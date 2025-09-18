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
  const { magnet } = req.body || {};
  if (!magnet) {
    console.log('❌ Torrent add failed: No magnet link provided');
    return res.status(400).json({ error: 'magnet is required' });
  }

  const userId = req.user.id;
  console.log('🚀 Starting torrent add process...');
  console.log(`📋 User ID: ${userId}`);
  console.log(`🔗 Magnet link: ${magnet.substring(0, 50)}...`);

  try {
    // Fire-and-forget: kick off torrent add in background
    console.log('⚡ Initiating background torrent addition...');
    addMagnet(magnet, userId).catch((e) => {
      console.error('💥 CRITICAL: addMagnet failed:', e);
      console.error('📊 Error details:', {
        userId,
        magnetPreview: magnet.substring(0, 50),
        errorMessage: e.message,
        errorStack: e.stack
      });
    });

    console.log('✅ Torrent add request accepted and queued');
    return res.status(202).json({
      status: 'accepted',
      message: 'Torrent add started. Will appear in list shortly.',
    });
  } catch (error) {
    console.error('💥 Error in torrent controller:', error);
    console.error('📊 Controller error details:', {
      userId,
      magnetPreview: magnet.substring(0, 50),
      errorMessage: error.message,
      errorStack: error.stack
    });
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
  const userId = req.user.id;
  const t = await getTorrent(req.params.id, userId);
  if (!t) {
    return res.status(404).json({ error: 'not found' });
  }

  const files = t.files.map((f, i) => {
    const streamToken = signLink(
      makeDirectLinkPayload({ torrentId: t.infoHash, fileIndex: i, userId: req.user.id, asAttachment: false })
    );
    const downloadToken = signLink(
      makeDirectLinkPayload({ torrentId: t.infoHash, fileIndex: i, userId: req.user.id, asAttachment: true })
    );

    return {
      index: i,
      name: f.name,
      length: f.length,
      streamUrl: `${BASE}/direct/${streamToken}`,
      downloadUrl: `${BASE}/direct/${downloadToken}`,
      directUrl: `${BASE}/direct/${downloadToken}`, // signed expiring download link
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
