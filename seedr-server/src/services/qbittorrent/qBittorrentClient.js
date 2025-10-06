// src/services/qbittorrent/qBittorrentClient.js
const axios = require('axios');
const { logger } = require('../../utils/logger');

/**
 * qBittorrent Web API v2 Client
 * Documentation: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)
 */
class QBittorrentClient {
  constructor(config) {
    this.baseURL = config.url || 'http://localhost:8080';
    this.username = config.username || 'admin';
    this.password = config.password || 'adminpass';
    this.cookie = null;
    this.isAuthenticated = false;

    // Create axios instance with timeout
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': this.baseURL
      }
    });

    // Add response interceptor for automatic re-authentication
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If we get 403 (Forbidden) and haven't retried yet, try re-authenticating
        if (error.response?.status === 403 && !originalRequest._retry) {
          originalRequest._retry = true;
          logger.warn('qBittorrent session expired, re-authenticating...');

          try {
            await this.login();
            // Retry the original request with new cookie
            originalRequest.headers.Cookie = this.cookie;
            return this.client(originalRequest);
          } catch (loginError) {
            logger.error('Failed to re-authenticate with qBittorrent:', loginError.message);
            return Promise.reject(loginError);
          }
        }

        return Promise.reject(error);
      }
    );

    logger.info(`qBittorrent client initialized: ${this.baseURL}`);
  }

  /**
   * Authenticate with qBittorrent WebUI
   */
  async login() {
    try {
      const response = await this.client.post('/api/v2/auth/login',
        new URLSearchParams({
          username: this.username,
          password: this.password
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Extract cookie from response
      const cookies = response.headers['set-cookie'];
      if (cookies && cookies.length > 0) {
        this.cookie = cookies[0].split(';')[0];
        this.isAuthenticated = true;
        logger.info('✅ qBittorrent authentication successful');
        return true;
      }

      throw new Error('No cookie received from qBittorrent');
    } catch (error) {
      this.isAuthenticated = false;
      logger.error('❌ qBittorrent authentication failed:', error.message);
      throw new Error(`Failed to authenticate with qBittorrent: ${error.message}`);
    }
  }

  /**
   * Ensure we have a valid session
   */
  async ensureAuthenticated() {
    if (!this.isAuthenticated || !this.cookie) {
      await this.login();
    }
  }

  /**
   * Make authenticated request to qBittorrent API
   */
  async request(method, endpoint, data = null) {
    await this.ensureAuthenticated();

    const config = {
      method,
      url: endpoint,
      headers: {
        Cookie: this.cookie
      }
    };

    if (data) {
      if (method.toLowerCase() === 'get') {
        config.params = data;
      } else {
        config.data = new URLSearchParams(data);
        config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }

    try {
      const response = await this.client(config);
      return response.data;
    } catch (error) {
      logger.error(`qBittorrent API error [${method} ${endpoint}]:`, error.message);
      throw error;
    }
  }

  /**
   * Get qBittorrent application version
   */
  async getVersion() {
    return await this.request('GET', '/api/v2/app/version');
  }

  /**
   * Get qBittorrent Web API version
   */
  async getWebAPIVersion() {
    return await this.request('GET', '/api/v2/app/webapiVersion');
  }

  /**
   * Get application preferences
   */
  async getPreferences() {
    return await this.request('GET', '/api/v2/app/preferences');
  }

  /**
   * Set application preferences
   */
  async setPreferences(prefs) {
    return await this.request('POST', '/api/v2/app/setPreferences', {
      json: JSON.stringify(prefs)
    });
  }

  /**
   * Add torrent from magnet link or torrent file
   * @param {Object} options
   * @param {string} options.magnet - Magnet link
   * @param {Buffer} options.torrentFile - Torrent file buffer
   * @param {string} options.savePath - Save path for torrent
   * @param {string} options.category - Category
   * @param {string[]} options.tags - Tags
   * @param {boolean} options.paused - Add in paused state
   */
  async addTorrent(options) {
    const params = {
      savepath: options.savePath || '',
      category: options.category || '',
      tags: options.tags ? options.tags.join(',') : '',
      paused: options.paused ? 'true' : 'false',
      autoTMM: 'false', // Disable automatic torrent management
      sequentialDownload: 'false',
      firstLastPiecePrio: 'false'
    };

    if (options.magnet) {
      params.urls = options.magnet;
      return await this.request('POST', '/api/v2/torrents/add', params);
    }

    if (options.torrentFile) {
      // For file uploads, we need multipart/form-data
      const FormData = require('form-data');
      const form = new FormData();

      form.append('torrents', options.torrentFile, {
        filename: 'torrent.torrent',
        contentType: 'application/x-bittorrent'
      });

      Object.entries(params).forEach(([key, value]) => {
        form.append(key, value);
      });

      await this.ensureAuthenticated();

      const response = await this.client.post('/api/v2/torrents/add', form, {
        headers: {
          ...form.getHeaders(),
          Cookie: this.cookie
        }
      });

      return response.data;
    }

    throw new Error('Either magnet or torrentFile must be provided');
  }

  /**
   * Get list of all torrents
   * @param {Object} filter - Filter options
   */
  async getTorrents(filter = {}) {
    return await this.request('GET', '/api/v2/torrents/info', filter);
  }

  /**
   * Get torrent properties
   */
  async getTorrentProperties(hash) {
    return await this.request('GET', '/api/v2/torrents/properties', { hash });
  }

  /**
   * Get torrent contents (files)
   */
  async getTorrentFiles(hash) {
    return await this.request('GET', '/api/v2/torrents/files', { hash });
  }

  /**
   * Get torrent trackers
   */
  async getTorrentTrackers(hash) {
    return await this.request('GET', '/api/v2/torrents/trackers', { hash });
  }

  /**
   * Pause torrent(s)
   */
  async pauseTorrents(hashes) {
    return await this.request('POST', '/api/v2/torrents/pause', {
      hashes: Array.isArray(hashes) ? hashes.join('|') : hashes
    });
  }

  /**
   * Resume torrent(s)
   */
  async resumeTorrents(hashes) {
    return await this.request('POST', '/api/v2/torrents/resume', {
      hashes: Array.isArray(hashes) ? hashes.join('|') : hashes
    });
  }

  /**
   * Delete torrent(s)
   * @param {string|string[]} hashes - Torrent hash(es)
   * @param {boolean} deleteFiles - Also delete files from disk
   */
  async deleteTorrents(hashes, deleteFiles = false) {
    return await this.request('POST', '/api/v2/torrents/delete', {
      hashes: Array.isArray(hashes) ? hashes.join('|') : hashes,
      deleteFiles: deleteFiles ? 'true' : 'false'
    });
  }

  /**
   * Set torrent category
   */
  async setCategory(hashes, category) {
    return await this.request('POST', '/api/v2/torrents/setCategory', {
      hashes: Array.isArray(hashes) ? hashes.join('|') : hashes,
      category
    });
  }

  /**
   * Add tags to torrent
   */
  async addTags(hashes, tags) {
    return await this.request('POST', '/api/v2/torrents/addTags', {
      hashes: Array.isArray(hashes) ? hashes.join('|') : hashes,
      tags: Array.isArray(tags) ? tags.join(',') : tags
    });
  }

  /**
   * Remove tags from torrent
   */
  async removeTags(hashes, tags) {
    return await this.request('POST', '/api/v2/torrents/removeTags', {
      hashes: Array.isArray(hashes) ? hashes.join('|') : hashes,
      tags: Array.isArray(tags) ? tags.join(',') : tags
    });
  }

  /**
   * Get torrent piece states
   */
  async getTorrentPieceStates(hash) {
    return await this.request('GET', '/api/v2/torrents/pieceStates', { hash });
  }

  /**
   * Get torrent piece hashes
   */
  async getTorrentPieceHashes(hash) {
    return await this.request('GET', '/api/v2/torrents/pieceHashes', { hash });
  }

  /**
   * Recheck torrent(s)
   */
  async recheckTorrents(hashes) {
    return await this.request('POST', '/api/v2/torrents/recheck', {
      hashes: Array.isArray(hashes) ? hashes.join('|') : hashes
    });
  }

  /**
   * Set file priority
   * @param {string} hash - Torrent hash
   * @param {string} id - File id(s) separated by |
   * @param {number} priority - 0=Do not download, 1=Normal priority, 6=High priority, 7=Maximal priority
   */
  async setFilePriority(hash, id, priority) {
    return await this.request('POST', '/api/v2/torrents/filePrio', {
      hash,
      id,
      priority
    });
  }

  /**
   * Get global transfer info
   */
  async getTransferInfo() {
    return await this.request('GET', '/api/v2/transfer/info');
  }

  /**
   * Create category
   */
  async createCategory(category, savePath) {
    return await this.request('POST', '/api/v2/torrents/createCategory', {
      category,
      savePath: savePath || ''
    });
  }

  /**
   * Remove categories
   */
  async removeCategories(categories) {
    return await this.request('POST', '/api/v2/torrents/removeCategories', {
      categories: Array.isArray(categories) ? categories.join('\n') : categories
    });
  }

  /**
   * Get all categories
   */
  async getCategories() {
    return await this.request('GET', '/api/v2/torrents/categories');
  }

  /**
   * Health check - verify qBittorrent is accessible and authenticated
   */
  async healthCheck() {
    try {
      const version = await this.getVersion();
      const apiVersion = await this.getWebAPIVersion();
      return {
        status: 'healthy',
        version,
        apiVersion,
        authenticated: this.isAuthenticated
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        authenticated: false
      };
    }
  }
}

module.exports = QBittorrentClient;
