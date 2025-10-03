const fs = require('fs');
const path = require('path');
const database = require('../models/database');

const BASE_STORAGE_DIR = process.env.ROOT || './src/storage/library';

// Get user's storage directory
function getUserStorageDir(userId) {
  return path.join(BASE_STORAGE_DIR, 'users', userId);
}

// Ensure user's storage directory exists
function ensureUserStorageDir(userId) {
  const userDir = getUserStorageDir(userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

// Calculate directory size recursively
function calculateDirectorySize(dirPath) {
  let totalSize = 0;

  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      totalSize += calculateDirectorySize(itemPath);
    } else {
      totalSize += stats.size;
    }
  }

  return totalSize;
}

// Update user's storage usage in database
async function updateUserStorageUsage(userId, forceUpdate = false) {
  // CRITICAL FIX: Don't overwrite progressive tracking when active downloads exist
  // Check if user has active reservations (ongoing downloads)
  const reservedBytes = await database.reservations.getUserReservedBytes(userId);

  if (reservedBytes > 0 && !forceUpdate) {
    console.log(`⏭️ Skipping filesystem scan for user ${userId.substring(0, 8)}... - ${humanBytes(reservedBytes)} in active downloads`);
    console.log(`   Progressive tracking is handling storage updates during downloads`);

    // Return current storage_used from database (maintained by progressive tracking)
    const user = await database.getUserById(userId);
    return user.storage_used;
  }

  // Force update requested OR no active downloads - scan filesystem and update
  if (forceUpdate) {
    console.log(`🔄 Force updating storage for user ${userId.substring(0, 8)}... (file deletion)`);
  } else {
    console.log(`📂 No active downloads - scanning filesystem for user ${userId.substring(0, 8)}...`);
  }

  const userDir = getUserStorageDir(userId);
  const storageUsed = calculateDirectorySize(userDir);

  await database.updateUserStorage(userId, storageUsed);
  console.log(`✅ Updated storage from filesystem: ${humanBytes(storageUsed)}`);
  return storageUsed;
}

// Check if user has enough space for a new download
async function checkStorageAvailable(userId, requiredBytes) {
  const storageInfo = await database.getUserStorageInfo(userId);
  if (!storageInfo) {
    throw new Error('User not found');
  }

  // Update current storage usage and remaining quota
  const currentUsage = await updateUserStorageUsage(userId);

  // Get updated storage info after usage calculation
  const updatedStorageInfo = await database.getUserStorageInfo(userId);

  return {
    hasSpace: updatedStorageInfo.remaining_quota >= requiredBytes,
    availableSpace: updatedStorageInfo.remaining_quota,
    requiredSpace: requiredBytes,
    currentUsage: updatedStorageInfo.storage_used,
    quota: updatedStorageInfo.storage_quota,
    remainingQuota: updatedStorageInfo.remaining_quota
  };
}

// Human readable bytes formatter
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
  const fixed = u < 2 ? 0 : 2;
  return `${bytes.toFixed(fixed)} ${units[u]}`;
}

// Clean up empty directories
function cleanupEmptyDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return;

  const items = fs.readdirSync(dirPath);

  // Recursively clean subdirectories first
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    if (fs.statSync(itemPath).isDirectory()) {
      cleanupEmptyDirectories(itemPath);
    }
  }

  // Remove directory if it's empty (except for user root directories)
  const updatedItems = fs.readdirSync(dirPath);
  if (updatedItems.length === 0 && !dirPath.endsWith('users')) {
    fs.rmdirSync(dirPath);
  }
}

// Import the production quota enforcer
const { enforceQuota } = require('./productionQuotaEnforcer');

// Check quota before adding torrent using production-grade enforcement
async function checkQuotaBeforeAddingTorrent(userId, input, options = {}) {
  try {
    console.log('🔒 Starting production quota enforcement...');
    const result = await enforceQuota(userId, input);

    if (result.allowed) {
      return {
        canAdd: true,
        detectedSize: result.detectedSize,
        torrentName: result.torrentName,
        detectionMethod: result.method,
        quotaInfo: result.quotaInfo,
        sizeDetected: !!result.detectedSize,
        reliable: result.reliable || false,
        warning: result.warning,
        suggestion: result.suggestion
      };
    } else {
      return {
        canAdd: false,
        detectedSize: result.detectedSize || null,
        quotaInfo: result.quotaInfo || null,
        sizeDetectionFailed: !result.detectedSize,
        detectionError: result.error,
        failureType: result.method,
        appliedPolicy: result.method,
        suggestion: result.suggestion,
        policyReason: result.policyReason
      };
    }
  } catch (error) {
    console.error('💥 Critical error in quota enforcement:', error);

    return {
      canAdd: false,
      detectedSize: null,
      quotaInfo: null,
      sizeDetectionFailed: true,
      detectionError: error.message,
      failureType: 'critical_error',
      appliedPolicy: 'system_error'
    };
  }
}

// Clear all files in a user's storage directory
async function clearUserStorage(userId) {
  const userDir = getUserStorageDir(userId);

  if (!fs.existsSync(userDir)) {
    console.log(`📂 User directory doesn't exist: ${userDir}`);
    return { clearedBytes: 0, clearedFiles: 0 };
  }

  // Calculate size before deletion
  const sizeBeforeDeletion = calculateDirectorySize(userDir);
  let filesDeleted = 0;

  // Recursively delete all files and subdirectories
  function deleteDirectoryRecursive(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        deleteDirectoryRecursive(itemPath);
        fs.rmdirSync(itemPath);
      } else {
        fs.unlinkSync(itemPath);
        filesDeleted++;
      }
    }
  }

  // Delete all contents but keep the user directory itself
  deleteDirectoryRecursive(userDir);

  // Reset user's storage_used to 0 in database
  await database.updateUserStorage(userId, 0);

  console.log(`🗑️ Cleared ${humanBytes(sizeBeforeDeletion)} from user ${userId} storage (${filesDeleted} files)`);

  return {
    clearedBytes: sizeBeforeDeletion,
    clearedFiles: filesDeleted
  };
}

module.exports = {
  getUserStorageDir,
  ensureUserStorageDir,
  calculateDirectorySize,
  updateUserStorageUsage,
  checkStorageAvailable,
  humanBytes,
  cleanupEmptyDirectories,
  checkQuotaBeforeAddingTorrent,
  clearUserStorage
};