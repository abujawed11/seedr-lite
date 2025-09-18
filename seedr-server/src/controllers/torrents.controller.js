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
 * Requires authentication - torrents are user-specific.
 */
exports.create = async (req, res) => {
  console.log('=== TORRENT CREATE REQUEST ===');
  console.log('Request body:', req.body);
  console.log('User:', req.user);

  const { magnet } = req.body || {};
  if (!magnet) {
    console.log('ERROR: No magnet provided');
    return res.status(400).json({ error: 'magnet is required' });
  }

  const userId = req.user.id;
  console.log('Adding torrent for user:', userId);

  try {
    // Fire-and-forget: kick off torrent add in background
    console.log('Starting addMagnet...');
    addMagnet(magnet, userId).catch((e) => console.error('addMagnet failed:', e));

    console.log('Torrent add request accepted');
    return res.status(202).json({
      status: 'accepted',
      message: 'Torrent add started. Will appear in list shortly.',
    });
  } catch (error) {
    console.error('Error starting torrent:', error);
    return res.status(500).json({ error: 'Failed to start torrent' });
  }
};

/**
 * GET /api/torrents
 * Returns a list of all torrents for the authenticated user.
 */
exports.index = async (req, res) => {
  const userId = req.user.id;
  const items = await listTorrents(userId);
  res.json(items);
};

/**
 * GET /api/torrents/:id
 * Returns details + file URLs for a specific torrent.
 * Only shows torrents owned by the authenticated user.
 */
exports.show = async (req, res) => {
  const t = await getTorrent(req.params.id);
  if (!t) {
    return res.status(404).json({ error: 'not found' });
  }

  // Check if user owns this torrent
  if (t.userId && t.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied - not your torrent' });
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
