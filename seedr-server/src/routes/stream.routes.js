const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const s = require('../controllers/stream.controller');

// CORS preflight handling for streaming endpoints
router.options('/stream/:id/:fileIndex', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

router.options('/direct/:token', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

router.options('/direct/:token/:filename', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Protected routes that require authentication
router.get('/stream/:id/:fileIndex', authenticateToken, s.stream);      // inline play (Range)
router.get('/download/:id/:fileIndex', authenticateToken, s.download);  // attachment

// Public route with signed token (no auth required)
router.get('/direct/:token', s.direct);              // signed public link
router.get('/direct/:token/:filename', s.direct);    // signed public link with filename

module.exports = router;
