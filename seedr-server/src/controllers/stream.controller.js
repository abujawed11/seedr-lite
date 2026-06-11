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

//   const stream = fs.createReadStream(file.path, { start, end });
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
const fs = require('fs');
const rangeParser = require('range-parser');
const mime = require('mime-types');
const { getTorrent } = require('../services/torrentManager');
const { verifyLink } = require('../services/linkSigner');
const database = require('../models/database');
const streamRegistry = require('../utils/streamRegistry');

async function streamFile(req, res, { torrentId, fileIndex, asAttachment = false }) {
  // getTorrent is async now — await it
  // Pass user ID to ensure users can only access their own torrents (if authenticated)
  const userId = req.user?.id;
  const t = await getTorrent(torrentId, userId);
  if (!t) return res.status(404).json({ error: 'torrent not found' });

  const idx = Number(fileIndex);
  const file = t.files?.[idx];
  if (!file) return res.status(404).json({ error: 'file not found' });

  // aria2 downloads to disk — verify the file exists before streaming
  if (!file.path || !fs.existsSync(file.path)) {
    return res.status(404).json({ error: 'File not yet available on disk' });
  }

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

  const stream = fs.createReadStream(file.path, { start, end });

  streamRegistry.register(file.path, stream);
  const unregister = () => streamRegistry.unregister(file.path, stream);
  stream.once('close', unregister);
  stream.once('error', unregister);

  // Release the file descriptor immediately on client disconnect.
  req.on('close', () => stream.destroy());

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
