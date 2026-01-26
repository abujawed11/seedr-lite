// const rangeParser = require('range-parser');
// const mime = require('mime-types');
// const jwt = require('jsonwebtoken');
// const { getTorrent } = require('../services/torrentManager');
// const { verifyLink } = require('../services/linkSigner');

// function streamFile(req, res, { torrentId, fileIndex, asAttachment = false }) {
//   const t = getTorrent(torrentId);
//   if (!t) return res.status(404).json({ error: 'torrent not found' });
//   const file = t.files[Number(fileIndex)];
//   if (!file) return res.status(404).json({ error: 'file not found' });

//   const total = file.length;
//   const type = mime.lookup(file.name) || 'application/octet-stream';
//   const range = req.headers.range ? rangeParser(total, req.headers.range) : -1;

//   res.setHeader('Accept-Ranges', 'bytes');
//   res.setHeader('Content-Type', type);

//   if (asAttachment) {
//     res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
//   }

//   if (range === -1 || range === -2) {
//     // no/invalid range → send full
//     res.setHeader('Content-Length', total);
//     const stream = file.createReadStream();
//     stream.on('error', (e) => res.destroy(e));
//     stream.pipe(res);
//     return;
//   }

//   // single range
//   const { start, end } = range[0];
//   const chunkSize = (end - start) + 1;

//   res.status(206);
//   res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
//   res.setHeader('Content-Length', chunkSize);

//   const stream = file.createReadStream({ start, end });
//   stream.on('error', (e) => res.destroy(e));
//   stream.pipe(res);
// }

// exports.stream = (req, res) => {
//   streamFile(req, res, { torrentId: req.params.id, fileIndex: req.params.fileIndex, asAttachment: false });
// };

// exports.download = (req, res) => {
//   streamFile(req, res, { torrentId: req.params.id, fileIndex: req.params.fileIndex, asAttachment: true });
// };

// exports.direct = (req, res) => {
//   try {
//     const payload = verifyLink(req.params.token);
//     streamFile(req, res, payload);
//   } catch (e) {
//     return res.status(401).json({ error: 'invalid or expired link' });
//   }
// };





// src/controllers/stream.controller.js
const rangeParser = require('range-parser');
const mime = require('mime-types');
const { getTorrent } = require('../services/torrentManager');
const { verifyLink } = require('../services/linkSigner');
const database = require('../models/database');
const r2Storage = require('../services/r2Storage');
const cacheManager = require('../services/cacheManager');

async function streamFile(req, res, { torrentId, fileIndex, asAttachment = false }) {
  // getTorrent is async now — await it
  // Pass user ID to ensure users can only access their own torrents (if authenticated)
  const userId = req.user?.id;
  const t = await getTorrent(torrentId, userId);
  if (!t) return res.status(404).json({ error: 'torrent not found' });

  const idx = Number(fileIndex);
  const file = t.files?.[idx];
  if (!file) return res.status(404).json({ error: 'file not found' });

  const total = file.length;
  const type = mime.lookup(file.name) || 'application/octet-stream';

  // Default: full content
  let start = 0;
  let end = total - 1;
  let status = 200;

  // Parse Range header (robustly)
  if (req.headers.range) {
    const ranges = rangeParser(total, req.headers.range);
    if (Array.isArray(ranges) && ranges.length > 0 && ranges.type === 'bytes') {
      start = ranges[0].start;
      end = ranges[0].end;
      status = 206;
    }
  }

  const chunkSize = (end - start) + 1;

  res.status(status);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Length', chunkSize);

  // CORS headers for media streaming
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

  if (status === 206) {
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
  }

  // Always set Content-Disposition header to help media players identify the filename
  if (asAttachment) {
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  } else {
    // For streaming, use 'inline' disposition but still include filename
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  }

  const stream = file.createReadStream({ start, end });
  stream.on('error', (e) => {
    console.error('stream error:', e);
    if (!res.headersSent) res.status(500).json({ error: 'stream error' });
    else res.destroy(e);
  });
  stream.pipe(res);

  // Log activity: file stream/download (only log once per request, not for range requests)
  if (!req.headers.range && userId) {
    try {
      const user = await database.getUserById(userId);
      const clientIp = req.ip || req.connection?.remoteAddress || 'Unknown';
      const userAgent = req.get('user-agent') || 'Unknown';

      await database.logActivity({
        userId,
        username: user?.username || 'Unknown',
        actionType: asAttachment ? 'file_download' : 'file_stream',
        torrentName: t.name,
        torrentHash: torrentId,
        magnetLink: null,
        filePath: file.name,
        fileSize: total,
        ipAddress: clientIp,
        userAgent
      });
      console.log(`📝 Activity logged: ${asAttachment ? 'file_download' : 'file_stream'} by ${user?.username || userId}`);
    } catch (logError) {
      console.error('⚠️ Failed to log activity:', logError);
      // Don't fail the request if logging fails
    }
  }
}

exports.stream = async (req, res) => {
  await streamFile(req, res, {
    torrentId: req.params.id,
    fileIndex: req.params.fileIndex,
    asAttachment: false
  });
};

exports.download = async (req, res) => {
  await streamFile(req, res, {
    torrentId: req.params.id,
    fileIndex: req.params.fileIndex,
    asAttachment: true
  });
};

exports.direct = async (req, res) => {
  try {
    const payload = verifyLink(req.params.token); // { torrentId, fileIndex, asAttachment?, userId? }

    // For direct links, we need to simulate the user context
    if (payload.userId) {
      req.user = { id: payload.userId };
    }

    await streamFile(req, res, payload);
  } catch (e) {
    return res.status(401).json({ error: 'invalid or expired link' });
  }
};

/**
 * Stream a file from R2 cloud storage
 * Route: GET /r2-stream/:infoHash/:filePath(*)
 */
async function streamFromR2(req, res, { infoHash, filePath, asAttachment = false }) {
  try {
    // Check if R2 is available
    if (!r2Storage.isAvailable()) {
      r2Storage.initialize();
      if (!r2Storage.isAvailable()) {
        return res.status(503).json({ error: 'R2 Storage is not available' });
      }
    }

    // Get file info from database
    const fileInfo = await r2Storage.getR2FileInfo(infoHash, filePath);
    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found in R2' });
    }

    const total = fileInfo.file_size;
    const type = fileInfo.mime_type || mime.lookup(fileInfo.file_name) || 'application/octet-stream';

    // Default: full content
    let start = 0;
    let end = total - 1;
    let status = 200;
    let range = null;

    // Parse Range header
    if (req.headers.range) {
      const ranges = rangeParser(total, req.headers.range);
      if (Array.isArray(ranges) && ranges.length > 0 && ranges.type === 'bytes') {
        start = ranges[0].start;
        end = ranges[0].end;
        status = 206;
        range = { start, end };
      }
    }

    const chunkSize = (end - start) + 1;

    // Get stream from R2
    const r2Response = await r2Storage.getObjectStream(fileInfo.r2_object_key, range);

    res.status(status);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Length', chunkSize);

    // CORS headers for media streaming
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

    if (status === 206) {
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    }

    // Set Content-Disposition
    if (asAttachment) {
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileInfo.file_name)}`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileInfo.file_name)}`);
    }

    // Pipe R2 stream to response
    r2Response.stream.on('error', (e) => {
      console.error('R2 stream error:', e);
      if (!res.headersSent) res.status(500).json({ error: 'R2 stream error' });
      else res.destroy(e);
    });

    r2Response.stream.pipe(res);

    // Log activity
    const userId = req.user?.id;
    if (!req.headers.range && userId) {
      try {
        const user = await database.getUserById(userId);
        const clientIp = req.ip || req.connection?.remoteAddress || 'Unknown';
        const userAgent = req.get('user-agent') || 'Unknown';

        await database.logActivity({
          userId,
          username: user?.username || 'Unknown',
          actionType: asAttachment ? 'r2_download' : 'r2_stream',
          torrentName: null,
          torrentHash: infoHash,
          magnetLink: null,
          filePath: filePath,
          fileSize: total,
          ipAddress: clientIp,
          userAgent
        });
      } catch (logError) {
        console.error('Failed to log R2 activity:', logError);
      }
    }
  } catch (error) {
    console.error('R2 streaming error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream from R2' });
    }
  }
}

exports.r2Stream = async (req, res) => {
  const { infoHash } = req.params;
  let filePath = req.params[0] || req.params.filePath; // Handle wildcard route
  
  // Express 5 / path-to-regexp v6 might return wildcards as arrays
  if (Array.isArray(filePath)) filePath = filePath.join('/');

  await streamFromR2(req, res, { infoHash, filePath, asAttachment: false });
};

exports.r2Download = async (req, res) => {
  const { infoHash } = req.params;
  let filePath = req.params[0] || req.params.filePath;
  
  if (Array.isArray(filePath)) filePath = filePath.join('/');

  await streamFromR2(req, res, { infoHash, filePath, asAttachment: true });
};

/**
 * Stream from cache - tries local first, then R2
 * This is the unified streaming endpoint that handles both local and R2 files
 */
exports.streamFromCache = async (req, res) => {
  const { infoHash, fileIndex } = req.params;
  const asAttachment = req.query.download === 'true';
  const userId = req.user?.id;

  try {
    // First check if cache exists
    const cache = await cacheManager.getCacheEntry(infoHash);
    if (!cache) {
      return res.status(404).json({ error: 'Cache not found' });
    }

    // Check if user has access to this cache
    if (userId) {
      const userLink = await cacheManager.getUserLink(userId, infoHash);
      if (!userLink) {
        return res.status(403).json({ error: 'Access denied to this cache' });
      }
    }

    // If R2 uploaded, stream from R2
    if (cache.r2_uploaded === 1) {
      // Get R2 files for this torrent
      const r2Files = await r2Storage.getTorrentR2Files(infoHash);

      if (r2Files.length === 0) {
        return res.status(404).json({ error: 'No files in R2' });
      }

      // If fileIndex is provided, get that specific file
      const file = fileIndex !== undefined ? r2Files[parseInt(fileIndex)] : r2Files[0];

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      await streamFromR2(req, res, {
        infoHash,
        filePath: file.file_path,
        asAttachment
      });
    } else {
      // Stream from local/webtorrent
      // Try to get active torrent
      const t = await getTorrent(infoHash, userId);
      if (t) {
        // Stream from WebTorrent
        await streamFile(req, res, {
          torrentId: infoHash,
          fileIndex: fileIndex || 0,
          asAttachment
        });
      } else {
        return res.status(404).json({
          error: 'Torrent not active and not in R2',
          suggestion: 'Wait for download to complete or upload to R2'
        });
      }
    }
  } catch (error) {
    console.error('Cache stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream from cache' });
    }
  }
};

/**
 * Get presigned URL for R2 file (for direct client access)
 */
exports.getR2PresignedUrl = async (req, res) => {
  const { infoHash } = req.params;
  let filePath = req.params[0] || req.params.filePath;
  const expiresIn = parseInt(req.query.expiresIn) || 3600;

  if (Array.isArray(filePath)) filePath = filePath.join('/');

  try {
    if (!r2Storage.isAvailable()) {
      return res.status(503).json({ error: 'R2 Storage is not available' });
    }

    // Get file info
    const fileInfo = await r2Storage.getR2FileInfo(infoHash, filePath);
    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found in R2' });
    }

    const url = await r2Storage.getPresignedUrl(fileInfo.r2_object_key, expiresIn);

    res.json({
      url,
      expiresIn,
      fileName: fileInfo.file_name,
      fileSize: fileInfo.file_size
    });
  } catch (error) {
    console.error('Presigned URL error:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
};
