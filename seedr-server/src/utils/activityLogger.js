/**
 * Activity Logger Helper
 * Simplifies logging across the application
 */

class ActivityLogger {
  constructor(database) {
    this.database = database;
  }

  /**
   * Log an activity
   * @param {Object} req - Express request object
   * @param {string} actionType - Action type (e.g., 'login_success')
   * @param {Object} details - Additional details
   */
  async log(req, actionType, details = {}) {
    try {
      // Extract IP address safely
      const ipAddress = req.ip || 
                        (req.connection && req.connection.remoteAddress) || 
                        (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0]) || 
                        'unknown';

      await this.database.logActivity({
        userId: req.user?.id || details.userId || null,
        username: req.user?.username || details.username || 'anonymous',
        actionType,
        torrentName: details.torrentName || null,
        torrentHash: details.torrentHash || null,
        magnetLink: details.magnetLink || null,
        filePath: details.filePath || null,
        fileSize: details.fileSize || null,
        ipAddress: ipAddress,
        userAgent: req.get('user-agent') || 'Unknown'
      });
    } catch (error) {
      console.error('[ActivityLogger] Failed to log activity:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(req, action, userId = null, username = null, success = true) {
    const actionType = `${action}_${success ? 'success' : 'failure'}`;
    await this.log(req, actionType, { userId, username });
  }

  /**
   * Log admin actions with target user
   */
  async logAdmin(req, action, targetUserId, targetUsername, details = {}) {
    const actionType = `admin_${action}`;
    await this.log(req, actionType, {
      ...details,
      // Store admin info in standard fields (handled by log method via req.user)
      // Store target info in torrentName/Hash as temporary workaround per guide
      torrentName: `target:${targetUsername}`,
      torrentHash: `targetId:${targetUserId}`
    });
  }

  /**
   * Log torrent operations
   */
  async logTorrent(req, action, torrent) {
    await this.log(req, `torrent_${action}`, {
      torrentName: torrent.name,
      torrentHash: torrent.infoHash,
      magnetLink: torrent.magnetLink || null,
      fileSize: torrent.length || null
    });
  }

  /**
   * Log file operations
   */
  async logFile(req, action, filePath, fileSize = null) {
    await this.log(req, `file_${action}`, {
      filePath,
      fileSize
    });
  }

  /**
   * Log security events
   */
  async logSecurity(req, event, details = {}) {
    await this.log(req, `security_${event}`, details);
  }
}

module.exports = ActivityLogger;
