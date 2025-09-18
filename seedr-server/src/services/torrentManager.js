
// // src/services/torrentManager.js (CJS compatible, no pretty-bytes)
// const path = require('path');
// const { logger } = require('../utils/logger');
// const { getTrackers } = require('../utils/trackers');

// const ROOT = process.env.ROOT || './src/storage/library';

// let WebTorrentMod;   // ESM default export
// let client;          // singleton

// // Store paused torrents in memory
// const pausedTorrents = new Map();

// // Simple human-readable bytes formatter (replaces pretty-bytes)
// function humanBytes(bytes) {
//   const thresh = 1024;
//   if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
//   if (Math.abs(bytes) < thresh) return `${bytes} B`;
//   const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
//   let u = -1;
//   do {
//     bytes /= thresh;
//     ++u;
//   } while (Math.abs(bytes) >= thresh && u < units.length - 1);
//   // fewer decimals for small units
//   const fixed = u < 2 ? 0 : 2;
//   return `${bytes.toFixed(fixed)} ${units[u]}`;
// }

// async function getClient() {
//   if (!WebTorrentMod) {
//     WebTorrentMod = (await import('webtorrent')).default;
//   }
//   if (!client) {
//     client = new WebTorrentMod({
//       // tune if needed
//       dht: true,
//       tracker: true,
//     });
//     client.on('error', (e) => logger.error('WebTorrent error:', e.message));
//   }
//   return client;
// }

// function toSummary(t) {
//   return {
//     id: t.infoHash,
//     name: t.name,
//     progress: Number((t.progress * 100).toFixed(2)),
//     downloaded: humanBytes(t.downloaded),
//     length: humanBytes(t.length || 0),
//     downloadSpeed: `${humanBytes(t.downloadSpeed)}/s`,
//     uploadSpeed: `${humanBytes(t.uploadSpeed)}/s`,
//     numPeers: t.numPeers,
//     paused: false, // Active torrents are never paused
//     files: t.files.map((f, i) => ({
//       index: i,
//       name: f.name,
//       path: f.path,
//       length: f.length
//     })),
//     done: t.done
//   };
// }

// const trackers = [
//   'udp://tracker.opentrackr.org:1337/announce',
//   'udp://tracker.torrent.eu.org:451/announce',
//   'udp://open.stealth.si:80/announce',
//   'udp://exodus.desync.com:6969/announce',
//   'http://tracker.opentrackr.org:1337/announce',
//   'http://open.tracker.cl:1337/announce'
// ];

// // async function addMagnet(magnet) {
// //   const c = await getClient();
// //   return new Promise((resolve, reject) => {
// //     const t = c.add(
// //       magnet,
// //       { path: path.resolve(ROOT), announce: trackers },
// //       (torrent) => {
// //         // helpful logging
// //         torrent.on('infoHash', () => console.log('got infoHash', torrent.infoHash));
// //         torrent.on('metadata', () => console.log('got metadata for', torrent.name));
// //         torrent.on('ready', () => console.log('torrent ready', torrent.name));
// //         torrent.on('error', (err) => console.error('torrent error:', err));
// //         torrent.on('noPeers', (type) => console.log('no peers from', type));

// //         torrent.on('ready', () => resolve(toSummary(torrent)));
// //       }
// //     );
// //     t.on('error', reject);
// //   });
// // }


// async function addMagnet(magnet) {
//   const c = await getClient();
//   const announce = getTrackers();
//   return new Promise((resolve, reject) => {
//     const t = c.add(
//       magnet,
//       { path: path.resolve(ROOT), announce },
//       (torrent) => {
//         // logging
//         torrent.on('infoHash', () => console.log('got infoHash', torrent.infoHash));
//         torrent.on('metadata', () => console.log('got metadata for', torrent.name));
//         torrent.on('ready', () => console.log('torrent ready', torrent.name));
//         torrent.on('error', (err) => console.error('torrent error:', err));
//         torrent.on('noPeers', (type) => console.log('no peers from', type));

//         // ⛔ Stop seeding as soon as download finishes (keep files)
//         torrent.on('done', () => {
//           console.log('download complete, removing torrent to stop seeding:', torrent.infoHash);
//           c.remove(torrent.infoHash, { destroyStore: false }, (err) => {
//             if (err) {
//               console.error('error removing torrent:', err);
//             } else {
//               console.log('torrent removed:', torrent.infoHash);
//             }
//           });
//         });

//         // resolve summary when torrent is ready (metadata available)
//         torrent.on('ready', () => resolve(toSummary(torrent)));
//       }
//     );

//     t.on('error', reject);
//   });
// }

// async function getTorrent(infoHash) {
//   const c = await getClient();
//   return c.get(infoHash) || null;
// }

// async function listTorrents() {
//   const c = await getClient();
//   const activeTorrents = c.torrents.map(toSummary);

//   // Add paused torrents to the list
//   const pausedTorrentsList = Array.from(pausedTorrents.entries()).map(([infoHash, info]) => ({
//     id: infoHash,
//     name: info.name || infoHash,
//     progress: info.progress ? Number((info.progress * 100).toFixed(2)) : 0,
//     downloaded: humanBytes(info.downloaded || 0),
//     length: humanBytes(info.length || 0),
//     downloadSpeed: '0 B/s',
//     uploadSpeed: '0 B/s',
//     numPeers: 0,
//     paused: true,
//     files: info.files || [],
//     done: false
//   }));

//   return [...activeTorrents, ...pausedTorrentsList];
// }

// async function pauseTorrent(infoHash) {
//   const c = await getClient();

//   // First check if it's already paused
//   if (pausedTorrents.has(infoHash)) {
//     throw new Error('Torrent is already paused');
//   }

//   // Find the active torrent
//   const t = c.torrents.find(torrent => torrent.infoHash === infoHash);

//   if (!t) {
//     throw new Error('Torrent not found or has been completed and removed');
//   }

//   if (t.done) {
//     throw new Error('Cannot pause completed torrent');
//   }

//   // Store torrent information for resume
//   const torrentInfo = {
//     magnetURI: t.magnetURI,
//     name: t.name,
//     path: t.path,
//     announce: t.announce,
//     progress: t.progress,
//     downloaded: t.downloaded,
//     length: t.length,
//     files: t.files.map((f, i) => ({
//       index: i,
//       name: f.name,
//       path: f.path,
//       length: f.length
//     }))
//   };

//   pausedTorrents.set(infoHash, torrentInfo);

//   // Remove torrent but keep files
//   return new Promise((resolve, reject) => {
//     c.remove(infoHash, { destroyStore: false }, (err) => {
//       if (err) {
//         // If removal fails, clean up the paused state
//         pausedTorrents.delete(infoHash);
//         return reject(err);
//       }
//       console.log('Torrent paused (removed from client but files kept):', infoHash);
//       resolve(true);
//     });
//   });
// }

// async function resumeTorrent(infoHash) {
//   // Check if torrent is paused
//   const torrentInfo = pausedTorrents.get(infoHash);

//   if (!torrentInfo) {
//     throw new Error('Torrent is not paused or not found');
//   }

//   try {
//     // Re-add the torrent using the stored magnet URI
//     const result = await addMagnet(torrentInfo.magnetURI);

//     // Remove from paused torrents
//     pausedTorrents.delete(infoHash);

//     console.log('Torrent resumed (re-added to client):', infoHash);
//     return result;
//   } catch (error) {
//     // If resume fails, keep it in paused state
//     throw new Error(`Failed to resume torrent: ${error.message}`);
//   }
// }

// async function stopTorrent(infoHash) {
//   const c = await getClient();

//   // Check if torrent is paused
//   if (pausedTorrents.has(infoHash)) {
//     // Just remove from paused state
//     pausedTorrents.delete(infoHash);
//     return true;
//   }

//   // Find active torrent
//   const t = c.torrents.find(torrent => torrent.infoHash === infoHash);
//   if (!t) return false;

//   return new Promise((resolve, reject) => {
//     c.remove(infoHash, { destroyStore: false }, (err) => {
//       if (err) return reject(err);
//       resolve(true);
//     });
//   });
// }

// async function removeTorrent(infoHash) {
//   const c = await getClient();

//   // Check if torrent is paused
//   if (pausedTorrents.has(infoHash)) {
//     // Just remove from paused state
//     pausedTorrents.delete(infoHash);
//     return true;
//   }

//   // Find active torrent
//   const t = c.torrents.find(torrent => torrent.infoHash === infoHash);
//   if (!t) return false;

//   return new Promise((resolve, reject) => {
//     c.remove(infoHash, { destroyStore: false }, (err) => {
//       if (err) return reject(err);
//       resolve(true);
//     });
//   });
// }

// module.exports = {
//   addMagnet,
//   getTorrent,
//   listTorrents,
//   pauseTorrent,
//   resumeTorrent,
//   stopTorrent,
//   removeTorrent
// };







// CJS-friendly WebTorrent manager with hard pause/resume semantics (remove & re-add)

const path = require("path");
const { logger } = require("../utils/logger");
const { getTrackers } = require("../utils/trackers");
const { getUserStorageDir, ensureUserStorageDir, updateUserStorageUsage } = require("../utils/storage");
const { validateStorageDuringDownload } = require("../middlewares/storageValidator");

const ROOT = process.env.ROOT || "./src/storage/library";

let WebTorrentMod;   // ESM default export holder
let client;          // singleton client

// Store original magnet links for each torrent (for reference)
const originalMagnets = new Map();

// simple human-readable bytes
function humanBytes(bytes) {
  const thresh = 1024;
  if (typeof bytes !== "number" || isNaN(bytes)) return "0 B";
  if (Math.abs(bytes) < thresh) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB", "PB", "EB"];
  let u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  const fixed = u < 2 ? 0 : 2;
  return `${bytes.toFixed(fixed)} ${units[u]}`;
}

async function getClient() {
  if (!WebTorrentMod) {
    WebTorrentMod = (await import("webtorrent")).default;
  }
  if (!client) {
    client = new WebTorrentMod({
      dht: true,
      tracker: true,
    });
    client.on("error", (e) => logger.error("WebTorrent error:", e?.message || e));
  }
  return client;
}

function toSummary(t, userId = null) {
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
      length: f.length,
    })),
    done: t.done,
    userId: userId, // Track which user owns this torrent
  };
}

function dedupeById(items) {
  const m = new Map();
  for (const it of items) m.set(it.id, it);
  return Array.from(m.values());
}

/**
 * addMagnet: idempotent-ish; returns existing torrent summary if already added
 * Now requires userId for user-specific storage
 */
async function addMagnet(magnet, userId) {
  console.log('🔥 addMagnet called with:', {
    userId,
    magnetPreview: magnet.substring(0, 60) + '...'
  });

  if (!userId) {
    console.error('❌ No user ID provided to addMagnet');
    throw new Error('User ID is required for torrent operations');
  }

  console.log('🔧 Getting WebTorrent client...');
  const c = await getClient();
  console.log('✅ WebTorrent client obtained');

  console.log('🌐 Getting trackers...');
  const announce = getTrackers();
  console.log(`📡 Using ${announce.length} trackers`);

  console.log('📁 Setting up user storage directory...');
  const userStorageDir = ensureUserStorageDir(userId);
  console.log(`💾 Storage directory: ${userStorageDir}`);

  // Simple guard: if same magnet already added, just return its summary (like backup)
  console.log('🔍 Checking for existing torrents...');
  const existing = c.torrents.find((t) => t.magnetURI === magnet);
  if (existing && existing.userId === userId) {
    console.log("♻️ Torrent already exists for user, returning existing:", existing.infoHash);
    return toSummary(existing, userId);
  }
  console.log('🆕 No existing torrent found, creating new one...');

  return new Promise((resolve, reject) => {
    console.log('⚡ Adding torrent to WebTorrent client...');

    const t = c.add(
      magnet,
      { path: path.resolve(userStorageDir), announce },
      (torrent) => {
        console.log('🎯 Torrent added to client successfully!');

        // Track which user owns this torrent - SET IMMEDIATELY
        torrent.userId = userId;
        console.log('👤 User ID assigned to torrent:', torrent.userId);

        // Enhanced event logging
        torrent.on("infoHash", () => {
          console.log("🔑 InfoHash obtained:", torrent.infoHash, "for user", userId);
        });

        torrent.on("metadata", () => {
          console.log("📋 Metadata received:", {
            name: torrent.name,
            size: humanBytes(torrent.length),
            fileCount: torrent.files.length,
            userId
          });
        });

        torrent.on("ready", () => {
          console.log("🚀 Torrent ready:", {
            name: torrent.name,
            infoHash: torrent.infoHash,
            fileCount: torrent.files.length,
            userId
          });
        });

        torrent.on("error", (err) => {
          console.error("💥 Torrent error:", {
            error: err.message,
            infoHash: torrent.infoHash,
            name: torrent.name,
            userId
          });
        });

        torrent.on("noPeers", (type) => {
          console.log("🔍 No peers found from:", type, "for torrent:", torrent.name);
        });

        // Enhanced download monitoring
        let lastLoggedProgress = 0;
        torrent.on("download", () => {
          const currentProgress = Math.floor(torrent.progress * 100);
          // Log every 5% progress change to avoid spam
          if (currentProgress > 0 && currentProgress !== lastLoggedProgress && currentProgress % 5 === 0) {
            console.log(`📈 Download progress: ${currentProgress}% - ${torrent.name} (${humanBytes(torrent.downloaded)}/${humanBytes(torrent.length)})`);
            lastLoggedProgress = currentProgress;
          }
        });

        // Immediately stop seeding when complete (keep files) and update storage usage
        torrent.on("done", async () => {
          console.log("🎉 Download complete! Stopping seeding:", {
            name: torrent.name,
            infoHash: torrent.infoHash,
            size: humanBytes(torrent.length),
            userId
          });

          // Update user's storage usage
          try {
            console.log("📊 Updating user storage usage...");
            await updateUserStorageUsage(userId);
            console.log("✅ Storage usage updated");
          } catch (error) {
            console.error("💥 Error updating storage usage:", error);
          }

          c.remove(torrent.infoHash, { destroyStore: false }, (err) => {
            if (err) {
              console.error("💥 Error removing torrent after completion:", err);
            } else {
              console.log("🗑️ Torrent removed from client (files kept):", torrent.infoHash);
            }
          });
        });

        // ⚡ IMMEDIATE RESOLUTION: Don't wait for events, resolve immediately with torrent object
        console.log("⚡ Creating immediate response for frontend...");

        // Generate a temporary infoHash if not available yet
        const tempId = torrent.infoHash || torrent.magnetURI.match(/urn:btih:([^&]+)/)?.[1] || 'temp-' + Date.now();
        console.log("🆔 Using temporary ID:", tempId);

        // Store the original magnet for this torrent
        originalMagnets.set(tempId, { magnet, userId });

        const summary = {
          id: tempId,
          name: torrent.name || 'Loading...', // Temporary name until metadata loads
          progress: 0,
          downloaded: humanBytes(0),
          length: humanBytes(torrent.length || 0),
          downloadSpeed: `0 B/s`,
          uploadSpeed: `0 B/s`,
          numPeers: 0,
          files: [],
          done: false,
          userId: userId
        };

        console.log("✅ Torrent summary created:", {
          id: summary.id,
          name: summary.name,
          userId
        });

        // IMPORTANT: Resolve immediately so torrent appears in listTorrents
        console.log("🚀 Resolving torrent addition - should now be visible in API");
        resolve(summary);
      }
    );

    // Set userId immediately on the torrent object (backup mechanism)
    console.log('🔧 Setting userId on torrent object immediately...');
    t.userId = userId;
    console.log('✅ Backup userId set on torrent:', t.userId);

    t.on("error", (err) => {
      console.error("💥 Critical error adding torrent:", {
        error: err.message,
        stack: err.stack,
        magnetPreview: magnet.substring(0, 60),
        userId
      });
      reject(err);
    });
  });
}

async function getTorrent(infoHash, userId = null) {
  const c = await getClient();
  const torrent = c.get(infoHash);

  if (!torrent) {
    return null;
  }

  // If userId is provided, ensure the torrent belongs to the user
  if (userId && torrent.userId !== userId) {
    return null;
  }

  return torrent;
}

async function listTorrents(userId = null) {
  console.log('📋 listTorrents called with userId:', userId);
  const c = await getClient();
  console.log('📊 Total torrents in client:', c.torrents.length);

  let torrents = c.torrents;
  console.log('🔍 All torrents:', torrents.map(t => ({
    id: t.infoHash,
    name: t.name,
    userId: t.userId,
    progress: Math.round(t.progress * 100)
  })));

  // Filter by user if userId provided
  if (userId) {
    torrents = torrents.filter(t => t.userId === userId);
    console.log('🎯 Filtered torrents for user', userId + ':', torrents.length);
  }

  const result = torrents.map(t => toSummary(t, t.userId));
  console.log('📤 Returning torrent summaries:', result.length);
  return result;
}



async function stopTorrent(infoHash) {
  const c = await getClient();
  const t = c.get(infoHash);
  if (!t) return false;

  return new Promise((resolve, reject) => {
    c.remove(infoHash, { destroyStore: false }, (err) => {
      if (err) return reject(err);
      // Clean up stored magnet URI
      originalMagnets.delete(infoHash);
      console.log("Torrent stopped (removed, files kept):", infoHash);
      resolve(true);
    });
  });
}

async function removeTorrent(infoHash) {
  // Just use stopTorrent for removal (they do the same thing now)
  return stopTorrent(infoHash);
}

module.exports = {
  addMagnet,
  getTorrent,
  listTorrents,
  stopTorrent,
  removeTorrent,
};
