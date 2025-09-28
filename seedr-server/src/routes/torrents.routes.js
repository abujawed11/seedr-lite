const router = require('express').Router();
const asyncH = require('../middlewares/asyncHandler');
const { authenticateToken } = require('../middlewares/auth');
const { validateStorageSpace } = require('../middlewares/storageValidator');
const c = require('../controllers/torrents.controller');
const inspectController = require('../controllers/inspect.controller');
const multer = require('multer');

// Configure multer for torrent file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for processing
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max torrent file size
  },
  fileFilter: (req, file, cb) => {
    // Accept .torrent files and files without extension (sometimes torrent files don't have .torrent extension)
    const allowedMimes = ['application/x-bittorrent', 'application/octet-stream'];
    const allowedExtensions = ['.torrent', ''];

    const hasValidMime = allowedMimes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.some(ext =>
      file.originalname.toLowerCase().endsWith(ext)
    );

    if (hasValidMime || hasValidExtension || file.originalname.toLowerCase().includes('torrent')) {
      cb(null, true);
    } else {
      cb(new Error('Only .torrent files are allowed'), false);
    }
  }
});

// All torrent operations require authentication
router.use(authenticateToken);

router.post("/inspect", asyncH(inspectController.inspect)); // inspect magnet metadata without downloading
router.post("/health-check", asyncH(inspectController.healthCheck)); // quick torrent health check (8s)
router.post('/', upload.single('torrentFile'), asyncH(c.create));        // add magnet or torrent file with quota validation
router.get('/', asyncH(c.index));          // list torrents
router.get('/:id', asyncH(c.show));        // files + URLs for one torrent
router.put('/:id/stop', asyncH(c.stop));   // stop torrent
router.delete('/:id', asyncH(c.destroy));  // remove torrent

module.exports = router;
