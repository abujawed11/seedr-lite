// src/routes/files.routes.js
const express = require("express");
const { listFiles } = require("../controllers/files.controller");

const router = express.Router();

router.get("/", listFiles);

module.exports = router;
