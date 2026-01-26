const router = require('express').Router();
const multer = require('multer');
const asyncH = require('../middlewares/asyncHandler');
const { authenticateToken } = require('../middlewares/auth');
const c = require('../controllers/torrents.controller');

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

// All torrent operations require authentication
router.use(authenticateToken);

router.get('/quota', asyncH(c.quota));                          // get quota information
router.delete('/reservations/cleanup', asyncH(c.cleanupReservations)); // cleanup stale reservations
router.get('/notifications', asyncH(c.getNotifications));               // get quota exceeded notifications
router.delete('/notifications/:id', asyncH(c.clearNotification));       // clear specific notification
router.delete('/notifications', asyncH(c.clearAllNotifications));       // clear all notifications
router.post('/', upload.single('torrent'), asyncH(c.create));           // add magnet link or torrent file
router.get('/', asyncH(c.index));                                       // list torrents
router.get('/library', asyncH(c.library));                              // list cached/completed torrents (DB-backed)
router.get('/:id', asyncH(c.show));                                     // files + URLs for one torrent
router.put('/:id/stop', asyncH(c.stop));                                // stop torrent
router.delete('/:id', asyncH(c.destroy));                               // remove torrent

// ==================== Cache-Aware Torrent Management ====================

// Add torrent with cache support (smart add)
router.post('/smart', asyncH(c.smartCreate));

// Check if torrent is cached before adding
router.get('/cache-check', asyncH(c.cacheCheck));

// Get storage system status
router.get('/storage-status', asyncH(c.storageStatus));

// Get files for a cached torrent (from local or R2)
router.get('/cache/:infoHash/files', asyncH(c.getCacheFiles));

module.exports = router;
