// src/services/torrentManagerV2.js
// Unified torrent manager that works with both WebTorrent and qBittorrent engines

const engineFactory = require('./torrentEngineFactory');
const { logger } = require('../utils/logger');

let engine = null;

/**
 * Initialize the torrent engine
 */
async function initializeEngine() {
  if (!engine) {
    try {
      await engineFactory.initialize();
      engine = engineFactory.getEngine();
      logger.info(`✅ Torrent engine initialized: ${engineFactory.getEngineType()}`);
    } catch (error) {
      logger.error('❌ Failed to initialize torrent engine:', error.message);
      throw error;
    }
  }
  return engine;
}

/**
 * Get the engine instance
 */
async function getEngine() {
  if (!engine) {
    await initializeEngine();
  }
  return engine;
}

/**
 * Add magnet link
 */
async function addMagnet(magnet, userId) {
  const eng = await getEngine();
  return await eng.addMagnet(magnet, userId);
}

/**
 * Get torrent by info hash
 */
async function getTorrent(infoHash, userId) {
  const eng = await getEngine();
  return await eng.getTorrent(infoHash, userId);
}

/**
 * List all torrents for a user
 */
async function listTorrents(userId) {
  const eng = await getEngine();
  return await eng.listTorrents(userId);
}

/**
 * Stop torrent (pause/remove from client but keep files)
 */
async function stopTorrent(infoHash, userId) {
  const eng = await getEngine();
  return await eng.stopTorrent(infoHash, userId);
}

/**
 * Remove torrent (and optionally delete files)
 */
async function removeTorrent(infoHash, userId) {
  const eng = await getEngine();
  return await eng.removeTorrent(infoHash, userId);
}

/**
 * Get user client (for WebTorrent compatibility)
 */
async function getUserClient(userId) {
  const eng = await getEngine();

  // For qBittorrent, this returns the qBittorrent client
  // For WebTorrent, this returns the user's WebTorrent client
  if (eng.getUserClient) {
    return await eng.getUserClient(userId);
  }

  throw new Error('getUserClient not supported by current engine');
}

/**
 * Get client (deprecated, for backward compatibility)
 */
async function getClient() {
  const eng = await getEngine();

  if (eng.getClient) {
    return await eng.getClient();
  }

  // For qBittorrent, return the client directly
  if (eng.client) {
    return eng.client;
  }

  throw new Error('getClient not supported by current engine');
}

/**
 * Get quota exceeded notifications
 */
function getQuotaExceededNotifications(userId) {
  if (!engine) {
    return [];
  }
  return engine.getQuotaExceededNotifications(userId);
}

/**
 * Clear specific quota exceeded notification
 */
function clearQuotaExceededNotification(userId, notificationId) {
  if (!engine) {
    return false;
  }
  return engine.clearQuotaExceededNotification(userId, notificationId);
}

/**
 * Clear all quota exceeded notifications
 */
function clearAllQuotaExceededNotifications(userId) {
  if (!engine) {
    return;
  }
  engine.clearAllQuotaExceededNotifications(userId);
}

/**
 * Get engine type
 */
function getEngineType() {
  return engineFactory.getEngineType();
}

/**
 * Check if using qBittorrent
 */
function isQBittorrent() {
  return engineFactory.isQBittorrent();
}

/**
 * Check if using WebTorrent
 */
function isWebTorrent() {
  return engineFactory.isWebTorrent();
}

module.exports = {
  initializeEngine,
  getEngine,
  addMagnet,
  getTorrent,
  listTorrents,
  stopTorrent,
  removeTorrent,
  getUserClient,
  getClient,
  getQuotaExceededNotifications,
  clearQuotaExceededNotification,
  clearAllQuotaExceededNotifications,
  getEngineType,
  isQBittorrent,
  isWebTorrent
};
