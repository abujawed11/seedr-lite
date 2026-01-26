// src/utils/diskSpace.js
// SSD Space Management - Check and manage disk space for downloads

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

class DiskSpaceManager {
  constructor() {
    // Configuration from environment
    this.ssdTotal = parseInt(process.env.SSD_TOTAL_CAPACITY) || 100 * 1024 * 1024 * 1024; // 100GB default
    this.ssdReserved = parseInt(process.env.SSD_RESERVED_FOR_SYSTEM) || 5 * 1024 * 1024 * 1024; // 5GB reserved
    this.maxDownloadSpace = this.ssdTotal - this.ssdReserved;
    this.storageRoot = process.env.ROOT || './src/storage/library';
    this.cacheDir = process.env.CACHE_DIR || './src/storage/cache';
  }

  /**
   * Get available disk space for a directory
   * Cross-platform support (Windows and Unix)
   */
  async getAvailableDiskSpace(directory = null) {
    const targetDir = directory || this.storageRoot;

    try {
      // Ensure directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const isWindows = process.platform === 'win32';

      if (isWindows) {
        return await this.getWindowsDiskSpace(targetDir);
      } else {
        return await this.getUnixDiskSpace(targetDir);
      }
    } catch (error) {
      console.error('Failed to get disk space:', error);
      throw error;
    }
  }

  /**
   * Get disk space on Windows using wmic
   */
  async getWindowsDiskSpace(directory) {
    try {
      const resolvedPath = path.resolve(directory);
      const driveLetter = resolvedPath.charAt(0).toUpperCase();

      const { stdout } = await execAsync(
        `wmic logicaldisk where "DeviceID='${driveLetter}:'" get Size,FreeSpace /format:csv`
      );

      const lines = stdout.trim().split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('Unable to parse disk space output');
      }

      const values = lines[1].split(',');
      const freeSpace = parseInt(values[1]) || 0;
      const totalSize = parseInt(values[2]) || 0;

      return {
        total: totalSize,
        free: freeSpace,
        used: totalSize - freeSpace
      };
    } catch (error) {
      // Fallback: try PowerShell
      return await this.getWindowsDiskSpacePowerShell(directory);
    }
  }

  /**
   * Fallback: Get disk space on Windows using PowerShell
   */
  async getWindowsDiskSpacePowerShell(directory) {
    const resolvedPath = path.resolve(directory);
    const driveLetter = resolvedPath.charAt(0).toUpperCase();

    const { stdout } = await execAsync(
      `powershell -command "Get-PSDrive ${driveLetter} | Select-Object Used,Free | ConvertTo-Json"`
    );

    const data = JSON.parse(stdout);
    const free = data.Free || 0;
    const used = data.Used || 0;
    const total = free + used;

    return {
      total,
      free,
      used
    };
  }

  /**
   * Get disk space on Unix/Linux/Mac using df
   */
  async getUnixDiskSpace(directory) {
    const { stdout } = await execAsync(`df -B1 "${directory}" | tail -1`);
    const parts = stdout.trim().split(/\s+/);

    // df output: Filesystem 1B-blocks Used Available Use% Mounted
    const total = parseInt(parts[1]) || 0;
    const used = parseInt(parts[2]) || 0;
    const free = parseInt(parts[3]) || 0;

    return {
      total,
      free,
      used
    };
  }

  /**
   * Check if there's enough space for a download
   * Considers both disk space and active reservations
   */
  async hasEnoughSpace(requiredBytes) {
    try {
      const { free } = await this.getAvailableDiskSpace();

      // Available = free disk space - system reserve - active reservations
      const availableAfterReserve = free - this.ssdReserved;

      // Get active SSD reservations from database
      const activeReservations = await this.getTotalSSDReservations();
      const actualAvailable = availableAfterReserve - activeReservations;

      const hasSpace = actualAvailable >= requiredBytes;

      console.log(`💾 Space check: Required=${this.formatBytes(requiredBytes)}, Available=${this.formatBytes(actualAvailable)}, HasSpace=${hasSpace}`);

      return {
        hasSpace,
        required: requiredBytes,
        available: actualAvailable,
        free,
        reserved: activeReservations
      };
    } catch (error) {
      console.error('Error checking disk space:', error);
      // Fail safe - deny if we can't check
      return {
        hasSpace: false,
        error: error.message
      };
    }
  }

  /**
   * Get total active SSD reservations from database
   */
  async getTotalSSDReservations() {
    try {
      const database = require('../models/database');

      return new Promise((resolve, reject) => {
        database.db.get(
          `SELECT COALESCE(SUM(size_bytes), 0) as total FROM ssd_reservations WHERE status = 'active'`,
          [],
          (err, row) => {
            if (err) {
              console.error('Error getting SSD reservations:', err);
              resolve(0); // Return 0 on error to not block downloads
            } else {
              resolve(row?.total || 0);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error getting SSD reservations:', error);
      return 0;
    }
  }

  /**
   * Get detailed SSD usage information
   */
  async getDetailedSSDUsage() {
    try {
      const diskStats = await this.getAvailableDiskSpace();
      const reserved = await this.getTotalSSDReservations();
      const cacheSize = await this.getCacheDirectorySize();

      return {
        disk: {
          total: diskStats.total,
          used: diskStats.used,
          free: diskStats.free,
        },
        config: {
          ssdTotal: this.ssdTotal,
          systemReserved: this.ssdReserved,
          maxDownloadSpace: this.maxDownloadSpace,
        },
        reservations: {
          active: reserved,
        },
        cache: {
          size: cacheSize,
        },
        calculated: {
          availableForDownloads: diskStats.free - this.ssdReserved - reserved,
          usagePercent: ((diskStats.used / diskStats.total) * 100).toFixed(2),
        }
      };
    } catch (error) {
      console.error('Error getting detailed SSD usage:', error);
      throw error;
    }
  }

  /**
   * Get the size of the cache directory
   */
  async getCacheDirectorySize() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        return 0;
      }

      return await this.getDirectorySize(this.cacheDir);
    } catch (error) {
      console.error('Error getting cache directory size:', error);
      return 0;
    }
  }

  /**
   * Recursively calculate directory size
   */
  async getDirectorySize(dirPath) {
    let totalSize = 0;

    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore permission errors
    }

    return totalSize;
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
   * Check if SSD usage is critical (> 90%)
   */
  async isCriticalUsage() {
    try {
      const { disk } = await this.getDetailedSSDUsage();
      const usagePercent = (disk.used / disk.total) * 100;
      return usagePercent > 90;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get space check summary for API response
   */
  async getSpaceCheckSummary(requiredBytes = 0) {
    const detailed = await this.getDetailedSSDUsage();
    const spaceCheck = requiredBytes > 0 ? await this.hasEnoughSpace(requiredBytes) : null;

    return {
      ...detailed,
      spaceCheck,
      formatted: {
        diskTotal: this.formatBytes(detailed.disk.total),
        diskUsed: this.formatBytes(detailed.disk.used),
        diskFree: this.formatBytes(detailed.disk.free),
        availableForDownloads: this.formatBytes(detailed.calculated.availableForDownloads),
        activeReservations: this.formatBytes(detailed.reservations.active),
        cacheSize: this.formatBytes(detailed.cache.size),
      }
    };
  }
}

// Export singleton instance
const diskSpaceManager = new DiskSpaceManager();
module.exports = diskSpaceManager;
