const { Router } = require('express');
const { startInit, getInitStatus } = require('../controllers/graphController');
const { searchTracks, recommend, getGenres } = require('../controllers/recommendController');

const router = Router();

router.post('/init-graph',   startInit);
router.get('/init-status',   getInitStatus);
router.get('/tracks/search', searchTracks);
router.get('/genres',        getGenres);
router.post('/recommend',    recommend);

module.exports = router;
