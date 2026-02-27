const router = require('express').Router();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const asyncH = require('../middlewares/asyncHandler');
const { authenticateToken, JWT_SECRET } = require('../middlewares/auth');
const c = require('../controllers/torrents.controller');
const database = require('../models/database');
const { registerSSEClient, unregisterSSEClient, listTorrents } = require('../services/torrentManager');

// Configure multer for memory storage (file stored in memory as Buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for torrent files
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.torrent')) {
      cb(null, true);
    } else {
      cb(new Error('Only .torrent files are allowed'));
    }
  }
});

// SSE endpoint — registered BEFORE the global authenticateToken middleware because
// EventSource (browser) cannot send Authorization headers. Token arrives as ?token=.
router.get('/events', async (req, res) => {
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });

  let user;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    user = await database.getUserById(decoded.userId);
    if (!user) throw new Error('User not found');
  } catch (e) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx / Cloudflare buffering
  res.flushHeaders();

  const userId = user.id;
  registerSSEClient(userId, res);

  // Send current state immediately so the UI doesn't wait for the first poll cycle
  try {
    const torrents = await listTorrents(userId);
    res.write(`event: torrent_update\ndata: ${JSON.stringify(torrents)}\n\n`);
  } catch (e) { /* aria2 may not be ready yet — poll will catch up */ }

  // Keepalive comment every 25s to survive proxy / firewall idle timeouts
  const keepalive = setInterval(() => {
    try { res.write(':ping\n\n'); } catch (e) { clearInterval(keepalive); }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepalive);
    unregisterSSEClient(userId, res);
  });
});

// All other torrent operations require authentication
router.use(authenticateToken);

router.get('/quota', asyncH(c.quota));                          // get quota information
router.delete('/reservations/cleanup', asyncH(c.cleanupReservations)); // cleanup stale reservations
router.get('/notifications', asyncH(c.getNotifications));               // get quota exceeded notifications
router.delete('/notifications/:id', asyncH(c.clearNotification));       // clear specific notification
router.delete('/notifications', asyncH(c.clearAllNotifications));       // clear all notifications
router.post('/', upload.single('torrent'), asyncH(c.create));           // add magnet link or torrent file
router.get('/', asyncH(c.index));                                       // list torrents
router.get('/:id', asyncH(c.show));                                     // files + URLs for one torrent
router.put('/:id/pause', asyncH(c.pause));                              // pause torrent
router.put('/:id/resume', asyncH(c.resume));                            // resume torrent
router.put('/:id/stop', asyncH(c.stop));                                // stop torrent
router.delete('/:id', asyncH(c.destroy));                               // remove torrent

module.exports = router;
