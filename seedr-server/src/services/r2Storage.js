// src/services/r2Storage.js
// Cloudflare R2 Storage Integration using AWS S3 SDK

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { nanoid } = require('nanoid');
const mime = require('mime-types');

class R2StorageManager {
  constructor() {
    this.enabled = process.env.R2_ENABLED === 'true';
    this.client = null;
    this.bucket = process.env.R2_BUCKET_NAME || 'seedr-lite-storage';
    this.publicDomain = process.env.R2_PUBLIC_DOMAIN || null;
    this.initialized = false;
  }

  /**
   * Initialize the R2 client
   */
  initialize() {
    if (this.initialized) return true;

    if (!this.enabled) {
      console.log('☁️  R2 Storage is disabled');
      return false;
    }

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;
    const region = process.env.S3_REGION || 'auto';

    if ((!accountId && !endpoint) || !accessKeyId || !secretAccessKey) {
      console.warn('⚠️  R2 credentials not configured, R2 storage disabled');
      this.enabled = false;
      return false;
    }

    try {
      this.client = new S3Client({
        region,
        endpoint: endpoint || `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      this.initialized = true;
      console.log('✅ R2 Storage initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize R2 Storage:', error.message);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Check if R2 is available
   */
  isAvailable() {
    return this.enabled && this.initialized;
  }

  /**
   * Upload a single file to R2
   */
  async uploadFile(localPath, r2Key, metadata = {}) {
    if (!this.isAvailable()) {
      throw new Error('R2 Storage is not available');
    }

    try {
      const fileStream = fs.createReadStream(localPath);
      const stats = await fsPromises.stat(localPath);
      const mimeType = mime.lookup(localPath) || 'application/octet-stream';

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: r2Key,
        Body: fileStream,
        ContentLength: stats.size,
        ContentType: mimeType,
        Metadata: metadata,
      });

      await this.client.send(command);

      console.log(`✅ Uploaded to R2: ${r2Key} (${this.formatBytes(stats.size)})`);

      return {
        success: true,
        key: r2Key,
        size: stats.size,
        mimeType,
      };
    } catch (error) {
      console.error(`❌ R2 upload failed: ${r2Key}`, error.message);
      throw error;
    }
  }

  /**
   * Upload all files from a torrent cache to R2
   */
  async uploadTorrent(infoHash, cachePath, userId = null) {
    if (!this.isAvailable()) {
      return { success: false, error: 'R2 Storage is not available' };
    }

    try {
      // Get all files in cache directory
      const files = await this.getAllFiles(cachePath);

      if (files.length === 0) {
        return { success: false, error: 'No files found in cache' };
      }

      console.log(`📤 Uploading ${files.length} files to R2 for ${infoHash}`);

      const uploadedFiles = [];
      const database = require('../models/database');

      for (const file of files) {
        const relativePath = path.relative(cachePath, file).replace(/\\/g, '/');
        const r2Key = `cache/${infoHash}/${relativePath}`;

        try {
          const result = await this.uploadFile(file, r2Key);

          // Store in database
          const fileId = nanoid();
          await new Promise((resolve, reject) => {
            database.db.run(
              `INSERT INTO r2_files (id, info_hash, file_path, r2_object_key, file_name, file_size, mime_type)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [fileId, infoHash.toLowerCase(), relativePath, r2Key, path.basename(file), result.size, result.mimeType],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          uploadedFiles.push(result);
        } catch (uploadError) {
          console.error(`Failed to upload file: ${file}`, uploadError.message);
          // Continue with other files
        }
      }

      // Update cache entry
      const cacheManager = require('./cacheManager');
      await cacheManager.updateCacheStatus(infoHash, 'completed', { r2Uploaded: true });

      console.log(`✅ Uploaded ${uploadedFiles.length}/${files.length} files to R2`);

      return {
        success: true,
        totalFiles: files.length,
        uploadedFiles: uploadedFiles.length,
        files: uploadedFiles,
      };
    } catch (error) {
      console.error(`❌ Failed to upload torrent to R2: ${infoHash}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all files recursively from a directory
   */
  async getAllFiles(dirPath, arrayOfFiles = []) {
    try {
      const items = await fsPromises.readdir(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = await fsPromises.stat(fullPath);

        if (stat.isDirectory()) {
          arrayOfFiles = await this.getAllFiles(fullPath, arrayOfFiles);
        } else {
          arrayOfFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore errors (permission issues, etc.)
    }

    return arrayOfFiles;
  }

  /**
   * Get a readable stream from R2
   */
  async getObjectStream(r2Key, range = null) {
    if (!this.isAvailable()) {
      throw new Error('R2 Storage is not available');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: r2Key,
        Range: range ? `bytes=${range.start}-${range.end}` : undefined,
      });

      const response = await this.client.send(command);

      return {
        stream: response.Body,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        contentRange: response.ContentRange,
        acceptRanges: response.AcceptRanges,
      };
    } catch (error) {
      console.error(`❌ Failed to get R2 object: ${r2Key}`, error.message);
      throw error;
    }
  }

  /**
   * Get object metadata (head request)
   */
  async getObjectMetadata(r2Key) {
    if (!this.isAvailable()) {
      throw new Error('R2 Storage is not available');
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: r2Key,
      });

      const response = await this.client.send(command);

      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata,
      };
    } catch (error) {
      if (error.name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Generate a presigned URL for direct download
   */
  async getPresignedUrl(r2Key, expiresIn = 3600) {
    if (!this.isAvailable()) {
      throw new Error('R2 Storage is not available');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: r2Key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error(`❌ Failed to generate presigned URL: ${r2Key}`, error.message);
      throw error;
    }
  }

  /**
   * Delete a single object from R2
   */
  async deleteObject(r2Key) {
    if (!this.isAvailable()) {
      throw new Error('R2 Storage is not available');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: r2Key,
      });

      await this.client.send(command);
      console.log(`🗑️  Deleted from R2: ${r2Key}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete from R2: ${r2Key}`, error.message);
      throw error;
    }
  }

  /**
   * Delete all files for a torrent from R2
   */
  async deleteTorrent(infoHash) {
    if (!this.isAvailable()) {
      return { success: false, error: 'R2 Storage is not available' };
    }

    try {
      const database = require('../models/database');

      // Get all R2 files for this torrent from database
      const files = await new Promise((resolve, reject) => {
        database.db.all(
          `SELECT r2_object_key FROM r2_files WHERE info_hash = ?`,
          [infoHash.toLowerCase()],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      if (files.length === 0) {
        return { success: true, deleted: 0 };
      }

      // Delete in batches of 1000 (S3 limit)
      const batchSize = 1000;
      let deleted = 0;

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const objects = batch.map(f => ({ Key: f.r2_object_key }));

        try {
          const command = new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: objects },
          });

          await this.client.send(command);
          deleted += batch.length;
        } catch (batchError) {
          console.error(`Failed to delete batch:`, batchError.message);
          // Delete one by one as fallback
          for (const file of batch) {
            try {
              await this.deleteObject(file.r2_object_key);
              deleted++;
            } catch (e) {
              // Ignore individual failures
            }
          }
        }
      }

      // Delete from database
      await new Promise((resolve, reject) => {
        database.db.run(
          `DELETE FROM r2_files WHERE info_hash = ?`,
          [infoHash.toLowerCase()],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log(`🗑️  Deleted ${deleted} files from R2 for ${infoHash}`);

      return { success: true, deleted };
    } catch (error) {
      console.error(`❌ Failed to delete torrent from R2: ${infoHash}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * List objects in R2 with a prefix
   */
  async listObjects(prefix, maxKeys = 1000) {
    if (!this.isAvailable()) {
      throw new Error('R2 Storage is not available');
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.client.send(command);

      return {
        contents: response.Contents || [],
        isTruncated: response.IsTruncated,
        count: response.KeyCount,
      };
    } catch (error) {
      console.error(`❌ Failed to list R2 objects: ${prefix}`, error.message);
      throw error;
    }
  }

  /**
   * Get R2 file info from database
   */
  async getR2FileInfo(infoHash, filePath) {
    const database = require('../models/database');

    return new Promise((resolve, reject) => {
      database.db.get(
        `SELECT * FROM r2_files WHERE info_hash = ? AND file_path = ?`,
        [infoHash.toLowerCase(), filePath],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  }

  /**
   * Get all R2 files for a torrent
   */
  async getTorrentR2Files(infoHash) {
    const database = require('../models/database');

    return new Promise((resolve, reject) => {
      database.db.all(
        `SELECT * FROM r2_files WHERE info_hash = ? ORDER BY file_path`,
        [infoHash.toLowerCase()],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Get R2 storage statistics
   */
  async getStats() {
    const database = require('../models/database');

    const dbStats = await new Promise((resolve, reject) => {
      database.db.get(
        `SELECT
           COUNT(*) as total_files,
           COUNT(DISTINCT info_hash) as total_torrents,
           SUM(file_size) as total_size
         FROM r2_files`,
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    return {
      enabled: this.enabled,
      initialized: this.initialized,
      bucket: this.bucket,
      publicDomain: this.publicDomain,
      stats: {
        totalFiles: dbStats?.total_files || 0,
        totalTorrents: dbStats?.total_torrents || 0,
        totalSize: dbStats?.total_size || 0,
        formattedSize: this.formatBytes(dbStats?.total_size || 0),
      },
    };
  }

  /**
   * Check if a torrent is uploaded to R2
   */
  async isTorrentUploaded(infoHash) {
    const files = await this.getTorrentR2Files(infoHash);
    return files.length > 0;
  }

  /**
   * Get public URL for a file (if public domain is configured)
   */
  getPublicUrl(r2Key) {
    if (!this.publicDomain) {
      return null;
    }
    return `${this.publicDomain}/${r2Key}`;
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Delete local cache after successful R2 upload
   */
  async deleteLocalCache(cachePath) {
    try {
      await fsPromises.rm(cachePath, { recursive: true, force: true });
      console.log(`🗑️  Deleted local cache: ${cachePath}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete local cache: ${cachePath}`, error.message);
      return false;
    }
  }

  /**
   * Complete upload workflow: upload to R2 and delete local
   */
  async migrateToR2(infoHash, cachePath, deleteLocal = true) {
    // Upload to R2
    const uploadResult = await this.uploadTorrent(infoHash, cachePath);

    if (!uploadResult.success) {
      return uploadResult;
    }

    // Delete local cache if requested
    if (deleteLocal && uploadResult.uploadedFiles > 0) {
      await this.deleteLocalCache(cachePath);
    }

    return {
      ...uploadResult,
      localDeleted: deleteLocal,
    };
  }
}

// Export singleton instance
const r2Storage = new R2StorageManager();
module.exports = r2Storage;
