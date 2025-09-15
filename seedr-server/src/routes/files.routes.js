const express = require("express");
const { browse, stream, download, direct, listFiles, deleteFile } = require("../controllers/files.controller");

const router = express.Router();

// API routes (for /api/files/*)
router.get("/", listFiles);
router.get("/browse", browse);
router.delete("/delete", deleteFile);

// File serving routes (for /files/*)
router.get("/stream", stream);
router.get("/download", download);
router.get("/direct/:token", direct);

module.exports = router;