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
  if (status === 206) {
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
  }
  if (asAttachment) {
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  }

  const stream = file.createReadStream({ start, end });
  stream.on('error', (e) => {
    console.error('stream error:', e);
    if (!res.headersSent) res.status(500).json({ error: 'stream error' });
    else res.destroy(e);
  });
  stream.pipe(res);
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
