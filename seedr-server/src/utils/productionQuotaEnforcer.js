/**
 * Production-grade quota enforcement
 * Like real torrent services (Seedr, etc.)
 */

const database = require('../models/database');

// Cache for known torrent sizes
const knownTorrents = new Map();

// Simple torrent file parser
async function parseTorrentFile(buffer) {
  try {
    const parseTorrent = (await import('parse-torrent')).default;
    const parsed = await parseTorrent(buffer); // AWAIT the result

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
    const parsed = await parseTorrent(magnetURI); // AWAIT the result since it's now async

    // Debug logging removed for production

    // Get the info hash
    let infoHash = parsed.infoHash;
    if (!infoHash && parsed.infoHashBuffer) {
      infoHash = parsed.infoHashBuffer.toString('hex');
    }

    const name = parsed.name || parsed.dn || 'Unknown';

    return {
      success: true,
      infoHash: infoHash,
      name: name,
      trackers: parsed.announce || []
    };
  } catch (error) {
    console.error('❌ Magnet parsing error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Check if user has enough storage quota
async function checkStorageQuota(userId, requiredBytes) {
  const storageInfo = await database.getUserStorageInfo(userId);
  if (!storageInfo) {
    throw new Error('User not found');
  }

  return {
    hasSpace: storageInfo.remaining_quota >= requiredBytes,
    availableSpace: storageInfo.remaining_quota,
    requiredSpace: requiredBytes,
    currentUsage: storageInfo.storage_used,
    quota: storageInfo.storage_quota,
    remainingQuota: storageInfo.remaining_quota
  };
}

// Main quota enforcement function
async function enforceQuota(userId, input) {
  console.log('🔒 Production quota enforcement started');

  // Method 1: Torrent file (100% reliable)
  if (Buffer.isBuffer(input)) {
    console.log('📁 Processing .torrent file...');
    const result = await parseTorrentFile(input);

    if (result.success) {
      console.log(`✅ Torrent file parsed: "${result.name}" - ${formatBytes(result.size)}`);

      // Cache the size for future magnet link requests
      knownTorrents.set(result.infoHash, {
        size: result.size,
        name: result.name,
        timestamp: Date.now()
      });

      // Check quota
      const quotaCheck = await checkStorageQuota(userId, result.size);

      return {
        allowed: quotaCheck.hasSpace,
        detectedSize: result.size,
        torrentName: result.name,
        method: 'torrent_file',
        reliable: true,
        quotaInfo: quotaCheck
      };
    } else {
      console.error('❌ Invalid torrent file:', result.error);
      return {
        allowed: false,
        error: 'Invalid torrent file: ' + result.error,
        method: 'torrent_file'
      };
    }
  }

  // Method 2: Magnet link (limited support)
  if (typeof input === 'string' && input.startsWith('magnet:')) {
    console.log('🧲 Processing magnet link...');

    const magnetInfo = await parseMagnetLink(input);
    if (!magnetInfo.success) {
      return {
        allowed: false,
        error: 'Invalid magnet link: ' + magnetInfo.error,
        method: 'magnet_parse'
      };
    }

    const infoHash = magnetInfo.infoHash;
    console.log(`🔑 Info hash: ${infoHash}`);

    // Check if we know this torrent from cache
    const cached = knownTorrents.get(infoHash);
    if (cached && (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000) { // 24 hour cache
      console.log(`✅ Found in cache: "${cached.name}" - ${formatBytes(cached.size)}`);

      const quotaCheck = await checkStorageQuota(userId, cached.size);

      return {
        allowed: quotaCheck.hasSpace,
        detectedSize: cached.size,
        torrentName: cached.name,
        method: 'cache',
        reliable: true,
        quotaInfo: quotaCheck
      };
    }

    // For unknown magnet links: SMART GRADUATED POLICY
    // Balance between quota safety and user experience
    console.log('⚠️ Unknown magnet link - applying smart graduated policy');

    const userStorage = await database.getUserStorageInfo(userId);
    const availableGB = userStorage.remaining_quota / (1024 * 1024 * 1024);

    console.log(`📊 User has ${availableGB.toFixed(1)}GB available, torrent size unknown`);

    if (availableGB >= 4.5) {
      // User has 4.5GB+ free - allow with strict monitoring
      console.log(`✅ Allowing unknown magnet - user has ${availableGB.toFixed(1)}GB free (≥4.5GB threshold)`);
      return {
        allowed: true,
        method: 'unknown_magnet_allowed_monitored',
        warning: `⚠️ UNKNOWN SIZE: This torrent's size cannot be determined. You have ${availableGB.toFixed(1)}GB available. The download will be stopped automatically if it exceeds your quota.`,
        suggestion: 'For guaranteed quota compliance, upload the .torrent file instead.',
        reliable: false,
        quotaMonitoring: true
      };
    } else if (availableGB >= 3.0) {
      // User has 3-4.5GB free - allow with strong warning
      console.log(`⚠️ Allowing unknown magnet with warning - user has ${availableGB.toFixed(1)}GB free (3-4.5GB range)`);
      return {
        allowed: true,
        method: 'unknown_magnet_allowed_risky',
        warning: `⚠️ RISKY: Unknown torrent size with only ${availableGB.toFixed(1)}GB available. Download will be stopped if quota is exceeded. Strongly recommend uploading .torrent file instead.`,
        suggestion: 'Upload the .torrent file for safe quota enforcement.',
        reliable: false,
        quotaMonitoring: true
      };
    } else {
      // User has <3GB free - block for safety
      console.log(`🚫 Blocking unknown magnet - user has only ${availableGB.toFixed(1)}GB free (<3GB threshold)`);
      return {
        allowed: false,
        error: `Cannot add unknown magnet link: You only have ${availableGB.toFixed(1)}GB available. To prevent quota violations, please upload the .torrent file for accurate size verification.`,
        method: 'unknown_magnet_blocked_insufficient',
        suggestion: 'Upload the .torrent file to get instant size detection and quota verification.',
        availableSpace: `${availableGB.toFixed(1)}GB`,
        policyReason: 'Insufficient free space for unknown-size content. .torrent files required for quota safety.'
      };
    }
  }

  return {
    allowed: false,
    error: 'Invalid input: expected Buffer (.torrent file) or string (magnet link)',
    method: 'invalid_input'
  };
}

// Helper function
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
  enforceQuota,
  parseMagnetLink,
  formatBytes
};