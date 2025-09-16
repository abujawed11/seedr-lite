const router = require('express').Router();
const asyncH = require('../middlewares/asyncHandler');
const c = require('../controllers/torrents.controller');

router.post('/', asyncH(c.create));        // add magnet
router.get('/', asyncH(c.index));          // list torrents
router.get('/:id', asyncH(c.show));        // files + URLs for one torrent
router.put('/:id/stop', asyncH(c.stop));   // stop torrent
router.delete('/:id', asyncH(c.destroy));  // remove torrent

module.exports = router;
