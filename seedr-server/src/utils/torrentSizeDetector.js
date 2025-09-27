// Use dynamic import for parse-torrent since it's an ESM module
let parseTorrent;
async function getParseTorrent() {
  if (!parseTorrent) {
    parseTorrent = (await import('parse-torrent')).default;
  }
  return parseTorrent;
}
const { promisify } = require('util');
const dns = require('dns');
const net = require('net');
const crypto = require('crypto');

// Convert DNS lookup to promise
const lookup = promisify(dns.lookup);

/**
 * Reliable torrent size detection using multiple methods
 * Used by professional services like Seedr
 */

// Method 1: Parse .torrent file directly (most reliable)
async function getTorrentSizeFromFile(torrentBuffer) {
  try {
    const parseTorrent = await getParseTorrent();
    const parsed = parseTorrent(torrentBuffer);
    return {
      success: true,
      size: parsed.length,
      name: parsed.name,
      files: parsed.files,
      method: 'torrent_file'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      method: 'torrent_file'
    };
  }
}

// Method 2: Parse magnet link and extract info hash for DHT lookup
async function parseInfoHashFromMagnet(magnetURI) {
  try {
    const parseTorrent = await getParseTorrent();
    const parsed = parseTorrent(magnetURI);
    return {
      success: true,
      infoHash: parsed.infoHash,
      name: parsed.name,
      trackers: parsed.announce || []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Method 3: DHT-based torrent info fetching (like what Seedr uses)
async function getTorrentSizeFromDHT(infoHash, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const WebTorrent = require('webtorrent');
    const client = new WebTorrent();

    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('DHT lookup timeout'));
    }, timeoutMs);

    // Create a temporary torrent just to get metadata
    const magnetURI = `magnet:?xt=urn:btih:${infoHash}`;

    client.add(magnetURI, {
      store: () => {}, // Dummy store to prevent file creation
      download: false   // Don't download, just get metadata
    }, (torrent) => {
      torrent.on('metadata', () => {
        clearTimeout(timeout);
        const result = {
          success: true,
          size: torrent.length,
          name: torrent.name,
          files: torrent.files.map(f => ({
            name: f.name,
            length: f.length,
            path: f.path
          })),
          method: 'dht_metadata'
        };
        client.destroy();
        resolve(result);
      });

      torrent.on('error', (error) => {
        clearTimeout(timeout);
        client.destroy();
        reject(error);
      });
    });
  });
}

// Method 4: Tracker-based size detection
async function getTorrentSizeFromTrackers(magnetURI, timeoutMs = 15000) {
  try {
    const parsed = await parseInfoHashFromMagnet(magnetURI);
    if (!parsed.success || !parsed.trackers.length) {
      throw new Error('No trackers found in magnet link');
    }

    // Try to connect to trackers and get torrent info
    // This is a simplified version - professional services use more sophisticated tracker communication
    const promises = parsed.trackers.slice(0, 3).map(tracker =>
      queryTracker(tracker, parsed.infoHash, timeoutMs)
    );

    const results = await Promise.allSettled(promises);
    const successful = results.find(r => r.status === 'fulfilled' && r.value.success);

    if (successful) {
      return successful.value;
    }

    throw new Error('All tracker queries failed');
  } catch (error) {
    return {
      success: false,
      error: error.message,
      method: 'tracker_query'
    };
  }
}

// Helper function to query individual tracker
async function queryTracker(trackerUrl, infoHash, timeoutMs) {
  return new Promise((resolve) => {
    // Simplified tracker query - in production, this would implement
    // full tracker protocol (HTTP/UDP announce)
    setTimeout(() => {
      resolve({
        success: false,
        error: 'Tracker query not implemented',
        method: 'tracker_query'
      });
    }, 100);
  });
}

// Method 5: Database cache lookup (for previously seen torrents)
const torrentCache = new Map();

function getTorrentSizeFromCache(infoHash) {
  const cached = torrentCache.get(infoHash);
  if (cached && (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000) { // 24 hour cache
    return {
      success: true,
      size: cached.size,
      name: cached.name,
      method: 'cache'
    };
  }
  return { success: false, method: 'cache' };
}

function cacheTorrentSize(infoHash, size, name) {
  torrentCache.set(infoHash, {
    size,
    name,
    timestamp: Date.now()
  });
}

// Main function: Try multiple methods in order of reliability
async function getTorrentSize(input, options = {}) {
  const { timeoutMs = 30000, preferredMethods = ['file', 'cache', 'dht', 'trackers'] } = options;
  const results = [];

  // If input is a buffer (torrent file), try parsing directly
  if (Buffer.isBuffer(input)) {
    console.log('🔍 Attempting torrent file parsing...');
    const result = await getTorrentSizeFromFile(input);
    results.push(result);

    if (result.success) {
      console.log(`✅ Got torrent size from file: ${formatBytes(result.size)}`);
      return result;
    }
  }

  // If input is magnet URI, try multiple methods
  if (typeof input === 'string' && input.startsWith('magnet:')) {
    const parsed = await parseInfoHashFromMagnet(input);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Invalid magnet link',
        results
      };
    }

    const infoHash = parsed.infoHash;
    console.log(`🔍 Analyzing magnet link with info hash: ${infoHash}`);

    // Try cache first
    if (preferredMethods.includes('cache')) {
      console.log('🔍 Checking cache...');
      const cacheResult = getTorrentSizeFromCache(infoHash);
      results.push(cacheResult);

      if (cacheResult.success) {
        console.log(`✅ Got torrent size from cache: ${formatBytes(cacheResult.size)}`);
        return cacheResult;
      }
    }

    // Try DHT metadata fetch
    if (preferredMethods.includes('dht')) {
      console.log('🔍 Attempting DHT metadata fetch...');
      try {
        const dhtResult = await getTorrentSizeFromDHT(infoHash, timeoutMs);
        results.push(dhtResult);

        if (dhtResult.success) {
          console.log(`✅ Got torrent size from DHT: ${formatBytes(dhtResult.size)}`);
          // Cache the result
          cacheTorrentSize(infoHash, dhtResult.size, dhtResult.name);
          return dhtResult;
        }
      } catch (error) {
        console.warn('⚠️ DHT metadata fetch failed:', error.message);
        results.push({
          success: false,
          error: error.message,
          method: 'dht_metadata'
        });
      }
    }

    // Try tracker queries as fallback
    if (preferredMethods.includes('trackers')) {
      console.log('🔍 Attempting tracker queries...');
      const trackerResult = await getTorrentSizeFromTrackers(input, timeoutMs);
      results.push(trackerResult);

      if (trackerResult.success) {
        console.log(`✅ Got torrent size from trackers: ${formatBytes(trackerResult.size)}`);
        cacheTorrentSize(infoHash, trackerResult.size, trackerResult.name);
        return trackerResult;
      }
    }
  }

  // All methods failed
  console.error('❌ All torrent size detection methods failed');
  return {
    success: false,
    error: 'Could not determine torrent size using any available method',
    results
  };
}

// Helper function to format bytes
function formatBytes(bytes) {
  const thresh = 1024;
  if (Math.abs(bytes) < thresh) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  return `${bytes.toFixed(2)} ${units[u]}`;
}

module.exports = {
  getTorrentSize,
  getTorrentSizeFromFile,
  getTorrentSizeFromDHT,
  getTorrentSizeFromTrackers,
  parseInfoHashFromMagnet,
  formatBytes
};