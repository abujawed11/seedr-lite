
// src/services/torrentManager.js (CJS compatible, no pretty-bytes)
const path = require('path');
const { logger } = require('../utils/logger');
const { getTrackers } = require('../utils/trackers');

const ROOT = process.env.ROOT || './src/storage/library';

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
      // tune if needed
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
    paused: t.paused || false,
    files: t.files.map((f, i) => ({
      index: i,
      name: f.name,
      path: f.path,
      length: f.length
    })),
    done: t.done
  };
}

const trackers = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://open.stealth.si:80/announce',
  'udp://exodus.desync.com:6969/announce',
  'http://tracker.opentrackr.org:1337/announce',
  'http://open.tracker.cl:1337/announce'
];

// async function addMagnet(magnet) {
//   const c = await getClient();
//   return new Promise((resolve, reject) => {
//     const t = c.add(
//       magnet,
//       { path: path.resolve(ROOT), announce: trackers },
//       (torrent) => {
//         // helpful logging
//         torrent.on('infoHash', () => console.log('got infoHash', torrent.infoHash));
//         torrent.on('metadata', () => console.log('got metadata for', torrent.name));
//         torrent.on('ready', () => console.log('torrent ready', torrent.name));
//         torrent.on('error', (err) => console.error('torrent error:', err));
//         torrent.on('noPeers', (type) => console.log('no peers from', type));

//         torrent.on('ready', () => resolve(toSummary(torrent)));
//       }
//     );
//     t.on('error', reject);
//   });
// }


async function addMagnet(magnet) {
  const c = await getClient();
  const announce = getTrackers();
  return new Promise((resolve, reject) => {
    const t = c.add(
      magnet,
      { path: path.resolve(ROOT), announce },
      (torrent) => {
        // logging
        torrent.on('infoHash', () => console.log('got infoHash', torrent.infoHash));
        torrent.on('metadata', () => console.log('got metadata for', torrent.name));
        torrent.on('ready', () => console.log('torrent ready', torrent.name));
        torrent.on('error', (err) => console.error('torrent error:', err));
        torrent.on('noPeers', (type) => console.log('no peers from', type));

        // ⛔ Stop seeding as soon as download finishes (keep files)
        torrent.on('done', () => {
          console.log('download complete, removing torrent to stop seeding:', torrent.infoHash);
          c.remove(torrent.infoHash, { destroyStore: false }, (err) => {
            if (err) {
              console.error('error removing torrent:', err);
            } else {
              console.log('torrent removed:', torrent.infoHash);
            }
          });
        });

        // resolve summary when torrent is ready (metadata available)
        torrent.on('ready', () => resolve(toSummary(torrent)));
      }
    );

    t.on('error', reject);
  });
}

async function getTorrent(infoHash) {
  const c = await getClient();
  return c.get(infoHash) || null;
}

async function listTorrents() {
  const c = await getClient();
  return c.torrents.map(toSummary);
}

async function pauseTorrent(infoHash) {
  const c = await getClient();

  // Try to find torrent in the torrents array instead of using c.get()
  const t = c.torrents.find(torrent => torrent.infoHash === infoHash);

  if (!t) {
    throw new Error('Torrent not found or has been completed and removed');
  }

  if (t.done) {
    throw new Error('Cannot pause completed torrent');
  }

  // Check if pause method exists
  if (typeof t.pause !== 'function') {
    console.log('Torrent methods:', Object.getOwnPropertyNames(t).filter(prop => typeof t[prop] === 'function'));
    console.log('Checking pause property type:', typeof t.pause);
    throw new Error('Pause method not available on torrent object');
  }

  t.pause();
  return true;
}

async function resumeTorrent(infoHash) {
  const c = await getClient();

  // Try to find torrent in the torrents array instead of using c.get()
  const t = c.torrents.find(torrent => torrent.infoHash === infoHash);

  if (!t) {
    throw new Error('Torrent not found or has been completed and removed');
  }

  if (t.done) {
    throw new Error('Cannot resume completed torrent');
  }

  // Check if resume method exists
  if (typeof t.resume !== 'function') {
    console.log('Torrent methods:', Object.getOwnPropertyNames(t).filter(prop => typeof t[prop] === 'function'));
    console.log('Checking resume property type:', typeof t.resume);
    throw new Error('Resume method not available on torrent object');
  }

  t.resume();
  return true;
}

async function stopTorrent(infoHash) {
  const c = await getClient();
  const t = c.get(infoHash);
  if (!t) return false;
  return new Promise((resolve, reject) => {
    c.remove(infoHash, { destroyStore: false }, (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

async function removeTorrent(infoHash) {
  const c = await getClient();
  const t = c.get(infoHash);
  if (!t) return false;
  return new Promise((resolve, reject) => {
    c.remove(infoHash, { destroyStore: false }, (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

module.exports = {
  addMagnet,
  getTorrent,
  listTorrents,
  pauseTorrent,
  resumeTorrent,
  stopTorrent,
  removeTorrent
};
