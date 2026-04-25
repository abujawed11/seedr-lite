const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const { startTransfer, getTransferStatus } = require('../controllers/r2.controller');

const router = express.Router();

router.post('/transfer', authenticateToken, startTransfer);
router.get('/transfer/:jobId', authenticateToken, getTransferStatus);

module.exports = router;
