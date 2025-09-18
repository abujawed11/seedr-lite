const router = require('express').Router();
const asyncH = require('../middlewares/asyncHandler');
const { authenticateToken } = require('../middlewares/auth');
const { validateStorageSpace } = require('../middlewares/storageValidator');
const c = require('../controllers/torrents.controller');

// All torrent operations require authentication
router.use(authenticateToken);

router.post('/', asyncH(c.create));        // add magnet (temporarily disabled storage validation)
router.get('/', asyncH(c.index));          // list torrents
router.get('/:id', asyncH(c.show));        // files + URLs for one torrent
router.put('/:id/stop', asyncH(c.stop));   // stop torrent
router.delete('/:id', asyncH(c.destroy));  // remove torrent

module.exports = router;
