const { driver } = require('../config/neo4j');

const GRAPH_SIM   = 'dj-similarity';
const GRAPH_ROUTE = 'dj-routing';

// ── Estado compartido del job de inicialización ───────────────────────────────
const jobState = {
  status: 'idle',   // idle | running | done | error
  step: '',
  progress: 0,
  stats: null,
  error: null,
  startedAt: null,
  finishedAt: null,
};

function updateJob(fields) {
  Object.assign(jobState, fields);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function dropGraphIfExists(session, name) {
  const { records } = await session.run(
    'CALL gds.graph.exists($name) YIELD exists RETURN exists',
    { name }
  );
  if (records[0]?.get('exists')) {
    await session.run('CALL gds.graph.drop($name) YIELD graphName', { name });
    console.log(`  GDS graph "${name}" eliminado de memoria`);
  }
}

// ── Inicialización completa (LOAD CSV + kNN + Dijkstra projection) ────────────

async function runInit() {
  const session = driver.session();
  try {
    updateJob({ status: 'running', startedAt: new Date(), finishedAt: null, error: null, stats: null });

    // Paso 1: Índices ────────────────────────────────────────────────────────
    updateJob({ step: 'Creando índices de base de datos...', progress: 5 });
    console.log('[Init] 1/6 Creando índices');
    await session.run('CREATE INDEX song_track_id IF NOT EXISTS FOR (s:Song) ON (s.track_id)');
    await session.run('CREATE INDEX song_popularity IF NOT EXISTS FOR (s:Song) ON (s.popularity)');
    await session.run(`
      CREATE FULLTEXT INDEX song_search IF NOT EXISTS
      FOR (s:Song) ON EACH [s.track_name, s.artists]
    `);

    // Paso 2: Limpiar datos previos ──────────────────────────────────────────
    updateJob({ step: 'Limpiando datos anteriores...', progress: 10 });
    console.log('[Init] 2/6 Limpiando datos anteriores');
    await dropGraphIfExists(session, GRAPH_SIM);
    await dropGraphIfExists(session, GRAPH_ROUTE);
    // Borrar nodos en lotes para evitar picos de memoria
    let deleted = 1;
    while (deleted > 0) {
      const r = await session.run('MATCH (s:Song) WITH s LIMIT 10000 DETACH DELETE s RETURN count(s) AS n');
      deleted = r.records[0]?.get('n')?.toNumber() ?? 0;
    }

    // Paso 3: LOAD CSV ───────────────────────────────────────────────────────
    updateJob({ step: 'Importando 113k canciones desde dataset.csv...', progress: 20 });
    console.log('[Init] 3/6 LOAD CSV dataset completo');

    /*
     * CALL { } IN TRANSACTIONS es la forma recomendada en Neo4j 5.x para
     * importar grandes volúmenes sin agotar la memoria de transacción.
     * MERGE evita duplicados cuando la misma track_id aparece en varios géneros.
     * bpm_normalized mapea [60–200 BPM] a [0.0–1.0] para igualar la escala
     * con energy, danceability y valence antes de aplicar similitud coseno.
     */
    await session.run(`
      LOAD CSV WITH HEADERS FROM 'file:///dataset.csv' AS row
      CALL {
        WITH row
        MERGE (s:Song {track_id: row.track_id})
        ON CREATE SET
          s.track_name     = row.track_name,
          s.artists        = row.artists,
          s.album_name     = row.album_name,
          s.bpm            = toInteger(round(toFloat(row.tempo))),
          s.key            = toInteger(row.key),
          s.mode           = toInteger(row.mode),
          s.energy         = toFloat(row.energy),
          s.danceability   = toFloat(row.danceability),
          s.valence        = toFloat(row.valence),
          s.acousticness   = toFloat(row.acousticness),
          s.popularity     = toInteger(row.popularity),
          s.genre          = row.track_genre,
          s.bpm_normalized = CASE
            WHEN toFloat(row.tempo) < 60  THEN 0.0
            WHEN toFloat(row.tempo) > 200 THEN 1.0
            ELSE (toFloat(row.tempo) - 60.0) / 140.0
          END
      } IN TRANSACTIONS OF 2000 ROWS
    `);

    const countR = await session.run('MATCH (s:Song) RETURN count(s) AS n');
    const nodeCount = countR.records[0].get('n').toNumber();
    console.log(`  Nodos importados: ${nodeCount.toLocaleString()}`);
    updateJob({ progress: 40 });

    // Paso 4: Proyectar grafo de características en memoria ──────────────────
    updateJob({ step: 'Proyectando grafo de características en GDS...', progress: 45 });
    console.log('[Init] 4/6 Proyectar grafo para kNN');

    /*
     * Proyectamos solo los nodos Song con sus propiedades numéricas.
     * kNN trabaja exclusivamente con vectores de nodos; no necesita relaciones.
     */
    await session.run(`
      CALL gds.graph.project(
        $name,
        {
          Song: {
            properties: {
              energy:         { defaultValue: 0.0 },
              danceability:   { defaultValue: 0.0 },
              valence:        { defaultValue: 0.0 },
              bpm_normalized: { defaultValue: 0.5 }
            }
          }
        },
        '*'
      ) YIELD graphName, nodeCount
    `, { name: GRAPH_SIM });

    // Paso 5: kNN cosine similarity → relaciones TRANSITIONS_TO ─────────────
    updateJob({ step: 'Calculando similitud coseno GDS kNN — puede tardar varios minutos...', progress: 50 });
    console.log('[Init] 5/6 gds.knn.write (topK=8, cosine) — proceso largo...');

    /*
     * gds.knn.write calcula los 8 vecinos más similares por similitud coseno
     * sobre el vector [energy, danceability, valence, bpm_normalized] y escribe
     * relaciones :TRANSITIONS_TO con la propiedad `score` (0=idéntico, 1=opuesto).
     * Después invertimos: weight = 1 − score, de modo que Dijkstra minimice el
     * "coste de transición" (peso bajo = canciones acústicamente compatibles).
     */
    await session.run(`
      CALL gds.knn.write($name, {
        topK: 8,
        nodeProperties: ['energy', 'danceability', 'valence', 'bpm_normalized'],
        writeRelationshipType: 'TRANSITIONS_TO',
        writeProperty: 'score',
        sampleRate: 0.5,
        concurrency: 1,
        randomSeed: 42
      })
      YIELD nodesCompared, relationshipsWritten
    `, { name: GRAPH_SIM });

    // Invertir score → weight en lotes (puede ser >800k relaciones)
    await session.run(`
      MATCH ()-[r:TRANSITIONS_TO]->()
      CALL {
        WITH r
        SET r.weight = round((1.0 - r.score) * 10000) / 10000
        REMOVE r.score
      } IN TRANSACTIONS OF 10000 ROWS
    `);

    const relR = await session.run('MATCH ()-[r:TRANSITIONS_TO]->() RETURN count(r) AS n');
    const relCount = relR.records[0].get('n').toNumber();
    console.log(`  Relaciones TRANSITIONS_TO: ${relCount.toLocaleString()}`);
    await dropGraphIfExists(session, GRAPH_SIM);
    updateJob({ progress: 85 });

    // Paso 6: Proyectar grafo de routing para Dijkstra ───────────────────────
    updateJob({ step: 'Proyectando grafo de ruta Dijkstra en GDS...', progress: 90 });
    console.log('[Init] 6/6 Proyectar grafo dj-routing');
    await _projectRoutingGraph(session);

    updateJob({
      status: 'done',
      step: 'Grafo inicializado correctamente',
      progress: 100,
      finishedAt: new Date(),
      stats: { nodes: nodeCount, relationships: relCount },
    });
    console.log('[Init] ✓ Completado');

  } catch (err) {
    console.error('[Init] ERROR:', err.message);
    updateJob({ status: 'error', step: 'Error durante la inicialización', error: err.message });
    try { await dropGraphIfExists(session, GRAPH_SIM); } catch (_) {}
  } finally {
    await session.close();
  }
}

// ── Re-proyección rápida (usada en reinicios cuando los datos ya existen) ─────

async function reprojectRoutingGraph() {
  const session = driver.session();
  try {
    updateJob({ status: 'running', step: 'Re-proyectando grafo GDS tras reinicio...', progress: 90, startedAt: new Date() });
    await _projectRoutingGraph(session);

    // Leer estadísticas actuales para el status del frontend
    const { records } = await session.run(`
      MATCH (s:Song) WITH count(s) AS nodes
      OPTIONAL MATCH ()-[r:TRANSITIONS_TO]->()
      RETURN nodes, count(r) AS rels
    `);
    const r = records[0];
    updateJob({
      status: 'done',
      step: 'Grafo re-proyectado (dataset existente)',
      progress: 100,
      finishedAt: new Date(),
      stats: {
        nodes:         r.get('nodes').toNumber(),
        relationships: r.get('rels').toNumber(),
      },
    });
    console.log('✓ Grafo GDS re-proyectado desde dataset existente');

  } catch (err) {
    console.error('[reprojectRoutingGraph]', err.message);
    updateJob({ status: 'error', step: 'Error al re-proyectar grafo', error: err.message });
  } finally {
    await session.close();
  }
}

// Función interna compartida para proyectar el grafo de routing
async function _projectRoutingGraph(session) {
  await dropGraphIfExists(session, GRAPH_ROUTE);
  await session.run(`
    CALL gds.graph.project(
      $name,
      'Song',
      {
        TRANSITIONS_TO: {
          orientation: 'UNDIRECTED',
          properties: { weight: { defaultValue: 1.0 } }
        }
      }
    ) YIELD graphName, nodeCount, relationshipCount
  `, { name: GRAPH_ROUTE });
}

// ── Controladores de ruta HTTP ────────────────────────────────────────────────

async function startInit(req, res) {
  if (jobState.status === 'running') {
    return res.status(409).json({ success: false, message: 'La inicialización ya está en progreso', job: jobState });
  }
  runInit(); // fire-and-forget
  res.json({ success: true, message: 'Inicialización iniciada', job: jobState });
}

function getInitStatus(req, res) {
  res.json({ success: true, job: jobState });
}

module.exports = { startInit, getInitStatus, runInit, reprojectRoutingGraph };
