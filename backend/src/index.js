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

async function autoInitIfNeeded() {
  const session = driver.session();
  try {
    const nodeRes = await session.run('MATCH (s:Song) RETURN count(s) AS n LIMIT 1');
    const nodeCount = nodeRes.records[0].get('n').toNumber();

    if (nodeCount === 0) {
      console.log('📂 Base de datos vacía → iniciando carga completa del dataset...');
      runInit();
      return;
    }

    const relRes = await session.run('MATCH ()-[r:TRANSITIONS_TO]->() RETURN count(r) AS n LIMIT 1');
    const relCount = relRes.records[0].get('n').toNumber();

    if (relCount === 0) {
      console.log('⚠️  Canciones sin relaciones TRANSITIONS_TO → re-inicializando...');
      runInit();
      return;
    }

    console.log(
      `✓ Dataset existente (${nodeCount.toLocaleString()} canciones, ` +
      `${relCount.toLocaleString()} transiciones) → re-proyectando grafo GDS...`
    );
    reprojectRoutingGraph();

  } catch (err) {
    console.error('[autoInit] Error al comprobar el estado de la BD:', err.message);
  } finally {
    await session.close();
  }
}

async function start() {
  // Retry con backoff: el healthcheck de Docker puede pasar antes de que GDS esté registrado
  let retries = 20;
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

  await new Promise(r => setTimeout(r, 5000)); // espera a que el plugin GDS termine de registrarse
  await autoInitIfNeeded();
}

start();
