const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  ),
  {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 30000,
  }
);

async function verifyConnectivity() {
  try {
    await driver.verifyConnectivity();
    console.log('✓ Conectado a Neo4j');
  } catch (err) {
    console.error('✗ No se pudo conectar a Neo4j:', err.message);
    process.exit(1);
  }
}

module.exports = { driver, verifyConnectivity };
