require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { driver, verifyConnectivity } = require('./config/neo4j');
const { runInit, reprojectRoutingGraph } = require('./controllers/graphController');
const apiRouter = require('./routes/api');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Auto-init: se ejecuta una sola vez al arrancar ────────────────────────────

async function autoInitIfNeeded() {
  const session = driver.session();
  try {
    // ¿Hay nodos Song en la base de datos?
    const nodeRes = await session.run('MATCH (s:Song) RETURN count(s) AS n LIMIT 1');
    const nodeCount = nodeRes.records[0].get('n').toNumber();

    if (nodeCount === 0) {
      // Base de datos vacía → carga completa (LOAD CSV + kNN + proyección)
      console.log('📂 Base de datos vacía → iniciando carga completa del dataset...');
      runInit(); // fire-and-forget; el cliente pollea GET /api/init-status
      return;
    }

    // ¿Existen relaciones de transición?
    const relRes = await session.run('MATCH ()-[r:TRANSITIONS_TO]->() RETURN count(r) AS n LIMIT 1');
    const relCount = relRes.records[0].get('n').toNumber();

    if (relCount === 0) {
      // Nodos sin relaciones (kNN falló antes) → reinicialización completa
      console.log('⚠️  Canciones sin relaciones TRANSITIONS_TO → re-inicializando...');
      runInit();
      return;
    }

    /*
     * Dataset completo y relaciones OK.
     * Los grafos GDS viven en memoria y se pierden al reiniciar Neo4j,
     * así que solo necesitamos re-proyectar el grafo de routing (segundos).
     * No hace falta volver a importar ni recalcular kNN.
     */
    console.log(
      `✓ Dataset existente (${nodeCount.toLocaleString()} canciones, ` +
      `${relCount.toLocaleString()} transiciones) → re-proyectando grafo GDS...`
    );
    reprojectRoutingGraph(); // fire-and-forget

  } catch (err) {
    console.error('[autoInit] Error al comprobar el estado de la BD:', err.message);
    // No se detiene el servidor — el usuario puede inicializar manualmente desde la UI
  } finally {
    await session.close();
  }
}

// ── Arranque del servidor ─────────────────────────────────────────────────────

async function start() {
  // Reintentar la conexión a Neo4j con backoff (el healthcheck de Docker puede
  // pasar justo antes de que el plugin GDS esté completamente registrado)
  let retries = 10;
  while (retries > 0) {
    try {
      await verifyConnectivity();
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.error('✗ No se pudo conectar a Neo4j tras varios intentos.');
        process.exit(1);
      }
      console.log(`  Reintentando conexión a Neo4j (${retries} intentos restantes)...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  app.listen(PORT, () => {
    console.log(`\n🎛️  DJ Recommender backend en http://localhost:${PORT}`);
    console.log(`   Neo4j Browser      en http://localhost:7474\n`);
  });

  // Pausa de seguridad: deja que el plugin GDS termine de registrarse
  // antes de lanzar consultas con procedimientos gds.*
  await new Promise(r => setTimeout(r, 5000));
  await autoInitIfNeeded();
}

start();
