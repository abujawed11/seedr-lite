// src/services/storageOrchestrator.js
// Storage Orchestrator - Coordinates Cache, Queue, SSD, and R2 systems

const cacheManager = require('./cacheManager');
const queueManager = require('./queueManager');
const r2Storage = require('./r2Storage');
const diskSpace = require('../utils/diskSpace');
const symlinkHelper = require('../utils/symlinkHelper');
const path = require('path');

class StorageOrchestrator {
  constructor() {
    this.autoMigrateToR2 = process.env.AUTO_MIGRATE_TO_R2 === 'true';
    this.storageMode = process.env.STORAGE_MODE || 'local'; // local, r2, hybrid
  }

  /**
   * Main entry point for adding a torrent
   * Handles cache checking, space management, and queueing
   */
  async addTorrent(userId, magnetLink, folderName = null) {
    // Extract infoHash from magnet link
    const infoHash = cacheManager.extractInfoHash(magnetLink);

    if (!infoHash) {
      return {
        success: false,
        error: 'Invalid magnet link - could not extract infoHash'
      };
    }

    console.log(`📥 Processing torrent request: ${infoHash} for user ${userId}`);

    // Step 1: Check if user already has this torrent
    const existingLink = await cacheManager.getUserLink(userId, infoHash);
    if (existingLink) {
      return {
        success: false,
        error: 'You already have this torrent',
        existingLink
      };
    }

    // Step 2: Check cache availability
    const cacheHit = await cacheManager.checkCacheAvailability(infoHash);

    if (cacheHit) {
      // CACHE HIT! - Instant access
      console.log(`⚡ Cache HIT for ${infoHash} - providing instant access`);
      return await this.handleCacheHit(userId, infoHash, cacheHit, folderName);
    }

    // Step 3: Check if download is already in progress
    const inProgress = await cacheManager.isCacheInProgress(infoHash);
    if (inProgress) {
      return {
        success: false,
        error: 'This torrent is already being downloaded by another user',
        status: 'in_progress',
        infoHash
      };
    }

    // Step 4: Cache MISS - need to download
    console.log(`📥 Cache MISS for ${infoHash} - initiating download`);
    return await this.handleCacheMiss(userId, magnetLink, infoHash, folderName);
  }

  /**
   * Handle cache hit - create user link to existing cache
   */
  async handleCacheHit(userId, infoHash, cacheEntry, folderName = null) {
    try {
      const name = folderName || cacheEntry.name;

      // Create user link to cache
      const userLink = await cacheManager.createUserLink(
        userId,
        infoHash,
        name,
        null, // symlink path - will be created below
        true  // is_cached = true (instant access)
      );

      // Create symlink for user access (if in local/hybrid mode)
      if (this.storageMode !== 'r2' && cacheEntry.cache_path) {
        try {
          const linkResult = await symlinkHelper.createUserAccess(
            userId,
            infoHash,
            cacheEntry.cache_path,
            name
          );
          console.log(`🔗 Created user access: ${linkResult.userPath}`);
        } catch (symlinkError) {
          console.warn(`⚠️ Could not create symlink (R2 streaming available): ${symlinkError.message}`);
        }
      }

      return {
        success: true,
        instant: true,
        cached: true,
        infoHash,
        name: cacheEntry.name,
        size: cacheEntry.total_size,
        r2Available: cacheEntry.r2_uploaded === 1,
        message: 'Instant access from cache!'
      };
    } catch (error) {
      console.error('Error handling cache hit:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle cache miss - check space and start/queue download
   */
  async handleCacheMiss(userId, magnetLink, infoHash, folderName = null) {
    try {
      const database = require('../models/database');

      // Check user quota
      const quotaInfo = await database.getUserStorageInfoWithReservations(userId);
      if (quotaInfo.effectiveRemaining <= 0) {
        return {
          success: false,
          error: 'Insufficient storage quota',
          quotaInfo
        };
      }

      // Check SSD space (estimate - will update when metadata received)
      const estimatedSize = 0; // Unknown until metadata
      const spaceCheck = await diskSpace.hasEnoughSpace(estimatedSize);

      if (!spaceCheck.hasSpace && queueManager.isAvailable()) {
        // SSD full - add to queue
        console.log(`💾 SSD space limited, adding to queue: ${infoHash}`);
        return await this.addToQueue(userId, magnetLink, infoHash, estimatedSize, folderName);
      }

      // Space available - proceed with download
      return {
        success: true,
        action: 'download',
        infoHash,
        message: 'Ready to download - proceed with torrentManager.addMagnet()',
        spaceAvailable: spaceCheck.available,
        // Return data needed for the actual download
        downloadParams: {
          userId,
          magnetLink,
          infoHash,
          folderName,
          useCacheSystem: true
        }
      };
    } catch (error) {
      console.error('Error handling cache miss:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add torrent to download queue
   */
  async addToQueue(userId, magnetLink, infoHash, estimatedSize = 0, folderName = null) {
    if (!queueManager.isAvailable()) {
      return {
        success: false,
        error: 'Queue system is not available'
      };
    }

    const result = await queueManager.addToQueue(
      userId,
      magnetLink,
      infoHash,
      estimatedSize,
      0, // priority
      folderName
    );

    if (result.success) {
      return {
        success: true,
        action: 'queued',
        status: 'queued',
        queueId: result.id,
        position: result.position,
        infoHash,
        message: `Added to download queue at position ${result.position}`
      };
    }

    return result;
  }

  /**
   * Called when download starts - create cache entry and reserve space
   */
  async onDownloadStart(userId, infoHash, name, estimatedSize = 0) {
    try {
      const database = require('../models/database');

      // Create cache entry
      await cacheManager.createCacheEntry(infoHash, name, estimatedSize);

      // Create SSD reservation
      if (estimatedSize > 0) {
        await database.ssdReservations.createReservation(userId, infoHash, estimatedSize);
      }

      console.log(`📥 Download started: ${infoHash} (${name})`);

      return { success: true };
    } catch (error) {
      console.error('Error on download start:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Called when torrent metadata is received - update size
   */
  async onMetadataReceived(userId, infoHash, name, actualSize, filesCount) {
    try {
      const database = require('../models/database');

      // Update cache entry with actual size
      await cacheManager.updateCacheStatus(infoHash, 'downloading', {
        totalSize: actualSize,
        filesCount
      });

      // Update SSD reservation with actual size
      await database.ssdReservations.updateReservationSize(infoHash, actualSize);

      // Check if we still have enough space
      const spaceCheck = await diskSpace.hasEnoughSpace(actualSize);
      if (!spaceCheck.hasSpace) {
        console.warn(`⚠️ Actual size ${actualSize} exceeds available space`);
        // Could cancel or queue here
      }

      console.log(`📊 Metadata received: ${name} - ${actualSize} bytes, ${filesCount} files`);

      return { success: true, actualSize, filesCount };
    } catch (error) {
      console.error('Error on metadata received:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Called when download completes - handle R2 upload and cleanup
   */
  async onDownloadComplete(userId, infoHash, cachePath, folderName = null) {
    try {
      const database = require('../models/database');
      const cache = await cacheManager.getCacheEntry(infoHash);

      console.log(`✅ Download complete: ${infoHash}`);

      // Create user link
      const name = folderName || cache?.name || infoHash;
      await cacheManager.createUserLink(userId, infoHash, name, null, false);

      // Create symlink for user access
      if (cachePath) {
        try {
          await symlinkHelper.createUserAccess(userId, infoHash, cachePath, name);
        } catch (e) {
          console.warn('Could not create symlink:', e.message);
        }
      }

      // Release SSD reservation
      await database.ssdReservations.finalizeReservation(infoHash);

      // Auto-migrate to R2 if enabled
      if (this.autoMigrateToR2 && r2Storage.isAvailable()) {
        console.log(`☁️ Auto-migrating to R2: ${infoHash}`);
        this.migrateToR2(infoHash, cachePath).catch(err => {
          console.error('R2 migration failed:', err.message);
        });
      } else {
        // Mark as completed locally
        await cacheManager.updateCacheStatus(infoHash, 'completed');
      }

      return {
        success: true,
        infoHash,
        name,
        r2Migration: this.autoMigrateToR2 && r2Storage.isAvailable()
      };
    } catch (error) {
      console.error('Error on download complete:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Called when download fails - cleanup
   */
  async onDownloadFailed(userId, infoHash, error) {
    try {
      const database = require('../models/database');

      console.log(`❌ Download failed: ${infoHash} - ${error}`);

      // Update cache status
      await cacheManager.updateCacheStatus(infoHash, 'error');

      // Release SSD reservation
      await database.ssdReservations.releaseReservation(infoHash);

      return { success: true };
    } catch (err) {
      console.error('Error on download failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Migrate a completed torrent to R2
   */
  async migrateToR2(infoHash, cachePath, deleteLocal = true) {
    if (!r2Storage.isAvailable()) {
      return { success: false, error: 'R2 not available' };
    }

    try {
      console.log(`☁️ Migrating to R2: ${infoHash}`);

      const result = await r2Storage.migrateToR2(infoHash, cachePath, deleteLocal);

      if (result.success) {
        console.log(`✅ R2 migration complete: ${infoHash} (${result.uploadedFiles} files)`);
      }

      return result;
    } catch (error) {
      console.error('R2 migration error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove a torrent for a user
   */
  async removeTorrent(userId, infoHash) {
    try {
      // Get user link
      const userLink = await cacheManager.getUserLink(userId, infoHash);
      if (!userLink) {
        return { success: false, error: 'Torrent not found for this user' };
      }

      // Remove symlink
      if (userLink.user_folder_name) {
        try {
          await symlinkHelper.removeUserAccess(userId, userLink.user_folder_name);
        } catch (e) {
          console.warn('Could not remove symlink:', e.message);
        }
      }

      // Remove user link (this decrements ref count)
      await cacheManager.removeUserLink(userId, infoHash);

      console.log(`🗑️ Removed torrent for user: ${userId} -> ${infoHash}`);

      return { success: true };
    } catch (error) {
      console.error('Error removing torrent:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get storage status for dashboard
   */
  async getStorageStatus() {
    const [ssdUsage, cacheStats, r2Stats, queueStats] = await Promise.all([
      diskSpace.getDetailedSSDUsage().catch(() => null),
      cacheManager.getCacheStats().catch(() => null),
      r2Storage.getStats().catch(() => ({ enabled: false })),
      queueManager.getQueueStats().catch(() => ({ available: false }))
    ]);

    return {
      ssd: ssdUsage,
      cache: cacheStats,
      r2: r2Stats,
      queue: queueStats,
      config: {
        storageMode: this.storageMode,
        autoMigrateToR2: this.autoMigrateToR2
      }
    };
  }

  /**
   * Check if a torrent is available (cached or in R2)
   */
  async isTorrentAvailable(infoHash) {
    const cache = await cacheManager.getCacheEntry(infoHash);

    if (!cache) {
      return { available: false };
    }

    return {
      available: cache.download_status === 'completed',
      cached: true,
      r2Uploaded: cache.r2_uploaded === 1,
      name: cache.name,
      size: cache.total_size,
      refCount: cache.reference_count
    };
  }

  /**
   * Get files for a torrent (from cache or R2)
   */
  async getTorrentFiles(infoHash) {
    const cache = await cacheManager.getCacheEntry(infoHash);

    if (!cache) {
      return { success: false, error: 'Torrent not found' };
    }

    // If R2 uploaded, get files from R2
    if (cache.r2_uploaded === 1) {
      const r2Files = await r2Storage.getTorrentR2Files(infoHash);
      return {
        success: true,
        source: 'r2',
        files: r2Files.map(f => ({
          name: f.file_name,
          path: f.file_path,
          size: f.file_size,
          mimeType: f.mime_type
        }))
      };
    }

    // Otherwise, list files from local cache
    const fs = require('fs').promises;

    try {
      const files = await this.listLocalFiles(cache.cache_path);
      return {
        success: true,
        source: 'local',
        files
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List files in local cache directory
   */
  async listLocalFiles(dirPath, basePath = null, files = []) {
    const fs = require('fs').promises;

    if (!basePath) basePath = dirPath;

    try {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
          await this.listLocalFiles(fullPath, basePath, files);
        } else {
          files.push({
            name: item,
            path: path.relative(basePath, fullPath).replace(/\\/g, '/'),
            size: stat.size
          });
        }
      }
    } catch (e) {
      // Ignore errors
    }

    return files;
  }
}

// Export singleton instance
const storageOrchestrator = new StorageOrchestrator();
module.exports = storageOrchestrator;
