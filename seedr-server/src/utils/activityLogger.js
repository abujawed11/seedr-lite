const geoip = require('geoip-lite');

/**
 * Activity Logger Helper
 * Simplifies logging across the application.
 *
 * - Country lookup is done locally (geoip-lite, offline database): no
 *   third-party calls, no user IPs leave the server, no request slowdown.
 * - Events without a logged-in user (e.g. failed logins for unknown
 *   usernames) are still recorded, with an empty user id.
 * - Missing usernames are resolved from the user id (cached).
 *
 * A new instance is created per request (see server.js), so caches are
 * module-level.
 */

const USERNAME_CACHE_MS = 5 * 60 * 1000;
const usernameCache = new Map(); // userId -> { name, exp }

class ActivityLogger {
  constructor(database) {
    this.database = database;
  }

  /**
   * Extract the client IP from an Express req.
   * Uses req.ip, which Express derives from X-Forwarded-For ONLY through the
   * proxies trusted by `app.set('trust proxy', ...)` in server.js. Never read
   * X-Forwarded-For directly here — its leftmost entry is client-controlled
   * and can be faked.
   */
  getClientIp(req) {
    if (req.ip) return req.ip;
    return (
      (req.connection && req.connection.remoteAddress) ||
      (req.socket && req.socket.remoteAddress) ||
      'unknown'
    );
  }

  /**
   * Normalize IPv4-mapped IPv6 addresses and strip zone id
   * - "::ffff:8.8.8.8" -> "8.8.8.8"
   * - "fe80::1%lo0" -> "fe80::1"
   */
  normalizeIp(ip) {
    if (!ip || typeof ip !== 'string') return null;
    let s = ip.trim();
    const zoneIdx = s.indexOf('%');
    if (zoneIdx !== -1) s = s.slice(0, zoneIdx);
    if (s.startsWith('::ffff:')) s = s.slice(7);
    if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1);
    return s;
  }

  /**
   * IP -> ISO 2-letter country code using the local GeoIP database.
   * Returns null for private/unknown addresses. Synchronous and fast.
   */
  getCountryCode(ipRaw) {
    const ip = this.normalizeIp(ipRaw);
    if (!ip || ip === 'unknown') return null;
    try {
      const geo = geoip.lookup(ip); // null for private / reserved ranges
      return geo && geo.country ? geo.country.toUpperCase() : null;
    } catch {
      return null;
    }
  }

  /**
   * Look up a username from a user id (cached). Returns null if unknown.
   */
  async resolveUsername(userId) {
    if (!userId) return null;
    const cached = usernameCache.get(userId);
    if (cached && cached.exp > Date.now()) return cached.name;
    try {
      const user = await this.database.getUserById(userId);
      const name = user?.username || null;
      usernameCache.set(userId, { name, exp: Date.now() + USERNAME_CACHE_MS });
      if (usernameCache.size > 5000) usernameCache.delete(usernameCache.keys().next().value);
      return name;
    } catch {
      return null;
    }
  }

  /**
   * Log an activity
   * @param {Object} req - Express request object
   * @param {string} actionType - Action type (e.g., 'login_success')
   * @param {Object} details - Additional details
   */
  async log(req, actionType, details = {}) {
    try {
      const userId = req.user?.id || details.userId || null;

      let username = req.user?.username || details.username || null;
      if (!username && userId) username = await this.resolveUsername(userId);
      if (!username) username = userId ? 'unknown' : 'anonymous';

      const normalizedIp = this.normalizeIp(this.getClientIp(req)) || 'unknown';

      await this.database.logActivity({
        // Events with no logged-in user (failed logins for unknown usernames,
        // public submissions...) are still recorded, with an empty user id.
        userId: userId || '',
        username,
        actionType,
        torrentName: details.torrentName || null,
        torrentHash: details.torrentHash || null,
        magnetLink: details.magnetLink || null,
        filePath: details.filePath || null,
        fileSize: details.fileSize || null,
        ipAddress: normalizedIp,
        userAgent: (typeof req.get === 'function' && req.get('user-agent')) || req.headers?.['user-agent'] || 'Unknown',
        countryCode: this.getCountryCode(normalizedIp),
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
      // Store target info in torrentName/Hash as temporary workaround per guide
      torrentName: `target:${targetUsername}`,
      torrentHash: `targetId:${targetUserId}`,
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
      fileSize: torrent.length || null,
    });
  }

  /**
   * Log file operations
   */
  async logFile(req, action, filePath, fileSize = null) {
    await this.log(req, `file_${action}`, {
      filePath,
      fileSize,
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
