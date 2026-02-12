// src/services/cacheManager.js
// Torrent Cache System - Prevents duplicate downloads, enables instant access

const path = require('path');
const fs = require('fs').promises;
const { nanoid } = require('nanoid');

class CacheManager {
  constructor() {
    this.cacheDir = process.env.CACHE_DIR || './src/storage/cache';
    this.retentionDays = parseInt(process.env.CACHE_RETENTION_DAYS) || 7;
    this.maxSingleTorrentSize = parseInt(process.env.CACHE_MAX_SINGLE_TORRENT_SIZE) || 100 * 1024 * 1024 * 1024; // 100GB
    this.initialized = false;
  }

  /**
   * Initialize the cache manager
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });
      this.initialized = true;
      console.log(`✅ Cache Manager initialized (dir: ${this.cacheDir})`);
    } catch (error) {
      console.error('Failed to initialize Cache Manager:', error);
    }
  }

  /**
   * Extract infoHash from magnet link
   */
  extractInfoHash(magnetURI) {
    if (!magnetURI) return null;

    // Match btih: followed by 40 hex characters (SHA-1) or 32 base32 characters
    const hexMatch = magnetURI.match(/btih:([a-fA-F0-9]{40})/i);
    if (hexMatch) {
      return hexMatch[1].toLowerCase();
    }

    // Base32 encoded (convert to hex)
    const base32Match = magnetURI.match(/btih:([A-Z2-7]{32})/i);
    if (base32Match) {
      return this.base32ToHex(base32Match[1]).toLowerCase();
    }

    return null;
  }

  /**
   * Convert base32 to hex (for magnet links)
   */
  base32ToHex(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let hex = '';

    for (const char of base32.toUpperCase()) {
      const val = alphabet.indexOf(char);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }

    for (let i = 0; i + 4 <= bits.length; i += 4) {
      hex += parseInt(bits.substr(i, 4), 2).toString(16);
    }

    return hex;
  }

  /**
   * Check if a torrent is already cached and available
   */
  async checkCacheAvailability(infoHash) {
    if (!infoHash) return null;

    try {
      const database = require('../models/database');

      return new Promise((resolve, reject) => {
        database.db.get(
          `SELECT * FROM torrent_cache
           WHERE info_hash = ? AND download_status = 'completed'`,
          [infoHash.toLowerCase()],
          async (err, row) => {
            if (err) return reject(err);

            if (row) {
              // Update last accessed time
              database.db.run(
                `UPDATE torrent_cache SET last_accessed_at = CURRENT_TIMESTAMP WHERE info_hash = ?`,
                [infoHash.toLowerCase()]
              );

              console.log(`⚡ Cache hit: ${infoHash}`);
            }

            resolve(row || null);
          }
        );
      });
    } catch (error) {
      console.error('Error checking cache availability:', error);
      return null;
    }
  }

  /**
   * Check if a torrent is currently being downloaded (cache in progress)
   */
  async isCacheInProgress(infoHash) {
    if (!infoHash) return false;

    try {
      const database = require('../models/database');

      return new Promise((resolve, reject) => {
        database.db.get(
          `SELECT * FROM torrent_cache
           WHERE info_hash = ? AND download_status IN ('downloading', 'uploading')`,
          [infoHash.toLowerCase()],
          (err, row) => {
            if (err) return reject(err);
            resolve(!!row);
          }
        );
      });
    } catch (error) {
      console.error('Error checking cache in progress:', error);
      return false;
    }
  }

  /**
   * Create a new cache entry when starting a download
   */
  async createCacheEntry(infoHash, name, totalSize = 0, filesCount = 0) {
    if (!infoHash) throw new Error('infoHash is required');

    const cachePath = path.join(this.cacheDir, infoHash.toLowerCase());

    try {
      const database = require('../models/database');

      // Create cache directory
      await fs.mkdir(cachePath, { recursive: true });

      return new Promise((resolve, reject) => {
        database.db.run(
          `INSERT OR REPLACE INTO torrent_cache
           (info_hash, name, total_size, files_count, cache_path, download_status, r2_uploaded, reference_count)
           VALUES (?, ?, ?, ?, ?, 'downloading', 0, 0)`,
          [infoHash.toLowerCase(), name, totalSize, filesCount, cachePath],
          function (err) {
            if (err) return reject(err);
            console.log(`📦 Cache entry created: ${infoHash} -> ${cachePath}`);
            resolve({
              infoHash: infoHash.toLowerCase(),
              name,
              totalSize,
              cachePath,
              status: 'downloading'
            });
          }
        );
      });
    } catch (error) {
      console.error('Error creating cache entry:', error);
      throw error;
    }
  }

  /**
   * Update cache entry status
   */
  async updateCacheStatus(infoHash, status, updates = {}) {
    if (!infoHash) return false;

    try {
      const database = require('../models/database');

      const setClauses = ['download_status = ?'];
      const params = [status];

      if (updates.totalSize !== undefined) {
        setClauses.push('total_size = ?');
        params.push(updates.totalSize);
      }
      if (updates.filesCount !== undefined) {
        setClauses.push('files_count = ?');
        params.push(updates.filesCount);
      }
      if (updates.r2Uploaded !== undefined) {
        setClauses.push('r2_uploaded = ?');
        params.push(updates.r2Uploaded ? 1 : 0);
      }

      params.push(infoHash.toLowerCase());

      return new Promise((resolve, reject) => {
        database.db.run(
          `UPDATE torrent_cache SET ${setClauses.join(', ')} WHERE info_hash = ?`,
          params,
          function (err) {
            if (err) return reject(err);
            if (this.changes > 0) {
              console.log(`📦 Cache status updated: ${infoHash} -> ${status}`);
            }
            resolve(this.changes > 0);
          }
        );
      });
    } catch (error) {
      console.error('Error updating cache status:', error);
      return false;
    }
  }

  /**
   * Mark cache as uploaded to R2
   */
  async markAsR2Uploaded(infoHash) {
    return this.updateCacheStatus(infoHash, 'completed', { r2Uploaded: true });
  }

  /**
   * Increment reference count when a user links to the cache
   */
  async incrementRefCount(infoHash) {
    if (!infoHash) return false;

    try {
      const database = require('../models/database');

      return new Promise((resolve, reject) => {
        database.db.run(
          `UPDATE torrent_cache
           SET reference_count = reference_count + 1, last_accessed_at = CURRENT_TIMESTAMP
           WHERE info_hash = ?`,
          [infoHash.toLowerCase()],
          function (err) {
            if (err) return reject(err);
            if (this.changes > 0) {
              console.log(`📦 Cache ref count incremented: ${infoHash}`);
            }
            resolve(this.changes > 0);
          }
        );
      });
    } catch (error) {
      console.error('Error incrementing ref count:', error);
      return false;
    }
  }

  /**
   * Decrement reference count when a user removes their link
   */
  async decrementRefCount(infoHash) {
    if (!infoHash) return false;

    try {
      const database = require('../models/database');

      return new Promise((resolve, reject) => {
        database.db.run(
          `UPDATE torrent_cache
           SET reference_count = CASE WHEN reference_count > 0 THEN reference_count - 1 ELSE 0 END
           WHERE info_hash = ?`,
          [infoHash.toLowerCase()],
          function (err) {
            if (err) return reject(err);
            if (this.changes > 0) {
              console.log(`📦 Cache ref count decremented: ${infoHash}`);
            }
            resolve(this.changes > 0);
          }
        );
      });
    } catch (error) {
      console.error('Error decrementing ref count:', error);
      return false;
    }
  }

  /**
   * Create a user link to a cached torrent
   */
  async createUserLink(userId, infoHash, folderName, symlinkPath = null, isCached = false) {
    if (!userId || !infoHash) throw new Error('userId and infoHash are required');

    try {
      const database = require('../models/database');

      // Check if link already exists
      const existing = await this.getUserLink(userId, infoHash);
      if (existing) {
        console.log(`🔗 User link already exists: ${userId} -> ${infoHash}`);
        return existing;
      }

      const id = nanoid();

      return new Promise((resolve, reject) => {
        database.db.run(
          `INSERT INTO user_torrent_links
           (id, user_id, info_hash, user_folder_name, symlink_path, is_cached)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, userId, infoHash.toLowerCase(), folderName, symlinkPath, isCached ? 1 : 0],
          async function (err) {
            if (err) {
              // Handle unique constraint violation gracefully
              if (err.message && err.message.includes('UNIQUE constraint')) {
                console.log(`🔗 User link already exists (race condition): ${userId} -> ${infoHash}`);
                const existingLink = await require('./cacheManager').getUserLink(userId, infoHash);
                return resolve(existingLink);
              }
              return reject(err);
            }

            // Increment reference count
            await require('./cacheManager').incrementRefCount(infoHash);

            console.log(`🔗 User link created: ${userId} -> ${infoHash} (${folderName})`);
            resolve({
              id,
              userId,
              infoHash: infoHash.toLowerCase(),
              folderName,
              symlinkPath,
              isCached
            });
          }
        );
      });
    } catch (error) {
      console.error('Error creating user link:', error);
      throw error;
    }
  }

  /**
   * Remove a user's link to a cached torrent
   */
  async removeUserLink(userId, infoHash) {
    if (!userId || !infoHash) return false;

    try {
      const database = require('../models/database');

      // Get the link first to get symlink path
      const link = await new Promise((resolve, reject) => {
        database.db.get(
          `SELECT * FROM user_torrent_links WHERE user_id = ? AND info_hash = ?`,
          [userId, infoHash.toLowerCase()],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!link) return false;

      // Delete the link
      return new Promise((resolve, reject) => {
        database.db.run(
          `DELETE FROM user_torrent_links WHERE user_id = ? AND info_hash = ?`,
          [userId, infoHash.toLowerCase()],
          async function (err) {
            if (err) return reject(err);

            if (this.changes > 0) {
              // Decrement reference count
              await require('./cacheManager').decrementRefCount(infoHash);
              console.log(`🔗 User link removed: ${userId} -> ${infoHash}`);
            }

            resolve({ removed: this.changes > 0, link });
          }
        );
      });
    } catch (error) {
      console.error('Error removing user link:', error);
      return false;
    }
  }

  /**
   * Get user's link to a specific torrent
   */
  async getUserLink(userId, infoHash) {
    if (!userId || !infoHash) return null;

    try {
      const database = require('../models/database');

      return new Promise((resolve, reject) => {
        database.db.get(
          `SELECT * FROM user_torrent_links WHERE user_id = ? AND info_hash = ?`,
          [userId, infoHash.toLowerCase()],
          (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
          }
        );
      });
    } catch (error) {
      console.error('Error getting user link:', error);
      return null;
    }
  }

  /**
   * Get all user links for a user
   */
  async getUserLinks(userId) {
    if (!userId) return [];

    try {
      const database = require('../models/database');

      return new Promise((resolve, reject) => {
        database.db.all(
          `SELECT utl.*, tc.name, tc.total_size, tc.files_count, tc.cache_path, tc.download_status, tc.r2_uploaded
           FROM user_torrent_links utl
           LEFT JOIN torrent_cache tc ON utl.info_hash = tc.info_hash
           WHERE utl.user_id = ?
           ORDER BY utl.added_at DESC`,
          [userId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
    } catch (error) {
      console.error('Error getting user links:', error);
      return [];
    }
  }

  /**
   * Check if user already has a link to a torrent
   */
  async userHasLink(userId, infoHash) {
    const link = await this.getUserLink(userId, infoHash);
    return !!link;
  }

  /**
   * Get cache entry by infoHash
   */
  async getCacheEntry(infoHash) {
    if (!infoHash) return null;

    try {
      const database = require('../models/database');

      return new Promise((resolve, reject) => {
        database.db.get(
          `SELECT * FROM torrent_cache WHERE info_hash = ?`,
          [infoHash.toLowerCase()],
          (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
          }
        );
      });
    } catch (error) {
      console.error('Error getting cache entry:', error);
      return null;
    }
  }

  /**
   * Get path to cache directory for a torrent
   */
  getCachePath(infoHash) {
    return path.join(this.cacheDir, infoHash.toLowerCase());
  }

  /**
   * Get unused cache entries (ref_count = 0 and older than retention period)
   */
  async getUnusedCache() {
    try {
      const database = require('../models/database');
      const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000).toISOString();

      return new Promise((resolve, reject) => {
        database.db.all(
          `SELECT * FROM torrent_cache
           WHERE reference_count = 0
             AND last_accessed_at < ?
             AND download_status = 'completed'`,
          [cutoff],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
    } catch (error) {
      console.error('Error getting unused cache:', error);
      return [];
    }
  }

  /**
   * Cleanup unused cache entries
   */
  async cleanupUnusedCache() {
    const unusedCache = await this.getUnusedCache();

    console.log(`🧹 Cleaning up ${unusedCache.length} unused cache entries`);

    let cleaned = 0;

    for (const cache of unusedCache) {
      try {
        // Delete local cache directory if it exists
        if (cache.cache_path) {
          try {
            await fs.rm(cache.cache_path, { recursive: true, force: true });
          } catch (e) {
            // Ignore if directory doesn't exist
          }
        }

        // Delete database entries
        const database = require('../models/database');

        await new Promise((resolve, reject) => {
          database.db.run(`DELETE FROM r2_files WHERE info_hash = ?`, [cache.info_hash], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve, reject) => {
          database.db.run(`DELETE FROM torrent_cache WHERE info_hash = ?`, [cache.info_hash], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        console.log(`✅ Deleted cache: ${cache.info_hash}`);
        cleaned++;
      } catch (error) {
        console.error(`❌ Failed to delete cache ${cache.info_hash}:`, error);
      }
    }

    return cleaned;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const database = require('../models/database');

      const stats = await new Promise((resolve, reject) => {
        database.db.get(
          `SELECT
             COUNT(*) as total_torrents,
             SUM(total_size) as total_size,
             SUM(reference_count) as total_references,
             AVG(reference_count) as avg_references,
             SUM(CASE WHEN r2_uploaded = 1 THEN 1 ELSE 0 END) as r2_uploaded_count,
             SUM(CASE WHEN download_status = 'completed' THEN 1 ELSE 0 END) as completed_count,
             SUM(CASE WHEN download_status = 'downloading' THEN 1 ELSE 0 END) as downloading_count
           FROM torrent_cache`,
          [],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      const topCached = await new Promise((resolve, reject) => {
        database.db.all(
          `SELECT name, info_hash, reference_count, total_size
           FROM torrent_cache
           WHERE download_status = 'completed'
           ORDER BY reference_count DESC
           LIMIT 10`,
          [],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      return {
        ...stats,
        topCached
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Start the cache cleanup background job
   */
  startCleanupJob() {
    const interval = parseInt(process.env.CACHE_CLEANUP_INTERVAL) || 24 * 60 * 60 * 1000; // 24 hours default

    setInterval(async () => {
      try {
        const cleaned = await this.cleanupUnusedCache();
        if (cleaned > 0) {
          console.log(`🧹 Cache cleanup job: removed ${cleaned} unused entries`);
        }
      } catch (error) {
        console.error('Cache cleanup job error:', error);
      }
    }, interval);

    console.log(`🧹 Cache cleanup job started (interval: ${interval / 1000 / 60} minutes)`);
  }

  /**
   * Delete a specific cache entry (admin function)
   */
  async deleteCacheEntry(infoHash) {
    if (!infoHash) return false;

    try {
      const cache = await this.getCacheEntry(infoHash);
      if (!cache) return false;

      // Delete local cache directory
      if (cache.cache_path) {
        try {
          await fs.rm(cache.cache_path, { recursive: true, force: true });
        } catch (e) {
          // Ignore
        }
      }

      const database = require('../models/database');

      // Delete user links
      await new Promise((resolve, reject) => {
        database.db.run(`DELETE FROM user_torrent_links WHERE info_hash = ?`, [infoHash.toLowerCase()], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Delete R2 files
      await new Promise((resolve, reject) => {
        database.db.run(`DELETE FROM r2_files WHERE info_hash = ?`, [infoHash.toLowerCase()], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Delete cache entry
      await new Promise((resolve, reject) => {
        database.db.run(`DELETE FROM torrent_cache WHERE info_hash = ?`, [infoHash.toLowerCase()], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(`🗑️ Cache entry deleted: ${infoHash}`);
      return true;
    } catch (error) {
      console.error('Error deleting cache entry:', error);
      return false;
    }
  }
}

// Export singleton instance
const cacheManager = new CacheManager();
module.exports = cacheManager;
