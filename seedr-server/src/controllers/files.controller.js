// src/controllers/files.controller.js
const fs = require("fs");
const path = require("path");

const ROOT = process.env.ROOT || path.resolve(__dirname, "../storage/library");

/**
 * Recursively walk the ROOT directory and return files.
 */
function walk(dir, base) {
  const results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walk(fullPath, base));
    } else {
      results.push({
        name: file,
        path: path.relative(base, fullPath), // relative path inside ROOT
        size: stat.size,
      });
    }
  });

  return results;
}

exports.listFiles = (req, res) => {
  try {
    const files = walk(ROOT, ROOT);
    res.json(files);
  } catch (err) {
    console.error("Error listing files:", err);
    res.status(500).json({ error: "failed to list files" });
  }
};
