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
 * Body: { magnet: "magnet:?xt=urn:btih:..." } OR FormData with 'torrent' file
 *
 * Fast torrent adding with post-metadata quota validation.
 * Adds torrent immediately, validates quota when metadata arrives.
 */
exports.create = async (req, res) => {
  const { magnet } = req.body || {};
  const torrentFile = req.file; // multer provides uploaded file here

  // Validate input - need either magnet link or torrent file
  if (!magnet && !torrentFile) {
    console.log('❌ Torrent add failed: No magnet link or torrent file provided');
    return res.status(400).json({
      error: 'Either magnet link or torrent file is required',
      acceptedFormats: 'magnet link (string) or .torrent file upload'
    });
  }

  const userId = req.user.id;
  console.log('🚀 Starting fast torrent add...');
  console.log(`📋 User ID: ${userId}`);

  if (magnet) {
    console.log(`🔗 Magnet link: ${magnet.substring(0, 50)}...`);
  }
  if (torrentFile) {
    console.log(`📁 Torrent file: ${torrentFile.originalname} (${torrentFile.size} bytes)`);
  }

  try {
    // Check if user account is disabled
    if (req.user.isActive === false) {
      console.log(`❌ Account disabled for user ${userId}`);
      return res.status(403).json({
        error: 'Your account has been disabled',
        code: 'ACCOUNT_DISABLED',
        message: 'Your account has been disabled by an administrator. Please contact support for assistance.'
      });
    }
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

              // Handle torrent file conversion to magnet URI if needed (for cleanup path)
              let magnetForCleanup = magnet;
              let torrentNameForCleanup = null;

              if (torrentFile) {
                try {
                  const parseTorrentModule = await import('parse-torrent');
                  const parseTorrent = parseTorrentModule.default;
                  const toMagnetURI = parseTorrentModule.toMagnetURI || parseTorrentModule.default.toMagnetURI;

                  const parsed = await parseTorrent(torrentFile.buffer);

                  // Try different methods to get magnet URI
                  if (typeof toMagnetURI === 'function') {
                    magnetForCleanup = await toMagnetURI(parsed);
                  } else if (parsed.magnetURI) {
                    magnetForCleanup = parsed.magnetURI;
                  } else {
                    // Build magnet URI manually
                    const infoHash = parsed.infoHash;
                    const name = parsed.name || '';
                    magnetForCleanup = `magnet:?xt=urn:btih:${infoHash}`;
                    if (name) {
                      magnetForCleanup += `&dn=${encodeURIComponent(name)}`;
                    }
                    if (parsed.announce && parsed.announce.length > 0) {
                      parsed.announce.forEach(tracker => {
                        magnetForCleanup += `&tr=${encodeURIComponent(tracker)}`;
                      });
                    }
                  }

                  torrentNameForCleanup = parsed.name || null;
                } catch (error) {
                  console.error('❌ Error processing torrent file in cleanup path:', error);
                  return res.status(400).json({
                    error: 'Invalid torrent file',
                    details: error.message
                  });
                }
              }

              // Continue with torrent add since we now have space
              console.log('⚡ Starting torrent immediately (quota will be validated on metadata)...');
              addMagnet(magnetForCleanup, userId).catch((e) => {
                console.error('💥 CRITICAL: addMagnet failed:', e);
              });

              // Log activity: torrent addition after cleanup
              try {
                const clientIp = req.ip || req.connection.remoteAddress;
                const userAgent = req.get('user-agent') || 'Unknown';

                await database.logActivity({
                  userId,
                  username: req.user.username,
                  actionType: 'torrent_add',
                  torrentName: torrentNameForCleanup,
                  torrentHash: null,
                  magnetLink: magnetForCleanup,
                  filePath: torrentFile ? torrentFile.originalname : null,
                  fileSize: torrentFile ? torrentFile.size : null,
                  ipAddress: clientIp,
                  userAgent
                });
                console.log(`📝 Activity logged: torrent_add by ${req.user.username} (after cleanup)`);
              } catch (logError) {
                console.error('⚠️ Failed to log activity:', logError);
              }

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

      // Log quota exceeded security event
      await req.activityLogger.logSecurity(req, 'quota_exceeded', {
        torrentName: magnet.substring(0, 50),
        fileSize: quotaInfo.effectiveRemaining,
        filePath: `active_reservations:${reservations.length}`
      });

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

      // Log concurrent limit exceeded security event
      await req.activityLogger.logSecurity(req, 'concurrent_limit_exceeded', {
        torrentName: `current:${activeTorrentCount}`,
        fileSize: maxConcurrentDownloads
      });

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

    // Handle torrent file conversion to magnet URI if needed
    let magnetToUse = magnet;
    let torrentNameFromMagnet = null;

    if (torrentFile) {
      try {
        console.log('📦 Quickly extracting infoHash from torrent file...');
        const parseTorrentModule = await import('parse-torrent');
        const parseTorrent = parseTorrentModule.default;
        const toMagnetURI = parseTorrentModule.toMagnetURI || parseTorrentModule.default.toMagnetURI;

        const parsed = await parseTorrent(torrentFile.buffer);

        // Try different methods to get magnet URI
        if (typeof toMagnetURI === 'function') {
          magnetToUse = await toMagnetURI(parsed);
        } else if (parsed.magnetURI) {
          magnetToUse = parsed.magnetURI;
        } else {
          // Build magnet URI manually from parsed data
          const infoHash = parsed.infoHash;
          const name = parsed.name || '';
          magnetToUse = `magnet:?xt=urn:btih:${infoHash}`;
          if (name) {
            magnetToUse += `&dn=${encodeURIComponent(name)}`;
          }
          if (parsed.announce && parsed.announce.length > 0) {
            parsed.announce.forEach(tracker => {
              magnetToUse += `&tr=${encodeURIComponent(tracker)}`;
            });
          }
        }

        torrentNameFromMagnet = parsed.name || null;
        console.log(`📋 Extracted infoHash quickly: ${parsed.infoHash}`);
        console.log(`📋 Name: ${torrentNameFromMagnet || 'Unknown'}`);
      } catch (error) {
        console.error('❌ Error processing torrent file:', error);
        return res.status(400).json({
          error: 'Invalid torrent file',
          details: error.message
        });
      }
    } else{
      // Extract torrent name from magnet link (dn parameter)
      try {
        const dnMatch = magnetToUse.match(/[?&]dn=([^&]+)/);
        if (dnMatch) {
          torrentNameFromMagnet = decodeURIComponent(dnMatch[1].replace(/\+/g, ' '));
          console.log(`📋 Extracted name from magnet: ${torrentNameFromMagnet}`);
        }
      } catch (e) {
        console.log('⚠️ Could not extract name from magnet link');
      }
    }

    // Start torrent in background (async - don't wait)
    console.log('⚡ Starting torrent immediately in background...');

    // Activity logging setup
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || 'Unknown';

    // Start torrent and log activity in background (don't block response)
    Promise.all([
      addMagnet(magnetToUse, userId).catch((e) => {
        console.error('💥 CRITICAL: addMagnet failed:', e);
        console.error('📊 Error details:', {
          userId,
          magnetPreview: magnetToUse.substring(0, 50),
          errorMessage: e.message,
          errorStack: e.stack
        });
      }),
      database.logActivity({
        userId,
        username: req.user.username,
        actionType: 'torrent_add',
        torrentName: torrentNameFromMagnet, // Use name from magnet link or torrent file!
        torrentHash: null,
        magnetLink: magnetToUse,
        filePath: torrentFile ? torrentFile.originalname : null,
        fileSize: torrentFile ? torrentFile.size : null,
        ipAddress: clientIp,
        userAgent
      }).catch(logError => {
        console.error('⚠️ Failed to log activity:', logError);
      })
    ]).then(() => {
      console.log(`✅ Torrent started and activity logged for ${req.user.username}`);
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
  
  // Log torrent list view (low priority)
  // Only log if items exist to reduce noise? Or always?
  // Guide says LOW priority.
  // We can skip logging this one to reduce DB load for frequent polling, 
  // or log it only if needed. Guide included it.
  // But wait, index is polled every few seconds. Logging every poll is BAD.
  // Let's NOT log every poll.
  // "torrent_list_view | LOW | GET /api/torrents | userId, username, count (in fileSize)"
  // The guide suggests logging it. But practicality suggests otherwise for polling.
  // I will skip this one or maybe only log if user explicitly requests it?
  // Frontend polls it.
  // I will add it but maybe wrapped in a "if (!req.query.polling)" check if frontend sends that?
  // No such param.
  // I will SKIP it for now to avoid flooding activity logs table (100k users * 1 request/2sec = disaster).
  
  res.json(items);
};

/**
 * GET /api/torrents/library
 * Returns DB-backed "library" entries (cached/completed torrents) so the UI can
 * still show items after the WebTorrent client removes finished torrents.
 */
exports.library = async (req, res) => {
  const userId = req.user.id;

  try {
    const links = await cacheManager.getUserLinks(userId);

    // Backfill missing sizes for already-completed torrents (e.g. if metadata event was missed)
    const normalizedLinks = await Promise.all(
      (links || []).map(async (l) => {
        try {
          if ((l.download_status || '').toLowerCase() !== 'completed') return l;
          if (l.total_size && l.total_size > 0) return l;
          if (!l.cache_path) return l;

          const files = await storageOrchestrator.listLocalFiles(l.cache_path);
          const totalSize = files.reduce((sum, f) => sum + (typeof f.size === 'number' ? f.size : 0), 0);
          const filesCount = files.length;

          if (totalSize > 0) {
            await cacheManager.updateCacheStatus(l.info_hash, 'completed', {
              totalSize,
              filesCount
            });
            return { ...l, total_size: totalSize, files_count: filesCount };
          }

          return l;
        } catch {
          return l;
        }
      })
    );

    res.json(
      (normalizedLinks || []).map((l) => ({
        id: l.info_hash,
        infoHash: l.info_hash,
        name: l.user_folder_name || l.name || l.info_hash,
        addedAt: l.added_at,
        isCached: l.is_cached === 1,
        downloadStatus: l.download_status || null,
        r2Uploaded: l.r2_uploaded === 1,
        sizeBytes: l.total_size || 0,
        size: humanBytes(l.total_size || 0),
      }))
    );
  } catch (error) {
    console.error('Library error:', error);
    res.status(500).json({ error: error.message });
  }
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
  const infoHash = req.params.id;

  // Get torrent info before stopping for logs
  let torrentName = 'Unknown';
  try {
    const t = await getTorrent(infoHash, userId);
    if (t) torrentName = t.name;
  } catch (e) { /* ignore */ }

  const ok = await stopTorrent(infoHash, userId);
  if (!ok) return res.status(404).json({ error: 'Torrent not found or access denied' });

  // Log torrent stop
  await req.activityLogger.logTorrent(req, 'stop', {
    name: torrentName,
    infoHash: infoHash
  });

  res.json({ stopped: true });
};

/**
 * DELETE /api/torrents/:id
 */
exports.destroy = async (req, res) => {
  try {
    const userId = req.user.id;
    const infoHash = req.params.id;

    // Get torrent info before removal for logs
    let torrentName = 'Unknown';
    let torrentSize = 0;
    try {
      const t = await getTorrent(infoHash, userId);
      if (t) {
        torrentName = t.name;
        torrentSize = t.length;
      }
    } catch (e) { /* ignore */ }

    const ok = await removeTorrent(infoHash, userId);
    if (!ok) return res.status(404).json({ error: 'Torrent not found or access denied' });

    // Log torrent deletion
    await req.activityLogger.logTorrent(req, 'delete', {
      name: torrentName,
      infoHash: infoHash,
      length: torrentSize
    });

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

    // Log manual cleanup
    if (cleanedCount > 0) {
      await req.activityLogger.log(req, 'reservation_cleanup', {
        fileSize: cleanedCount,
        torrentName: 'manual_cleanup'
      });
    }

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

    // Log notification view (low priority)
    /*
    if (notifications.length > 0) {
      await req.activityLogger.log(req, 'notification_view', {
        fileSize: notifications.length
      });
    }
    */

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
      // Log notification clear
      await req.activityLogger.log(req, 'notification_clear', {
        torrentHash: notificationId
      });
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

// ==================== Cache-Aware Torrent Management ====================

const storageOrchestrator = require('../services/storageOrchestrator');
const cacheManager = require('../services/cacheManager');

/**
 * POST /api/torrents/smart
 * Smart torrent add with cache support
 * - Checks cache first for instant access
 * - Queues download if SSD full
 * - Falls back to regular download
 */
exports.smartCreate = async (req, res) => {
  const { magnet, folderName } = req.body || {};

  if (!magnet) {
    return res.status(400).json({ error: 'Magnet link is required' });
  }

  const userId = req.user.id;

  try {
    // Check if user account is disabled
    if (req.user.isActive === false) {
      return res.status(403).json({
        error: 'Your account has been disabled',
        code: 'ACCOUNT_DISABLED'
      });
    }

    console.log(`🧠 Smart torrent add for user ${userId}`);

    // Use storage orchestrator to handle the request
    const result = await storageOrchestrator.addTorrent(userId, magnet, folderName);

    if (!result.success) {
      // Handle different error cases
      if (result.existingLink) {
        return res.status(409).json({
          error: result.error,
          code: 'ALREADY_EXISTS',
          existingLink: result.existingLink
        });
      }

      if (result.status === 'in_progress') {
        return res.status(202).json({
          status: 'in_progress',
          message: 'This torrent is being downloaded by another user. You will get instant access once complete.',
          infoHash: result.infoHash
        });
      }

      if (result.quotaInfo) {
        return res.status(403).json({
          error: result.error,
          code: 'QUOTA_EXCEEDED',
          quotaInfo: result.quotaInfo
        });
      }

      return res.status(400).json({ error: result.error });
    }

    // Handle different success cases
    if (result.instant) {
      // Cache hit - instant access
      console.log(`⚡ Instant access granted for ${result.infoHash}`);

      // Log activity
      await database.logActivity({
        userId,
        username: req.user.username,
        actionType: 'cache_hit',
        torrentName: result.name,
        torrentHash: result.infoHash,
        fileSize: result.size,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent')
      }).catch(e => console.error('Activity log error:', e));

      return res.status(200).json({
        status: 'instant',
        message: result.message,
        cached: true,
        infoHash: result.infoHash,
        name: result.name,
        size: result.size,
        sizeFormatted: humanBytes(result.size),
        r2Available: result.r2Available
      });
    }

    if (result.action === 'queued') {
      // Added to queue
      console.log(`📥 Queued for download: ${result.infoHash}`);

      return res.status(202).json({
        status: 'queued',
        message: result.message,
        queueId: result.queueId,
        position: result.position,
        infoHash: result.infoHash
      });
    }

    if (result.action === 'download') {
      // Ready to download - proceed with regular flow
      console.log(`📥 Proceeding with download: ${result.infoHash}`);

      // Notify orchestrator that download is starting
      await storageOrchestrator.onDownloadStart(userId, result.infoHash, folderName || 'Unknown', 0);

      // Start the actual download using existing addMagnet
      addMagnet(magnet, userId).catch((e) => {
        console.error('addMagnet failed:', e);
        storageOrchestrator.onDownloadFailed(userId, result.infoHash, e.message);
      });

      // Log activity
      await database.logActivity({
        userId,
        username: req.user.username,
        actionType: 'torrent_add_smart',
        torrentHash: result.infoHash,
        magnetLink: magnet,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent')
      }).catch(e => console.error('Activity log error:', e));

      return res.status(202).json({
        status: 'downloading',
        message: 'Download started',
        infoHash: result.infoHash,
        spaceAvailable: humanBytes(result.spaceAvailable || 0)
      });
    }

    // Unknown result
    return res.status(200).json(result);

  } catch (error) {
    console.error('Smart create error:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/torrents/cache-check?magnet=...
 * Check if a torrent is cached before adding
 */
exports.cacheCheck = async (req, res) => {
  const { magnet, infoHash: providedHash } = req.query;

  if (!magnet && !providedHash) {
    return res.status(400).json({ error: 'Provide magnet or infoHash' });
  }

  try {
    const infoHash = providedHash || cacheManager.extractInfoHash(magnet);

    if (!infoHash) {
      return res.status(400).json({ error: 'Invalid magnet link' });
    }

    const cache = await cacheManager.checkCacheAvailability(infoHash);
    const inProgress = cache ? false : await cacheManager.isCacheInProgress(infoHash);
    const userHasLink = await cacheManager.userHasLink(req.user.id, infoHash);

    res.json({
      infoHash,
      cached: !!cache,
      inProgress,
      userHasAccess: userHasLink,
      cache: cache ? {
        name: cache.name,
        size: cache.total_size,
        sizeFormatted: humanBytes(cache.total_size),
        r2Uploaded: cache.r2_uploaded === 1,
        refCount: cache.reference_count
      } : null
    });
  } catch (error) {
    console.error('Cache check error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/torrents/storage-status
 * Get storage system status (cache, queue, SSD, R2)
 */
exports.storageStatus = async (req, res) => {
  try {
    const status = await storageOrchestrator.getStorageStatus();

    // Format sizes for display
    const formatSize = (bytes) => bytes ? humanBytes(bytes) : '0 B';

    res.json({
      ...status,
      formatted: {
        ssd: status.ssd ? {
          total: formatSize(status.ssd.disk?.total),
          used: formatSize(status.ssd.disk?.used),
          free: formatSize(status.ssd.disk?.free),
          availableForDownloads: formatSize(status.ssd.calculated?.availableForDownloads)
        } : null,
        cache: status.cache ? {
          totalSize: formatSize(status.cache.total_size),
          torrents: status.cache.total_torrents
        } : null,
        r2: status.r2 ? {
          totalSize: status.r2.stats?.formattedSize
        } : null
      }
    });
  } catch (error) {
    console.error('Storage status error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/torrents/cache/:infoHash/files
 * Get files for a cached torrent
 */
exports.getCacheFiles = async (req, res) => {
  const { infoHash } = req.params;
  const userId = req.user.id;

  try {
    // Check if user has access
    const userLink = await cacheManager.getUserLink(userId, infoHash);
    if (!userLink) {
      return res.status(403).json({ error: 'You do not have access to this torrent' });
    }

    const result = await storageOrchestrator.getTorrentFiles(infoHash);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json({
      infoHash,
      source: result.source,
      files: result.files.map(f => ({
        ...f,
        sizeFormatted: humanBytes(f.size)
      }))
    });
  } catch (error) {
    console.error('Get cache files error:', error);
    res.status(500).json({ error: error.message });
  }
};

