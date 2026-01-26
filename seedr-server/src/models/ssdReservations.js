// src/models/ssdReservations.js
// Global SSD Space Reservation Management

const { nanoid } = require('nanoid');

class SSDReservationManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new SSD reservation for a download
   */
  async createReservation(userId, infoHash, sizeBytes) {
    const id = nanoid();

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO ssd_reservations (id, info_hash, user_id, size_bytes, status)
         VALUES (?, ?, ?, ?, 'active')`,
        [id, infoHash, userId, sizeBytes],
        function (err) {
          if (err) {
            console.error('Error creating SSD reservation:', err);
            return reject(err);
          }
          console.log(`💾 SSD reservation created: ${infoHash} (${sizeBytes} bytes)`);
          resolve({ id, infoHash, userId, sizeBytes, status: 'active' });
        }
      );
    });
  }

  /**
   * Release a reservation (download cancelled or failed)
   */
  async releaseReservation(infoHash) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE ssd_reservations
         SET status = 'released'
         WHERE info_hash = ? AND status = 'active'`,
        [infoHash],
        function (err) {
          if (err) {
            console.error('Error releasing SSD reservation:', err);
            return reject(err);
          }
          if (this.changes > 0) {
            console.log(`💾 SSD reservation released: ${infoHash}`);
          }
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Finalize a reservation (download completed, files uploaded to R2)
   */
  async finalizeReservation(infoHash) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE ssd_reservations
         SET status = 'finalized'
         WHERE info_hash = ? AND status = 'active'`,
        [infoHash],
        function (err) {
          if (err) {
            console.error('Error finalizing SSD reservation:', err);
            return reject(err);
          }
          if (this.changes > 0) {
            console.log(`💾 SSD reservation finalized: ${infoHash}`);
          }
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Get total active reservations (for space calculations)
   */
  async getTotalActiveReservations() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COALESCE(SUM(size_bytes), 0) as total
         FROM ssd_reservations
         WHERE status = 'active'`,
        [],
        (err, row) => {
          if (err) {
            console.error('Error getting total SSD reservations:', err);
            return reject(err);
          }
          resolve(row?.total || 0);
        }
      );
    });
  }

  /**
   * Get reservation for a specific torrent
   */
  async getReservation(infoHash) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM ssd_reservations WHERE info_hash = ? AND status = 'active'`,
        [infoHash],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  }

  /**
   * Get all active reservations
   */
  async getAllActiveReservations() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT sr.*, u.username
         FROM ssd_reservations sr
         LEFT JOIN users u ON sr.user_id = u.id
         WHERE sr.status = 'active'
         ORDER BY sr.created_at DESC`,
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
  }

  /**
   * Get reservations by user
   */
  async getUserReservations(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM ssd_reservations
         WHERE user_id = ? AND status = 'active'
         ORDER BY created_at DESC`,
        [userId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
  }

  /**
   * Cleanup stale reservations (older than specified hours)
   */
  async cleanupStaleReservations(olderThanHours = 24) {
    return new Promise((resolve, reject) => {
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

      this.db.run(
        `UPDATE ssd_reservations
         SET status = 'released'
         WHERE status = 'active' AND created_at < ?`,
        [cutoffTime],
        function (err) {
          if (err) {
            console.error('Error cleaning up stale SSD reservations:', err);
            return reject(err);
          }
          if (this.changes > 0) {
            console.log(`🧹 Released ${this.changes} stale SSD reservations`);
          }
          resolve(this.changes);
        }
      );
    });
  }

  /**
   * Cleanup reservations for torrents that are no longer active
   */
  async cleanupOrphanedReservations(activeInfoHashes = []) {
    if (activeInfoHashes.length === 0) {
      // Release all active reservations if no torrents are active
      return new Promise((resolve, reject) => {
        this.db.run(
          `UPDATE ssd_reservations SET status = 'released' WHERE status = 'active'`,
          [],
          function (err) {
            if (err) return reject(err);
            if (this.changes > 0) {
              console.log(`🧹 Released ${this.changes} orphaned SSD reservations (no active torrents)`);
            }
            resolve(this.changes);
          }
        );
      });
    }

    // Create placeholders for SQL IN clause
    const placeholders = activeInfoHashes.map(() => '?').join(',');

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE ssd_reservations
         SET status = 'released'
         WHERE status = 'active' AND info_hash NOT IN (${placeholders})`,
        activeInfoHashes,
        function (err) {
          if (err) return reject(err);
          if (this.changes > 0) {
            console.log(`🧹 Released ${this.changes} orphaned SSD reservations`);
          }
          resolve(this.changes);
        }
      );
    });
  }

  /**
   * Update reservation size (if actual size differs from estimated)
   */
  async updateReservationSize(infoHash, newSizeBytes) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE ssd_reservations
         SET size_bytes = ?
         WHERE info_hash = ? AND status = 'active'`,
        [newSizeBytes, infoHash],
        function (err) {
          if (err) return reject(err);
          if (this.changes > 0) {
            console.log(`💾 SSD reservation updated: ${infoHash} -> ${newSizeBytes} bytes`);
          }
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Check if reservation exists and is active
   */
  async hasActiveReservation(infoHash) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 1 FROM ssd_reservations WHERE info_hash = ? AND status = 'active'`,
        [infoHash],
        (err, row) => {
          if (err) return reject(err);
          resolve(!!row);
        }
      );
    });
  }

  /**
   * Get reservation statistics
   */
  async getReservationStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT
           COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
           COUNT(CASE WHEN status = 'released' THEN 1 END) as released_count,
           COUNT(CASE WHEN status = 'finalized' THEN 1 END) as finalized_count,
           COALESCE(SUM(CASE WHEN status = 'active' THEN size_bytes ELSE 0 END), 0) as active_bytes,
           COALESCE(SUM(CASE WHEN status = 'finalized' THEN size_bytes ELSE 0 END), 0) as finalized_bytes
         FROM ssd_reservations`,
        [],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || {
            active_count: 0,
            released_count: 0,
            finalized_count: 0,
            active_bytes: 0,
            finalized_bytes: 0
          });
        }
      );
    });
  }
}

module.exports = SSDReservationManager;
