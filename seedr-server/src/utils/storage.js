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
async function updateUserStorageUsage(userId) {
  const userDir = getUserStorageDir(userId);
  const storageUsed = calculateDirectorySize(userDir);

  await database.updateUserStorage(userId, storageUsed);
  return storageUsed;
}

// Check if user has enough space for a new download
async function checkStorageAvailable(userId, requiredBytes) {
  const user = await database.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Get current storage usage
  const currentUsage = await updateUserStorageUsage(userId);
  const availableSpace = user.storage_quota - currentUsage;

  return {
    hasSpace: availableSpace >= requiredBytes,
    availableSpace,
    requiredSpace: requiredBytes,
    currentUsage,
    quota: user.storage_quota
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

module.exports = {
  getUserStorageDir,
  ensureUserStorageDir,
  calculateDirectorySize,
  updateUserStorageUsage,
  checkStorageAvailable,
  humanBytes,
  cleanupEmptyDirectories
};