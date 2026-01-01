// src/services/torrentManager.js (CJS compatible, no pretty-bytes)
const path = require('path');
const { logger } = require('../utils/logger');
const { getTrackers } = require('../utils/trackers');
const database = require('../models/database');
const { getUserStorageDir, ensureUserStorageDir } = require('../utils/storage');

const ROOT = process.env.ROOT || './src/storage/library';

// Store quota exceeded notifications for frontend
const quotaExceededNotifications = new Map(); // userId -> [notifications]

// CRITICAL FIX: Clear all notifications on server start to prevent stale alerts
// Notifications are in-memory only and should not persist across server restarts
console.log('🧹 STARTUP: Clearing all in-memory notifications from previous session');
quotaExceededNotifications.clear();

// Store per-user WebTorrent clients for complete isolation
const userClients = new Map(); // userId -> WebTorrent client

let WebTorrentMod;   // ESM default export

// Initialize WebTorrent module and perform startup cleanup
initializeManager().catch(error => {
  console.error('❌ TORRENT_MANAGER: Failed to initialize manager:', error);
});

// Simple human-readable bytes formatter (replaces pretty-bytes)
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
  // fewer decimals for small units
  const fixed = u < 2 ? 0 : 2;
  return `${bytes.toFixed(fixed)} ${units[u]}`;
}

// Initialize the WebTorrent module and perform startup cleanup
async function initializeManager() {
  if (!WebTorrentMod) {
    WebTorrentMod = (await import('webtorrent')).default;
  }

  // Smart startup cleanup: Collect torrents from all existing user clients after delay
  setTimeout(async () => {
    try {
      const allActiveTorrentHashes = [];

      // Collect all active torrents across all user clients
      for (const [userId, client] of userClients.entries()) {
        const userTorrentHashes = client.torrents.map(t => t.infoHash);
        allActiveTorrentHashes.push(...userTorrentHashes);
        console.log(`🧹 User ${userId} has ${userTorrentHashes.length} active torrents`);
      }

      console.log(`🧹 SMART CLEANUP: Found ${allActiveTorrentHashes.length} total active torrents across all users, cleaning stale reservations...`);

      const cleanedCount = await database.reservations.cleanupStaleReservations(allActiveTorrentHashes);
      console.log(`✅ SMART CLEANUP: Released ${cleanedCount} stale reservations`);

      if (cleanedCount > 0) {
        await database.logActivity({
          userId: null,
          username: 'system',
          actionType: 'reservation_cleanup',
          fileSize: cleanedCount,
          torrentName: 'smart_cleanup_startup'
        });
      }
    } catch (error) {
      console.error('❌ SMART CLEANUP ERROR:', error);
    }
  }, 5000); // Wait 5 seconds for torrents to load
}

// Cleanup idle clients to save resources
function cleanupIdleClients() {
  const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  const now = Date.now();

  for (const [userId, client] of userClients.entries()) {
    // Skip if client has active torrents
    if (client.torrents.length > 0) {
      client._lastActivity = now; // Update activity
      continue;
    }

    // Check if client has been idle too long
    if (now - client._lastActivity > IDLE_TIMEOUT) {
      console.log(`🧹 Cleaning up idle client for user: ${userId}`);
      try {
        client.destroy((err) => {
          if (err) console.error(`Error destroying client for user ${userId}:`, err);
        });
        userClients.delete(userId);
        console.log(`✅ Idle client cleaned up for user: ${userId}`);
      } catch (error) {
        console.error(`Failed to cleanup client for user ${userId}:`, error);
      }
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupIdleClients, 5 * 60 * 1000);

// Monitor client performance
function logClientStats() {
  console.log(`📊 CLIENT STATS: ${userClients.size} active user clients`);
  for (const [userId, client] of userClients.entries()) {
    const torrentsCount = client.torrents.length;
    const totalPeers = client.torrents.reduce((sum, t) => sum + t.numPeers, 0);
    const totalSpeed = client.torrents.reduce((sum, t) => sum + t.downloadSpeed, 0);
    console.log(`  User ${userId}: ${torrentsCount} torrents, ${totalPeers} peers, ${humanBytes(totalSpeed)}/s`);
  }
}

// Log stats every 2 minutes
setInterval(logClientStats, 2 * 60 * 1000);

// Get or create a WebTorrent client for a specific user
async function getUserClient(userId) {
  if (!WebTorrentMod) {
    WebTorrentMod = (await import('webtorrent')).default;
  }

  // Update activity timestamp if client exists
  if (userClients.has(userId)) {
    const client = userClients.get(userId);
    client._lastActivity = Date.now();
    return client;
  }

  // Create user-specific client if it doesn't exist
  console.log(`🏗️ Creating new WebTorrent client for user: ${userId}`);

  const userClient = new WebTorrentMod({
    dht: true,
    tracker: true,
    maxConns: 30        // Limit concurrent connections per user
  });

  userClient.on('error', (e) => {
    logger.error(`WebTorrent error for user ${userId}:`, e.message);
  });

  // Store the client for this user with timestamp
  userClients.set(userId, userClient);
  userClient._lastActivity = Date.now();
  userClient._userId = userId;

  console.log(`✅ WebTorrent client created for user: ${userId} (max ${userClient.maxConns} connections)`);

  return userClients.get(userId);
}

// For backward compatibility - this should be replaced with getUserClient
async function getClient() {
  console.warn('⚠️ DEPRECATED: getClient() called without userId - this should be replaced with getUserClient(userId)');
  // Return a default client or throw error
  throw new Error('getClient() is deprecated - use getUserClient(userId) instead');
}

function toSummary(t) {
  return {
    id: t.infoHash,
    name: t.name,
    progress: Number((t.progress * 100).toFixed(2)),
    downloaded: humanBytes(t.downloaded),
    length: humanBytes(t.length || 0),
    downloadSpeed: `${humanBytes(t.downloadSpeed)}/s`,
    uploadSpeed: `${humanBytes(t.uploadSpeed)}/s`,
    numPeers: t.numPeers,
    files: t.files.map((f, i) => ({
      index: i,
      name: f.name,
      path: f.path,
      length: f.length
    })),
    done: t.done
  };
}

async function addMagnet(magnet, userId) {
  const c = await getUserClient(userId);  // Use user-specific client
  const announce = getTrackers();
  return new Promise((resolve, reject) => {
    // Ensure user directory exists and get user-specific path
    const userStorageDir = ensureUserStorageDir(userId);
    console.log(`📁 Using user storage directory: ${userStorageDir}`);

    const t = c.add(
      magnet,
      { path: userStorageDir, announce },
      (torrent) => {
        // Track user for this torrent - CRITICAL: Set this immediately
        torrent.userId = userId;
        torrent.quotaValidated = false; // Flag to prevent duplicate quota validation


        torrent.on('infoHash', () => {
          console.log(`🔑 Got infoHash: ${torrent.infoHash} for user ${userId}`);
          console.log(`🔍 Torrent state after infoHash: ready=${torrent.ready}, length=${torrent.length}, name=${torrent.name || 'Unknown'}`);
        });

        // Shared quota validation function
        const validateQuotaAndReserve = async (source = '') => {
          if (torrent.quotaValidated) {
            console.log(`🔍 QUOTA ALREADY VALIDATED${source ? ` (${source})` : ''} - skipping`);
            return;
          }

          console.log(`🔍 QUOTA VALIDATION${source ? ` (${source})` : ''} STARTING`);
          console.log(`🔍 Torrent details: name=${torrent.name}, length=${torrent.length}, ready=${torrent.ready}`);

          try {
            const quotaInfo = await database.getUserStorageInfoWithReservations(userId);
            const torrentSize = torrent.length;
            const availableSpace = quotaInfo.effectiveRemaining;

            console.log(`🔍 QUOTA CHECK DEBUG${source ? ` (${source})` : ''}:`);
            console.log(`  📊 Torrent size: ${humanBytes(torrentSize)} (${torrentSize} bytes)`);
            console.log(`  📊 Available space: ${humanBytes(availableSpace)} (${availableSpace} bytes)`);
            console.log(`  📊 Size > Available: ${torrentSize} > ${availableSpace} = ${torrentSize > availableSpace}`);

            if (torrentSize > availableSpace) {
              console.log(`❌ QUOTA EXCEEDED${source ? ` (${source})` : ''}! Torrent exceeds available quota - stopping download immediately`);
              console.log(`❌ REMOVING TORRENT: ${torrent.name} (${humanBytes(torrentSize)}) > available (${humanBytes(availableSpace)})`);

              // Mark as validated to prevent duplicate attempts
              torrent.quotaValidated = true;

              // Stop the torrent and remove files
              try {
                await new Promise((resolve, reject) => {
                  c.remove(torrent.infoHash, { destroyStore: true }, (err) => {
                    if (err) {
                      console.error(`💥 Error removing oversized torrent${source ? ` (${source})` : ''}:`, err);
                      reject(err);
                    } else {
                      console.log(`🗑️ Successfully removed oversized torrent${source ? ` (${source})` : ''}: ${torrent.name}`);
                      resolve();
                    }
                  });
                });
              } catch (removeError) {
                console.error(`💥 Failed to remove oversized torrent${source ? ` (${source})` : ''}:`, removeError);
              }

              // Log quota exceeded message that frontend can pick up
              console.error(`🚫 QUOTA_EXCEEDED${source ? ` (${source})` : ''}: ${torrent.name} (${humanBytes(torrentSize)}) exceeds available quota (${humanBytes(availableSpace)})`);

              // Store notification for frontend
              // DEFENSIVE: Ensure availableSpace is valid before creating notification
              const safeAvailableSpace = (typeof availableSpace === 'number' && !isNaN(availableSpace))
                ? humanBytes(availableSpace)
                : '0 B';

              addQuotaExceededNotification(userId, {
                torrentName: torrent.name || 'Unknown',
                torrentSize: humanBytes(torrentSize) || '0 B',
                availableSpace: safeAvailableSpace,
                timestamp: new Date().toISOString()
              });

              return;
            }

            console.log(`✅ QUOTA CHECK PASSED${source ? ` (${source})` : ''}: Torrent size ${humanBytes(torrentSize)} fits in available space ${humanBytes(availableSpace)}`);

            // Mark as validated to prevent duplicate attempts
            torrent.quotaValidated = true;

            // Simple, foolproof reservation creation using INSERT OR REPLACE
            try {
              // First, clear any existing reservations for this torrent (clean slate)
              await database.reservations._run(
                `DELETE FROM storage_reservations WHERE user_id=? AND info_hash=?`,
                [userId, torrent.infoHash]
              );
              console.log(`🧹 Cleared any existing reservations for ${torrent.infoHash}`);

              // Now create new reservation (guaranteed to work)
              await database.reserveSpaceAtomic(userId, torrent.infoHash, torrentSize);
              console.log(`✅ Quota validated and space reserved${source ? ` (${source})` : ''} - torrent can proceed (${humanBytes(torrentSize)})`);

            } catch (reserveError) {
              console.log(`⚠️ Reservation failed but quota OK${source ? ` (${source})` : ''} - continuing: ${reserveError.message}`);

              // Show debug info
              try {
                const allReservations = await database.getUserReservations(userId);
                console.log(`🔍 DEBUG: Current user reservations (${allReservations.length}):`);
                allReservations.forEach(r => {
                  console.log(`  - ${r.info_hash}: ${humanBytes(r.size_bytes)} (${r.status})`);
                });
              } catch (debugError) {
                console.error(`💥 Failed to debug reservations:`, debugError);
              }
            }

          } catch (error) {
            console.error(`💥 Error during quota validation${source ? ` (${source})` : ''}:`, error);
            console.error('💥 Error stack:', error.stack);
            // Don't stop torrent for validation errors, just log
          }
        };

        torrent.on('metadata', async () => {
          console.log(`🔍 METADATA EVENT TRIGGERED!`);
          console.log(`📋 Got metadata: ${torrent.name} (${humanBytes(torrent.length)}) for user ${userId}`);
          await validateQuotaAndReserve('METADATA');
        });

        torrent.on('ready', () => {
          console.log(`🚀 Torrent ready: ${torrent.name} for user ${userId}`);
          console.log(`🔍 Ready state details: length=${torrent.length}, files=${torrent.files.length}, progress=${torrent.progress}`);
        });

        torrent.on('error', (err) => {
          console.error(`💥 Torrent error for user ${userId}:`, err);
          // Log torrent error
          database.logActivity({
            userId,
            username: 'system',
            actionType: 'torrent_error',
            torrentName: torrent.name || 'Unknown',
            torrentHash: torrent.infoHash,
            magnetLink: `error:${err.message}`
          }).catch(e => console.error('Failed to log torrent error:', e));
        });

        torrent.on('noPeers', (type) => {
          console.log(`🔍 No peers from ${type} for torrent: ${torrent.name || 'Unknown'}`);
        });

        // Additional debugging events
        torrent.on('wire', (wire, addr) => {
          console.log(`🔗 Connected to peer: ${addr}`);
        });

        // Track cumulative data transfer (less noisy than per-chunk logging)
        let totalDownloaded = 0;
        let totalUploaded = 0;
        let lastLogTime = Date.now();

        torrent.on('upload', (bytes) => {
          totalUploaded += bytes;
          const now = Date.now();
          // Only log every 10 seconds to reduce noise
          if (now - lastLogTime > 10000) {
            console.log(`📊 Data transfer: ⬇️ ${humanBytes(totalDownloaded)} ⬆️ ${humanBytes(totalUploaded)}`);
            lastLogTime = now;
          }
        });

        // Progressive storage tracking
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 5000; // Update every 5 seconds

        torrent.on('download', async (bytes) => {
          totalDownloaded += bytes;

          // Update storage progressively (throttled to avoid too many DB calls)
          const now = Date.now();
          if (now - lastUpdateTime > UPDATE_INTERVAL && torrent.quotaValidated) {
            lastUpdateTime = now;

            try {
              const downloadedBytes = torrent.downloaded;
              await database.updateProgressiveStorage(userId, torrent.infoHash, downloadedBytes);
              console.log(`📊 Progressive update: ${humanBytes(downloadedBytes)} downloaded for ${torrent.name || 'Unknown'}`);
            } catch (error) {
              console.error('Error updating progressive storage:', error);
            }
          }
        });

        // Log torrent state periodically
        const debugInterval = setInterval(() => {
          if (torrent.destroyed) {
            clearInterval(debugInterval);
            return;
          }
          console.log(`🔍 TORRENT STATUS: name=${torrent.name || 'Unknown'}, ready=${torrent.ready}, length=${torrent.length || 0}, progress=${(torrent.progress * 100).toFixed(1)}%, peers=${torrent.numPeers}`);
        }, 30000); // Every 30 seconds

        // Check if metadata is already available immediately
        console.log(`🔍 IMMEDIATE CHECK: ready=${torrent.ready}, length=${torrent.length}, name=${torrent.name || 'None'}`);
        if (torrent.ready && torrent.length > 0) {
          console.log(`🔍 METADATA ALREADY AVAILABLE! Triggering quota check immediately`);
          // Manually trigger quota validation since metadata event might have already fired
          setTimeout(async () => {
            await validateQuotaAndReserve('MANUAL');
          }, 1000);
        }

        // ⛔ Stop seeding as soon as download finishes and finalize storage
        torrent.on('done', async () => {
          console.log(`🎉 Download complete: ${torrent.name} for user ${userId}`);

          try {
            // CRITICAL: Final progressive update to sync all downloaded bytes before finalization
            // This prevents race conditions where the last 5-second interval hasn't triggered yet
            const finalDownloadedBytes = torrent.downloaded;
            console.log(`🔄 Final sync: ${humanBytes(finalDownloadedBytes)} downloaded for ${torrent.name}`);

            await database.updateProgressiveStorage(userId, torrent.infoHash, finalDownloadedBytes);
            console.log(`✅ Progressive storage synced before finalization`);

            // Now finalize with the exact downloaded amount
            // This should result in minimal or zero remainingBytes since we just synced
            await database.finalizeReservation(userId, torrent.infoHash, finalDownloadedBytes);
            console.log(`✅ Storage usage finalized for completed torrent: ${humanBytes(finalDownloadedBytes)}`);
            console.log(`🔄 Reservation finalized for user ${userId}, torrent ${torrent.infoHash}`);
          } catch (error) {
            console.error('💥 Error finalizing reservation:', error);
            console.error('💥 Error details:', {
              userId,
              infoHash: torrent.infoHash,
              downloaded: torrent.downloaded,
              length: torrent.length,
              error: error.message
            });

            // Fallback: try to release the reservation if finalization fails
            try {
              await database.releaseReservation(userId, torrent.infoHash);
              console.log(`🔄 Fallback: Released reservation for ${torrent.infoHash}`);
            } catch (releaseError) {
              console.error('💥 Fallback release also failed:', releaseError);
            }
          }

          // Add completion notification to trigger file explorer refresh
          addCompletionNotification(userId, {
            torrentName: torrent.name,
            torrentSize: humanBytes(torrent.length),
            infoHash: torrent.infoHash,
            timestamp: new Date().toISOString()
          });

          // Log torrent completion
          try {
            await database.logActivity({
              userId,
              username: 'system', // or get user details if available, but torrent.userId is all we have
              actionType: 'torrent_complete',
              torrentName: torrent.name,
              torrentHash: torrent.infoHash,
              fileSize: torrent.length,
              filePath: 'download_complete'
            });
            console.log(`📝 Activity logged: torrent_complete for ${torrent.name}`);
          } catch (logError) {
            console.error('⚠️ Failed to log torrent completion:', logError);
          }

          c.remove(torrent.infoHash, { destroyStore: false }, (err) => {
            if (err) {
              console.error('error removing completed torrent:', err);
            } else {
              console.log('torrent removed from client (files kept):', torrent.infoHash);
            }
          });
        });

        // resolve summary when torrent is ready (metadata available)
        torrent.on('ready', () => resolve(toSummary(torrent)));
      }
    );

    // CRITICAL: Set userId immediately on the torrent object to avoid race conditions
    t.userId = userId;
    t.quotaValidated = false;

    t.on('error', (err) => {
      console.error(`💥 Critical error adding torrent for user ${userId}:`, err);
      reject(err);
    });
  });
}

async function getTorrent(infoHash, userId) {
  const c = await getUserClient(userId);  // Use user-specific client
  const torrent = c.get(infoHash);

  // With per-user clients, any torrent found in user's client belongs to them
  return torrent;
}

async function listTorrents(userId) {
  const c = await getUserClient(userId);  // Use user-specific client
  // All torrents in user's client belong to them, no filtering needed
  return c.torrents.map(toSummary);
}

async function stopTorrent(infoHash, userId) {
  if (!userId) {
    throw new Error('userId is required for stopTorrent');
  }

  const c = await getUserClient(userId);  // Use user-specific client
  const t = c.get(infoHash);  // Get torrent directly by infoHash

  if (!t) return false;

  // Release any active reservation when stopping torrent
  try {
    await database.releaseReservation(userId, infoHash);
    console.log(`🔓 Released reservation for stopped torrent: ${infoHash}`);
  } catch (error) {
    console.log('⚠️ No reservation to release for stopped torrent (normal)');
  }

  return new Promise((resolve, reject) => {
    c.remove(infoHash, { destroyStore: false }, (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

async function removeTorrent(infoHash, userId) {
  if (!userId) {
    throw new Error('userId is required for removeTorrent');
  }

  const c = await getUserClient(userId);  // Use user-specific client
  const t = c.get(infoHash);  // Get torrent directly by infoHash

  if (!t) return false;

  // Release any active reservation when removing torrent
  try {
    await database.releaseReservation(userId, infoHash);
    console.log(`🔓 Released reservation for removed torrent: ${infoHash}`);
  } catch (error) {
    console.log('⚠️ No reservation to release for removed torrent (normal)');
  }

  return new Promise((resolve, reject) => {
    c.remove(infoHash, { destroyStore: false }, (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

// Notification management functions
function addQuotaExceededNotification(userId, notification) {
  if (!quotaExceededNotifications.has(userId)) {
    quotaExceededNotifications.set(userId, []);
  }

  const userNotifications = quotaExceededNotifications.get(userId);
  userNotifications.push({
    id: Date.now().toString(),
    type: 'quota_exceeded',
    ...notification
  });

  // Keep only last 10 notifications per user
  if (userNotifications.length > 10) {
    userNotifications.splice(0, userNotifications.length - 10);
  }

  console.log(`📢 Added quota exceeded notification for user ${userId}: ${notification.torrentName}`);
}

function addCompletionNotification(userId, notification) {
  if (!quotaExceededNotifications.has(userId)) {
    quotaExceededNotifications.set(userId, []);
  }

  const userNotifications = quotaExceededNotifications.get(userId);
  userNotifications.push({
    id: Date.now().toString(),
    type: 'download_completed',
    ...notification
  });

  // Keep only last 10 notifications per user
  if (userNotifications.length > 10) {
    userNotifications.splice(0, userNotifications.length - 10);
  }

  console.log(`🎉 Added completion notification for user ${userId}: ${notification.torrentName}`);
}

function getQuotaExceededNotifications(userId) {
  return quotaExceededNotifications.get(userId) || [];
}

function clearQuotaExceededNotification(userId, notificationId) {
  const userNotifications = quotaExceededNotifications.get(userId);
  if (userNotifications) {
    const index = userNotifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      userNotifications.splice(index, 1);
      console.log(`🗑️ Cleared notification ${notificationId} for user ${userId}`);
      return true;
    }
  }
  return false;
}

function clearAllQuotaExceededNotifications(userId) {
  const existingNotifications = quotaExceededNotifications.get(userId) || [];

  // DEBUG: Log what we're clearing
  if (existingNotifications.length > 0) {
    console.log(`🗑️ Clearing ${existingNotifications.length} notifications for user ${userId.substring(0, 8)}...:`);
    existingNotifications.forEach(n => {
      console.log(`  - Type: ${n.type}, Torrent: ${n.torrentName?.substring(0, 30)}..., Size: ${n.torrentSize}, Available: ${n.availableSpace}, ID: ${n.id}`);
    });
  } else {
    console.log(`🗑️ No notifications to clear for user ${userId.substring(0, 8)}...`);
  }

  quotaExceededNotifications.set(userId, []);
}

module.exports = {
  addMagnet,
  getTorrent,
  listTorrents,
  stopTorrent,
  removeTorrent,
  getUserClient,
  getClient,  // Keep for backward compatibility (will throw error)
  getQuotaExceededNotifications,
  clearQuotaExceededNotification,
  clearAllQuotaExceededNotifications
};