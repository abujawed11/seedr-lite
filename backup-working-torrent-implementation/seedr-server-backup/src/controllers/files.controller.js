const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const rangeParser = require("range-parser");
const { signLink, verifyLink } = require("../services/linkSigner");

const ROOT = process.env.ROOT || path.resolve(__dirname, "../storage/library");

// function validatePath(userPath) {
//   if (!userPath) return "";

//   const normalized = path.normalize(userPath).replace(/^(\.\.[\/\\])+/, "");
//   const fullPath = path.resolve(ROOT, normalized);

//   if (!fullPath.startsWith(ROOT)) {
//     throw new Error("Path traversal attempt detected");
//   }

//   return normalized;
// }


function validatePath(userPath) {
  if (!userPath) return "";
  const normalized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.resolve(ROOT, normalized);
  const resolvedRoot = path.resolve(ROOT);

  if (!fullPath.startsWith(resolvedRoot)) {
    throw new Error("Path traversal attempt detected");
  }
  return normalized;
}


function getAbsolutePath(relativePath) {
  const safePath = validatePath(relativePath);
  return path.resolve(ROOT, safePath);
}

exports.browse = async (req, res) => {
  try {
    // const userPath = req.query.path || "";
    const rawPath = req.query.path || "";
    const decoded = decodeURIComponent(rawPath);
    const safePath = validatePath(decoded);
    const fullPath = path.resolve(ROOT, safePath);
    // const safePath = validatePath(userPath);
    // const fullPath = path.resolve(ROOT, safePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "Directory not found" });
    }

    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: "Path is not a directory" });
    }

    const items = fs.readdirSync(fullPath);
    const dirs = [];
    const files = [];

    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const itemStat = fs.statSync(itemPath);
      const relativePath = path.posix.join(safePath, item).replace(/\\/g, "/");

      if (itemStat.isDirectory()) {
        dirs.push({
          name: item,
          path: relativePath
        });
      } else {
        const mimeType = mime.lookup(item) || "application/octet-stream";
        const baseUrl = process.env.WEB_BASE_URL || `${req.protocol}://${req.get('host')}`;

        const directToken = signLink({ path: relativePath, asAttachment: false });

        files.push({
          name: item,
          path: relativePath,
          size: itemStat.size,
          mime: mimeType,
          streamUrl: `${baseUrl}/files/stream?path=${encodeURIComponent(relativePath)}`,
          downloadUrl: `${baseUrl}/files/download?path=${encodeURIComponent(relativePath)}`,
          directUrl: `${baseUrl}/files/direct/${directToken}`
        });
      }
    }

    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    const parentPath = safePath ? path.dirname(safePath).replace(/\\/g, "/") : null;
    const parent = parentPath === "." ? "" : parentPath;

    res.json({
      cwd: safePath.replace(/\\/g, "/") || "",
      parent: parent,
      dirs,
      files
    });
  } catch (err) {
    console.error("Error browsing files:", err);
    res.status(500).json({ error: "Failed to browse directory" });
  }
};

async function streamFileFromDisk(req, res, { filePath, asAttachment = false }) {
  try {
    const safePath = validatePath(filePath);
    const fullPath = path.resolve(ROOT, safePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      return res.status(400).json({ error: "Path is not a file" });
    }

    const total = stat.size;
    const fileName = path.basename(fullPath);
    const mimeType = mime.lookup(fileName) || "application/octet-stream";

    let start = 0;
    let end = total - 1;
    let status = 200;

    if (req.headers.range) {
      const ranges = rangeParser(total, req.headers.range);
      if (Array.isArray(ranges) && ranges.length > 0 && ranges.type === "bytes") {
        start = ranges[0].start;
        end = ranges[0].end;
        status = 206;
      }
    }

    const chunkSize = (end - start) + 1;

    res.status(status);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", chunkSize);

    if (status === 206) {
      res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
    }

    if (asAttachment) {
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    }

    const stream = fs.createReadStream(fullPath, { start, end });
    stream.on("error", (e) => {
      console.error("Stream error:", e);
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream error" });
      } else {
        res.destroy(e);
      }
    });

    stream.pipe(res);
  } catch (err) {
    console.error("Error streaming file:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream file" });
    }
  }
}

exports.stream = async (req, res) => {
  // const filePath = req.query.path;
  const rawPath = req.query.path || "";
  const decoded = decodeURIComponent(rawPath);
  const safePath = validatePath(decoded);
  const fullPath = path.resolve(ROOT, safePath);
  if (!decoded) {
    return res.status(400).json({ error: "Missing path parameter" });
  }

  await streamFileFromDisk(req, res, { filePath: decoded, asAttachment: false });
};

exports.download = async (req, res) => {
  // const filePath = req.query.path;
  const rawPath = req.query.path || "";
  const decoded = decodeURIComponent(rawPath);
  const safePath = validatePath(decoded);
  const fullPath = path.resolve(ROOT, safePath);
  if (!decoded) {
    return res.status(400).json({ error: "Missing path parameter" });
  }

  await streamFileFromDisk(req, res, { filePath: decoded, asAttachment: true });
};

exports.direct = async (req, res) => {
  try {
    const token = req.params.token;
    const payload = verifyLink(token);

    if (!payload.path) {
      return res.status(400).json({ error: "Invalid token payload" });
    }

    await streamFileFromDisk(req, res, {
      filePath: payload.path,
      asAttachment: payload.asAttachment || false
    });
  } catch (err) {
    console.error("Direct link error:", err);
    return res.status(401).json({ error: "Invalid or expired link" });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const userPath = req.body.path;
    if (!userPath) {
      return res.status(400).json({ error: "Missing path parameter" });
    }

    const safePath = validatePath(userPath);
    const fullPath = path.resolve(ROOT, safePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File or directory not found" });
    }

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Remove directory recursively
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      // Remove file
      fs.unlinkSync(fullPath);
    }

    res.json({
      deleted: true,
      path: safePath,
      type: stat.isDirectory() ? 'directory' : 'file'
    });
  } catch (err) {
    console.error("Error deleting file:", err);
    res.status(500).json({ error: "Failed to delete file or directory" });
  }
};

exports.listFiles = (req, res) => {
  try {
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
            path: path.relative(base, fullPath),
            size: stat.size,
          });
        }
      });

      return results;
    }

    const files = walk(ROOT, ROOT);
    res.json(files);
  } catch (err) {
    console.error("Error listing files:", err);
    res.status(500).json({ error: "failed to list files" });
  }
};