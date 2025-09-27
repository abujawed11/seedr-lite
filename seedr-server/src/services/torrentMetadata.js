// const path = require('path');
// const { logger } = require('../utils/logger');
// const { getTrackers } = require('../utils/trackers');

// const TORRENT_META_TIMEOUT_MS = parseInt(process.env.TORRENT_META_TIMEOUT_MS) || 15000;

// let WebTorrentMod;   // ESM default export
// let metadataCache = new Map(); // Simple in-memory cache

// // Simple LRU cache implementation
// class LRUCache {
//   constructor(maxSize = 100) {
//     this.maxSize = maxSize;
//     this.cache = new Map();
//   }

//   get(key) {
//     if (this.cache.has(key)) {
//       const value = this.cache.get(key);
//       // Move to end (most recently used)
//       this.cache.delete(key);
//       this.cache.set(key, value);
//       return value;
//     }
//     return null;
//   }

//   set(key, value) {
//     if (this.cache.has(key)) {
//       this.cache.delete(key);
//     } else if (this.cache.size >= this.maxSize) {
//       // Remove oldest entry
//       const firstKey = this.cache.keys().next().value;
//       this.cache.delete(firstKey);
//     }
//     this.cache.set(key, value);
//   }

//   has(key) {
//     return this.cache.has(key);
//   }
// }

// // Initialize LRU cache for metadata
// const metadataLRUCache = new LRUCache(200);

// async function getClient() {
//   if (!WebTorrentMod) {
//     WebTorrentMod = (await import('webtorrent')).default;
//   }
//   return WebTorrentMod;
// }

// function extractInfoHashFromMagnet(magnet) {
//   if (!magnet || typeof magnet !== 'string') {
//     throw new Error('Invalid magnet URI');
//   }

//   const match = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[A-Za-z2-7]{32})/);
//   if (!match) {
//     throw new Error('Invalid magnet URI: no info hash found');
//   }

//   return match[1].toLowerCase();
// }

// /**
//  * Fetches torrent metadata without downloading any pieces
//  * @param {string} magnet - Magnet URI
//  * @param {Object} options - Options object
//  * @param {number} options.timeoutMs - Timeout in milliseconds (default: TORRENT_META_TIMEOUT_MS)
//  * @returns {Promise<Object>} - Metadata object with infoHash, name, sizeBytes, files
//  */
// async function getTorrentMetadata(magnet, options = {}) {
//   const timeoutMs = options.timeoutMs || TORRENT_META_TIMEOUT_MS;

//   if (!magnet || typeof magnet !== 'string') {
//     throw new Error('Invalid magnet URI provided');
//   }

//   // Extract info hash for caching
//   let infoHash;
//   try {
//     infoHash = extractInfoHashFromMagnet(magnet);
//   } catch (error) {
//     logger.error('[INSPECT] Invalid magnet URI:', error.message);
//     throw new Error('Invalid magnet URI format');
//   }

//   // Check cache first
//   if (metadataLRUCache.has(infoHash)) {
//     const cached = metadataLRUCache.get(infoHash);
//     logger.info(`[INSPECT CACHE] Found cached metadata for ${infoHash}: ${cached.name} (${humanBytes(cached.sizeBytes)})`);
//     return cached;
//   }

//   logger.info(`[INSPECT START] Fetching metadata for: ${infoHash}`);

//   const WebTorrent = await getClient();
//   const client = new WebTorrent({
//     dht: true,
//     tracker: true,
//     webSeeds: true,
//     // Enable more aggressive peer discovery for metadata
//     maxConns: 20
//   });

//   return new Promise((resolve, reject) => {
//     const cleanup = () => {
//       if (torrent) {
//         try {
//           client.remove(torrent, { destroyStore: false });
//         } catch (err) {
//           // Ignore cleanup errors
//         }
//       }
//       try {
//         client.destroy();
//       } catch (err) {
//         // Ignore destroy errors
//       }
//     };

//     const timeout = setTimeout(() => {
//       cleanup();
//       const error = new Error(`Metadata fetch timeout after ${timeoutMs}ms`);
//       logger.error(`[INSPECT TIMEOUT] ${infoHash}: ${error.message}`);
//       reject(error);
//     }, timeoutMs);

//     let torrent;

//     try {
//       const trackers = getTrackers();

//       torrent = client.add(magnet, {
//         announce: trackers,
//         // Prevent file creation and piece selection
//         store: () => ({
//           // Dummy store that doesn't actually store anything
//           put: () => {},
//           get: () => Buffer.alloc(0),
//           close: () => {},
//           destroy: () => {}
//         })
//       });

//       // Immediately pause and deselect all pieces to prevent downloading
//       torrent.on('infoHash', () => {
//         logger.info(`[INSPECT] Got infoHash: ${torrent.infoHash}`);
//         try {
//           torrent.pause();
//           // Deselect all pieces to prevent any downloading
//           if (torrent.pieces && torrent.pieces.length > 0) {
//             torrent.deselect(0, torrent.pieces.length - 1, true);
//           }
//         } catch (err) {
//           logger.warn('[INSPECT] Warning during piece deselection:', err.message);
//         }
//       });

//       torrent.on('metadata', () => {
//         clearTimeout(timeout);

//         const metadata = {
//           infoHash: torrent.infoHash,
//           name: torrent.name || 'Unknown',
//           sizeBytes: torrent.length || 0,
//           files: torrent.files ? torrent.files.map((file, index) => ({
//             index,
//             name: file.name,
//             path: file.path,
//             length: file.length
//           })) : []
//         };

//         logger.info(`[INSPECT OK] ${metadata.name}, size=${humanBytes(metadata.sizeBytes)}, files=${metadata.files.length}`);

//         // Cache the result
//         metadataLRUCache.set(infoHash, metadata);

//         cleanup();
//         resolve(metadata);
//       });

//       torrent.on('error', (error) => {
//         clearTimeout(timeout);
//         logger.error(`[INSPECT ERROR] ${infoHash}: ${error.message}`);
//         cleanup();
//         reject(new Error(`Failed to fetch torrent metadata: ${error.message}`));
//       });

//       torrent.on('warning', (warning) => {
//         logger.warn(`[INSPECT WARNING] ${infoHash}: ${warning.message || warning}`);
//       });

//       // Handle case where torrent never gets metadata
//       torrent.on('noPeers', (announceType) => {
//         logger.info(`[INSPECT] No peers found from ${announceType} for ${infoHash}`);
//       });

//     } catch (error) {
//       clearTimeout(timeout);
//       logger.error(`[INSPECT CRITICAL] Failed to add torrent: ${error.message}`);
//       cleanup();
//       reject(new Error(`Failed to start metadata fetch: ${error.message}`));
//     }
//   });
// }

// // Helper function for human-readable bytes
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
//   const fixed = u < 2 ? 0 : 2;
//   return `${bytes.toFixed(fixed)} ${units[u]}`;
// }

// /**
//  * Clear the metadata cache (useful for testing or memory management)
//  */
// function clearMetadataCache() {
//   metadataLRUCache = new LRUCache(200);
//   logger.info('[INSPECT] Metadata cache cleared');
// }

// /**
//  * Get cache statistics
//  */
// function getCacheStats() {
//   return {
//     size: metadataLRUCache.cache.size,
//     maxSize: metadataLRUCache.maxSize
//   };
// }

// module.exports = {
//   getTorrentMetadata,
//   clearMetadataCache,
//   getCacheStats,
//   extractInfoHashFromMagnet,
//   TORRENT_META_TIMEOUT_MS
// };


// src/services/torrentMetadata.js
const { logger } = require('../utils/logger');
const { getTrackers } = require('../utils/trackers');

const TORRENT_META_TIMEOUT_MS = parseInt(process.env.TORRENT_META_TIMEOUT_MS) || 15000;

// --- Simple LRU cache ---
class LRUCache {
  constructor(maxSize = 200) { this.maxSize = maxSize; this.cache = new Map(); }
  get(k){ if(!this.cache.has(k)) return null; const v=this.cache.get(k); this.cache.delete(k); this.cache.set(k,v); return v; }
  set(k,v){ if(this.cache.has(k)) this.cache.delete(k); else if(this.cache.size>=this.maxSize) this.cache.delete(this.cache.keys().next().value); this.cache.set(k,v); }
  has(k){ return this.cache.has(k); }
  clear(){ this.cache.clear(); }
}
const metadataLRUCache = new LRUCache(200);

function extractInfoHashFromMagnet(magnet){
  if (!magnet || typeof magnet !== 'string') throw new Error('Invalid magnet URI');
  const m = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[A-Za-z2-7]{32})/);
  if (!m) throw new Error('Invalid magnet URI: no info hash found');
  return m[1].toLowerCase();
}

function humanBytes(bytes){
  const u=['B','KB','MB','GB','TB']; let i=0;
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
  while(bytes>=1024 && i<u.length-1){bytes/=1024;i++;}
  return `${(i<2?bytes.toFixed(0):bytes.toFixed(2))} ${u[i]}`;
}

/**
 * Fetch torrent metadata without downloading pieces.
 * Uses dynamic import for ESM-only 'webtorrent'.
 */
async function getTorrentMetadata(magnet, { timeoutMs = TORRENT_META_TIMEOUT_MS } = {}) {
  if (!magnet || typeof magnet !== 'string') throw new Error('Invalid magnet URI provided');

  // Dynamic ESM import (required because webtorrent uses top-level await)
  const mod = await import('webtorrent');
  const WebTorrent = mod.default || mod; // default export

  const infoHash = extractInfoHashFromMagnet(magnet);

  const cached = metadataLRUCache.get(infoHash);
  if (cached) {
    logger.info(`[INSPECT CACHE] ${infoHash}: ${cached.name} (${humanBytes(cached.sizeBytes)})`);
    return cached;
  }

  logger.info(`[INSPECT START] ${infoHash}`);
  const client = new WebTorrent({ dht: true, tracker: true, maxConns: 20 });

  return new Promise((resolve, reject) => {
    let timeout; 
    let settled = false;

    const finish = (err, data, torrent) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const destroyTorrent = (cb) => torrent ? torrent.destroy({ destroyStore: true }, cb) : cb();
      destroyTorrent(() => client.destroy(() => (err ? reject(err) : resolve(data))));
    };

    const trackers = getTrackers() || [];
    const torrent = client.add(magnet, { announce: trackers });

    // No pause; just ensure nothing is selected
    torrent.on('ready', () => {
      try {
        if (torrent.pieces && torrent.pieces.length) {
          torrent.deselect(0, torrent.pieces.length - 1, true);
        }
      } catch (e) {
        logger.warn('[INSPECT] deselect warning:', e.message);
      }
    });

    torrent.once('metadata', () => {
      const meta = {
        infoHash: torrent.infoHash,
        name: torrent.name || 'Unknown',
        sizeBytes: torrent.length || 0,
        files: (torrent.files || []).map((f, i) => ({ index: i, name: f.name, path: f.path, length: f.length }))
      };
      logger.info(`[INSPECT OK] ${meta.name}, size=${humanBytes(meta.sizeBytes)}, files=${meta.files.length}`);
      metadataLRUCache.set(infoHash, meta);
      finish(null, meta, torrent);
    });

    torrent.on('warning', (w) => logger.warn(`[INSPECT WARN] ${infoHash}: ${w && w.message || w}`));
    torrent.once('error', (e) => {
      logger.error(`[INSPECT ERROR] ${infoHash}: ${e.message}`);
      finish(new Error(`Failed to fetch metadata: ${e.message}`), null, torrent);
    });

    timeout = setTimeout(() => {
      logger.error(`[INSPECT TIMEOUT] ${infoHash} after ${timeoutMs}ms`);
      finish(new Error(`Metadata fetch timeout after ${timeoutMs}ms`), null, torrent);
    }, timeoutMs);
  });
}

function clearMetadataCache(){ metadataLRUCache.clear(); logger.info('[INSPECT] Metadata cache cleared'); }
function getCacheStats(){ return { size: metadataLRUCache.cache.size, maxSize: metadataLRUCache.maxSize }; }

module.exports = {
  getTorrentMetadata,
  clearMetadataCache,
  getCacheStats,
  extractInfoHashFromMagnet,
  TORRENT_META_TIMEOUT_MS
};

