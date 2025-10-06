// src/services/torrentEngineFactory.js
const { logger } = require('../utils/logger');

/**
 * Torrent Engine Factory
 * Provides a unified interface for switching between WebTorrent and qBittorrent engines
 */
class TorrentEngineFactory {
  constructor() {
    this.engine = null;
    this.engineType = null;
  }

  /**
   * Initialize the appropriate torrent engine based on environment variable
   */
  async initialize() {
    const engineType = process.env.TORRENT_ENGINE || 'webtorrent';
    this.engineType = engineType.toLowerCase();

    logger.info(`🚀 Initializing torrent engine: ${this.engineType}`);

    if (this.engineType === 'qbittorrent') {
      await this.initializeQBittorrent();
    } else {
      await this.initializeWebTorrent();
    }

    return this.engine;
  }

  /**
   * Initialize qBittorrent engine
   */
  async initializeQBittorrent() {
    try {
      const QBittorrentEngine = require('./qbittorrent/qBittorrentEngine');

      const config = {
        url: process.env.QBITTORRENT_URL || 'http://localhost:8080',
        username: process.env.QBITTORRENT_USERNAME || 'admin',
        password: process.env.QBITTORRENT_PASSWORD || 'adminpass'
      };

      logger.info(`📡 Connecting to qBittorrent at ${config.url}`);

      this.engine = new QBittorrentEngine(config);
      await this.engine.initialize();

      logger.info('✅ qBittorrent engine ready');
    } catch (error) {
      logger.error('❌ Failed to initialize qBittorrent engine:', error.message);
      throw new Error(`qBittorrent initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize WebTorrent engine (original implementation)
   */
  async initializeWebTorrent() {
    try {
      // Use the existing WebTorrent-based torrentManager
      logger.info('📡 Initializing WebTorrent engine');

      // The existing torrentManager module handles WebTorrent initialization
      // We just need to import it
      const torrentManager = require('./torrentManager');

      // Wrap the existing module to match our engine interface
      this.engine = {
        engineType: 'webtorrent',
        addMagnet: torrentManager.addMagnet,
        getTorrent: torrentManager.getTorrent,
        listTorrents: torrentManager.listTorrents,
        stopTorrent: torrentManager.stopTorrent,
        removeTorrent: torrentManager.removeTorrent,
        getUserClient: torrentManager.getUserClient,
        getClient: torrentManager.getClient,
        getQuotaExceededNotifications: torrentManager.getQuotaExceededNotifications,
        clearQuotaExceededNotification: torrentManager.clearQuotaExceededNotification,
        clearAllQuotaExceededNotifications: torrentManager.clearAllQuotaExceededNotifications
      };

      logger.info('✅ WebTorrent engine ready');
    } catch (error) {
      logger.error('❌ Failed to initialize WebTorrent engine:', error.message);
      throw error;
    }
  }

  /**
   * Get the initialized engine
   */
  getEngine() {
    if (!this.engine) {
      throw new Error('Torrent engine not initialized. Call initialize() first.');
    }
    return this.engine;
  }

  /**
   * Get engine type
   */
  getEngineType() {
    return this.engineType;
  }

  /**
   * Check if using qBittorrent
   */
  isQBittorrent() {
    return this.engineType === 'qbittorrent';
  }

  /**
   * Check if using WebTorrent
   */
  isWebTorrent() {
    return this.engineType === 'webtorrent';
  }
}

// Singleton instance
const factory = new TorrentEngineFactory();

module.exports = factory;
