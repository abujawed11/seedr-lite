// src/services/qbittorrent/qBittorrentEngine.js
const path = require('path');
const fs = require('fs');
const QBittorrentClient = require('./qBittorrentClient');
const { logger } = require('../../utils/logger');
const { getUserStorageDir, ensureUserStorageDir } = require('../../utils/storage');
const database = require('../../models/database');

/**
 * qBittorrent Engine Adapter
 * Implements the same interface as WebTorrent torrentManager for seamless switching
 */
class QBittorrentEngine {
  constructor(config) {
    this.client = new QBittorrentClient(config);
    this.userClients = new Map(); // Track per-user data
    this.completionCallbacks = new Map(); // Hash -> callbacks
    this.pollingInterval = null;
    this.quotaExceededNotifications = new Map(); // userId -> [notifications]

    logger.info('🔧 qBittorrent engine initialized');
  }

  /**
   * Initialize the engine
   */
  async initialize() {
    try {
      // Test connection and authenticate
      await this.client.login();

      // Get qBittorrent version info
      const health = await this.client.healthCheck();
      logger.info(`✅ qBittorrent connected: v${health.version} (API v${health.apiVersion})`);

      // Start monitoring torrents for completion
      this.startCompletionMonitoring();

      // Cleanup stale torrents on startup
      await this.cleanupStaleTorrents();

      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize qBittorrent engine:', error.message);
      throw error;
    }
  }

  /**
   * Cleanup torrents from previous sessions
   */
  async cleanupStaleTorrents() {
    try {
      const allTorrents = await this.client.getTorrents();
      const allActiveTorrentHashes = allTorrents.map(t => t.hash);

      logger.info(`🧹 Found ${allActiveTorrentHashes.length} active torrents in qBittorrent`);

      // Cleanup stale reservations
      const cleanedCount = await database.reservations.cleanupStaleReservations(allActiveTorrentHashes);
      logger.info(`✅ Released ${cleanedCount} stale reservations`);
    } catch (error) {
      logger.error('❌ Cleanup error:', error.message);
    }
  }

  /**
   * Start monitoring torrents for completion
   */
  startCompletionMonitoring() {
    // Poll every 5 seconds for torrent status changes
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkForCompletedTorrents();
      } catch (error) {
        logger.error('Polling error:', error.message);
      }
    }, 5000);

    logger.info('👀 Started torrent completion monitoring (5s interval)');
  }

  /**
   * Check for completed torrents and trigger callbacks
   */
  async checkForCompletedTorrents() {
    const torrents = await this.client.getTorrents();

    for (const torrent of torrents) {
      // Check if torrent just completed
      if (torrent.progress === 1 && torrent.state.includes('upload')) {
        const hash = torrent.hash.toLowerCase();

        // Get user ID from category (we'll set category as userId when adding)
        const userId = torrent.category;

        if (!userId) continue;

        // Check if we've already processed this completion
        const processed = this.userClients.get(`${userId}:${hash}:completed`);
        if (processed) continue;

        // Mark as processed
        this.userClients.set(`${userId}:${hash}:completed`, true);

        logger.info(`🎉 Torrent completed: ${torrent.name} for user ${userId}`);

        // Trigger completion logic
        await this.handleTorrentCompletion(hash, userId, torrent);
      }
    }
  }

  /**
   * Handle torrent completion - same logic as WebTorrent
   */
  async handleTorrentCompletion(hash, userId, torrent) {
    try {
      // Final progressive update
      const finalDownloadedBytes = torrent.size;
      logger.info(`🔄 Final sync: ${this.humanBytes(finalDownloadedBytes)} for ${torrent.name}`);

      await database.updateProgressiveStorage(userId, hash, finalDownloadedBytes);
      logger.info('✅ Progressive storage synced before finalization');

      // Finalize reservation
      await database.finalizeReservation(userId, hash, finalDownloadedBytes);
      logger.info(`✅ Storage finalized: ${this.humanBytes(finalDownloadedBytes)}`);

      // Add completion notification
      this.addCompletionNotification(userId, {
        torrentName: torrent.name,
        torrentSize: this.humanBytes(torrent.size),
        infoHash: hash,
        timestamp: new Date().toISOString()
      });

      // Stop seeding and remove from qBittorrent (keep files)
      logger.info(`⏹️ Stopping torrent: ${torrent.name}`);
      await this.client.pauseTorrents(hash);

      // Optionally remove from client (keeping files)
      // await this.client.deleteTorrents(hash, false);

    } catch (error) {
      logger.error('💥 Error handling completion:', error.message);
    }
  }

  /**
   * Add magnet link - matches WebTorrent interface
   */
  async addMagnet(magnet, userId) {
    try {
      // Ensure user directory exists
      const userStorageDir = ensureUserStorageDir(userId);
      logger.info(`📁 User storage: ${userStorageDir}`);

      // Extract info hash from magnet for tracking
      const infoHash = this.extractInfoHash(magnet);

      // Add torrent to qBittorrent with user-specific settings
      await this.client.addTorrent({
        magnet,
        savePath: userStorageDir,
        category: userId, // Use category to track user ownership
        tags: ['seedr-lite', userId],
        paused: false
      });

      logger.info(`✅ Torrent added to qBittorrent: ${infoHash}`);

      // Wait for torrent metadata to be available
      const torrent = await this.waitForTorrentMetadata(infoHash, 30000);

      if (!torrent) {
        throw new Error('Timeout waiting for torrent metadata');
      }

      // Validate quota once we have the size
      await this.validateQuotaAndReserve(userId, torrent);

      return this.toSummary(torrent, userId);

    } catch (error) {
      logger.error('❌ Failed to add magnet:', error.message);
      throw error;
    }
  }

  /**
   * Wait for torrent metadata to become available
   */
  async waitForTorrentMetadata(hash, timeout = 30000) {
    const startTime = Date.now();
    const lowerHash = hash.toLowerCase();

    while (Date.now() - startTime < timeout) {
      const torrents = await this.client.getTorrents();
      const torrent = torrents.find(t => t.hash.toLowerCase() === lowerHash);

      if (torrent && torrent.size > 0) {
        logger.info(`📋 Metadata received: ${torrent.name} (${this.humanBytes(torrent.size)})`);
        return torrent;
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return null;
  }

  /**
   * Validate quota and create reservation
   */
  async validateQuotaAndReserve(userId, torrent) {
    const torrentSize = torrent.size;
    const hash = torrent.hash.toLowerCase();

    try {
      const quotaInfo = await database.getUserStorageInfoWithReservations(userId);
      const availableSpace = quotaInfo.effectiveRemaining;

      logger.info(`🔍 Quota check: ${this.humanBytes(torrentSize)} vs ${this.humanBytes(availableSpace)}`);

      if (torrentSize > availableSpace) {
        logger.error(`❌ QUOTA EXCEEDED! ${this.humanBytes(torrentSize)} > ${this.humanBytes(availableSpace)}`);

        // Remove the torrent
        await this.client.deleteTorrents(hash, true);
        logger.info(`🗑️ Removed oversized torrent: ${torrent.name}`);

        // Add notification
        this.addQuotaExceededNotification(userId, {
          torrentName: torrent.name,
          torrentSize: this.humanBytes(torrentSize),
          availableSpace: this.humanBytes(availableSpace),
          timestamp: new Date().toISOString()
        });

        throw new Error(`Quota exceeded: ${this.humanBytes(torrentSize)} > ${this.humanBytes(availableSpace)}`);
      }

      logger.info(`✅ Quota check passed: ${this.humanBytes(torrentSize)}`);

      // Create reservation
      await database.reserveSpaceAtomic(userId, hash, torrentSize);
      logger.info(`✅ Space reserved: ${this.humanBytes(torrentSize)}`);

    } catch (error) {
      logger.error('💥 Quota validation error:', error.message);
      throw error;
    }
  }

  /**
   * Extract info hash from magnet link
   */
  extractInfoHash(magnet) {
    const match = magnet.match(/btih:([a-f0-9]{40})/i);
    if (match) {
      return match[1].toLowerCase();
    }
    throw new Error('Invalid magnet link: no info hash found');
  }

  /**
   * Get user client - for compatibility with WebTorrent interface
   */
  async getUserClient(userId) {
    // qBittorrent doesn't have per-user clients, but we track user data
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, {
        userId,
        lastActivity: Date.now()
      });
    }
    return this.client;
  }

  /**
   * List torrents for a specific user
   */
  async listTorrents(userId) {
    try {
      const allTorrents = await this.client.getTorrents();

      // Filter by category (userId)
      const userTorrents = allTorrents.filter(t => t.category === userId);

      return userTorrents.map(t => this.toSummary(t, userId));
    } catch (error) {
      logger.error('Error listing torrents:', error.message);
      return [];
    }
  }

  /**
   * Get specific torrent
   */
  async getTorrent(infoHash, userId) {
    try {
      const allTorrents = await this.client.getTorrents();
      const lowerHash = infoHash.toLowerCase();

      const torrent = allTorrents.find(t =>
        t.hash.toLowerCase() === lowerHash && t.category === userId
      );

      if (!torrent) return null;

      // Get file list
      const files = await this.client.getTorrentFiles(torrent.hash);

      return this.toSummaryWithFiles(torrent, files, userId);
    } catch (error) {
      logger.error('Error getting torrent:', error.message);
      return null;
    }
  }

  /**
   * Stop torrent (pause but keep files)
   */
  async stopTorrent(infoHash, userId) {
    try {
      const torrent = await this.getTorrent(infoHash, userId);
      if (!torrent) return false;

      await this.client.pauseTorrents(infoHash);

      // Release reservation
      try {
        await database.releaseReservation(userId, infoHash.toLowerCase());
        logger.info(`🔓 Released reservation: ${infoHash}`);
      } catch (error) {
        logger.info('⚠️ No reservation to release');
      }

      return true;
    } catch (error) {
      logger.error('Error stopping torrent:', error.message);
      return false;
    }
  }

  /**
   * Remove torrent and optionally delete files
   */
  async removeTorrent(infoHash, userId) {
    try {
      const torrent = await this.getTorrent(infoHash, userId);
      if (!torrent) return false;

      // Delete torrent but keep files (files are managed separately)
      await this.client.deleteTorrents(infoHash, false);

      // Release reservation
      try {
        await database.releaseReservation(userId, infoHash.toLowerCase());
        logger.info(`🔓 Released reservation: ${infoHash}`);
      } catch (error) {
        logger.info('⚠️ No reservation to release');
      }

      return true;
    } catch (error) {
      logger.error('Error removing torrent:', error.message);
      return false;
    }
  }

  /**
   * Convert qBittorrent torrent to WebTorrent-compatible summary
   */
  toSummary(qbTorrent, userId) {
    return {
      id: qbTorrent.hash.toLowerCase(),
      name: qbTorrent.name,
      progress: Number((qbTorrent.progress * 100).toFixed(2)),
      downloaded: this.humanBytes(qbTorrent.downloaded),
      length: this.humanBytes(qbTorrent.size),
      downloadSpeed: `${this.humanBytes(qbTorrent.dlspeed)}/s`,
      uploadSpeed: `${this.humanBytes(qbTorrent.upspeed)}/s`,
      numPeers: qbTorrent.num_seeds + qbTorrent.num_leechs,
      files: [], // Files loaded separately in getTorrent()
      done: qbTorrent.progress === 1,
      state: qbTorrent.state,
      userId
    };
  }

  /**
   * Convert qBittorrent torrent with files to WebTorrent-compatible summary
   */
  toSummaryWithFiles(qbTorrent, qbFiles, userId) {
    const files = qbFiles.map((f, i) => ({
      index: i,
      name: path.basename(f.name),
      path: f.name,
      length: f.size,
      // Create a dummy stream interface for compatibility
      createReadStream: (opts) => this.createFileReadStream(qbTorrent.hash, i, opts)
    }));

    return {
      id: qbTorrent.hash.toLowerCase(),
      infoHash: qbTorrent.hash.toLowerCase(),
      name: qbTorrent.name,
      progress: Number((qbTorrent.progress * 100).toFixed(2)),
      downloaded: this.humanBytes(qbTorrent.downloaded),
      length: this.humanBytes(qbTorrent.size),
      downloadSpeed: `${this.humanBytes(qbTorrent.dlspeed)}/s`,
      uploadSpeed: `${this.humanBytes(qbTorrent.upspeed)}/s`,
      numPeers: qbTorrent.num_seeds + qbTorrent.num_leechs,
      files,
      done: qbTorrent.progress === 1,
      state: qbTorrent.state,
      userId
    };
  }

  /**
   * Create a read stream for a torrent file
   * This is used for streaming/downloading files
   */
  createFileReadStream(hash, fileIndex, opts = {}) {
    // Get the file path from qBittorrent's download directory
    // This will need to be enhanced to work with actual file paths
    const getUserId = async () => {
      const torrents = await this.client.getTorrents();
      const torrent = torrents.find(t => t.hash.toLowerCase() === hash.toLowerCase());
      return torrent?.category;
    };

    return new Promise(async (resolve, reject) => {
      try {
        const userId = await getUserId();
        if (!userId) {
          return reject(new Error('Torrent not found'));
        }

        const files = await this.client.getTorrentFiles(hash);
        const file = files[fileIndex];

        if (!file) {
          return reject(new Error('File not found'));
        }

        const userStorageDir = getUserStorageDir(userId);
        const filePath = path.join(userStorageDir, file.name);

        // Create read stream from filesystem
        const stream = fs.createReadStream(filePath, opts);
        resolve(stream);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Human-readable bytes formatter
   */
  humanBytes(bytes) {
    const thresh = 1024;
    if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
    if (Math.abs(bytes) < thresh) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
    let u = -1;
    do {
      bytes /= thresh;
      ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    const fixed = u < 2 ? 0 : 2;
    return `${bytes.toFixed(fixed)} ${units[u]}`;
  }

  /**
   * Notification management - same as WebTorrent
   */
  addQuotaExceededNotification(userId, notification) {
    if (!this.quotaExceededNotifications.has(userId)) {
      this.quotaExceededNotifications.set(userId, []);
    }

    const userNotifications = this.quotaExceededNotifications.get(userId);
    userNotifications.push({
      id: Date.now().toString(),
      type: 'quota_exceeded',
      ...notification
    });

    if (userNotifications.length > 10) {
      userNotifications.splice(0, userNotifications.length - 10);
    }

    logger.info(`📢 Quota exceeded notification: ${notification.torrentName}`);
  }

  addCompletionNotification(userId, notification) {
    if (!this.quotaExceededNotifications.has(userId)) {
      this.quotaExceededNotifications.set(userId, []);
    }

    const userNotifications = this.quotaExceededNotifications.get(userId);
    userNotifications.push({
      id: Date.now().toString(),
      type: 'download_completed',
      ...notification
    });

    if (userNotifications.length > 10) {
      userNotifications.splice(0, userNotifications.length - 10);
    }

    logger.info(`🎉 Completion notification: ${notification.torrentName}`);
  }

  getQuotaExceededNotifications(userId) {
    return this.quotaExceededNotifications.get(userId) || [];
  }

  clearQuotaExceededNotification(userId, notificationId) {
    const userNotifications = this.quotaExceededNotifications.get(userId);
    if (userNotifications) {
      const index = userNotifications.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        userNotifications.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  clearAllQuotaExceededNotifications(userId) {
    this.quotaExceededNotifications.set(userId, []);
  }

  /**
   * Cleanup on shutdown
   */
  async destroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    logger.info('🛑 qBittorrent engine shut down');
  }
}

module.exports = QBittorrentEngine;
