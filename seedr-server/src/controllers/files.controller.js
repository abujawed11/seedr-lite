const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const rangeParser = require("range-parser");
const archiver = require("archiver");
const { signLink, verifyLink } = require("../services/linkSigner");
const { getUserStorageDir, updateUserStorageUsage } = require("../utils/storage");
const streamRegistry = require("../utils/streamRegistry");
const adGate = require("../services/adGate");

const ROOT = process.env.ROOT || path.resolve(__dirname, "../storage/library");

// Calculate total size of a directory recursively
function calculateDirectorySize(dirPath) {
  let totalSize = 0;
  let fileCount = 0;

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        const subResult = calculateDirectorySize(itemPath);
        totalSize += subResult.size;
        fileCount += subResult.files;
      } else {
        totalSize += stat.size;
        fileCount++;
      }
    }
  } catch (error) {
    console.error(`Error calculating directory size for ${dirPath}:`, error.message);
  }

  return { size: totalSize, files: fileCount };
}

// Estimate the byte size of a ZIP archive (level 0) before streaming it.
// With no compression, each file contributes:
//   30 (local header) + nameBytes + fileSize + 16 (data descriptor)
//   + 46 (central directory entry) + nameBytes
// Plus 22 bytes for the end-of-central-directory record.
function calculateZipContentLength(dirPath, archiveName) {
  let size = 22; // end-of-central-directory record

  function walk(currentPath, archivePath) {
    let entries;
    try { entries = fs.readdirSync(currentPath, { withFileTypes: true }); }
    catch (e) { return; }

    for (const entry of entries) {
      const fullEntryPath = path.join(currentPath, entry.name);
      const entryArchivePath = archivePath + '/' + entry.name;
      if (entry.isDirectory()) {
        walk(fullEntryPath, entryArchivePath);
      } else {
        let fileSize = 0;
        try { fileSize = fs.statSync(fullEntryPath).size; } catch (e) {}
        const nameBytes = Buffer.byteLength(entryArchivePath, 'utf8');
        size += 30 + nameBytes + fileSize + 16 + 46 + nameBytes;
      }
    }
  }

  walk(dirPath, archiveName);
  return size;
}

// function validatePath(userPath) {
//   if (!userPath) return "";

//   const normalized = path.normalize(userPath).replace(/^(\.\.[\/\\])+/, "");
//   const fullPath = path.resolve(ROOT, normalized);

//   if (!fullPath.startsWith(ROOT)) {
//     throw new Error("Path traversal attempt detected");
//   }

//   return normalized;
// }


function validatePath(userPath, userRoot) {
  if (!userPath) return "";
  const normalized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.resolve(userRoot, normalized);
  const resolvedRoot = path.resolve(userRoot);

  if (!fullPath.startsWith(resolvedRoot)) {
    throw new Error("Path traversal attempt detected");
  }
  return normalized;
}


// De-duplicate direct_link_access log entries
const DIRECT_LOG_WINDOW_MS = 30 * 60 * 1000;
const directLogSeen = new Map(); // "userId|path|mode" -> last logged timestamp

function shouldLogDirectAccess(req, payload) {
  // Only the start of a file counts: no Range header, or a range from byte 0.
  // Seeks and later chunks of the same playback/download are skipped.
  const range = req.headers.range;
  if (range && !/^bytes=0-/.test(range)) return false;

  const key = `${payload.userId}|${payload.path}|${payload.asAttachment ? 'dl' : 'st'}`;
  const now = Date.now();
  const last = directLogSeen.get(key);
  if (last && now - last < DIRECT_LOG_WINDOW_MS) return false;

  directLogSeen.set(key, now);
  if (directLogSeen.size > 10000) {
    for (const [k, t] of directLogSeen) {
      if (now - t > DIRECT_LOG_WINDOW_MS) directLogSeen.delete(k);
    }
  }
  return true;
}

function buildDirectUrl(req, token, filename) {
  const baseUrl = process.env.WEB_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/files/direct/${token}/${encodeURIComponent(filename)}`;
}

function getAbsolutePath(relativePath, userRoot) {
  const safePath = validatePath(relativePath, userRoot);
  return path.resolve(userRoot, safePath);
}

exports.browse = async (req, res) => {
  try {
    // Prevent caching of file browse data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const userId = req.user.id;
    const userRoot = getUserStorageDir(userId);
    console.log(`📁 Browse: User ${userId} browsing directory: ${userRoot}`);

    // Update storage usage when browsing (to keep it current)
    try {
      const calculatedUsage = await updateUserStorageUsage(userId);
      console.log(`📊 Browse: Calculated storage usage: ${calculatedUsage} bytes`);
    } catch (error) {
      console.error("Error updating storage usage during browse:", error);
    }

    const rawPath = req.query.path || "";
    let decoded;
    try {
      decoded = decodeURIComponent(rawPath);
    } catch (error) {
      console.error("URL decode error for path:", rawPath, error.message);
      // If decoding fails, use the raw path as-is
      decoded = rawPath;
    }
    const safePath = validatePath(decoded, userRoot);
    const fullPath = path.resolve(userRoot, safePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "Directory not found" });
    }

    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: "Path is not a directory" });
    }

    const adRequired = !adGate.isExemptUser(req.user);
    const items = fs.readdirSync(fullPath);
    const dirs = [];
    const files = [];

    for (const item of items) {
      // Hide aria2 control files — they're internal download state, not user files
      if (item.endsWith('.aria2')) continue;

      const itemPath = path.join(fullPath, item);
      const itemStat = fs.statSync(itemPath);
      const relativePath = path.posix.join(safePath, item).replace(/\\/g, "/");

      if (itemStat.isDirectory()) {
        // Calculate directory size and file count
        const sizeInfo = calculateDirectorySize(itemPath);

        const dir = {
          name: item,
          path: relativePath,
          size: sizeInfo.size,
          fileCount: sizeInfo.files,
        };

        // Free users get no links here — they must go through the ad gate
        if (!adRequired) {
          const downloadToken = signLink({ path: relativePath, asAttachment: true, userId: userId, isFolder: true });
          dir.downloadUrl = buildDirectUrl(req, downloadToken, `${item}.zip`);
        }

        dirs.push(dir);
      } else {
        const mimeType = mime.lookup(item) || "application/octet-stream";

        const file = {
          name: item,
          path: relativePath,
          size: itemStat.size,
          mime: mimeType,
        };

        if (!adRequired) {
          const streamToken = signLink({ path: relativePath, asAttachment: false, userId: userId });
          const downloadToken = signLink({ path: relativePath, asAttachment: true, userId: userId });
          file.streamUrl = buildDirectUrl(req, streamToken, item);
          file.downloadUrl = buildDirectUrl(req, downloadToken, item);
          file.directUrl = file.downloadUrl;
        }

        files.push(file);
      }
    }

    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    const parentPath = safePath ? path.dirname(safePath).replace(/\\/g, "/") : null;
    const parent = parentPath === "." ? "" : parentPath;

    res.json({
      cwd: safePath.replace(/\\/g, "/") || "",
      parent: parent,
      adRequired,
      dirs,
      files
    });
  } catch (err) {
    if (err.message === "Path traversal attempt detected") {
      await req.activityLogger.logSecurity(req, 'path_traversal_attempt', {
        filePath: req.query.path || 'unknown',
        torrentName: 'browse_operation'
      });
      return res.status(403).json({ error: "Invalid path" });
    }
    console.error("Error browsing files:", err);
    res.status(500).json({ error: "Failed to browse directory" });
  }
};

async function streamFileFromDisk(req, res, { filePath, asAttachment = false, userId = null }) {
  try {
    // For direct links, userId might not be available, use a default storage root
    const userRoot = userId ? getUserStorageDir(userId) : ROOT;

    const safePath = validatePath(filePath, userRoot);
    const fullPath = path.resolve(userRoot, safePath);

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

    // Always set Content-Disposition header to help media players identify the filename
    if (asAttachment) {
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    } else {
      // For streaming, use 'inline' disposition but still include filename
      res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    }

    const stream = fs.createReadStream(fullPath, { start, end });

    streamRegistry.register(fullPath, stream);
    const unregister = () => streamRegistry.unregister(fullPath, stream);
    stream.once('close', unregister);
    stream.once('error', unregister);

    // Destroy the read stream immediately when the client disconnects so the
    // file descriptor is released even if the inode was already unlinked.
    req.on('close', () => stream.destroy());

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
    if (err.message === "Path traversal attempt detected") {
      // req might not have activityLogger attached if called directly? 
      // Actually it's passed from controller methods which have it via middleware
      if (req.activityLogger) {
        await req.activityLogger.logSecurity(req, 'path_traversal_attempt', {
          filePath: filePath || 'unknown',
          torrentName: asAttachment ? 'download_operation' : 'stream_operation'
        });
      }
      if (!res.headersSent) {
        return res.status(403).json({ error: "Invalid path" });
      }
    }

    console.error("Error streaming file:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream file" });
    }
  }
}

exports.stream = async (req, res) => {
  const rawPath = req.query.path || "";
  const decoded = decodeURIComponent(rawPath);
  if (!decoded) {
    return res.status(400).json({ error: "Missing path parameter" });
  }

  await streamFileFromDisk(req, res, {
    filePath: decoded,
    asAttachment: false,
    userId: req.user.id
  });
};

exports.download = async (req, res) => {
  const rawPath = req.query.path || "";
  const decoded = decodeURIComponent(rawPath);
  if (!decoded) {
    return res.status(400).json({ error: "Missing path parameter" });
  }

  await streamFileFromDisk(req, res, {
    filePath: decoded,
    asAttachment: true,
    userId: req.user.id
  });
};

exports.direct = async (req, res) => {
  try {
    const token = req.params.token;
    const payload = verifyLink(token);

    if (!payload.path) {
      return res.status(400).json({ error: "Invalid token payload" });
    }

    // Free users may only use links issued after watching an ad
    const access = await adGate.checkDirectAccess(payload, req);
    if (!access.ok) {
      return res.status(403).json({ error: access.reason, adRequired: true });
    }

    // Check if this is a folder download request
    if (payload.isFolder) {
      // Handle folder download
      const userRoot = getUserStorageDir(payload.userId);
      const safePath = validatePath(payload.path, userRoot);
      const fullPath = path.resolve(userRoot, safePath);

      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "Folder not found" });
      }

      const stat = fs.statSync(fullPath);
      if (!stat.isDirectory()) {
        return res.status(400).json({ error: "Path is not a directory" });
      }

      // Get folder name for ZIP filename
      const folderName = path.basename(fullPath);
      const zipFilename = `${folderName}.zip`;

      // Short-circuit HEAD requests — return headers immediately, no archiving needed
      if (req.method === 'HEAD') {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
        res.setHeader('Accept-Ranges', 'none');
        return res.status(200).end();
      }

      // Pre-calculate ZIP size so clients can show download progress
      const contentLength = calculateZipContentLength(fullPath, folderName);

      // Set response headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
      res.setHeader('Content-Length', contentLength);

      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 0 } // No compression — files stream immediately without CPU overhead
      });

      // Handle archive errors
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to create archive' });
        }
      });

      // Abort the archiver when the client disconnects so its internal file
      // handles are released immediately rather than running to completion.
      res.on('close', () => { try { archive.abort(); } catch (_) {} });

      // Pipe archive to response
      archive.pipe(res);

      // Add directory contents to archive
      archive.directory(fullPath, folderName);

      // Finalize the archive
      await archive.finalize();

      console.log(`📦 Folder download completed: ${folderName} (${zipFilename})`);
      return;
    }

    // Use the userId from the token to get the correct user directory for file downloads
    await streamFileFromDisk(req, res, {
      filePath: payload.path,
      asAttachment: payload.asAttachment || false,
      userId: payload.userId  // Use userId from token
    });

    // Log direct link access — once per user/file/mode per window, not once per
    // video chunk (players and download managers send many Range requests).
    if (req.activityLogger && res.statusCode < 400 && shouldLogDirectAccess(req, payload)) {
      // Pass the real req (keeps the real client IP); the username is looked
      // up from the token's userId.
      await req.activityLogger.log(req, 'direct_link_access', {
        userId: payload.userId,
        filePath: payload.path,
        torrentName: payload.asAttachment ? 'download' : 'stream'
      });
    }
  } catch (err) {
    if (err.message === "Path traversal attempt detected") {
      // req.activityLogger might not be available or fully populated for public links
      // but we try anyway
      if (req.activityLogger) {
        await req.activityLogger.logSecurity(req, 'path_traversal_attempt', {
          filePath: req.params.token || 'unknown_token',
          torrentName: 'direct_link_operation'
        });
      }
      return res.status(403).json({ error: "Invalid path" });
    }
    console.error("Direct link error:", err);
    return res.status(401).json({ error: "Invalid or expired link" });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRoot = getUserStorageDir(userId);

    const userPath = req.body.path;
    if (!userPath) {
      return res.status(400).json({ error: "Missing path parameter" });
    }

    const safePath = validatePath(userPath, userRoot);
    const fullPath = path.resolve(userRoot, safePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File or directory not found" });
    }

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Close any streams reading files inside this directory before deleting,
      // so Linux releases the inodes immediately rather than holding them open.
      await streamRegistry.drainDirectory(fullPath);
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      // Close any stream currently reading this file before unlinking.
      await streamRegistry.drainPath(fullPath);
      fs.unlinkSync(fullPath);
    }

    // Update user's storage usage after deletion (force update to recalculate from filesystem)
    try {
      await updateUserStorageUsage(userId, true);
    } catch (error) {
      console.error("Error updating storage usage after deletion:", error);
    }

    // Log file deletion
    await req.activityLogger.logFile(req, 'delete', safePath, 0); // 0 size as we don't calculate it before delete here

    res.json({
      deleted: true,
      path: safePath,
      type: stat.isDirectory() ? 'directory' : 'file'
    });
  } catch (err) {
    if (err.message === "Path traversal attempt detected") {
      await req.activityLogger.logSecurity(req, 'path_traversal_attempt', {
        filePath: req.body.path || 'unknown',
        torrentName: 'delete_operation'
      });
      return res.status(403).json({ error: "Invalid path" });
    }
    console.error("Error deleting file:", err);
    res.status(500).json({ error: "Failed to delete file or directory" });
  }
};

exports.listFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRoot = getUserStorageDir(userId);

    function walk(dir, base) {
      const results = [];
      if (!fs.existsSync(dir)) {
        return results;
      }

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

    const files = walk(userRoot, userRoot);

    // Log file list view (low priority)
    await req.activityLogger.log(req, 'file_list_view', {
      fileSize: files.length
    });

    res.json(files);
  } catch (err) {
    console.error("Error listing files:", err);
    res.status(500).json({ error: "failed to list files" });
  }
};

// Download folder as ZIP
exports.downloadFolder = async (req, res) => {
  try {
    const token = req.params.token;
    if (!token) {
      return res.status(400).json({ error: "Missing download token" });
    }

    // Verify the signed token
    const { path: relativePath, userId } = verifyLink(token);

    if (req.user.id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const userRoot = getUserStorageDir(userId);
    const safePath = validatePath(relativePath, userRoot);
    const fullPath = path.resolve(userRoot, safePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "Folder not found" });
    }

    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: "Path is not a directory" });
    }

    // Get folder name for ZIP filename
    const folderName = path.basename(fullPath);
    const zipFilename = `${folderName}.zip`;

    // Pre-calculate ZIP size so clients can show download progress
    const contentLength = calculateZipContentLength(fullPath, folderName);

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Content-Length', contentLength);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 0 } // No compression — files stream immediately without CPU overhead
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    // Abort the archiver when the client disconnects so its internal file
    // handles are released immediately rather than running to completion.
    res.on('close', () => { try { archive.abort(); } catch (_) {} });

    // Pipe archive to response
    archive.pipe(res);

    // Add directory contents to archive
    archive.directory(fullPath, folderName);

    // Finalize the archive
    await archive.finalize();

    console.log(`📦 Folder download completed: ${folderName} (${zipFilename})`);

    // Log folder download
    if (req.activityLogger) { // Might be null if direct link context doesn't have it initialized? No, middleware is global.
        // Wait, verifyLink calls direct download which is public. Middleware is on app level.
        // But req.user is mocked in direct().
        // For downloadFolder(), it is protected route, so req.user is real.
        // Wait, downloadFolder has :token, but also authenticateToken middleware?
        // Routes: router.get("/download/folder/:token", authenticateToken, downloadFolder);
        // Yes, it is authenticated.
        
        await req.activityLogger.logFile(req, 'folder_download', relativePath, 0); // Size unknown at log time
    }

  } catch (error) {
    if (error.message === "Path traversal attempt detected") {
      await req.activityLogger.logSecurity(req, 'path_traversal_attempt', {
        filePath: req.params.token || 'unknown_token',
        torrentName: 'folder_download_operation'
      });
      return res.status(403).json({ error: "Invalid path" });
    }
    console.error("Error downloading folder:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to download folder" });
    }
  }
};
// ---------------------------------------------------------------------------
// Ad gate
// ---------------------------------------------------------------------------

// Resolve and validate a path for the ad gate. Returns { safePath, name } or
// throws an Error with a `status` property.
function resolveGateTarget(userId, rawPath, kind) {
  if (!rawPath || typeof rawPath !== "string") {
    const e = new Error("Missing path"); e.status = 400; throw e;
  }
  const userRoot = getUserStorageDir(userId);
  const safePath = validatePath(rawPath, userRoot).split(path.sep).join("/");
  const fullPath = path.resolve(userRoot, safePath);

  if (!safePath || !fs.existsSync(fullPath)) {
    const e = new Error("Not found"); e.status = 404; throw e;
  }
  const stat = fs.statSync(fullPath);
  if (kind === "folder" ? !stat.isDirectory() : !stat.isFile()) {
    const e = new Error(kind === "folder" ? "Path is not a directory" : "Path is not a file");
    e.status = 400; throw e;
  }
  return { safePath, name: path.basename(fullPath) };
}

function issueGateLink(req, { userId, safePath, name, kind, viaAd }) {
  let token;
  if (viaAd) {
    token = signLink(adGate.adLinkPayload(req, { userId, path: safePath, kind }), adGate.linkTtl(kind));
  } else {
    const payload = { path: safePath, userId, asAttachment: kind !== "stream" };
    if (kind === "folder") payload.isFolder = true;
    token = signLink(payload);
  }
  return buildDirectUrl(req, token, kind === "folder" ? `${name}.zip` : name);
}

function handleGateError(req, res, err, op) {
  if (err.message === "Path traversal attempt detected") {
    if (req.activityLogger) {
      req.activityLogger.logSecurity(req, "path_traversal_attempt", {
        filePath: req.body?.path || "unknown",
        torrentName: op,
      }).catch(() => {});
    }
    return res.status(403).json({ error: "Invalid path" });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(`Ad gate ${op} error:`, err);
  return res.status(500).json({ error: "Ad gate error" });
}

// POST /files/ad/start  { path, kind: 'stream' | 'download' | 'folder' }
exports.adStart = async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const userId = req.user.id;
    const kind = req.body?.kind;
    if (!adGate.KINDS.has(kind)) return res.status(400).json({ error: "Invalid kind" });

    const { safePath, name } = resolveGateTarget(userId, req.body?.path, kind);

    // Paid plans and admins skip the ad entirely
    if (adGate.isExemptUser(req.user)) {
      return res.json({ skip: true, url: issueGateLink(req, { userId, safePath, name, kind, viaAd: false }) });
    }

    const result = adGate.startSession(userId, { path: safePath, kind });
    if (result.error) return res.status(result.status).json({ error: result.error });

    res.json({ sessionId: result.sessionId, waitSeconds: result.waitSeconds });
  } catch (err) {
    handleGateError(req, res, err, "ad_start");
  }
};

// POST /files/ad/complete  { sessionId }
exports.adComplete = async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const userId = req.user.id;
    const result = adGate.completeSession(userId, req.body?.sessionId);
    if (result.error) {
      return res.status(result.status).json({ error: result.error, retryAfterMs: result.retryAfterMs });
    }

    const { path: storedPath, kind } = result.session;
    // Re-check: the file may have been deleted while the ad was showing
    const { safePath, name } = resolveGateTarget(userId, storedPath, kind);

    res.json({ url: issueGateLink(req, { userId, safePath, name, kind, viaAd: true }) });
  } catch (err) {
    handleGateError(req, res, err, "ad_complete");
  }
};
