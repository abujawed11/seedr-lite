/**
 * Simplified but reliable torrent size detection
 * Focuses on the most reliable methods used by professional services
 */

const crypto = require('crypto');

// Cache for torrent sizes
const sizeCache = new Map();

// Simple torrent file parser (most reliable method)
async function parseTorrentFile(buffer) {
  try {
    // Use the existing parse-torrent with dynamic import
    const parseTorrent = (await import('parse-torrent')).default;
    const parsed = parseTorrent(buffer);

    return {
      success: true,
      size: parsed.length,
      name: parsed.name,
      infoHash: parsed.infoHash,
      files: parsed.files?.map(f => ({
        name: f.name,
        length: f.length,
        path: f.path
      })) || []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Parse magnet link for basic info
async function parseMagnetLink(magnetURI) {
  try {
    const parseTorrent = (await import('parse-torrent')).default;
    const parsed = parseTorrent(magnetURI);

    return {
      success: true,
      infoHash: parsed.infoHash,
      name: parsed.name || 'Unknown',
      trackers: parsed.announce || []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Simple DHT metadata fetching using a clean WebTorrent instance
async function getMetadataFromDHT(magnetURI, timeoutMs = 20000) {
  let client = null;

  try {
    // Dynamic import for WebTorrent
    const WebTorrent = (await import('webtorrent')).default;
    client = new WebTorrent();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (client) client.destroy();
        reject(new Error('DHT metadata fetch timeout'));
      }, timeoutMs);

      // Add torrent just to get metadata, don't start downloading
      const torrent = client.add(magnetURI, {
        path: '/tmp/webtorrent-temp-' + Date.now(), // Temporary path that won't be used
        download: false  // Don't download, just get metadata
      });

      // Pause immediately to prevent any downloading
      if (torrent.pause) {
        torrent.pause();
      }

      torrent.on('metadata', () => {
        clearTimeout(timeout);
        const result = {
          success: true,
          size: torrent.length,
          name: torrent.name,
          infoHash: torrent.infoHash,
          files: torrent.files?.map(f => ({
            name: f.name,
            length: f.length,
            path: f.path
          })) || []
        };

        client.destroy();
        resolve(result);
      });

      torrent.on('error', (error) => {
        clearTimeout(timeout);
        client.destroy();
        reject(error);
      });

      // Also listen for client errors
      client.on('error', (error) => {
        clearTimeout(timeout);
        client.destroy();
        reject(error);
      });
    });
  } catch (error) {
    if (client) client.destroy();
    throw error;
  }
}

// Cache functions
function getCachedSize(infoHash) {
  const cached = sizeCache.get(infoHash);
  if (cached && (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000) { // 24 hour cache
    return {
      success: true,
      size: cached.size,
      name: cached.name,
      cached: true
    };
  }
  return { success: false };
}

function cacheSize(infoHash, size, name) {
  sizeCache.set(infoHash, {
    size,
    name,
    timestamp: Date.now()
  });
}

// Main function to detect torrent size
async function detectTorrentSize(input, options = {}) {
  const { timeoutMs = 20000 } = options;

  console.log('🔍 Starting torrent size detection...');

  // Method 1: Direct torrent file parsing (100% reliable)
  if (Buffer.isBuffer(input)) {
    console.log('📁 Parsing torrent file directly...');
    const result = await parseTorrentFile(input);

    if (result.success) {
      console.log(`✅ Torrent file parsed: "${result.name}" - ${formatBytes(result.size)}`);
      // Cache the result
      cacheSize(result.infoHash, result.size, result.name);
      return {
        success: true,
        size: result.size,
        name: result.name,
        method: 'torrent_file',
        reliable: true
      };
    } else {
      console.error('❌ Failed to parse torrent file:', result.error);
      return {
        success: false,
        error: 'Invalid torrent file: ' + result.error,
        method: 'torrent_file'
      };
    }
  }

  // Method 2: Magnet link processing
  if (typeof input === 'string' && input.startsWith('magnet:')) {
    console.log('🧲 Processing magnet link...');

    const magnetInfo = await parseMagnetLink(input);
    if (!magnetInfo.success) {
      return {
        success: false,
        error: 'Invalid magnet link: ' + magnetInfo.error,
        method: 'magnet_parse'
      };
    }

    const infoHash = magnetInfo.infoHash;
    console.log(`🔑 Info hash: ${infoHash}`);

    // Check cache first
    console.log('🗄️ Checking cache...');
    const cached = getCachedSize(infoHash);
    if (cached.success) {
      console.log(`✅ Found in cache: "${cached.name}" - ${formatBytes(cached.size)}`);
      return {
        success: true,
        size: cached.size,
        name: cached.name,
        method: 'cache',
        reliable: true
      };
    }

    // Try DHT metadata fetch
    console.log('🌐 Attempting DHT metadata fetch...');
    try {
      const dhtResult = await getMetadataFromDHT(input, timeoutMs);

      if (dhtResult.success) {
        console.log(`✅ DHT metadata success: "${dhtResult.name}" - ${formatBytes(dhtResult.size)}`);
        // Cache the result
        cacheSize(infoHash, dhtResult.size, dhtResult.name);
        return {
          success: true,
          size: dhtResult.size,
          name: dhtResult.name,
          method: 'dht_metadata',
          reliable: true
        };
      }
    } catch (error) {
      console.warn('⚠️ DHT metadata fetch failed:', error.message);
    }

    // All methods failed for magnet link
    return {
      success: false,
      error: 'Could not fetch torrent metadata from DHT. Try uploading the .torrent file instead.',
      method: 'all_failed',
      suggestion: 'Upload .torrent file for guaranteed size detection'
    };
  }

  return {
    success: false,
    error: 'Invalid input: expected Buffer (torrent file) or string (magnet link)',
    method: 'invalid_input'
  };
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
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
  detectTorrentSize,
  parseTorrentFile,
  parseMagnetLink,
  formatBytes
};