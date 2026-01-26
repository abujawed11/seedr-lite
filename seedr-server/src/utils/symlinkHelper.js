// src/utils/symlinkHelper.js
// Symlink/Junction Helper - Cross-platform support for user access to cached torrents

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SymlinkHelper {
  constructor() {
    this.isWindows = process.platform === 'win32';
  }

  resolveSymlinkTarget(linkPath, rawTarget) {
    if (!rawTarget) return null;

    if (path.isAbsolute(rawTarget)) {
      return path.resolve(rawTarget);
    }

    const relativeToLinkDir = path.resolve(path.dirname(linkPath), rawTarget);
    if (fsSync.existsSync(relativeToLinkDir)) {
      return relativeToLinkDir;
    }

    const relativeToCwd = path.resolve(rawTarget);
    if (fsSync.existsSync(relativeToCwd)) {
      return relativeToCwd;
    }

    return relativeToLinkDir;
  }

  /**
   * Create a symlink or junction from user directory to cache
   * On Windows, uses junctions for directories (no admin required)
   * On Unix, uses absolute-target symlinks to avoid dangling links
   */
  async createSymlink(targetPath, linkPath) {
    try {
      const resolvedTarget = path.resolve(targetPath);
      const resolvedLink = path.resolve(linkPath);

      // Ensure parent directory exists
      const parentDir = path.dirname(resolvedLink);
      await fs.mkdir(parentDir, { recursive: true });

      // Check if link already exists
      if (await this.exists(resolvedLink)) {
        // Check if it's already pointing to the same target
        const existingTarget = await this.getSymlinkTarget(resolvedLink);
        const existingResolvedTarget = this.resolveSymlinkTarget(resolvedLink, existingTarget);
        const existingResolvesFromLinkDir = !existingTarget
          ? false
          : path.isAbsolute(existingTarget) || fsSync.existsSync(path.resolve(path.dirname(resolvedLink), existingTarget));

        // If the existing link stores a relative target that doesn't resolve from the link dir,
        // it's effectively broken (common when running inside Linux containers with relative paths).
        if (existingResolvedTarget && path.resolve(existingResolvedTarget) === resolvedTarget && existingResolvesFromLinkDir) {
          console.log(`ðŸ”— Symlink already exists: ${linkPath} -> ${targetPath}`);
          return { success: true, existed: true };
        }
        // Remove existing link
        await this.removeSymlink(resolvedLink);
      }

      let targetStat;
      try {
        targetStat = await fs.stat(resolvedTarget);
      } catch {
        throw new Error(`Target does not exist: ${resolvedTarget}`);
      }

      if (this.isWindows) {
        if (targetStat.isDirectory()) {
          // Use junction for directories on Windows (no admin required)
          await this.createWindowsJunction(resolvedTarget, resolvedLink);
        } else {
          // Use hard link for files on Windows, or copy if that fails
          await this.createWindowsFileLink(resolvedTarget, resolvedLink);
        }
      } else {
        // Unix: use absolute paths so link is stable regardless of link location
        await fs.symlink(resolvedTarget, resolvedLink);
      }

      console.log(`ðŸ”— Symlink created: ${linkPath} -> ${targetPath}`);
      return { success: true, existed: false };
    } catch (error) {
      console.error(`Failed to create symlink: ${linkPath} -> ${targetPath}`, error);
      throw error;
    }
  }

  /**
   * Create a Windows junction (directory link)
   */
  async createWindowsJunction(targetPath, linkPath) {
    const resolvedTarget = path.resolve(targetPath);
    const resolvedLink = path.resolve(linkPath);

    try {
      // Try Node.js symlink with 'junction' type first
      await fs.symlink(resolvedTarget, resolvedLink, 'junction');
    } catch (error) {
      // Fallback to mklink command
      try {
        await execAsync(`mklink /J "${resolvedLink}" "${resolvedTarget}"`);
      } catch (cmdError) {
        throw new Error(`Failed to create junction: ${cmdError.message}`);
      }
    }
  }

  /**
   * Create a Windows file link (hard link or copy)
   */
  async createWindowsFileLink(targetPath, linkPath) {
    const resolvedTarget = path.resolve(targetPath);
    const resolvedLink = path.resolve(linkPath);

    try {
      // Try hard link first
      await fs.link(resolvedTarget, resolvedLink);
    } catch (error) {
      // Hard link failed (maybe cross-device), try symlink
      try {
        await fs.symlink(resolvedTarget, resolvedLink, 'file');
      } catch (symlinkError) {
        // Symlink failed (needs admin), copy the file instead
        await fs.copyFile(resolvedTarget, resolvedLink);
        console.log(`ðŸ“‹ Copied file (symlink not available): ${linkPath}`);
      }
    }
  }

  /**
   * Remove a symlink or junction
   */
  async removeSymlink(linkPath) {
    try {
      if (!await this.exists(linkPath)) {
        return { success: true, existed: false };
      }

      const stats = await fs.lstat(linkPath);

      if (stats.isSymbolicLink()) {
        // It's a symlink, just unlink
        await fs.unlink(linkPath);
      } else if (this.isWindows && stats.isDirectory()) {
        // On Windows, junctions appear as directories
        // Check if it's a junction/reparse point
        const isJunction = await this.isJunction(linkPath);
        if (isJunction) {
          // Remove junction using rmdir (doesn't delete target contents)
          await fs.rmdir(linkPath);
        } else {
          // It's a real directory, use recursive delete
          await fs.rm(linkPath, { recursive: true, force: true });
        }
      } else if (stats.isDirectory()) {
        // Regular directory
        await fs.rm(linkPath, { recursive: true, force: true });
      } else {
        // Regular file
        await fs.unlink(linkPath);
      }

      console.log(`ðŸ”— Symlink removed: ${linkPath}`);
      return { success: true, existed: true };
    } catch (error) {
      console.error(`Failed to remove symlink: ${linkPath}`, error);
      throw error;
    }
  }

  /**
   * Check if a path is a symlink or junction
   */
  async isSymlink(linkPath) {
    try {
      const stats = await fs.lstat(linkPath);

      if (stats.isSymbolicLink()) {
        return true;
      }

      // On Windows, check for junction
      if (this.isWindows && stats.isDirectory()) {
        return await this.isJunction(linkPath);
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a Windows path is a junction point
   */
  async isJunction(linkPath) {
    if (!this.isWindows) return false;

    try {
      const stats = await fs.lstat(linkPath);

      // Check if it's a reparse point (junction or symlink)
      // On Windows, junctions have the reparse point attribute
      // Node.js doesn't expose this directly, so we check by trying to read it
      if (stats.isDirectory()) {
        try {
          await fs.readlink(linkPath);
          return true; // If readlink succeeds, it's a junction/symlink
        } catch (e) {
          return false; // Regular directory
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the target of a symlink
   */
  async getSymlinkTarget(linkPath) {
    try {
      const target = await fs.readlink(linkPath);
      return target;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a path exists (works for both regular files and symlinks)
   */
  async exists(filePath) {
    try {
      await fs.lstat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create user folder structure with symlink to cache
   * Returns the path where files will be accessible to the user
   */
  async createUserAccess(userId, infoHash, cachePath, folderName) {
    const { getUserStorageDir } = require('./storage');

    const userDir = getUserStorageDir(userId);
    const userLinkPath = path.join(userDir, folderName);

    // Create the symlink
    await this.createSymlink(cachePath, userLinkPath);

    return {
      userPath: userLinkPath,
      cachePath: cachePath,
      folderName: folderName
    };
  }

  /**
   * Remove user's access to a cached torrent
   */
  async removeUserAccess(userId, folderName) {
    const { getUserStorageDir } = require('./storage');

    const userDir = getUserStorageDir(userId);
    const userLinkPath = path.join(userDir, folderName);

    return await this.removeSymlink(userLinkPath);
  }

  /**
   * Verify that a symlink is valid (target exists)
   */
  async verifySymlink(linkPath) {
    try {
      if (!await this.isSymlink(linkPath)) {
        return { valid: false, reason: 'Not a symlink' };
      }

      const target = await this.getSymlinkTarget(linkPath);
      if (!target) {
        return { valid: false, reason: 'Cannot read target' };
      }

      const resolvedTarget = this.resolveSymlinkTarget(linkPath, target);
      if (!resolvedTarget || !fsSync.existsSync(resolvedTarget)) {
        return { valid: false, reason: 'Target does not exist', target: resolvedTarget };
      }

      return { valid: true, target: resolvedTarget };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  /**
   * Fix broken symlinks by removing them
   */
  async cleanupBrokenSymlinks(directory) {
    let cleaned = 0;

    try {
      const items = await fs.readdir(directory);

      for (const item of items) {
        const itemPath = path.join(directory, item);

        try {
          const isLink = await this.isSymlink(itemPath);
          if (isLink) {
            const verification = await this.verifySymlink(itemPath);
            if (!verification.valid) {
              await this.removeSymlink(itemPath);
              cleaned++;
              console.log(`ðŸ§¹ Removed broken symlink: ${itemPath}`);
            }
          }
        } catch (error) {
          // Skip items we can't check
        }
      }
    } catch (error) {
      console.error(`Error cleaning up symlinks in ${directory}:`, error);
    }

    return cleaned;
  }
}

// Export singleton instance
const symlinkHelper = new SymlinkHelper();
module.exports = symlinkHelper;
