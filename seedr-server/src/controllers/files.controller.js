const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const rangeParser = require("range-parser");
const archiver = require("archiver");
const { signLink, verifyLink } = require("../services/linkSigner");
const { getUserStorageDir, ensureUserStorageDir, updateUserStorageUsage } = require("../utils/storage");
const symlinkHelper = require("../utils/symlinkHelper");

const ROOT = process.env.ROOT || path.resolve(__dirname, "../storage/library");

// Calculate total size of a directory recursively
function calculateDirectorySize(dirPath) {
  let totalSize = 0;
  let fileCount = 0;

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      let stat;
      try {
        stat = fs.statSync(itemPath);
      } catch (e) {
        continue;
      }

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
    const userRoot = ensureUserStorageDir(userId);
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

    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (e) {
      return res.status(404).json({ error: "Directory not found" });
    }
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: "Path is not a directory" });
    }

    const items = fs.readdirSync(fullPath);
    const dirs = [];
    const files = [];

    const tryRepairDanglingSymlink = async (itemPath) => {
      try {
        const lstats = fs.lstatSync(itemPath);
        if (!lstats.isSymbolicLink()) return false;

        const rawTarget = fs.readlinkSync(itemPath);
        if (!rawTarget || path.isAbsolute(rawTarget)) return false;

        const candidateTarget = path.resolve(rawTarget);
        if (!fs.existsSync(candidateTarget)) return false;

        await symlinkHelper.createSymlink(candidateTarget, itemPath);
        return true;
      } catch {
        return false;
      }
    };

    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      let itemStat;
      try {
        itemStat = fs.statSync(itemPath);
      } catch (e) {
        const repaired = await tryRepairDanglingSymlink(itemPath);
        if (!repaired) continue;
        try {
          itemStat = fs.statSync(itemPath);
        } catch {
          continue;
        }
      }
      const relativePath = path.posix.join(safePath, item).replace(/\\/g, "/");

      if (itemStat.isDirectory()) {
        // Calculate directory size and file count
        const sizeInfo = calculateDirectorySize(itemPath);

        // Create download token for the folder
        const downloadToken = signLink({ path: relativePath, asAttachment: true, userId: userId, isFolder: true });
        const baseUrl = process.env.WEB_BASE_URL || `${req.protocol}://${req.get('host')}`;

        dirs.push({
          name: item,
          path: relativePath,
          size: sizeInfo.size,
          fileCount: sizeInfo.files,
          downloadUrl: `${baseUrl}/files/direct/${downloadToken}/${encodeURIComponent(item)}.zip`
        });
      } else {
        const mimeType = mime.lookup(item) || "application/octet-stream";
        const baseUrl = process.env.WEB_BASE_URL || `${req.protocol}://${req.get('host')}`;

        const streamToken = signLink({ path: relativePath, asAttachment: false, userId: userId });
        const downloadToken = signLink({ path: relativePath, asAttachment: true, userId: userId });

        // Encode filename for URL but keep it readable
        const encodedFilename = encodeURIComponent(item);

        files.push({
          name: item,
          path: relativePath,
          size: itemStat.size,
          mime: mimeType,
          streamUrl: `${baseUrl}/files/direct/${streamToken}/${encodedFilename}`,
          downloadUrl: `${baseUrl}/files/direct/${downloadToken}/${encodedFilename}`,
          directUrl: `${baseUrl}/files/direct/${downloadToken}/${encodedFilename}`
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

      // Set response headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Handle archive errors
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to create archive' });
        }
      });

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

    // Log direct link access
    if (req.activityLogger) {
      // Simulate user context for logger since this is a public route
      const mockReq = { ...req, user: { id: payload.userId, username: 'direct_link_user' } };
      await req.activityLogger.log(mockReq, 'direct_link_access', {
        filePath: payload.path,
        torrentName: 'direct_link'
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
      // Remove directory recursively
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      // Remove file
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
        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch (e) {
          return;
        }
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

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

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
