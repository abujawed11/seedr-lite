const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const s = require('../controllers/stream.controller');

// Protected routes that require authentication
router.get('/stream/:id/:fileIndex', authenticateToken, s.stream);      // inline play (Range)
router.get('/download/:id/:fileIndex', authenticateToken, s.download);  // attachment

// Public route with signed token (no auth required)
router.get('/direct/:token', s.direct);              // signed public link

module.exports = router;
