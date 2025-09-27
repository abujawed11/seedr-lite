const {
  addMagnet,
  listTorrents,
  getTorrent,
  stopTorrent,
  removeTorrent,
} = require('../services/torrentManager');

const { getTorrentMetadata } = require('../services/torrentMetadata');
const { signLink, makeDirectLinkPayload } = require('../services/linkSigner');
const { humanBytes, checkStorageAvailable } = require('../utils/storage');
const database = require('../models/database');

const BASE = process.env.WEB_BASE_URL || 'http://localhost:5000';

/**
 * Atomically reserve storage space for a user
 * @param {string} userId - User ID
 * @param {number} sizeBytes - Size to reserve in bytes
 * @returns {Promise<Object>} - Result with success flag and quota info
 */
async function reserveStorageSpace(userId, sizeBytes) {
  return new Promise((resolve, reject) => {
    database.db.serialize(() => {
      database.db.run('BEGIN TRANSACTION');

      // Get current user storage info with row lock
      database.db.get(
        'SELECT storage_used, storage_quota, remaining_quota FROM users WHERE id = ? FOR UPDATE',
        [userId],
        (err, row) => {
          if (err) {
            database.db.run('ROLLBACK');
            return reject(new Error(`Failed to get user storage info: ${err.message}`));
          }

          if (!row) {
            database.db.run('ROLLBACK');
            return reject(new Error('User not found'));
          }

          const { storage_used, storage_quota, remaining_quota } = row;

          // Check if user has enough remaining quota
          if (remaining_quota < sizeBytes) {
            database.db.run('ROLLBACK');
            return resolve({
              success: false,
              reason: 'QUOTA_EXCEEDED',
              quotaInfo: {
                currentUsage: storage_used,
                quota: storage_quota,
                remainingQuota: remaining_quota,
                requested: sizeBytes
              }
            });
          }

          // Reserve the space by incrementing used_bytes
          const newUsedBytes = storage_used + sizeBytes;
          const newRemainingQuota = storage_quota - newUsedBytes;

          database.db.run(
            'UPDATE users SET storage_used = ?, remaining_quota = ? WHERE id = ?',
            [newUsedBytes, newRemainingQuota, userId],
            function(updateErr) {
              if (updateErr) {
                database.db.run('ROLLBACK');
                return reject(new Error(`Failed to reserve storage: ${updateErr.message}`));
              }

              database.db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  return reject(new Error(`Failed to commit reservation: ${commitErr.message}`));
                }

                resolve({
                  success: true,
                  quotaInfo: {
                    currentUsage: newUsedBytes,
                    quota: storage_quota,
                    remainingQuota: newRemainingQuota,
                    reserved: sizeBytes
                  }
                });
              });
            }
          );
        }
      );
    });
  });
}

/**
 * POST /api/torrents
 * Body: { magnet: "magnet:?xt=urn:btih:..." }
 *
 * Strict quota-first torrent add flow:
 * 1. Fetch metadata without downloading pieces
 * 2. Check quota and atomically reserve space
 * 3. Only then start downloading
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
  console.log('[STRICT ADD] Starting strict quota-first torrent add');
  console.log(`[STRICT ADD] User ID: ${userId}`);

  if (magnet) {
    console.log(`[STRICT ADD] Magnet: ${magnet.substring(0, 60)}...`);
  }
  if (torrentFile) {
    console.log(`[STRICT ADD] Torrent file: ${torrentFile.originalname} (${torrentFile.size} bytes)`);
  }

  try {
    let magnetToUse = magnet;
    let metadata;

    // Handle torrent file conversion
    if (torrentFile) {
      try {
        console.log('[STRICT ADD] Converting torrent file to magnet');
        const parseTorrent = (await import('parse-torrent')).default;
        const parsed = parseTorrent(torrentFile.buffer);
        magnetToUse = parseTorrent.toMagnetURI(parsed);

        // For torrent files, we can get metadata directly
        metadata = {
          infoHash: parsed.infoHash,
          name: parsed.name || 'Unknown',
          sizeBytes: parsed.length || 0,
          files: (parsed.files || []).map((file, index) => ({
            index,
            name: file.name,
            path: file.path,
            length: file.length
          }))
        };
        console.log(`[STRICT ADD] Got metadata from torrent file: ${metadata.name} (${humanBytes(metadata.sizeBytes)})`);
      } catch (error) {
        console.error('[STRICT ADD] Error processing torrent file:', error);
        return res.status(400).json({
          error: 'Invalid torrent file',
          details: error.message
        });
      }
    } else {
      // For magnet links, fetch metadata first
      console.log('[STRICT ADD] Fetching metadata for magnet');
      try {
        metadata = await getTorrentMetadata(magnetToUse, {
          timeoutMs: 10000 // 10 second timeout
        });
        console.log(`[INSPECT OK] ${metadata.name}, size=${humanBytes(metadata.sizeBytes)}, files=${metadata.files.length}`);
      } catch (error) {
        console.log(`[INSPECT FAILED] ${error.message}`);

        if (error.message.includes('timeout')) {
          return res.status(422).json({
            error: 'Could not fetch torrent information within timeout. Try again or use a different magnet.',
            code: 'METADATA_TIMEOUT'
          });
        }

        return res.status(422).json({
          error: 'Could not fetch torrent metadata',
          code: 'METADATA_FETCH_FAILED',
          details: error.message
        });
      }
    }

    // Get user's current quota info
    console.log('[QUOTA CHECK] Checking remaining quota');
    const userInfo = await database.getUserStorageInfo(userId);
    if (!userInfo) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log(`[QUOTA CHECK] User has ${humanBytes(userInfo.remaining_quota)} remaining, torrent needs ${humanBytes(metadata.sizeBytes)}`);

    // Check if torrent fits in remaining quota
    if (metadata.sizeBytes > userInfo.remaining_quota) {
      console.log('[QUOTA REJECT] size>remaining');
      return res.status(403).json({
        error: `Quota exceeded. Torrent "${metadata.name}" requires ${humanBytes(metadata.sizeBytes)} but you only have ${humanBytes(userInfo.remaining_quota)} remaining.`,
        code: 'QUOTA_EXCEEDED',
        details: {
          torrentName: metadata.name,
          required: humanBytes(metadata.sizeBytes),
          remaining: humanBytes(userInfo.remaining_quota),
          currentUsage: humanBytes(userInfo.storage_used),
          quota: humanBytes(userInfo.storage_quota)
        }
      });
    }

    // Atomically reserve the storage space
    console.log(`[RESERVE] Attempting to reserve ${humanBytes(metadata.sizeBytes)}`);
    const reservation = await reserveStorageSpace(userId, metadata.sizeBytes);

    if (!reservation.success) {
      console.log('[RESERVE FAILED] Concurrent quota check failed');
      return res.status(403).json({
        error: 'Quota exceeded (concurrent check)',
        code: 'QUOTA_EXCEEDED',
        details: {
          torrentName: metadata.name,
          required: humanBytes(metadata.sizeBytes),
          remaining: humanBytes(reservation.quotaInfo.remainingQuota),
          currentUsage: humanBytes(reservation.quotaInfo.currentUsage),
          quota: humanBytes(reservation.quotaInfo.quota)
        }
      });
    }

    console.log(`[RESERVE OK] bytes=${humanBytes(metadata.sizeBytes)}`);

    // Now we can safely start the download
    console.log(`[START DOWNLOAD] infoHash=${metadata.infoHash} path=user storage`);

    // Start torrent download in background
    addMagnet(magnetToUse, userId).catch((e) => {
      console.error('💥 CRITICAL: addMagnet failed after reservation:', e);
      console.error('📊 Error details:', {
        userId,
        infoHash: metadata.infoHash,
        magnetPreview: magnetToUse.substring(0, 50),
        errorMessage: e.message,
        errorStack: e.stack
      });
      // TODO: Consider rolling back the reservation on failure
    });

    console.log('✅ Strict torrent add completed successfully');

    return res.status(202).json({
      status: 'accepted',
      message: 'Torrent quota validated and download started',
      torrent: {
        infoHash: metadata.infoHash,
        name: metadata.name,
        sizeBytes: metadata.sizeBytes,
        files: metadata.files.length
      },
      quota: {
        reserved: humanBytes(metadata.sizeBytes),
        remaining: humanBytes(reservation.quotaInfo.remainingQuota),
        currentUsage: humanBytes(reservation.quotaInfo.currentUsage)
      }
    });

  } catch (error) {
    console.error('💥 Error in strict torrent controller:', error);
    console.error('📊 Controller error details:', {
      userId,
      inputType: torrentFile ? 'file' : 'magnet',
      errorMessage: error.message,
      errorStack: error.stack
    });
    return res.status(500).json({
      error: 'Failed to process torrent request',
      code: 'INTERNAL_ERROR'
    });
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

/**
 * POST /api/torrents/inspect
 * Body: { magnet: "magnet:?xt=urn:btih:..." }
 *
 * Inspects a torrent magnet to get metadata (name, size, files) without downloading any pieces.
 * Used for quota checking before actually adding the torrent.
 */
exports.inspect = async (req, res) => {
  const { magnet } = req.body || {};

  if (!magnet || typeof magnet !== 'string') {
    return res.status(400).json({
      error: 'Magnet URI is required',
      code: 'INVALID_INPUT'
    });
  }

  const userId = req.user.id;
  console.log(`[INSPECT] Starting metadata inspection for user ${userId}`);
  console.log(`[INSPECT] Magnet: ${magnet.substring(0, 60)}...`);

  try {
    // Fetch metadata without downloading pieces
    const metadata = await getTorrentMetadata(magnet, {
      timeoutMs: 10000 // 10 second timeout for inspect
    });

    console.log(`[INSPECT OK] ${metadata.name}, size=${humanBytes(metadata.sizeBytes)}, files=${metadata.files.length}`);

    return res.status(200).json({
      infoHash: metadata.infoHash,
      name: metadata.name,
      sizeBytes: metadata.sizeBytes,
      files: metadata.files
    });

  } catch (error) {
    console.log(`[INSPECT FAILED] ${error.message}`);

    // Different error types for better UX
    if (error.message.includes('timeout')) {
      return res.status(422).json({
        error: 'Could not fetch torrent information within timeout. Try again or use a different magnet.',
        code: 'METADATA_TIMEOUT',
        details: 'The torrent metadata could not be retrieved within the time limit'
      });
    }

    if (error.message.includes('Invalid magnet')) {
      return res.status(422).json({
        error: 'Invalid magnet URI format',
        code: 'INVALID_MAGNET',
        details: error.message
      });
    }

    return res.status(422).json({
      error: 'Could not fetch torrent metadata',
      code: 'METADATA_FETCH_FAILED',
      details: error.message
    });
  }
};