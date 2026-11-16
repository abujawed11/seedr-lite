const express = require("express");
const { authenticateToken } = require('../middlewares/auth');
const { requireAdExempt } = require('../services/adGate');
const { browse, stream, download, direct, listFiles, deleteFile, downloadFolder, adStart, adComplete } = require("../controllers/files.controller");

const router = express.Router();

// Public routes (no authentication required) — signed token; ad gate enforced inside
router.get("/direct/:token", direct);
router.get("/direct/:token/:filename", direct);

// Protected routes (authentication required)
router.get("/", authenticateToken, listFiles);
router.get("/browse", authenticateToken, browse);
router.delete("/delete", authenticateToken, deleteFile);

// Ad gate: free users watch an ad, then receive a short-lived link
router.post("/ad/start", authenticateToken, adStart);
router.post("/ad/complete", authenticateToken, adComplete);

// Raw byte routes would let free users skip the ad, so they're paid-only
router.get("/stream", authenticateToken, requireAdExempt, stream);
router.get("/download", authenticateToken, requireAdExempt, download);
router.get("/download/folder/:token", authenticateToken, requireAdExempt, downloadFolder);

module.exports = router;
