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

// ==================== R2 Cloud Streaming Routes ====================

// CORS preflight for R2 routes
router.options('/r2-stream/:infoHash/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

router.options('/cache-stream/:infoHash/:fileIndex?', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Stream from R2 (requires auth)
// Route: /r2-stream/:infoHash/path/to/file.mp4
router.get('/r2-stream/:infoHash/*', authenticateToken, s.r2Stream);

// Download from R2 (requires auth)
router.get('/r2-download/:infoHash/*', authenticateToken, s.r2Download);

// Unified cache streaming - tries local first, then R2 (requires auth)
// Route: /cache-stream/:infoHash/:fileIndex?download=true
router.get('/cache-stream/:infoHash/:fileIndex?', authenticateToken, s.streamFromCache);

// Get presigned URL for direct R2 access (requires auth)
router.get('/r2-presign/:infoHash/*', authenticateToken, s.getR2PresignedUrl);

module.exports = router;
