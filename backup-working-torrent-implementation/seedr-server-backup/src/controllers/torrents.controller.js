const {
  addMagnet,
  listTorrents,
  getTorrent,
  stopTorrent,
  removeTorrent,
} = require('../services/torrentManager');

const { signLink, makeDirectLinkPayload } = require('../services/linkSigner');

const BASE = process.env.WEB_BASE_URL || 'http://localhost:5000';

/**
 * POST /api/torrents
 * Body: { magnet: "magnet:?xt=urn:btih:..." }
 *
 * Adds a torrent in the background and responds immediately.
 */
exports.create = async (req, res) => {
  const { magnet } = req.body || {};
  if (!magnet) {
    return res.status(400).json({ error: 'magnet is required' });
  }

  // Fire-and-forget: don’t await, just kick off torrent add
  addMagnet(magnet).catch((e) => console.error('addMagnet failed:', e));

  return res.status(202).json({
    status: 'accepted',
    message: 'Torrent add started. Poll GET /api/torrents or /api/torrents/:id until ready.',
  });
};

/**
 * GET /api/torrents
 * Returns a list of all torrents with basic info.
 */
exports.index = async (_req, res) => {
  const items = await listTorrents();
  res.json(items);
};

/**
 * GET /api/torrents/:id
 * Returns details + file URLs for a specific torrent.
 */
exports.show = async (req, res) => {
  const t = await getTorrent(req.params.id);
  if (!t) {
    return res.status(404).json({ error: 'not found' });
  }

  const files = t.files.map((f, i) => {
    const token = signLink(
      makeDirectLinkPayload({ torrentId: t.infoHash, fileIndex: i })
    );

    return {
      index: i,
      name: f.name,
      length: f.length,
      streamUrl: `${BASE}/stream/${t.infoHash}/${i}`,
      downloadUrl: `${BASE}/download/${t.infoHash}/${i}`,
      directUrl: `${BASE}/direct/${token}`, // signed expiring link
    };
  });

  res.json({
    id: t.infoHash,
    name: t.name,
    done: t.done,
    files,
  });
};


/**
 * PUT /api/torrents/:id/stop
 * Stops a torrent (removes from client but keeps files).
 */
exports.stop = async (req, res) => {
  const ok = await stopTorrent(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  res.json({ stopped: true });
};

/**
 * DELETE /api/torrents/:id
 * Stops and removes a torrent.
 */
exports.destroy = async (req, res) => {
  try {
    const ok = await removeTorrent(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'Torrent not found' });
    }
    res.json({ removed: ok });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
