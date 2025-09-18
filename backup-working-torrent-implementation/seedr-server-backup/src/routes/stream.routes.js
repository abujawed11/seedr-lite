const router = require('express').Router();
const s = require('../controllers/stream.controller');

router.get('/stream/:id/:fileIndex', s.stream);      // inline play (Range)
router.get('/download/:id/:fileIndex', s.download);  // attachment
router.get('/direct/:token', s.direct);              // signed public link

module.exports = router;
