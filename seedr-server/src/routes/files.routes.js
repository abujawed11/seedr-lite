const express = require("express");
const { authenticateToken } = require('../middlewares/auth');
const { browse, stream, download, direct, listFiles, deleteFile } = require("../controllers/files.controller");

const router = express.Router();

// Public routes (no authentication required)
router.get("/direct/:token", direct);

// Protected routes (authentication required)
router.get("/", authenticateToken, listFiles);
router.get("/browse", authenticateToken, browse);
router.delete("/delete", authenticateToken, deleteFile);
router.get("/stream", authenticateToken, stream);
router.get("/download", authenticateToken, download);

module.exports = router;