
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
  if (!userId) {
    throw new Error('User ID is required for torrent operations');
  }

  const c = await getClient();
  const announce = getTrackers();

  // Ensure user's storage directory exists
  const userStorageDir = ensureUserStorageDir(userId);

  // guard: if same magnet already added for this user, just return its summary
  const existing = c.torrents.find((t) => t.magnetURI === magnet && t.userId === userId);
  if (existing) return toSummary(existing, userId);

  return new Promise((resolve, reject) => {
    const t = c.add(
      magnet,
      { path: path.resolve(userStorageDir), announce },
      (torrent) => {
        // Track which user owns this torrent
        torrent.userId = userId;

        torrent.on("infoHash", () => console.log("got infoHash", torrent.infoHash, "for user", userId));
        torrent.on("metadata", () => console.log("got metadata", torrent.name, "for user", userId));
        torrent.on("ready", () => console.log("torrent ready", torrent.name, "for user", userId));
        torrent.on("error", (err) => console.error("torrent error:", err));
        torrent.on("noPeers", (type) => console.log("no peers from", type));

        // Monitor download progress and validate storage
        torrent.on("download", async () => {
          try {
            const hasSpace = await validateStorageDuringDownload(userId, torrent.length || 0);
            if (!hasSpace) {
              console.log("Storage limit exceeded, pausing torrent:", torrent.infoHash);
              torrent.pause();
            }
          } catch (error) {
            console.error("Error validating storage during download:", error);
          }
        });

        // Immediately stop seeding when complete (keep files) and update storage usage
        torrent.on("done", async () => {
          console.log("download complete → removing to stop seeding:", torrent.infoHash);

          // Update user's storage usage
          try {
            await updateUserStorageUsage(userId);
          } catch (error) {
            console.error("Error updating storage usage:", error);
          }

          c.remove(torrent.infoHash, { destroyStore: false }, (err) => {
            if (err) console.error("error removing after done:", err);
            else console.log("removed (done)", torrent.infoHash);
          });
        });

        torrent.on("ready", () => {
          // Store the original magnet for this torrent
          originalMagnets.set(torrent.infoHash, { magnet, userId });
          resolve(toSummary(torrent, userId));
        });
      }
    );
    t.on("error", reject);
  });
}

async function getTorrent(infoHash) {
  const c = await getClient();
  return c.get(infoHash) || null;
}

async function listTorrents(userId = null) {
  const c = await getClient();
  let torrents = c.torrents;

  // Filter by user if userId provided
  if (userId) {
    torrents = torrents.filter(t => t.userId === userId);
  }

  return torrents.map(t => toSummary(t, t.userId));
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
