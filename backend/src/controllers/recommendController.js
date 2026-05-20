const neo4j = require('neo4j-driver');
const { driver } = require('../config/neo4j');

const GRAPH_ROUTE = 'dj-routing';

// Convierte valores Neo4j Integer a número JS de forma segura
const toNum = (v) => (v != null && typeof v.toNumber === 'function' ? v.toNumber() : Number(v));

// ── Búsqueda de canciones ────────────────────────────────────────────────────

async function searchTracks(req, res) {
  const query = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  if (!query || query.length < 2) {
    return res.json({ success: true, tracks: [] });
  }

  const session = driver.session();
  try {
    /*
     * Usamos el índice full-text creado durante el init para búsqueda rápida.
     * El asterisco al final habilita la búsqueda por prefijo (ej. "daft" → "Daft Punk").
     * Escapamos caracteres especiales de Lucene para evitar errores de sintaxis.
     */
    const lucene = query.replace(/[+\-!(){}[\]^"~*?:\\/]/g, '\\$&') + '*';

    const { records } = await session.run(
      `CALL db.index.fulltext.queryNodes('song_search', $q)
       YIELD node AS s, score
       RETURN s.track_id   AS track_id,
              s.track_name AS track_name,
              s.artists    AS artists,
              s.genre      AS genre,
              s.popularity AS popularity,
              s.bpm        AS bpm,
              s.key        AS key,
              s.mode       AS mode,
              s.energy     AS energy,
              s.danceability AS danceability,
              s.valence    AS valence,
              s.acousticness AS acousticness,
              score
       ORDER BY score DESC, s.popularity DESC
       LIMIT $limit`,
      { q: lucene, limit: neo4j.int(limit) }
    );

    const tracks = records.map((r) => ({
      track_id:     r.get('track_id'),
      track_name:   r.get('track_name'),
      artists:      r.get('artists'),
      genre:        r.get('genre'),
      popularity:   toNum(r.get('popularity')),
      bpm:          toNum(r.get('bpm')),
      key:          toNum(r.get('key')),
      mode:         toNum(r.get('mode')),
      energy:       r.get('energy'),
      danceability: r.get('danceability'),
      valence:      r.get('valence'),
      acousticness: r.get('acousticness'),
    }));

    res.json({ success: true, tracks });
  } catch (err) {
    // Si el índice full-text no existe (init no completado), hacemos fallback a CONTAINS
    if (err.message.includes('song_search')) {
      return res.json({ success: true, tracks: [], hint: 'Inicializa el grafo primero' });
    }
    console.error('[searchTracks]', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await session.close();
  }
}

// ── Recomendación: Dijkstra sobre TRANSITIONS_TO ────────────────────────────

async function recommend(req, res) {
  const { start_track_id, end_track_id } = req.body;

  if (!start_track_id || !end_track_id) {
    return res.status(400).json({ success: false, error: 'Se requieren start_track_id y end_track_id' });
  }
  if (start_track_id === end_track_id) {
    return res.status(400).json({ success: false, error: 'Las canciones de inicio y destino deben ser diferentes' });
  }

  const session = driver.session();
  try {
    // Verificar que el grafo de routing existe
    const { records: existsRec } = await session.run(
      'CALL gds.graph.exists($name) YIELD exists RETURN exists',
      { name: GRAPH_ROUTE }
    );
    if (!existsRec[0]?.get('exists')) {
      return res.status(400).json({
        success: false,
        error: 'El grafo no está inicializado. Ejecuta primero POST /api/init-graph',
      });
    }

    /*
     * Dijkstra encuentra el camino de menor peso acumulado entre los nodos start y end.
     * weight = 1 - similitud_coseno → peso bajo = canciones muy similares y fluidas de mezclar.
     * gds.util.asNode convierte los IDs internos de GDS en nodos reales del grafo.
     */
    const { records } = await session.run(
      `MATCH (start:Song {track_id: $start_id}), (end:Song {track_id: $end_id})
       CALL gds.shortestPath.dijkstra.stream($graph, {
         sourceNode: start,
         targetNode: end,
         relationshipWeightProperty: 'weight'
       })
       YIELD nodeIds, costs, totalCost
       RETURN
         [nid IN nodeIds | gds.util.asNode(nid)] AS tracks,
         costs,
         totalCost
       LIMIT 1`,
      { start_id: start_track_id, end_id: end_track_id, graph: GRAPH_ROUTE }
    );

    if (!records.length) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró ninguna ruta entre las canciones seleccionadas. Prueba con canciones de géneros más cercanos.',
      });
    }

    const record   = records[0];
    const nodes    = record.get('tracks');
    const costs    = record.get('costs');   // array de costes acumulados (Float64)
    const totalCost = record.get('totalCost');

    const playlist = nodes.map((node, i) => {
      const p = node.properties;
      return {
        track_id:        p.track_id,
        track_name:      p.track_name,
        artists:         p.artists,
        album_name:      p.album_name,
        genre:           p.genre,
        bpm:             toNum(p.bpm),
        key:             toNum(p.key),
        mode:            toNum(p.mode),
        energy:          p.energy,
        danceability:    p.danceability,
        valence:         p.valence,
        acousticness:    p.acousticness,
        popularity:      toNum(p.popularity),
        step:            i + 1,
        is_start:        i === 0,
        is_end:          i === nodes.length - 1,
        cumulative_cost: parseFloat(costs[i].toFixed(4)),
        step_cost:       i > 0 ? parseFloat((costs[i] - costs[i - 1]).toFixed(4)) : 0,
      };
    });

    res.json({
      success: true,
      playlist,
      total_cost:  parseFloat(totalCost.toFixed(4)),
      total_hops:  nodes.length,
    });

  } catch (err) {
    console.error('[recommend]', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await session.close();
  }
}

module.exports = { searchTracks, recommend };
