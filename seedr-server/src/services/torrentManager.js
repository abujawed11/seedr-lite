// src/services/torrentManager.js (CJS compatible, no pretty-bytes)
const path = require('path');
const { logger } = require('../utils/logger');
const { getTrackers } = require('../utils/trackers');
const database = require('../models/database');

const ROOT = process.env.ROOT || './src/storage/library';

// Store quota exceeded notifications for frontend
const quotaExceededNotifications = new Map(); // userId -> [notifications]

let WebTorrentMod;   // ESM default export
let client;          // singleton

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

async function getClient() {
  if (!WebTorrentMod) {
    WebTorrentMod = (await import('webtorrent')).default;
  }
  if (!client) {
    client = new WebTorrentMod({
      dht: true,
      tracker: true,
    });
    client.on('error', (e) => logger.error('WebTorrent error:', e.message));
  }
  return client;
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
  const c = await getClient();
  const announce = getTrackers();
  return new Promise((resolve, reject) => {
    const t = c.add(
      magnet,
      { path: path.resolve(ROOT), announce },
      (torrent) => {
        // Track user for this torrent
        torrent.userId = userId;

        // Enhanced logging for all torrent events
        console.log(`🔍 TORRENT LIFECYCLE: Setting up event handlers for user ${userId}`);

        torrent.on('infoHash', () => {
          console.log(`🔑 Got infoHash: ${torrent.infoHash} for user ${userId}`);
          console.log(`🔍 Torrent state after infoHash: ready=${torrent.ready}, length=${torrent.length}, name=${torrent.name || 'Unknown'}`);
        });

        torrent.on('metadata', async () => {
          console.log(`🔍 METADATA EVENT TRIGGERED!`);
          console.log(`🔍 Torrent details: name=${torrent.name}, length=${torrent.length}, ready=${torrent.ready}`);

          console.log(`📋 Got metadata: ${torrent.name} (${humanBytes(torrent.length)}) for user ${userId}`);

          // Simple quota validation: check if torrent size fits in available space
          try {
            const quotaInfo = await database.getUserStorageInfoWithReservations(userId);
            const torrentSize = torrent.length;
            const availableSpace = quotaInfo.effectiveRemaining;

            console.log(`🔍 QUOTA CHECK DEBUG:`);
            console.log(`  📊 Torrent size: ${humanBytes(torrentSize)} (${torrentSize} bytes)`);
            console.log(`  📊 Available space: ${humanBytes(availableSpace)} (${availableSpace} bytes)`);
            console.log(`  📊 Size > Available: ${torrentSize} > ${availableSpace} = ${torrentSize > availableSpace}`);

            if (torrentSize > availableSpace) {
              console.log('❌ QUOTA EXCEEDED! Torrent exceeds available quota - stopping download immediately');
              console.log(`❌ REMOVING TORRENT: ${torrent.name} (${humanBytes(torrentSize)}) > available (${humanBytes(availableSpace)})`);

              // Stop the torrent and remove files
              try {
                await new Promise((resolve, reject) => {
                  c.remove(torrent.infoHash, { destroyStore: true }, (err) => {
                    if (err) {
                      console.error('💥 Error removing oversized torrent:', err);
                      reject(err);
                    } else {
                      console.log(`🗑️ Successfully removed oversized torrent: ${torrent.name}`);
                      resolve();
                    }
                  });
                });
              } catch (removeError) {
                console.error('💥 Failed to remove oversized torrent:', removeError);
              }

              // Log quota exceeded message that frontend can pick up
              console.error(`🚫 QUOTA_EXCEEDED: ${torrent.name} (${humanBytes(torrentSize)}) exceeds available quota (${humanBytes(availableSpace)})`);

              // Store notification for frontend
              addQuotaExceededNotification(userId, {
                torrentName: torrent.name,
                torrentSize: humanBytes(torrentSize),
                availableSpace: humanBytes(availableSpace),
                timestamp: new Date().toISOString()
              });

              return;
            }

            console.log(`✅ QUOTA CHECK PASSED: Torrent size ${humanBytes(torrentSize)} fits in available space ${humanBytes(availableSpace)}`);

            // Torrent fits - create a simple reservation to track usage
            try {
              await database.reserveSpaceAtomic(userId, torrent.infoHash, torrentSize);
              console.log(`✅ Quota validated and space reserved - torrent can proceed (${humanBytes(torrentSize)})`);
            } catch (reserveError) {
              console.log(`⚠️ Reservation creation failed but quota OK - continuing: ${reserveError.message}`);
            }

          } catch (error) {
            console.error('💥 Error during quota validation:', error);
            console.error('💥 Error stack:', error.stack);
            // Don't stop torrent for validation errors, just log
          }
        });

        torrent.on('ready', () => {
          console.log(`🚀 Torrent ready: ${torrent.name} for user ${userId}`);
          console.log(`🔍 Ready state details: length=${torrent.length}, files=${torrent.files.length}, progress=${torrent.progress}`);
        });

        torrent.on('error', (err) => {
          console.error(`💥 Torrent error for user ${userId}:`, err);
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

        torrent.on('download', (bytes) => {
          totalDownloaded += bytes;
          // Upload event will handle the logging to avoid duplicate logs
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
            console.log(`🔍 MANUAL METADATA CHECK TRIGGERED!`);
            console.log(`🔍 Torrent details: name=${torrent.name}, length=${torrent.length}, ready=${torrent.ready}`);

            // Simple quota validation: check if torrent size fits in available space
            try {
              const quotaInfo = await database.getUserStorageInfoWithReservations(userId);
              const torrentSize = torrent.length;
              const availableSpace = quotaInfo.effectiveRemaining;

              console.log(`🔍 QUOTA CHECK DEBUG (MANUAL):`);
              console.log(`  📊 Torrent size: ${humanBytes(torrentSize)} (${torrentSize} bytes)`);
              console.log(`  📊 Available space: ${humanBytes(availableSpace)} (${availableSpace} bytes)`);
              console.log(`  📊 Size > Available: ${torrentSize} > ${availableSpace} = ${torrentSize > availableSpace}`);

              if (torrentSize > availableSpace) {
                console.log('❌ QUOTA EXCEEDED! (MANUAL CHECK) Torrent exceeds available quota - stopping download immediately');
                console.log(`❌ REMOVING TORRENT: ${torrent.name} (${humanBytes(torrentSize)}) > available (${humanBytes(availableSpace)})`);

                // Stop the torrent and remove files
                try {
                  await new Promise((resolve, reject) => {
                    c.remove(torrent.infoHash, { destroyStore: true }, (err) => {
                      if (err) {
                        console.error('💥 Error removing oversized torrent (manual):', err);
                        reject(err);
                      } else {
                        console.log(`🗑️ Successfully removed oversized torrent (manual): ${torrent.name}`);
                        resolve();
                      }
                    });
                  });
                } catch (removeError) {
                  console.error('💥 Failed to remove oversized torrent (manual):', removeError);
                }

                // Log quota exceeded message that frontend can pick up
                console.error(`🚫 QUOTA_EXCEEDED (MANUAL): ${torrent.name} (${humanBytes(torrentSize)}) exceeds available quota (${humanBytes(availableSpace)})`);

                // Store notification for frontend
                addQuotaExceededNotification(userId, {
                  torrentName: torrent.name,
                  torrentSize: humanBytes(torrentSize),
                  availableSpace: humanBytes(availableSpace),
                  timestamp: new Date().toISOString()
                });

                return;
              }

              console.log(`✅ QUOTA CHECK PASSED (MANUAL): Torrent size ${humanBytes(torrentSize)} fits in available space ${humanBytes(availableSpace)}`);

              // Torrent fits - create a simple reservation to track usage
              try {
                await database.reserveSpaceAtomic(userId, torrent.infoHash, torrentSize);
                console.log(`✅ Quota validated and space reserved (manual) - torrent can proceed (${humanBytes(torrentSize)})`);
              } catch (reserveError) {
                console.log(`⚠️ Reservation creation failed but quota OK (manual) - continuing: ${reserveError.message}`);
              }

            } catch (error) {
              console.error('💥 Error during manual quota validation:', error);
              console.error('💥 Error stack:', error.stack);
            }
          }, 1000);
        }

        // ⛔ Stop seeding as soon as download finishes and finalize storage
        torrent.on('done', async () => {
          console.log(`🎉 Download complete: ${torrent.name} for user ${userId}`);

          try {
            // Finalize the reservation (move from reserved to used storage)
            await database.finalizeReservation(userId, torrent.infoHash, torrent.length);
            console.log(`✅ Storage usage updated for completed torrent: ${humanBytes(torrent.length)}`);
          } catch (error) {
            console.error('💥 Error updating storage usage:', error);
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

    t.on('error', (err) => {
      console.error(`💥 Critical error adding torrent for user ${userId}:`, err);
      reject(err);
    });
  });
}

async function getTorrent(infoHash, userId) {
  const c = await getClient();
  return c.get(infoHash) || null;
}

async function listTorrents(userId) {
  const c = await getClient();
  return c.torrents.map(toSummary);
}

async function stopTorrent(infoHash) {
  const c = await getClient();
  const t = c.torrents.find(torrent => torrent.infoHash === infoHash);
  if (!t) return false;

  // Release any active reservation when stopping torrent
  if (t.userId) {
    try {
      await database.releaseReservation(t.userId, infoHash);
      console.log(`🔓 Released reservation for stopped torrent: ${infoHash}`);
    } catch (error) {
      console.log('⚠️ No reservation to release for stopped torrent (normal)');
    }
  }

  return new Promise((resolve, reject) => {
    c.remove(infoHash, { destroyStore: false }, (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

async function removeTorrent(infoHash) {
  const c = await getClient();
  const t = c.torrents.find(torrent => torrent.infoHash === infoHash);
  if (!t) return false;

  // Release any active reservation when removing torrent
  if (t.userId) {
    try {
      await database.releaseReservation(t.userId, infoHash);
      console.log(`🔓 Released reservation for removed torrent: ${infoHash}`);
    } catch (error) {
      console.log('⚠️ No reservation to release for removed torrent (normal)');
    }
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
  quotaExceededNotifications.set(userId, []);
  console.log(`🗑️ Cleared all notifications for user ${userId}`);
}

module.exports = {
  addMagnet,
  getTorrent,
  listTorrents,
  stopTorrent,
  removeTorrent,
  getClient,
  getQuotaExceededNotifications,
  clearQuotaExceededNotification,
  clearAllQuotaExceededNotifications
};