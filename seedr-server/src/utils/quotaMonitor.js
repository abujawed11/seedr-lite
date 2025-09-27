/**
 * Robust real-time quota monitoring during torrent downloads
 * Automatically stops torrents that exceed user quota with enhanced reliability
 */

const database = require('../models/database');
const { updateUserStorageUsage } = require('./storage');

// Monitoring intervals and thresholds
const MONITORING_CONFIG = {
  INTERVAL_MS: 10000,        // Check every 10 seconds
  WARNING_THRESHOLD: 0.9,    // Warn at 90% quota usage
  CRITICAL_THRESHOLD: 0.95,  // Critical alert at 95% quota usage
  GRACE_PERIOD_MB: 100,      // Allow 100MB grace before stopping
  MAX_RETRIES: 3             // Max retries for stopping torrents
};

// Active monitoring intervals
const activeMonitors = new Map(); // userId -> intervalId
const monitoringStats = new Map(); // userId -> stats

// Format bytes for logging
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Enhanced quota monitoring for a specific user
async function monitorUserQuota(userId, torrentClient) {
  try {
    // Update user's current storage usage
    await updateUserStorageUsage(userId);
    const userStorage = await database.getUserStorageInfo(userId);

    if (!userStorage) {
      console.warn(`⚠️ User ${userId} not found during quota monitoring`);
      return { stopped: false, reason: 'user_not_found' };
    }

    const usageRatio = userStorage.storage_used / userStorage.storage_quota;
    const remainingBytes = userStorage.remaining_quota;
    const remainingMB = remainingBytes / (1024 * 1024);

    // Get user's active downloading torrents
    const userTorrents = torrentClient.torrents.filter(t =>
      t.userId === userId && !t.done && t.progress < 1
    );

    // Update monitoring stats
    const stats = monitoringStats.get(userId) || { checks: 0, warnings: 0, stops: 0 };
    stats.checks++;
    stats.lastCheck = Date.now();
    stats.currentUsage = userStorage.storage_used;
    stats.quota = userStorage.storage_quota;
    stats.remaining = remainingBytes;
    monitoringStats.set(userId, stats);

    // Log periodic status (every 5 checks to avoid spam)
    if (stats.checks % 5 === 0) {
      console.log(`📊 Quota Monitor [${userId}]: ${formatBytes(userStorage.storage_used)}/${formatBytes(userStorage.storage_quota)} used (${(usageRatio * 100).toFixed(1)}%) - ${userTorrents.length} active torrents`);
    }

    // CRITICAL: Quota exceeded with grace period
    if (remainingMB < -MONITORING_CONFIG.GRACE_PERIOD_MB) {
      const overageMB = Math.abs(remainingMB);
      console.log(`🚨 QUOTA EXCEEDED: User ${userId} is ${overageMB.toFixed(1)}MB over quota (grace period: ${MONITORING_CONFIG.GRACE_PERIOD_MB}MB)`);

      stats.warnings++;

      if (userTorrents.length > 0) {
        // Stop the largest downloading torrent
        const largestTorrent = userTorrents.reduce((largest, current) =>
          (current.length || 0) > (largest.length || 0) ? current : largest
        );

        console.log(`🛑 Stopping largest torrent: "${largestTorrent.name}" (${formatBytes(largestTorrent.length || 0)})`);

        try {
          await stopTorrentSafely(torrentClient, largestTorrent.infoHash, userId);
          stats.stops++;
          console.log(`✅ Successfully stopped over-quota torrent: ${largestTorrent.name}`);
          return { stopped: true, reason: 'quota_exceeded', torrent: largestTorrent.name };
        } catch (error) {
          console.error(`❌ Failed to stop torrent ${largestTorrent.name}: ${error.message}`);
          return { stopped: false, reason: 'stop_failed', error: error.message };
        }
      }
    }
    // WARNING: Approaching quota limit
    else if (usageRatio >= MONITORING_CONFIG.CRITICAL_THRESHOLD) {
      stats.warnings++;
      console.log(`⚠️ CRITICAL: User ${userId} at ${(usageRatio * 100).toFixed(1)}% quota usage (${formatBytes(remainingBytes)} remaining)`);
    }
    else if (usageRatio >= MONITORING_CONFIG.WARNING_THRESHOLD) {
      console.log(`⚠️ WARNING: User ${userId} at ${(usageRatio * 100).toFixed(1)}% quota usage (${formatBytes(remainingBytes)} remaining)`);
    }

    return { stopped: false, reason: 'within_quota', usage: usageRatio };
  } catch (error) {
    console.error(`💥 Error monitoring quota for user ${userId}:`, error);
    return { stopped: false, reason: 'monitoring_error', error: error.message };
  }
}

// Safely stop a torrent with retries
async function stopTorrentSafely(torrentClient, infoHash, userId, retries = MONITORING_CONFIG.MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const torrent = torrentClient.get(infoHash);
      if (!torrent) {
        console.log(`ℹ️ Torrent ${infoHash} no longer exists (may have been removed)`);
        return true;
      }

      // Use torrent.destroy instead of client.remove for more reliable stopping
      torrent.destroy({ destroyStore: false });

      // Wait a moment to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify it's actually removed
      const stillExists = torrentClient.get(infoHash);
      if (!stillExists) {
        console.log(`✅ Torrent ${infoHash} successfully stopped on attempt ${attempt}`);
        return true;
      } else {
        throw new Error(`Torrent still exists after destroy attempt ${attempt}`);
      }
    } catch (error) {
      console.error(`❌ Attempt ${attempt}/${retries} to stop torrent ${infoHash} failed: ${error.message}`);
      if (attempt === retries) {
        throw new Error(`Failed to stop torrent after ${retries} attempts: ${error.message}`);
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

// Start real-time monitoring for a user
function startQuotaMonitoring(userId, torrentClient) {
  // Don't start if already monitoring
  if (activeMonitors.has(userId)) {
    console.log(`📊 Quota monitoring already active for user ${userId}`);
    return;
  }

  console.log(`🔍 Starting real-time quota monitoring for user ${userId}`);

  const intervalId = setInterval(async () => {
    try {
      await monitorUserQuota(userId, torrentClient);
    } catch (error) {
      console.error(`💥 Error in quota monitoring interval for user ${userId}:`, error);
    }
  }, MONITORING_CONFIG.INTERVAL_MS);

  activeMonitors.set(userId, intervalId);

  // Initialize stats
  if (!monitoringStats.has(userId)) {
    monitoringStats.set(userId, {
      started: Date.now(),
      checks: 0,
      warnings: 0,
      stops: 0
    });
  }
}

// Stop monitoring for a user
function stopQuotaMonitoring(userId) {
  const intervalId = activeMonitors.get(userId);
  if (intervalId) {
    clearInterval(intervalId);
    activeMonitors.delete(userId);

    const stats = monitoringStats.get(userId);
    if (stats) {
      const duration = (Date.now() - stats.started) / 1000;
      console.log(`📊 Stopped quota monitoring for user ${userId} after ${duration.toFixed(0)}s (${stats.checks} checks, ${stats.warnings} warnings, ${stats.stops} stops)`);
    }

    console.log(`🛑 Stopped quota monitoring for user ${userId}`);
  }
}

// Monitor all users with active torrents
async function startGlobalQuotaMonitoring(torrentClient) {
  console.log('🌍 Starting global quota monitoring...');

  // Monitor every 30 seconds for new users
  const globalInterval = setInterval(async () => {
    try {
      // Get all users with active torrents
      const activeUsers = new Set();

      for (const torrent of torrentClient.torrents) {
        if (torrent.userId && !torrent.done) {
          activeUsers.add(torrent.userId);
        }
      }

      // Start monitoring for new users
      for (const userId of activeUsers) {
        if (!activeMonitors.has(userId)) {
          startQuotaMonitoring(userId, torrentClient);
        }
      }

      // Stop monitoring for users with no active torrents
      for (const [userId, intervalId] of activeMonitors) {
        if (!activeUsers.has(userId)) {
          stopQuotaMonitoring(userId);
        }
      }
    } catch (error) {
      console.error('💥 Error in global quota monitoring:', error);
    }
  }, 30000); // Check every 30 seconds

  console.log('✅ Global quota monitoring started');
  return globalInterval;
}

// Get monitoring statistics
function getMonitoringStats(userId) {
  if (userId) {
    return monitoringStats.get(userId) || null;
  }

  // Return all stats
  const allStats = {};
  for (const [uid, stats] of monitoringStats) {
    allStats[uid] = { ...stats, isActive: activeMonitors.has(uid) };
  }
  return allStats;
}

// Enhanced bulk quota compliance check (legacy compatibility)
async function checkAllTorrentsQuotaCompliance(torrentClient) {
  try {
    console.log('🔍 Enhanced quota compliance check for all active torrents...');

    // Group torrents by user
    const torrentsByUser = new Map();

    for (const torrent of torrentClient.torrents) {
      if (torrent.userId) {
        if (!torrentsByUser.has(torrent.userId)) {
          torrentsByUser.set(torrent.userId, []);
        }
        torrentsByUser.get(torrent.userId).push(torrent);
      }
    }

    let stoppedCount = 0;
    const results = [];

    // Check quota for each user
    for (const [userId, userTorrents] of torrentsByUser) {
      try {
        const result = await monitorUserQuota(userId, torrentClient);
        results.push({ userId, ...result });

        if (result.stopped) {
          stoppedCount++;
        }
      } catch (error) {
        console.error(`❌ Error checking quota for user ${userId}:`, error);
        results.push({ userId, stopped: false, reason: 'error', error: error.message });
      }
    }

    // Summary report
    console.log(`📊 Quota Compliance Summary:`);
    console.log(`   - Users checked: ${torrentsByUser.size}`);
    console.log(`   - Torrents stopped: ${stoppedCount}`);

    const withinQuota = results.filter(r => r.reason === 'within_quota').length;
    const overQuota = results.filter(r => r.reason === 'quota_exceeded').length;
    const errors = results.filter(r => r.reason === 'error' || r.reason === 'stop_failed').length;

    console.log(`   - Within quota: ${withinQuota}`);
    console.log(`   - Over quota: ${overQuota}`);
    console.log(`   - Errors: ${errors}`);

    return stoppedCount;
  } catch (error) {
    console.error('💥 Error in enhanced quota checking:', error);
    return 0;
  }
}

// Legacy function for backward compatibility
async function monitorQuotaCompliance(userId, torrent) {
  console.log('⚠️ Using legacy monitorQuotaCompliance - consider upgrading to new monitoring system');
  // This is now handled by the continuous monitoring system
  return false;
}

module.exports = {
  // New robust monitoring system
  startQuotaMonitoring,
  stopQuotaMonitoring,
  startGlobalQuotaMonitoring,
  monitorUserQuota,
  getMonitoringStats,
  stopTorrentSafely,

  // Enhanced legacy compatibility
  checkAllTorrentsQuotaCompliance,
  monitorQuotaCompliance,

  // Configuration
  MONITORING_CONFIG
};