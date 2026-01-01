// const axios = require('axios');

// /**
//  * Activity Logger Helper
//  * Simplifies logging across the application
//  */

// class ActivityLogger {
//   constructor(database) {
//     this.database = database;
//   }

//   /**
//    * Resolve IP to Country Code
//    */
//   // async getCountryCode(ip) {
//   //   if (!ip || ip === 'unknown' || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
//   //     return null;
//   //   }

//   //   try {
//   //     // Use ip-api.com (free, no key, 45req/min)
//   //     // Timeout 1s to avoid blocking logging
//   //     const response = await axios.get(`http://ip-api.com/json/${ip}?fields=countryCode`, {
//   //       timeout: 1000
//   //     });

//   //     if (response.data && response.data.countryCode) {
//   //       return response.data.countryCode;
//   //     }
//   //   } catch (error) {
//   //     // Ignore errors (timeouts, rate limits) - country logging is best-effort
//   //     // console.error('Failed to resolve country:', error.message);
//   //   }
//   //   return null;
//   // }

//   /**
//  * Check if an IP is local/private
//  */

//   /**
//    * Log an activity
//    * @param {Object} req - Express request object
//    * @param {string} actionType - Action type (e.g., 'login_success')
//    * @param {Object} details - Additional details
//    */
//   async log(req, actionType, details = {}) {
//     try {
//       // Extract IP address safely
//       const ipAddress = req.ip ||
//         (req.connection && req.connection.remoteAddress) ||
//         (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0]) ||
//         'unknown';

//       // Resolve country code (async but don't block heavily)
//       const countryCode = await this.getCountryCode(ipAddress);

//       await this.database.logActivity({
//         userId: req.user?.id || details.userId || null,
//         username: req.user?.username || details.username || 'anonymous',
//         actionType,
//         torrentName: details.torrentName || null,
//         torrentHash: details.torrentHash || null,
//         magnetLink: details.magnetLink || null,
//         filePath: details.filePath || null,
//         fileSize: details.fileSize || null,
//         ipAddress: ipAddress,
//         userAgent: req.get('user-agent') || 'Unknown',
//         countryCode: countryCode
//       });
//     } catch (error) {
//       console.error('[ActivityLogger] Failed to log activity:', error);
//       // Don't throw - logging failures shouldn't break the application
//     }
//   }

//   /**
//    * Log authentication events
//    */
//   async logAuth(req, action, userId = null, username = null, success = true) {
//     const actionType = `${action}_${success ? 'success' : 'failure'}`;
//     await this.log(req, actionType, { userId, username });
//   }

//   /**
//    * Log admin actions with target user
//    */
//   async logAdmin(req, action, targetUserId, targetUsername, details = {}) {
//     const actionType = `admin_${action}`;
//     await this.log(req, actionType, {
//       ...details,
//       // Store admin info in standard fields (handled by log method via req.user)
//       // Store target info in torrentName/Hash as temporary workaround per guide
//       torrentName: `target:${targetUsername}`,
//       torrentHash: `targetId:${targetUserId}`
//     });
//   }

//   /**
//    * Log torrent operations
//    */
//   async logTorrent(req, action, torrent) {
//     await this.log(req, `torrent_${action}`, {
//       torrentName: torrent.name,
//       torrentHash: torrent.infoHash,
//       magnetLink: torrent.magnetLink || null,
//       fileSize: torrent.length || null
//     });
//   }

//   /**
//    * Log file operations
//    */
//   async logFile(req, action, filePath, fileSize = null) {
//     await this.log(req, `file_${action}`, {
//       filePath,
//       fileSize
//     });
//   }

//   /**
//    * Log security events
//    */
//   async logSecurity(req, event, details = {}) {
//     await this.log(req, `security_${event}`, details);
//   }
// }

// module.exports = ActivityLogger;










const axios = require('axios');

/**
 * Activity Logger Helper
 * Simplifies logging across the application
 */
class ActivityLogger {
  constructor(database, options = {}) {
    this.database = database;

    // Tunables (safe defaults)
    this.geoTimeoutMs = options.geoTimeoutMs ?? 1200;
    this.geoCacheTtlMs = options.geoCacheTtlMs ?? 24 * 60 * 60 * 1000; // 24h
    this.geoMaxCache = options.geoMaxCache ?? 5000;

    // Simple in-memory cache: ip -> { cc, exp }
    this._geoCache = new Map();
  }

  /**
   * Extract the best client IP from Express req (supports proxies)
   * NOTE: If you're behind a proxy (Nginx/Cloudflare), set:
   *   app.set('trust proxy', true)
   */
  getClientIp(req) {
    // Prefer x-forwarded-for when behind proxy
    const xff = req.headers['x-forwarded-for'];
    if (xff && typeof xff === 'string') {
      // Take the first IP in the list
      const first = xff.split(',')[0].trim();
      if (first) return first;
    }

    // Express sets req.ip (depends on trust proxy)
    if (req.ip) return req.ip;

    // Fallbacks
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

    // Strip zone id for IPv6 link-local
    const zoneIdx = s.indexOf('%');
    if (zoneIdx !== -1) s = s.slice(0, zoneIdx);

    // IPv4-mapped IPv6
    if (s.startsWith('::ffff:')) s = s.slice(7);

    // Some environments wrap IPv6 in brackets
    if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1);

    return s;
  }

  /**
   * Basic IP validation (IPv4/IPv6)
   */
  isValidIp(ip) {
    if (!ip || typeof ip !== 'string') return false;

    // IPv4 check
    const v4 = ip.split('.');
    if (v4.length === 4) {
      for (const part of v4) {
        if (!/^\d+$/.test(part)) return false;
        const n = Number(part);
        if (n < 0 || n > 255) return false;
      }
      return true;
    }

    // Very lightweight IPv6 check (not perfect but good enough for logging)
    // Accepts standard hex+colon forms.
    return /^[0-9a-fA-F:]+$/.test(ip) && ip.includes(':');
  }

  /**
   * Check if an IP is local/private/reserved (avoid external lookup)
   */
  isPrivateOrLocal(ip) {
    if (!ip) return true;

    // Common "unknown" / loopback
    if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') return true;

    // IPv4 ranges
    const parts = ip.split('.');
    if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
      const a = Number(parts[0]);
      const b = Number(parts[1]);

      // 10.0.0.0/8
      if (a === 10) return true;

      // 192.168.0.0/16
      if (a === 192 && b === 168) return true;

      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 169.254.0.0/16 (link-local)
      if (a === 169 && b === 254) return true;

      // 100.64.0.0/10 (CGNAT)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 0.0.0.0/8 and 255.255.255.255 (reserved/broadcast)
      if (a === 0 || a === 255) return true;
    }

    // IPv6: link-local (fe80::/10), unique local (fc00::/7), multicast (ff00::/8)
    const lower = ip.toLowerCase();
    if (
      lower.startsWith('fe80:') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('ff')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Tiny LRU-ish cache maintenance: if over max, delete oldest entry
   */
  _cacheSet(ip, cc) {
    const now = Date.now();

    // refresh insertion order
    if (this._geoCache.has(ip)) this._geoCache.delete(ip);
    this._geoCache.set(ip, { cc, exp: now + this.geoCacheTtlMs });

    // trim
    if (this._geoCache.size > this.geoMaxCache) {
      const oldestKey = this._geoCache.keys().next().value;
      if (oldestKey) this._geoCache.delete(oldestKey);
    }
  }

  _cacheGet(ip) {
    const entry = this._geoCache.get(ip);
    if (!entry) return null;
    if (Date.now() > entry.exp) {
      this._geoCache.delete(ip);
      return null;
    }
    // refresh insertion order
    this._geoCache.delete(ip);
    this._geoCache.set(ip, entry);
    return entry.cc;
  }

  /**
   * Resolve IP -> Country Code (best-effort, HTTPS providers + fallback)
   * Returns ISO 2-letter country code, or null.
   */
  async getCountryCode(ipRaw) {
    const ip = this.normalizeIp(ipRaw);

    if (!ip || this.isPrivateOrLocal(ip) || !this.isValidIp(ip)) return null;

    // Cache first
    const cached = this._cacheGet(ip);
    if (cached) return cached;

    // Providers (HTTPS, no key) — fallback order
    const providers = [
      // country.is returns: { ip, country }
      async (targetIp) => {
        const res = await axios.get(`https://api.country.is/${targetIp}`, {
          timeout: this.geoTimeoutMs,
          validateStatus: (s) => s >= 200 && s < 500,
        });
        const cc = res?.data?.country;
        return typeof cc === 'string' ? cc : null;
      },

      // geojs country endpoint returns: { country: "US" } (or similar)
      async (targetIp) => {
        const res = await axios.get(`https://get.geojs.io/v1/ip/country/${targetIp}.json`, {
          timeout: this.geoTimeoutMs,
          validateStatus: (s) => s >= 200 && s < 500,
        });
        const cc = res?.data?.country;
        return typeof cc === 'string' ? cc : null;
      },

      // ipapi.co returns: { country_code: "US", ... }
      async (targetIp) => {
        const res = await axios.get(`https://ipapi.co/${targetIp}/json/`, {
          timeout: this.geoTimeoutMs,
          validateStatus: (s) => s >= 200 && s < 500,
        });
        const cc = res?.data?.country_code;
        return typeof cc === 'string' ? cc : null;
      },

      // ipwho.is returns: { country_code: "US", success: true, ... }
      async (targetIp) => {
        const res = await axios.get(`https://ipwho.is/${targetIp}`, {
          timeout: this.geoTimeoutMs,
          validateStatus: (s) => s >= 200 && s < 500,
        });
        const cc = res?.data?.country_code;
        return typeof cc === 'string' ? cc : null;
      },
    ];

    for (const provider of providers) {
      try {
        const cc = await provider(ip);
        if (cc && typeof cc === 'string' && cc.length === 2) {
          const up = cc.toUpperCase();
          this._cacheSet(ip, up);
          return up;
        }
      } catch {
        // ignore and try next provider
      }
    }

    // Cache negative result briefly to reduce repeated calls (optional)
    this._cacheSet(ip, null);
    return null;
  }

  /**
   * Log an activity
   * @param {Object} req - Express request object
   * @param {string} actionType - Action type (e.g., 'login_success')
   * @param {Object} details - Additional details
   */
  async log(req, actionType, details = {}) {
    try {
      const ipAddress = this.getClientIp(req);
      const normalizedIp = this.normalizeIp(ipAddress) || 'unknown';

      // best-effort geo lookup
      const countryCode = await this.getCountryCode(normalizedIp);

      await this.database.logActivity({
        userId: req.user?.id || details.userId || null,
        username: req.user?.username || details.username || 'anonymous',
        actionType,
        torrentName: details.torrentName || null,
        torrentHash: details.torrentHash || null,
        magnetLink: details.magnetLink || null,
        filePath: details.filePath || null,
        fileSize: details.fileSize || null,
        ipAddress: normalizedIp,
        userAgent: (typeof req.get === 'function' && req.get('user-agent')) || req.headers['user-agent'] || 'Unknown',
        countryCode: countryCode,
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
