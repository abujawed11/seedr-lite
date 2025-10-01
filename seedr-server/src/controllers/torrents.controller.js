// const {
//   addMagnet,
//   listTorrents,
//   getTorrent,
//   stopTorrent,
//   removeTorrent,
// } = require('../services/torrentManager');

// const { getTorrentMetadata } = require('../services/torrentMetadata');
// const { signLink, makeDirectLinkPayload } = require('../services/linkSigner');
// const { humanBytes, checkStorageAvailable } = require('../utils/storage');
// const database = require('../models/database');

// const BASE = process.env.WEB_BASE_URL || 'http://localhost:5000';

// /**
//  * Atomically reserve storage space for a user using the reservation system
//  * @param {string} userId - User ID
//  * @param {string} infoHash - Torrent info hash
//  * @param {number} sizeBytes - Size to reserve in bytes
//  * @returns {Promise<Object>} - Result with success flag and quota info
//  */
// async function reserveStorageSpace(userId, infoHash, sizeBytes) {
//   try {
//     // Check quota including existing reservations
//     const quotaCheck = await database.checkUserQuotaWithReservations(userId, sizeBytes);

//     if (!quotaCheck.hasSpace) {
//       return {
//         success: false,
//         reason: 'QUOTA_EXCEEDED',
//         quotaInfo: {
//           currentUsage: quotaCheck.quotaInfo.storageUsed,
//           quota: quotaCheck.quotaInfo.storageQuota,
//           totalReserved: quotaCheck.quotaInfo.totalReserved,
//           effectiveRemaining: quotaCheck.quotaInfo.effectiveRemaining,
//           requested: sizeBytes
//         }
//       };
//     }

//     // Create the reservation
//     const reservation = await database.createReservation(userId, infoHash, sizeBytes);

//     // Get updated quota info after reservation
//     const updatedQuotaInfo = await database.getUserStorageInfoWithReservations(userId);

//     return {
//       success: true,
//       quotaInfo: {
//         currentUsage: updatedQuotaInfo.storageUsed,
//         quota: updatedQuotaInfo.storageQuota,
//         totalReserved: updatedQuotaInfo.totalReserved,
//         effectiveRemaining: updatedQuotaInfo.effectiveRemaining,
//         reserved: sizeBytes
//       }
//     };

//   } catch (error) {
//     throw new Error(`Failed to reserve storage: ${error.message}`);
//   }
// }

// /**
//  * POST /api/torrents
//  * Body: { magnet: "magnet:?xt=urn:btih:..." }
//  *
//  * Strict quota-first torrent add flow:
//  * 1. Fetch metadata without downloading pieces
//  * 2. Check quota and atomically reserve space
//  * 3. Only then start downloading
//  */
// exports.create = async (req, res) => {
//   const { magnet } = req.body || {};
//   const torrentFile = req.file; // For uploaded .torrent files

//   // Validate input - need either magnet link or torrent file
//   if (!magnet && !torrentFile) {
//     console.log('❌ Torrent add failed: No magnet link or torrent file provided');
//     return res.status(400).json({
//       error: 'Either magnet link or torrent file is required',
//       acceptedFormats: 'magnet link (string) or .torrent file upload'
//     });
//   }

//   const userId = req.user.id;
//   console.log('[STRICT ADD] Starting strict quota-first torrent add');
//   console.log(`[STRICT ADD] User ID: ${userId}`);

//   if (magnet) {
//     console.log(`[STRICT ADD] Magnet: ${magnet.substring(0, 60)}...`);
//   }
//   if (torrentFile) {
//     console.log(`[STRICT ADD] Torrent file: ${torrentFile.originalname} (${torrentFile.size} bytes)`);
//   }

//   try {
//     let magnetToUse = magnet;
//     let metadata;

//     // Handle torrent file conversion
//     if (torrentFile) {
//       try {
//         console.log('[STRICT ADD] Converting torrent file to magnet');
//         const parseTorrent = (await import('parse-torrent')).default;
//         const parsed = parseTorrent(torrentFile.buffer);
//         magnetToUse = parseTorrent.toMagnetURI(parsed);

//         // For torrent files, we can get metadata directly
//         metadata = {
//           infoHash: parsed.infoHash,
//           name: parsed.name || 'Unknown',
//           sizeBytes: parsed.length || 0,
//           files: (parsed.files || []).map((file, index) => ({
//             index,
//             name: file.name,
//             path: file.path,
//             length: file.length
//           }))
//         };
//         console.log(`[STRICT ADD] Got metadata from torrent file: ${metadata.name} (${humanBytes(metadata.sizeBytes)})`);
//       } catch (error) {
//         console.error('[STRICT ADD] Error processing torrent file:', error);
//         return res.status(400).json({
//           error: 'Invalid torrent file',
//           details: error.message
//         });
//       }
//     } else {
//       // For magnet links, fetch metadata first
//       console.log('[STRICT ADD] Fetching metadata for magnet');
//       try {
//         metadata = await getTorrentMetadata(magnetToUse, {
//           timeoutMs: 100000 // 10 second timeout
//         });
//         console.log(`[INSPECT OK] ${metadata.name}, size=${humanBytes(metadata.sizeBytes)}, files=${metadata.files.length}`);
//       } catch (error) {
//         console.log(`[INSPECT FAILED] ${error.message}`);

//         if (error.message.includes('timeout')) {
//           return res.status(422).json({
//             error: 'Could not fetch torrent information within timeout. Try again or use a different magnet.',
//             code: 'METADATA_TIMEOUT'
//           });
//         }

//         return res.status(422).json({
//           error: 'Could not fetch torrent metadata',
//           code: 'METADATA_FETCH_FAILED',
//           details: error.message
//         });
//       }
//     }

//     // Check quota including existing reservations and attempt to reserve space
//     console.log("[QUOTA CHECK] Checking remaining quota including reservations");
//     console.log(`[RESERVE] Attempting to reserve ${humanBytes(metadata.sizeBytes)} for ${metadata.infoHash}`);
//     const reservation = await reserveStorageSpace(userId, metadata.infoHash, metadata.sizeBytes);

//     if (!reservation.success) {
//       console.log('[RESERVE FAILED] Concurrent quota check failed');
//       return res.status(403).json({
//         error: 'Quota exceeded (concurrent check)',
//         code: 'QUOTA_EXCEEDED',
//         details: {
//           torrentName: metadata.name,
//           required: humanBytes(metadata.sizeBytes),
//           remaining: humanBytes(reservation.quotaInfo.effectiveRemaining),
//           currentUsage: humanBytes(reservation.quotaInfo.currentUsage),
//           quota: humanBytes(reservation.quotaInfo.quota)
//         }
//       });
//     }

//     console.log(`[RESERVE OK] bytes=${humanBytes(metadata.sizeBytes)}`);

//     // Now we can safely start the download
//     console.log(`[START DOWNLOAD] infoHash=${metadata.infoHash} path=user storage`);

//     // Start torrent download in background
//     addMagnet(magnetToUse, userId).catch((e) => {
//       console.error('💥 CRITICAL: addMagnet failed after reservation:', e);
//       console.error('📊 Error details:', {
//         userId,
//         infoHash: metadata.infoHash,
//         magnetPreview: magnetToUse.substring(0, 50),
//         errorMessage: e.message,
//         errorStack: e.stack
//       });
//       // TODO: Consider rolling back the reservation on failure
//     });

//     console.log('✅ Strict torrent add completed successfully');

//     return res.status(202).json({
//       status: 'accepted',
//       message: 'Torrent quota validated and download started',
//       torrent: {
//         infoHash: metadata.infoHash,
//         name: metadata.name,
//         sizeBytes: metadata.sizeBytes,
//         files: metadata.files.length
//       },
//       quota: {
//         reserved: humanBytes(metadata.sizeBytes),
//         remaining: humanBytes(reservation.quotaInfo.effectiveRemaining),
//         currentUsage: humanBytes(reservation.quotaInfo.currentUsage)
//       }
//     });

//   } catch (error) {
//     console.error('💥 Error in strict torrent controller:', error);
//     console.error('📊 Controller error details:', {
//       userId,
//       inputType: torrentFile ? 'file' : 'magnet',
//       errorMessage: error.message,
//       errorStack: error.stack
//     });
//     return res.status(500).json({
//       error: 'Failed to process torrent request',
//       code: 'INTERNAL_ERROR'
//     });
//   }
// };

// /**
//  * GET /api/torrents
//  * Returns a list of all torrents for the authenticated user.
//  */
// exports.index = async (req, res) => {
//   const userId = req.user.id;
//   const items = await listTorrents(userId);
//   res.json(items);
// };

// /**
//  * GET /api/torrents/:id
//  * Returns details + file URLs for a specific torrent.
//  * Only shows torrents owned by the authenticated user.
//  */
// exports.show = async (req, res) => {
//   const userId = req.user.id;
//   const t = await getTorrent(req.params.id, userId);
//   if (!t) {
//     return res.status(404).json({ error: 'not found' });
//   }

//   const files = t.files.map((f, i) => {
//     const streamToken = signLink(
//       makeDirectLinkPayload({ torrentId: t.infoHash, fileIndex: i, userId: req.user.id, asAttachment: false })
//     );
//     const downloadToken = signLink(
//       makeDirectLinkPayload({ torrentId: t.infoHash, fileIndex: i, userId: req.user.id, asAttachment: true })
//     );

//     // Encode filename for URL but keep it readable
//     const encodedFilename = encodeURIComponent(f.name);

//     return {
//       index: i,
//       name: f.name,
//       length: f.length,
//       streamUrl: `${BASE}/direct/${streamToken}/${encodedFilename}`,
//       downloadUrl: `${BASE}/direct/${downloadToken}/${encodedFilename}`,
//       directUrl: `${BASE}/direct/${downloadToken}/${encodedFilename}`, // signed expiring download link
//     };
//   });

//   res.json({
//     id: t.infoHash,
//     name: t.name,
//     done: t.done,
//     files,
//   });
// };


// /**
//  * PUT /api/torrents/:id/stop
//  * Stops a torrent (removes from client but keeps files).
//  */
// exports.stop = async (req, res) => {
//   const ok = await stopTorrent(req.params.id);
//   if (!ok) {
//     return res.status(404).json({ error: 'Torrent not found' });
//   }
//   res.json({ stopped: true });
// };

// /**
//  * DELETE /api/torrents/:id
//  * Stops and removes a torrent.
//  */
// exports.destroy = async (req, res) => {
//   try {
//     const ok = await removeTorrent(req.params.id);
//     if (!ok) {
//       return res.status(404).json({ error: 'Torrent not found' });
//     }
//     res.json({ removed: ok });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// };

// /**
//  * POST /api/torrents/inspect
//  * Body: { magnet: "magnet:?xt=urn:btih:..." }
//  *
//  * Inspects a torrent magnet to get metadata (name, size, files) without downloading any pieces.
//  * Used for quota checking before actually adding the torrent.
//  */
// exports.inspect = async (req, res) => {
//   const { magnet } = req.body || {};

//   if (!magnet || typeof magnet !== 'string') {
//     return res.status(400).json({
//       error: 'Magnet URI is required',
//       code: 'INVALID_INPUT'
//     });
//   }

//   const userId = req.user.id;
//   console.log(`[INSPECT] Starting metadata inspection for user ${userId}`);
//   console.log(`[INSPECT] Magnet: ${magnet.substring(0, 60)}...`);

//   try {
//     // Fetch metadata without downloading pieces
//     const metadata = await getTorrentMetadata(magnet, {
//       timeoutMs: 100000 // 10 second timeout for inspect
//     });

//     console.log(`[INSPECT OK] ${metadata.name}, size=${humanBytes(metadata.sizeBytes)}, files=${metadata.files.length}`);

//     return res.status(200).json({
//       infoHash: metadata.infoHash,
//       name: metadata.name,
//       sizeBytes: metadata.sizeBytes,
//       files: metadata.files
//     });

//   } catch (error) {
//     console.log(`[INSPECT FAILED] ${error.message}`);

//     // Different error types for better UX
//     if (error.message.includes('timeout')) {
//       return res.status(422).json({
//         error: 'Could not fetch torrent information within timeout. Try again or use a different magnet.',
//         code: 'METADATA_TIMEOUT',
//         details: 'The torrent metadata could not be retrieved within the time limit'
//       });
//     }

//     if (error.message.includes('Invalid magnet')) {
//       return res.status(422).json({
//         error: 'Invalid magnet URI format',
//         code: 'INVALID_MAGNET',
//         details: error.message
//       });
//     }

//     return res.status(422).json({
//       error: 'Could not fetch torrent metadata',
//       code: 'METADATA_FETCH_FAILED',
//       details: error.message
//     });
//   }
// };






// src/controllers/torrents.controller.js
const {
  addMagnet,
  listTorrents,
  getTorrent,
  stopTorrent,
  removeTorrent,
  getClient,
  getQuotaExceededNotifications,
  clearQuotaExceededNotification,
  clearAllQuotaExceededNotifications
} = require('../services/torrentManager');

const { signLink, makeDirectLinkPayload } = require('../services/linkSigner');
const database = require('../models/database');

const BASE = process.env.WEB_BASE_URL || 'http://localhost:5000';

// Helper function to format bytes
function humanBytes(bytes) {
  const thresh = 1024;
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
  if (Math.abs(bytes) < thresh) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  let u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  const fixed = u < 2 ? 0 : 2;
  return `${bytes.toFixed(fixed)} ${units[u]}`;
}

/**
 * POST /api/torrents
 * Body: { magnet: "magnet:?xt=urn:btih:..." }
 *
 * Fast torrent adding with post-metadata quota validation.
 * Adds torrent immediately, validates quota when metadata arrives.
 */
exports.create = async (req, res) => {
  const { magnet } = req.body || {};
  if (!magnet) {
    console.log('❌ Torrent add failed: No magnet link provided');
    return res.status(400).json({ error: 'magnet is required' });
  }

  const userId = req.user.id;
  console.log('🚀 Starting fast torrent add...');
  console.log(`📋 User ID: ${userId}`);
  console.log(`🔗 Magnet link: ${magnet.substring(0, 50)}...`);

  try {
    // Basic quota check - user must have some space available
    const quotaInfo = await database.getUserStorageInfoWithReservations(userId);

    // Debug quota calculation
    console.log('🔍 DEBUG: Quota calculation details:');
    console.log(`  Total quota: ${humanBytes(quotaInfo.storageQuota)}`);
    console.log(`  Currently used: ${humanBytes(quotaInfo.storageUsed)}`);
    console.log(`  Total reserved: ${humanBytes(quotaInfo.totalReserved)}`);
    console.log(`  Effective remaining: ${humanBytes(quotaInfo.effectiveRemaining)}`);
    console.log(`  Calculation: ${humanBytes(quotaInfo.storageQuota)} - ${humanBytes(quotaInfo.storageUsed)} - ${humanBytes(quotaInfo.totalReserved)} = ${humanBytes(quotaInfo.effectiveRemaining)}`);

    if (quotaInfo.effectiveRemaining <= 0) {
      console.log('❌ No space available - checking if reservations are the issue');

      // Get detailed reservation info
      const reservations = await database.getUserReservations(userId);
      console.log(`🔍 Active reservations (${reservations.length}):`);
      reservations.forEach(r => {
        console.log(`  - ${r.info_hash}: ${humanBytes(r.size_bytes)} (${new Date(r.created_at).toISOString()})`);
      });

      // Auto-cleanup stale reservations if no active torrents
      if (reservations.length > 0) {
        console.log('🧹 Attempting automatic cleanup of stale reservations...');

        const client = await getClient();
        const activeTorrentHashes = client.torrents
          .filter(t => t.userId === userId)
          .map(t => t.infoHash);

        console.log(`📊 Found ${activeTorrentHashes.length} active torrents for user`);

        const staleReservations = reservations.filter(r =>
          !activeTorrentHashes.includes(r.info_hash)
        );

        if (staleReservations.length > 0) {
          console.log(`🗑️ Auto-cleaning ${staleReservations.length} stale reservations...`);

          let cleanedCount = 0;
          for (const reservation of staleReservations) {
            try {
              await database.releaseReservation(userId, reservation.info_hash);
              cleanedCount++;
              console.log(`✅ Auto-released: ${reservation.info_hash} (${humanBytes(reservation.size_bytes)})`);
            } catch (error) {
              console.error(`❌ Failed to auto-release ${reservation.info_hash}:`, error);
            }
          }

          if (cleanedCount > 0) {
            // Recalculate quota after cleanup
            const updatedQuotaInfo = await database.getUserStorageInfoWithReservations(userId);
            console.log(`🔄 After cleanup - Available: ${humanBytes(updatedQuotaInfo.effectiveRemaining)}`);

            if (updatedQuotaInfo.effectiveRemaining > 0) {
              console.log('✅ Auto-cleanup successful - retrying torrent add');

              // Continue with torrent add since we now have space
              console.log('⚡ Starting torrent immediately (quota will be validated on metadata)...');
              addMagnet(magnet, userId).catch((e) => {
                console.error('💥 CRITICAL: addMagnet failed:', e);
              });

              return res.status(202).json({
                status: 'accepted',
                message: 'Stale reservations cleaned up. Torrent add started.',
                quota: {
                  available: humanBytes(updatedQuotaInfo.effectiveRemaining),
                  currentUsage: humanBytes(updatedQuotaInfo.storageUsed),
                  total: humanBytes(updatedQuotaInfo.storageQuota),
                  cleanedReservations: cleanedCount
                }
              });
            }
          }
        }
      }

      return res.status(403).json({
        error: 'No storage space available',
        code: 'QUOTA_EXCEEDED',
        details: {
          remaining: humanBytes(quotaInfo.effectiveRemaining),
          currentUsage: humanBytes(quotaInfo.storageUsed),
          quota: humanBytes(quotaInfo.storageQuota),
          totalReserved: humanBytes(quotaInfo.totalReserved),
          activeReservations: reservations.length
        }
      });
    }

    // Check max concurrent downloads limit
    const user = await database.getUserById(userId);
    const maxConcurrentDownloads = user.max_concurrent_downloads || 2;

    // Get active torrents for this user
    const userTorrents = await listTorrents(userId);
    const activeTorrentCount = userTorrents.length;

    console.log(`📊 Concurrent downloads check: ${activeTorrentCount}/${maxConcurrentDownloads}`);

    if (activeTorrentCount >= maxConcurrentDownloads) {
      console.log(`❌ Max concurrent downloads limit reached (${maxConcurrentDownloads})`);
      return res.status(403).json({
        error: `Maximum concurrent downloads limit reached`,
        code: 'MAX_DOWNLOADS_EXCEEDED',
        details: {
          currentDownloads: activeTorrentCount,
          maxAllowed: maxConcurrentDownloads,
          activeTorrents: userTorrents.map(t => ({
            name: t.name,
            progress: `${(t.progress * 100).toFixed(1)}%`,
            downloaded: humanBytes(t.downloaded),
            size: humanBytes(t.length)
          }))
        },
        suggestion: `Please wait for some downloads to complete. You can have up to ${maxConcurrentDownloads} active downloads at once.`
      });
    }

    // Fire-and-forget: kick off torrent add in background immediately
    // Quota validation will happen when metadata is received
    console.log('⚡ Starting torrent immediately (quota will be validated on metadata)...');
    addMagnet(magnet, userId).catch((e) => {
      console.error('💥 CRITICAL: addMagnet failed:', e);
      console.error('📊 Error details:', {
        userId,
        magnetPreview: magnet.substring(0, 50),
        errorMessage: e.message,
        errorStack: e.stack
      });
    });

    console.log('✅ Torrent add started - quota will be validated when metadata arrives');
    return res.status(202).json({
      status: 'accepted',
      message: 'Torrent add started. Quota will be validated when metadata arrives.',
      quota: {
        available: humanBytes(quotaInfo.effectiveRemaining),
        currentUsage: humanBytes(quotaInfo.storageUsed),
        total: humanBytes(quotaInfo.storageQuota)
      }
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
 */
exports.index = async (req, res) => {
  const userId = req.user.id;
  const items = await listTorrents(userId);
  res.json(items);
};

/**
 * GET /api/torrents/:id
 */
exports.show = async (req, res) => {
  const userId = req.user.id;
  const t = await getTorrent(req.params.id, userId);
  if (!t) return res.status(404).json({ error: 'not found' });

  const files = t.files.map((f, i) => {
    const streamToken = signLink(
      makeDirectLinkPayload({
        torrentId: t.infoHash,
        fileIndex: i,
        userId,
        asAttachment: false,
      })
    );
    const downloadToken = signLink(
      makeDirectLinkPayload({
        torrentId: t.infoHash,
        fileIndex: i,
        userId,
        asAttachment: true,
      })
    );
    const encodedFilename = encodeURIComponent(f.name);
    return {
      index: i,
      name: f.name,
      length: f.length,
      streamUrl: `${BASE}/direct/${streamToken}/${encodedFilename}`,
      downloadUrl: `${BASE}/direct/${downloadToken}/${encodedFilename}`,
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
 */
exports.stop = async (req, res) => {
  const userId = req.user.id;
  const ok = await stopTorrent(req.params.id, userId);
  if (!ok) return res.status(404).json({ error: 'Torrent not found or access denied' });
  res.json({ stopped: true });
};

/**
 * DELETE /api/torrents/:id
 */
exports.destroy = async (req, res) => {
  try {
    const userId = req.user.id;
    const ok = await removeTorrent(req.params.id, userId);
    if (!ok) return res.status(404).json({ error: 'Torrent not found or access denied' });
    res.json({ removed: ok });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/torrents/quota
 * Returns current quota information for the user
 */
exports.quota = async (req, res) => {
  try {
    const userId = req.user.id;
    const quotaInfo = await database.getUserStorageInfoWithReservations(userId);

    res.json({
      quota: humanBytes(quotaInfo.storageQuota),
      used: humanBytes(quotaInfo.storageUsed),
      reserved: humanBytes(quotaInfo.totalReserved),
      inProgress: humanBytes(quotaInfo.totalInProgress || 0),
      available: humanBytes(quotaInfo.effectiveRemaining),
      details: {
        quotaBytes: quotaInfo.storageQuota,
        usedBytes: quotaInfo.storageUsed,
        reservedBytes: quotaInfo.totalReserved,
        inProgressBytes: quotaInfo.totalInProgress || 0,
        availableBytes: quotaInfo.effectiveRemaining
      }
    });
  } catch (error) {
    console.error('Error fetching quota info:', error);
    res.status(500).json({ error: 'Failed to fetch quota information' });
  }
};

/**
 * DELETE /api/torrents/reservations/cleanup
 * Cleans up stale reservations for the user
 */
exports.cleanupReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`🧹 Manual cleanup requested for user ${userId}`);

    // Get current active torrents
    const client = await getClient();
    const activeTorrentHashes = client.torrents
      .filter(t => t.userId === userId)
      .map(t => t.infoHash);

    console.log(`📊 Found ${activeTorrentHashes.length} active torrents`);

    // Get user's reservations
    const userReservations = await database.getUserReservations(userId);
    console.log(`📊 Found ${userReservations.length} active reservations`);

    // Log all reservations for debugging
    userReservations.forEach(r => {
      console.log(`  Reservation: ${r.info_hash} - ${humanBytes(r.size_bytes)}`);
    });

    const staleReservations = userReservations.filter(r =>
      !activeTorrentHashes.includes(r.info_hash)
    );

    console.log(`📊 Found ${staleReservations.length} stale reservations to clean`);

    // Release stale reservations
    let cleanedCount = 0;
    for (const reservation of staleReservations) {
      try {
        await database.releaseReservation(userId, reservation.info_hash);
        cleanedCount++;
        console.log(`🗑️ Released stale reservation: ${reservation.info_hash} (${humanBytes(reservation.size_bytes)})`);
      } catch (error) {
        console.error(`❌ Failed to release reservation ${reservation.info_hash}:`, error);
      }
    }

    // Get updated quota info after cleanup
    const updatedQuotaInfo = await database.getUserStorageInfoWithReservations(userId);

    res.json({
      cleaned: cleanedCount,
      message: `Cleaned up ${cleanedCount} stale reservations`,
      quotaAfterCleanup: {
        total: humanBytes(updatedQuotaInfo.storageQuota),
        used: humanBytes(updatedQuotaInfo.storageUsed),
        reserved: humanBytes(updatedQuotaInfo.totalReserved),
        available: humanBytes(updatedQuotaInfo.effectiveRemaining)
      }
    });
  } catch (error) {
    console.error('Error cleaning up reservations:', error);
    res.status(500).json({ error: 'Failed to clean up reservations' });
  }
};

/**
 * GET /api/torrents/notifications
 * Returns quota exceeded notifications for the user
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = getQuotaExceededNotifications(userId);

    // DEBUG: Log notification details to track the source of quota exceeded alerts
    if (notifications.length > 0) {
      console.log(`📋 Returning ${notifications.length} notifications for user ${userId.substring(0, 8)}...`);
      notifications.forEach(n => {
        console.log(`  - Type: ${n.type}, Torrent: ${n.torrentName?.substring(0, 30)}..., Size: ${n.torrentSize}, Available: ${n.availableSpace}, ID: ${n.id}`);
      });
    }

    // CRITICAL FIX: Prevent caching of notifications to avoid showing stale quota exceeded alerts
    // After login, old cached notifications with incorrect quota info can confuse users
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * DELETE /api/torrents/notifications/:id
 * Clears a specific notification
 */
exports.clearNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    const cleared = clearQuotaExceededNotification(userId, notificationId);

    if (cleared) {
      res.json({ message: 'Notification cleared', id: notificationId });
    } else {
      res.status(404).json({ error: 'Notification not found' });
    }
  } catch (error) {
    console.error('Error clearing notification:', error);
    res.status(500).json({ error: 'Failed to clear notification' });
  }
};

/**
 * DELETE /api/torrents/notifications
 * Clears all notifications for the user
 */
exports.clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    clearAllQuotaExceededNotifications(userId);
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
};

