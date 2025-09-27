const {
  addMagnet,
  listTorrents,
  getTorrent,
  stopTorrent,
  removeTorrent,
} = require('../services/torrentManager');

const { signLink, makeDirectLinkPayload } = require('../services/linkSigner');
const { checkQuotaBeforeAddingTorrent, humanBytes } = require('../utils/storage');

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
  const torrentFile = req.file; // For uploaded .torrent files

  // Validate input - need either magnet link or torrent file
  if (!magnet && !torrentFile) {
    console.log('❌ Torrent add failed: No magnet link or torrent file provided');
    return res.status(400).json({
      error: 'Either magnet link or torrent file is required',
      acceptedFormats: 'magnet link (string) or .torrent file upload'
    });
  }

  const userId = req.user.id;
  console.log('🚀 Starting torrent add process...');
  console.log(`📋 User ID: ${userId}`);

  if (magnet) {
    console.log(`🔗 Magnet link: ${magnet.substring(0, 50)}...`);
  }
  if (torrentFile) {
    console.log(`📁 Torrent file: ${torrentFile.originalname} (${torrentFile.size} bytes)`);
  }

  try {
    // Determine input type for quota checking
    const input = torrentFile ? torrentFile.buffer : magnet;
    const inputType = torrentFile ? 'torrent_file' : 'magnet_link';

    // Check quota before adding torrent using improved detection
    console.log(`🔍 Checking user quota before adding torrent (input: ${inputType})...`);
    const quotaCheck = await checkQuotaBeforeAddingTorrent(userId, input, {
      timeoutMs: 20000 // 20 second timeout for size detection
    });

    if (!quotaCheck.canAdd) {
      console.log('❌ Torrent add rejected: Insufficient quota');
      const quotaInfo = quotaCheck.quotaInfo;

      let errorMessage = 'Insufficient storage space to add this torrent.';
      let details = {};

      // Only add quota details if quotaInfo exists (for actual quota checks)
      if (quotaInfo) {
        details.currentUsage = humanBytes(quotaInfo.currentUsage);
        details.availableSpace = humanBytes(quotaInfo.availableSpace);
        details.quota = humanBytes(quotaInfo.quota);
      }

      if (quotaCheck.sizeDetected && quotaCheck.detectedSize) {
        details.detectedTorrentSize = humanBytes(quotaCheck.detectedSize);
        details.torrentName = quotaCheck.torrentName;
        details.detectionMethod = quotaCheck.detectionMethod;
        details.required = humanBytes(quotaCheck.detectedSize);
        errorMessage = `Insufficient storage space. Torrent "${quotaCheck.torrentName}" requires ${humanBytes(quotaCheck.detectedSize)} but you only have ${quotaInfo ? humanBytes(quotaInfo.availableSpace) : 'insufficient space'} available.`;
      } else if (quotaCheck.sizeDetectionFailed) {
        details.detectionError = quotaCheck.detectionError;
        details.appliedPolicy = quotaCheck.appliedPolicy;

        if (quotaCheck.minRequiredSpace) {
          details.minimumRequired = humanBytes(quotaCheck.minRequiredSpace);
        }

        if (quotaCheck.failureType === 'torrent_file_invalid') {
          errorMessage = 'Invalid torrent file: ' + quotaCheck.detectionError;
        } else if (quotaCheck.appliedPolicy === 'unknown_magnet') {
          errorMessage = quotaCheck.detectionError; // Use the detailed error message
        } else if (quotaCheck.appliedPolicy === 'conservative') {
          errorMessage = 'Cannot add torrent: Storage quota is nearly full and torrent size could not be detected reliably. ' + (quotaCheck.suggestion || '');
        } else {
          errorMessage = 'Cannot add torrent: Storage quota is insufficient and torrent size could not be detected.';
        }

        if (quotaCheck.suggestion) {
          details.suggestion = quotaCheck.suggestion;
        }

        if (quotaCheck.policyReason) {
          details.policyReason = quotaCheck.policyReason;
        }
      }

      return res.status(413).json({
        error: errorMessage,
        code: 'QUOTA_EXCEEDED',
        details
      });
    }

    console.log('✅ Quota check passed. Proceeding with torrent addition...');

    let logDetails = {};
    if (quotaCheck.sizeDetected && quotaCheck.detectedSize) {
      console.log(`📏 Detected torrent size: ${humanBytes(quotaCheck.detectedSize)} using ${quotaCheck.detectionMethod}`);
      console.log(`📋 Torrent name: ${quotaCheck.torrentName}`);
      logDetails.detectedSize = humanBytes(quotaCheck.detectedSize);
      logDetails.torrentName = quotaCheck.torrentName;
      logDetails.detectionMethod = quotaCheck.detectionMethod;
    } else {
      console.log('⚠️ Torrent size could not be detected, but user has sufficient free space');
    }

    // Convert torrent file to magnet if needed
    let magnetToUse = magnet;
    if (torrentFile && !magnet) {
      try {
        const parseTorrent = (await import('parse-torrent')).default;
        const parsed = parseTorrent(torrentFile.buffer);
        magnetToUse = parseTorrent.toMagnetURI(parsed);
        console.log('🔄 Converted torrent file to magnet link');
      } catch (error) {
        console.error('💥 Error converting torrent file to magnet:', error);
        return res.status(400).json({
          error: 'Invalid torrent file',
          details: error.message
        });
      }
    }

    // Fire-and-forget: kick off torrent add in background
    console.log('⚡ Initiating background torrent addition...');
    addMagnet(magnetToUse, userId).catch((e) => {
      console.error('💥 CRITICAL: addMagnet failed:', e);
      console.error('📊 Error details:', {
        userId,
        magnetPreview: magnetToUse.substring(0, 50),
        errorMessage: e.message,
        errorStack: e.stack
      });
    });

    console.log('✅ Torrent add request accepted and queued');

    let responseData = {
      status: 'accepted',
      message: 'Torrent add started. Will appear in list shortly.',
      inputType
    };

    // Add detected information to response
    if (quotaCheck.sizeDetected && quotaCheck.detectedSize) {
      responseData.detectedSize = humanBytes(quotaCheck.detectedSize);
      responseData.torrentName = quotaCheck.torrentName;
      responseData.detectionMethod = quotaCheck.detectionMethod;
      responseData.sizeReliable = true;
    } else if (quotaCheck.sizeDetectionFailed) {
      responseData.warning = 'Torrent size could not be detected reliably. Monitor your quota usage carefully.';
      responseData.sizeReliable = false;
    }

    // Handle warnings from unknown magnet policy
    if (quotaCheck.warning) {
      responseData.warning = quotaCheck.warning;
      responseData.sizeReliable = quotaCheck.reliable || false;
    }

    return res.status(202).json(responseData);
  } catch (error) {
    console.error('💥 Error in torrent controller:', error);
    console.error('📊 Controller error details:', {
      userId,
      inputType: torrentFile ? 'file' : 'magnet',
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

    // Encode filename for URL but keep it readable
    const encodedFilename = encodeURIComponent(f.name);

    return {
      index: i,
      name: f.name,
      length: f.length,
      streamUrl: `${BASE}/direct/${streamToken}/${encodedFilename}`,
      downloadUrl: `${BASE}/direct/${downloadToken}/${encodedFilename}`,
      directUrl: `${BASE}/direct/${downloadToken}/${encodedFilename}`, // signed expiring download link
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
