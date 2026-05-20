const { Router } = require('express');
const { startInit, getInitStatus } = require('../controllers/graphController');
const { searchTracks, recommend, getGenres } = require('../controllers/recommendController');

const router = Router();

// ── Inicialización del grafo ──────────────────────────────────────────────────
// POST  /api/init-graph   → dispara el proceso async de carga + GDS
// GET   /api/init-status  → estado y progreso del proceso
router.post('/init-graph',  startInit);
router.get('/init-status',  getInitStatus);

// ── Búsqueda de canciones ─────────────────────────────────────────────────────
// GET /api/tracks/search?q=<texto>&limit=<n>
router.get('/tracks/search', searchTracks);

// ── Géneros disponibles ───────────────────────────────────────────────────────
// GET /api/genres
router.get('/genres', getGenres);

// ── Recomendación Dijkstra ────────────────────────────────────────────────────
// POST /api/recommend  body: { start_track_id, end_track_id }
router.post('/recommend', recommend);

module.exports = router;
