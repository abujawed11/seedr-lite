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
// const { logger } = require('../utils/logger');
// const { getTrackers } = require('../utils/trackers');

// const TORRENT_META_TIMEOUT_MS = parseInt(process.env.TORRENT_META_TIMEOUT_MS) || 15000;

// // --- Simple LRU cache ---
// class LRUCache {
//   constructor(maxSize = 200) { this.maxSize = maxSize; this.cache = new Map(); }
//   get(k){ if(!this.cache.has(k)) return null; const v=this.cache.get(k); this.cache.delete(k); this.cache.set(k,v); return v; }
//   set(k,v){ if(this.cache.has(k)) this.cache.delete(k); else if(this.cache.size>=this.maxSize) this.cache.delete(this.cache.keys().next().value); this.cache.set(k,v); }
//   has(k){ return this.cache.has(k); }
//   clear(){ this.cache.clear(); }
// }
// const metadataLRUCache = new LRUCache(200);

// function extractInfoHashFromMagnet(magnet){
//   if (!magnet || typeof magnet !== 'string') throw new Error('Invalid magnet URI');
//   const m = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[A-Za-z2-7]{32})/);
//   if (!m) throw new Error('Invalid magnet URI: no info hash found');
//   return m[1].toLowerCase();
// }

// function humanBytes(bytes){
//   const u=['B','KB','MB','GB','TB']; let i=0;
//   if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
//   while(bytes>=1024 && i<u.length-1){bytes/=1024;i++;}
//   return `${(i<2?bytes.toFixed(0):bytes.toFixed(2))} ${u[i]}`;
// }

// /**
//  * Fetch torrent metadata without downloading pieces.
//  * Uses dynamic import for ESM-only 'webtorrent'.
//  */
// async function getTorrentMetadata(magnet, { timeoutMs = TORRENT_META_TIMEOUT_MS } = {}) {
//   if (!magnet || typeof magnet !== 'string') throw new Error('Invalid magnet URI provided');

//   // Dynamic ESM import (required because webtorrent uses top-level await)
//   const mod = await import('webtorrent');
//   const WebTorrent = mod.default || mod; // default export

//   const infoHash = extractInfoHashFromMagnet(magnet);

//   const cached = metadataLRUCache.get(infoHash);
//   if (cached) {
//     logger.info(`[INSPECT CACHE] ${infoHash}: ${cached.name} (${humanBytes(cached.sizeBytes)})`);
//     return cached;
//   }

//   logger.info(`[INSPECT START] ${infoHash}`);
//   const client = new WebTorrent({ dht: true, tracker: true, maxConns: 20 });

//   return new Promise((resolve, reject) => {
//     let timeout; 
//     let settled = false;

//     const finish = (err, data, torrent) => {
//       if (settled) return;
//       settled = true;
//       clearTimeout(timeout);
//       const destroyTorrent = (cb) => torrent ? torrent.destroy({ destroyStore: true }, cb) : cb();
//       destroyTorrent(() => client.destroy(() => (err ? reject(err) : resolve(data))));
//     };

//     const trackers = getTrackers() || [];
//     const torrent = client.add(magnet, { announce: trackers });

//     // No pause; just ensure nothing is selected
//     torrent.on('ready', () => {
//       try {
//         if (torrent.pieces && torrent.pieces.length) {
//           torrent.deselect(0, torrent.pieces.length - 1, true);
//         }
//       } catch (e) {
//         logger.warn('[INSPECT] deselect warning:', e.message);
//       }
//     });

//     torrent.once('metadata', () => {
//       const meta = {
//         infoHash: torrent.infoHash,
//         name: torrent.name || 'Unknown',
//         sizeBytes: torrent.length || 0,
//         files: (torrent.files || []).map((f, i) => ({ index: i, name: f.name, path: f.path, length: f.length }))
//       };
//       logger.info(`[INSPECT OK] ${meta.name}, size=${humanBytes(meta.sizeBytes)}, files=${meta.files.length}`);
//       metadataLRUCache.set(infoHash, meta);
//       finish(null, meta, torrent);
//     });

//     torrent.on('warning', (w) => logger.warn(`[INSPECT WARN] ${infoHash}: ${w && w.message || w}`));
//     torrent.once('error', (e) => {
//       logger.error(`[INSPECT ERROR] ${infoHash}: ${e.message}`);
//       finish(new Error(`Failed to fetch metadata: ${e.message}`), null, torrent);
//     });

//     timeout = setTimeout(() => {
//       logger.error(`[INSPECT TIMEOUT] ${infoHash} after ${timeoutMs}ms`);
//       finish(new Error(`Metadata fetch timeout after ${timeoutMs}ms`), null, torrent);
//     }, timeoutMs);
//   });
// }

// function clearMetadataCache(){ metadataLRUCache.clear(); logger.info('[INSPECT] Metadata cache cleared'); }
// function getCacheStats(){ return { size: metadataLRUCache.cache.size, maxSize: metadataLRUCache.maxSize }; }

// module.exports = {
//   getTorrentMetadata,
//   clearMetadataCache,
//   getCacheStats,
//   extractInfoHashFromMagnet,
//   TORRENT_META_TIMEOUT_MS
// };





// src/services/torrentMetadata.js
const { logger } = require('../utils/logger');
const { getTrackers, getReliableTrackers, getExtendedTrackers } = require('../utils/trackers');

// Aggressive timeouts for fast metadata fetching
const TORRENT_META_TIMEOUT_MS = parseInt(process.env.TORRENT_META_TIMEOUT_MS) || 30000;
const RETRY_ATTEMPTS = parseInt(process.env.TORRENT_META_RETRIES) || 3;
const RETRY_DELAY_MS = parseInt(process.env.TORRENT_META_RETRY_DELAY) || 2000;

// Fast dead torrent detection settings
const FAST_CHECK_TIMEOUT_MS = 8000;  // Quick 8-second check first
const DEAD_TORRENT_INDICATORS = new Set([
  'no peers found',
  'operation was aborted',
  'tracker request timed out',
  'getaddrinfo ENOTFOUND',
  'invalid announce message',
  'fetch failed'
]);

// LRU Cache for metadata
class LRUCache {
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }
}

const metadataCache = new LRUCache(500);
let WebTorrentClient;

async function getWebTorrentClient() {
  if (!WebTorrentClient) {
    const WebTorrent = (await import('webtorrent')).default;
    WebTorrentClient = WebTorrent;
  }
  return WebTorrentClient;
}

function extractInfoHashFromMagnet(magnet) {
  const m = typeof magnet === 'string' && magnet.match(/urn:btih:([a-fA-F0-9]{40}|[A-Za-z2-7]{32})/);
  if (!m) throw new Error('Invalid magnet URI: no info hash found');
  return m[1].toLowerCase();
}

// Enhanced magnet link with additional trackers
function enhanceMagnetWithTrackers(magnet, additionalTrackers = []) {
  const trackers = getTrackers(additionalTrackers);
  if (!trackers.length) return magnet;

  const trackersParam = trackers.map(tracker => `&tr=${encodeURIComponent(tracker)}`).join('');
  return magnet.includes('&tr=') ? magnet : magnet + trackersParam;
}

// Fast dead torrent detection - quick 8-second check with only reliable trackers
async function fastDeadTorrentCheck(magnet, infoHash) {
  logger.info(`[FAST CHECK] Quick health check for ${infoHash}...`);

  const WebTorrent = await getWebTorrentClient();
  const client = new WebTorrent({
    dht: true,
    tracker: true,
    maxConns: 50,  // Fewer connections for quick check
    downloadLimit: -1,
    uploadLimit: 0
  });

  const reliableTrackers = getReliableTrackers().slice(0, 5); // Only top 5 reliable trackers
  const enhancedMagnet = enhanceMagnetWithTrackers(magnet, reliableTrackers);

  return new Promise((resolve) => {
    let errorCount = 0;
    let warnings = [];
    let hasPeers = false;
    let hasMetadata = false;
    let torrent = null;  // Declare torrent variable in scope

    const cleanup = () => {
      if (torrent && !torrent.destroyed) {
        try {
          torrent.destroy({ destroyStore: true });
        } catch (err) {
          // Ignore cleanup errors
        }
      }
      if (client && !client.destroyed) {
        try {
          client.destroy();
        } catch (err) {
          // Ignore destroy errors
        }
      }
    };

    const timeout = setTimeout(() => {
      cleanup();

      // Analyze warnings to determine if torrent is likely dead
      const deadSignals = warnings.filter(w =>
        Array.from(DEAD_TORRENT_INDICATORS).some(indicator =>
          w.toLowerCase().includes(indicator)
        )
      ).length;

      const isDead = !hasMetadata && !hasPeers && (deadSignals >= 3 || errorCount >= 8);

      logger.info(`[FAST CHECK] ${infoHash} result: ${isDead ? 'LIKELY DEAD' : 'POSSIBLY ALIVE'} (errors: ${errorCount}, warnings: ${deadSignals})`);

      resolve({
        isDead,
        errorCount,
        warningCount: deadSignals,
        hasMetadata,
        hasPeers
      });
    }, FAST_CHECK_TIMEOUT_MS);

    try {
      torrent = client.add(enhancedMagnet, {
        announce: reliableTrackers,
        store: () => ({
          put: () => {},
          get: () => Buffer.alloc(0),
          close: () => {},
          destroy: () => {}
        })
      });

      torrent.on('metadata', () => {
        hasMetadata = true;
        logger.info(`[FAST CHECK] ${infoHash} has metadata - ALIVE!`);
        clearTimeout(timeout);
        cleanup();
        resolve({ isDead: false, hasMetadata: true, hasPeers: false });
      });

      torrent.on('wire', () => {
        hasPeers = true;
        logger.debug(`[FAST CHECK] ${infoHash} found peers`);
      });

      torrent.on('warning', (warning) => {
        const warningMsg = warning.message || warning;
        warnings.push(warningMsg.toLowerCase());
        errorCount++;
        logger.debug(`[FAST CHECK] Warning ${errorCount}: ${warningMsg}`);
      });

      torrent.on('error', (error) => {
        errorCount++;
        warnings.push(error.message.toLowerCase());
        logger.debug(`[FAST CHECK] Error ${errorCount}: ${error.message}`);
      });

      torrent.on('noPeers', (type) => {
        errorCount++;
        logger.debug(`[FAST CHECK] No peers from ${type}`);
      });

    } catch (error) {
      clearTimeout(timeout);
      cleanup();
      logger.warn(`[FAST CHECK] Failed to start: ${error.message}`);
      resolve({ isDead: true, errorCount: 10, hasMetadata: false, hasPeers: false });
    }
  });
}

async function createOptimizedClient() {
  const WebTorrent = await getWebTorrentClient();

  return new WebTorrent({
    // Optimize for metadata fetching
    dht: {
      bootstrap: [
        // Bootstrap with popular DHT nodes for faster peer discovery
        'router.bittorrent.com:6881',
        'dht.transmissionbt.com:6881',
        'router.utorrent.com:6881',
        'dht.libtorrent.org:25401'
      ],
      concurrency: 16,
      // Announce every 15 minutes as per DHT spec
      announce: 15 * 60 * 1000
    },
    tracker: {
      // qBittorrent-style tracker settings
      announce: trackers => {
        // Announce to all trackers in parallel
        return Promise.allSettled(trackers.map(tracker => tracker.announce()));
      },
      // Increase concurrent announces
      getAnnounceOpts: () => ({
        numwant: 50,
        compact: 1
      })
    },
    // Optimize connection limits for metadata fetching
    maxConns: 100,        // Increased from default 55
    downloadLimit: -1,    // No download limit for metadata
    uploadLimit: 0,       // No upload for metadata-only

    // Enable all peer discovery methods
    webSeeds: true,
    dhtEnabled: true,
    trackerEnabled: true,
    lsdEnabled: true,

    // Optimize piece selection for metadata
    strategy: 'rarest'
  });
}

async function attemptMetadataFetch(magnet, timeoutMs, attempt = 1, useExtendedTrackers = false) {
  const infoHash = extractInfoHashFromMagnet(magnet);

  // Choose tracker set based on attempt
  const trackerSet = useExtendedTrackers ? getExtendedTrackers() : getReliableTrackers();
  const enhancedMagnet = enhanceMagnetWithTrackers(magnet, trackerSet);

  logger.info(`[METADATA FETCH] Attempt ${attempt} for ${infoHash} (timeout: ${timeoutMs}ms, trackers: ${useExtendedTrackers ? 'extended' : 'reliable'})`);

  const client = await createOptimizedClient();

  return new Promise((resolve, reject) => {
    let torrent;
    let settled = false;
    let metadataReceived = false;

    const cleanup = () => {
      if (torrent && !torrent.destroyed) {
        try {
          torrent.destroy({ destroyStore: true });
        } catch (err) {
          logger.warn(`[METADATA CLEANUP] Warning: ${err.message}`);
        }
      }
      if (client && !client.destroyed) {
        try {
          client.destroy();
        } catch (err) {
          logger.warn(`[CLIENT CLEANUP] Warning: ${err.message}`);
        }
      }
    };

    const finish = (error, metadata) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cleanup();

      if (error) {
        reject(error);
      } else {
        resolve(metadata);
      }
    };

    const timeout = setTimeout(() => {
      if (!metadataReceived) {
        logger.warn(`[METADATA TIMEOUT] ${infoHash} after ${timeoutMs}ms on attempt ${attempt}`);
        finish(new Error(`Metadata fetch timeout after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    try {
      // Add torrent with selected tracker set
      torrent = client.add(enhancedMagnet, {
        // Use appropriate tracker set for this attempt
        announce: trackerSet,
        // Store implementation that prevents actual downloading
        store: () => ({
          put: () => {},
          get: () => Buffer.alloc(0),
          close: () => {},
          destroy: () => {}
        })
      });

      // Immediately configure for metadata-only
      torrent.on('infoHash', () => {
        logger.debug(`[METADATA] Got infoHash: ${torrent.infoHash}`);

        // Deselect all pieces immediately to prevent downloading
        setImmediate(() => {
          try {
            if (torrent.pieces && torrent.pieces.length > 0) {
              torrent.deselect(0, torrent.pieces.length - 1, true);
              torrent.pause(); // Pause after deselecting pieces
            }
          } catch (err) {
            logger.warn(`[METADATA] Piece deselection warning: ${err.message}`);
          }
        });
      });

      // Handle metadata received
      torrent.once('metadata', () => {
        metadataReceived = true;
        logger.info(`[METADATA SUCCESS] ${torrent.name} (attempt ${attempt})`);

        const metadata = {
          infoHash: torrent.infoHash,
          name: torrent.name || 'Unknown',
          sizeBytes: torrent.length || 0,
          files: (torrent.files || []).map((file, index) => ({
            index,
            name: file.name,
            path: file.path,
            length: file.length
          }))
        };

        // Cache successful result
        metadataCache.set(infoHash, metadata);

        finish(null, metadata);
      });

      // Enhanced error handling
      torrent.once('error', (error) => {
        logger.error(`[METADATA ERROR] ${infoHash} (attempt ${attempt}): ${error.message}`);
        finish(new Error(`Metadata fetch failed: ${error.message}`));
      });

      // Log warnings but don't fail
      torrent.on('warning', (warning) => {
        logger.warn(`[METADATA WARNING] ${infoHash}: ${warning.message || warning}`);
      });

      // Track peer discovery progress
      torrent.on('wire', (wire) => {
        logger.debug(`[METADATA] Connected to peer for ${infoHash}`);
      });

      torrent.on('noPeers', (announceType) => {
        logger.debug(`[METADATA] No peers from ${announceType} for ${infoHash}`);
      });

    } catch (error) {
      logger.error(`[METADATA CRITICAL] Failed to add torrent: ${error.message}`);
      finish(new Error(`Failed to start metadata fetch: ${error.message}`));
    }
  });
}

async function getTorrentMetadata(magnet, options = {}) {
  const {
    timeoutMs = TORRENT_META_TIMEOUT_MS,
    maxRetries = RETRY_ATTEMPTS,
    retryDelay = RETRY_DELAY_MS,
    skipCache = false,
    skipDeadCheck = false  // Option to skip dead torrent check for testing
  } = options;

  if (!magnet || typeof magnet !== 'string') {
    throw new Error('Invalid magnet URI provided');
  }

  const infoHash = extractInfoHashFromMagnet(magnet);

  // Check cache first (unless skipped)
  if (!skipCache && metadataCache.has(infoHash)) {
    const cached = metadataCache.get(infoHash);
    logger.info(`[METADATA CACHE] Found cached result for ${infoHash}: ${cached.name}`);
    return cached;
  }

  // Fast dead torrent check first (unless skipped)
  if (!skipDeadCheck) {
    try {
      const healthCheck = await fastDeadTorrentCheck(magnet, infoHash);

      // If fast check found metadata, return it immediately
      if (healthCheck.hasMetadata) {
        logger.info(`[FAST CHECK SUCCESS] ${infoHash} metadata found in fast check!`);
        // Note: The fast check doesn't cache, so we'll still do the full fetch
      }

      // If torrent appears dead, fail fast with detailed error
      if (healthCheck.isDead) {
        const deadReason = `Torrent appears dead: ${healthCheck.errorCount} errors, ${healthCheck.warningCount} warnings, no peers found`;
        logger.error(`[FAST CHECK FAILED] ${infoHash}: ${deadReason}`);
        throw new Error(`Dead torrent detected: ${deadReason}`);
      }

      logger.info(`[FAST CHECK PASSED] ${infoHash} shows signs of life, proceeding with full fetch...`);

    } catch (fastCheckError) {
      // If fast check indicates dead torrent, fail immediately
      if (fastCheckError.message.includes('Dead torrent detected')) {
        throw fastCheckError;
      }

      // If fast check fails for other reasons, continue with normal flow
      logger.warn(`[FAST CHECK ERROR] ${infoHash}: ${fastCheckError.message}, continuing with normal fetch...`);
    }
  }

  let lastError;

  // Progressive timeout increase with retries
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const attemptTimeout = timeoutMs + ((attempt - 1) * 5000); // Add 5s per retry

    try {
      // Use extended trackers on later attempts
      const useExtendedTrackers = attempt > 1;
      const result = await attemptMetadataFetch(magnet, attemptTimeout, attempt, useExtendedTrackers);
      logger.info(`[METADATA COMPLETE] Successfully fetched ${result.name} in ${attempt} attempt(s)`);
      return result;

    } catch (error) {
      lastError = error;
      logger.warn(`[METADATA RETRY] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delay = retryDelay * attempt; // Progressive delay
        logger.info(`[METADATA RETRY] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  logger.error(`[METADATA FAILED] All ${maxRetries} attempts failed for ${infoHash}: ${lastError.message}`);
  throw new Error(`Failed to fetch metadata after ${maxRetries} attempts: ${lastError.message}`);
}

// Fast add torrent with immediate metadata if available
async function fastAddTorrent(magnet, client) {
  const infoHash = extractInfoHashFromMagnet(magnet);

  // Check if we have cached metadata
  if (metadataCache.has(infoHash)) {
    const cached = metadataCache.get(infoHash);
    logger.info(`[FAST ADD] Using cached metadata for ${cached.name}`);

    // Enhance magnet with all available trackers for faster peer discovery
    const enhancedMagnet = enhanceMagnetWithTrackers(magnet);
    return client.add(enhancedMagnet, {
      announce: getTrackers()
    });
  }

  // No cache, add normally but with enhanced tracker list
  const enhancedMagnet = enhanceMagnetWithTrackers(magnet);
  return client.add(enhancedMagnet, {
    announce: getTrackers()
  });
}

function humanBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${(i < 2 ? bytes.toFixed(0) : bytes.toFixed(2))} ${units[i]}`;
}

function clearMetadataCache() {
  metadataCache.cache.clear();
  logger.info('[METADATA] Cache cleared');
}

function getCacheStats() {
  return {
    size: metadataCache.cache.size,
    maxSize: metadataCache.maxSize
  };
}

module.exports = {
  getTorrentMetadata,
  fastAddTorrent,
  fastDeadTorrentCheck,
  clearMetadataCache,
  getCacheStats,
  extractInfoHashFromMagnet,
  enhanceMagnetWithTrackers
};
