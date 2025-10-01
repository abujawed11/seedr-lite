// const { nanoid } = require('nanoid');

// /**
//  * Reservation system for storage quota management
//  * Tracks space that will be used by in-progress torrents
//  */
// class ReservationManager {
//   constructor(database) {
//     this.db = database;
//   }

//   /**
//    * Create the reservations table if it doesn't exist
//    */
//   async createReservationsTable() {
//     const createReservationsTable = `
//       CREATE TABLE IF NOT EXISTS storage_reservations (
//         id TEXT PRIMARY KEY,
//         user_id TEXT NOT NULL,
//         info_hash TEXT NOT NULL,
//         size_bytes INTEGER NOT NULL,
//         status TEXT DEFAULT 'active',
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//         finalized_at DATETIME,
//         FOREIGN KEY (user_id) REFERENCES users (id),
//         UNIQUE(user_id, info_hash)
//       )
//     `;

//     return new Promise((resolve, reject) => {
//       this.db.run(createReservationsTable, (err) => {
//         if (err) {
//           console.error('Error creating reservations table:', err);
//           reject(err);
//         } else {
//           console.log('Storage reservations table created or verified');
//           resolve();
//         }
//       });
//     });
//   }

//   /**
//    * Create an active reservation for a user's torrent
//    * @param {string} userId - User ID
//    * @param {string} infoHash - Torrent info hash
//    * @param {number} sizeBytes - Size to reserve in bytes
//    * @returns {Promise<Object>} - Reservation object
//    */
//   async createReservation(userId, infoHash, sizeBytes) {
//     const id = nanoid();

//     return new Promise((resolve, reject) => {
//       const sql = `
//         INSERT INTO storage_reservations (id, user_id, info_hash, size_bytes, status)
//         VALUES (?, ?, ?, ?, 'active')
//       `;

//       this.db.run(sql, [id, userId, infoHash, sizeBytes], function(err) {
//         if (err) {
//           if (err.message.includes('UNIQUE constraint failed')) {
//             reject(new Error('Reservation already exists for this torrent'));
//           } else {
//             reject(err);
//           }
//         } else {
//           resolve({
//             id,
//             userId,
//             infoHash,
//             sizeBytes,
//             status: 'active',
//             createdAt: new Date()
//           });
//         }
//       });
//     });
//   }

//   /**
//    * Get total reserved bytes for a user
//    * @param {string} userId - User ID
//    * @returns {Promise<number>} - Total reserved bytes
//    */
//   async getUserReservedBytes(userId) {
//     return new Promise((resolve, reject) => {
//       const sql = `
//         SELECT COALESCE(SUM(size_bytes), 0) as total_reserved
//         FROM storage_reservations
//         WHERE user_id = ? AND status = 'active'
//       `;

//       this.db.get(sql, [userId], (err, row) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(row.total_reserved || 0);
//         }
//       });
//     });
//   }

//   /**
//    * Get user's effective remaining quota (considering reservations)
//    * @param {string} userId - User ID
//    * @returns {Promise<Object>} - Quota info with reservations
//    */
//   async getUserQuotaWithReservations(userId) {
//     return new Promise((resolve, reject) => {
//       const sql = `
//         SELECT
//           u.storage_quota,
//           u.storage_used,
//           COALESCE(SUM(r.size_bytes), 0) as total_reserved,
//           (u.storage_quota - u.storage_used - COALESCE(SUM(r.size_bytes), 0)) as effective_remaining
//         FROM users u
//         LEFT JOIN storage_reservations r ON u.id = r.user_id AND r.status = 'active'
//         WHERE u.id = ?
//         GROUP BY u.id
//       `;

//       this.db.get(sql, [userId], (err, row) => {
//         if (err) {
//           reject(err);
//         } else if (!row) {
//           reject(new Error('User not found'));
//         } else {
//           resolve({
//             storageQuota: row.storage_quota,
//             storageUsed: row.storage_used,
//             totalReserved: row.total_reserved,
//             effectiveRemaining: row.effective_remaining
//           });
//         }
//       });
//     });
//   }

//   /**
//    * Check if user has enough quota for a new reservation
//    * @param {string} userId - User ID
//    * @param {number} sizeBytes - Size to check
//    * @returns {Promise<Object>} - Quota check result
//    */
//   async checkQuotaWithReservations(userId, sizeBytes) {
//     const quotaInfo = await this.getUserQuotaWithReservations(userId);

//     return {
//       hasSpace: quotaInfo.effectiveRemaining >= sizeBytes,
//       quotaInfo,
//       requiredSpace: sizeBytes
//     };
//   }

//   /**
//    * Finalize a reservation when torrent completes
//    * @param {string} userId - User ID
//    * @param {string} infoHash - Torrent info hash
//    * @returns {Promise<boolean>} - Success status
//    */
//   async finalizeReservation(userId, infoHash) {
//     return new Promise((resolve, reject) => {
//       const sql = `
//         UPDATE storage_reservations
//         SET status = 'finalized', finalized_at = CURRENT_TIMESTAMP
//         WHERE user_id = ? AND info_hash = ? AND status = 'active'
//       `;

//       this.db.run(sql, [userId, infoHash], function(err) {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(this.changes > 0);
//         }
//       });
//     });
//   }

//   /**
//    * Release a reservation when torrent is cancelled/removed
//    * @param {string} userId - User ID
//    * @param {string} infoHash - Torrent info hash
//    * @returns {Promise<boolean>} - Success status
//    */
//   async releaseReservation(userId, infoHash) {
//     return new Promise((resolve, reject) => {
//       const sql = `
//         DELETE FROM storage_reservations
//         WHERE user_id = ? AND info_hash = ? AND status = 'active'
//       `;

//       this.db.run(sql, [userId, infoHash], function(err) {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(this.changes > 0);
//         }
//       });
//     });
//   }

//   /**
//    * Get all active reservations for a user
//    * @param {string} userId - User ID
//    * @returns {Promise<Array>} - Array of reservations
//    */
//   async getUserReservations(userId) {
//     return new Promise((resolve, reject) => {
//       const sql = `
//         SELECT id, info_hash, size_bytes, created_at
//         FROM storage_reservations
//         WHERE user_id = ? AND status = 'active'
//         ORDER BY created_at DESC
//       `;

//       this.db.all(sql, [userId], (err, rows) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(rows || []);
//         }
//       });
//     });
//   }

//   /**
//    * Clean up stale reservations (reservations without active torrents)
//    * This should be called on server startup
//    * @param {Array} activeTorrentHashes - Array of currently active torrent info hashes
//    * @returns {Promise<number>} - Number of cleaned reservations
//    */
//   async cleanupStaleReservations(activeTorrentHashes = []) {
//     return new Promise((resolve, reject) => {
//       let sql;
//       let params = [];

//       if (activeTorrentHashes.length === 0) {
//         // If no active torrents, clean all active reservations
//         sql = `DELETE FROM storage_reservations WHERE status = 'active'`;
//       } else {
//         // Clean reservations that don't have corresponding active torrents
//         const placeholders = activeTorrentHashes.map(() => '?').join(',');
//         sql = `
//           DELETE FROM storage_reservations
//           WHERE status = 'active' AND info_hash NOT IN (${placeholders})
//         `;
//         params = activeTorrentHashes;
//       }

//       this.db.run(sql, params, function(err) {
//         if (err) {
//           reject(err);
//         } else {
//           console.log(`Cleaned up ${this.changes} stale reservations`);
//           resolve(this.changes);
//         }
//       });
//     });
//   }

//   /**
//    * Create reservations for existing active torrents
//    * This should be called on server startup for reconciliation
//    * @param {Array} activeTorrents - Array of { infoHash, userId, sizeBytes }
//    * @returns {Promise<number>} - Number of reservations created
//    */
//   async reconcileReservations(activeTorrents) {
//     let created = 0;

//     for (const torrent of activeTorrents) {
//       try {
//         await this.createReservation(torrent.userId, torrent.infoHash, torrent.sizeBytes);
//         created++;
//         console.log(`Created reservation for existing torrent: ${torrent.infoHash}`);
//       } catch (error) {
//         if (error.message.includes('already exists')) {
//           console.log(`Reservation already exists for torrent: ${torrent.infoHash}`);
//         } else {
//           console.error(`Error creating reservation for ${torrent.infoHash}:`, error.message);
//         }
//       }
//     }

//     return created;
//   }
// }

// module.exports = ReservationManager;




// src/models/reservations.js
// src/models/reservations.js
const { nanoid } = require('nanoid');

class ReservationManager {
  constructor(database) {
    this.db = database;
  }

  async createReservationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS storage_reservations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        info_hash TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active','released','finalized')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finalized_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
      CREATE INDEX IF NOT EXISTS idx_res_user ON storage_reservations(user_id);
      -- One ACTIVE reservation per (user, info_hash)
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_res_user_infohash_active
      ON storage_reservations(user_id, info_hash, status)
      WHERE status='active';
    `;
    await new Promise((resolve, reject) => this.db.exec(sql, err => err ? reject(err) : resolve()));
    console.log('Storage reservations table created or verified');
  }

  // helpers
  _exec(sql){ return new Promise((resolve,reject)=>this.db.exec(sql, err=>err?reject(err):resolve())); }
  _get(sql, params=[]){ return new Promise((resolve,reject)=>this.db.get(sql, params, (e,row)=>e?reject(e):resolve(row))); }
  _all(sql, params=[]){ return new Promise((resolve,reject)=>this.db.all(sql, params, (e,rows)=>e?reject(e):resolve(rows||[]))); }
  _run(sql, params=[]){ return new Promise((resolve,reject)=>this.db.run(sql, params, function(e){ return e?reject(e):resolve(this); })); }

  async getUserQuotaWithReservations(userId) {
    const u = await this._get(
      `SELECT storage_quota AS storageQuota, storage_used AS storageUsed
       FROM users WHERE id=?`, [userId]
    );
    if (!u) throw new Error('User not found');

    // Get detailed reservation breakdown for debugging
    const activeReservations = await this._all(
      `SELECT info_hash, size_bytes, COALESCE(downloaded_bytes, 0) as downloaded_bytes,
              (size_bytes - COALESCE(downloaded_bytes, 0)) as remaining_bytes
       FROM storage_reservations WHERE user_id=? AND status='active'`, [userId]
    );

    const r = await this._get(
      `SELECT
         COALESCE(SUM(size_bytes - COALESCE(downloaded_bytes, 0)), 0) AS totalReserved,
         COALESCE(SUM(COALESCE(downloaded_bytes, 0)), 0) AS totalInProgress
       FROM storage_reservations WHERE user_id=? AND status='active'`, [userId]
    );

    // CRITICAL FIX: storage_used already includes downloaded_bytes from progressive updates
    // So we should NOT subtract totalReserved which represents remaining bytes
    // The correct formula: available = quota - used - remaining_to_download
    // But storage_used already has progressive bytes, so:
    // available = quota - used - (reserved - already_downloaded)
    // available = quota - used - totalReserved ✓ This is correct!

    // But there's a subtle bug: when calculating totalReserved, we use size_bytes - downloaded_bytes
    // This gives us the REMAINING reservation
    // However, storage_used might include bytes from FINALIZED reservations too
    // So we need to ensure we're not double-counting

    const effectiveRemaining = Math.max(0, u.storageQuota - u.storageUsed - r.totalReserved);

    // Debug logging for quota calculations
    console.log(`🔍 QUOTA CALCULATION for user ${userId.substring(0, 8)}...:`);
    console.log(`  Quota: ${this._humanBytes(u.storageQuota)}`);
    console.log(`  Used (includes progressive): ${this._humanBytes(u.storageUsed)}`);
    console.log(`  Total reserved (remaining from active): ${this._humanBytes(r.totalReserved)}`);
    console.log(`  Total in progress (already downloaded): ${this._humanBytes(r.totalInProgress)}`);
    console.log(`  Effective remaining: ${this._humanBytes(effectiveRemaining)}`);
    console.log(`  Active reservations: ${activeReservations.length}`);
    activeReservations.forEach(res => {
      console.log(`    - ${res.info_hash.substring(0, 8)}: ${this._humanBytes(res.size_bytes)} total, ${this._humanBytes(res.downloaded_bytes)} done, ${this._humanBytes(res.remaining_bytes)} remaining`);
    });

    return {
      storageQuota: u.storageQuota,
      storageUsed: u.storageUsed,
      totalReserved: r.totalReserved, // Remaining bytes from active reservations
      totalInProgress: r.totalInProgress, // Downloaded bytes from active reservations
      effectiveRemaining
    };
  }

  async getUserReservedBytes(userId) {
    const row = await this._get(
      `SELECT COALESCE(SUM(size_bytes),0) AS total_reserved
       FROM storage_reservations WHERE user_id=? AND status='active'`, [userId]
    );
    return row?.total_reserved || 0;
  }

  async checkQuotaWithReservations(userId, sizeBytes) {
    const qi = await this.getUserQuotaWithReservations(userId);
    return { hasSpace: qi.effectiveRemaining >= sizeBytes, quotaInfo: qi, requiredSpace: sizeBytes };
  }

  /**
   * ATOMIC: check (quota - used - activeReserved) and insert ACTIVE reservation
   * Returns { success, id?, quotaInfo }
   */
  async reserveSpaceAtomic(userId, infoHash, sizeBytes) {
    if (!userId) throw new Error('userId required');
    if (!infoHash) throw new Error('infoHash required');
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) throw new Error('sizeBytes must be > 0');

    return this._retryTransaction(async () => {
      await this._exec('BEGIN IMMEDIATE');

      try {
        const u = await this._get(
          `SELECT storage_quota AS storageQuota, storage_used AS storageUsed
           FROM users WHERE id=?`, [userId]
        );
        if (!u) { await this._exec('ROLLBACK'); throw new Error('User not found'); }

        const r = await this._get(
          `SELECT COALESCE(SUM(size_bytes - COALESCE(downloaded_bytes, 0)),0) AS totalReserved
           FROM storage_reservations WHERE user_id=? AND status='active'`, [userId]
        );

        const effectiveRemaining = u.storageQuota - u.storageUsed - r.totalReserved;
        if (sizeBytes > effectiveRemaining) {
          await this._exec('ROLLBACK');
          return {
            success: false,
            quotaInfo: {
              storageQuota: u.storageQuota,
              storageUsed:  u.storageUsed,
              totalReserved: r.totalReserved,
              effectiveRemaining: Math.max(0, effectiveRemaining)
            }
          };
        }

        // Idempotent: reuse existing active reservation if any
        const existing = await this._get(
          `SELECT id FROM storage_reservations
           WHERE user_id=? AND info_hash=? AND status='active'`,
          [userId, infoHash]
        );

        let id;
        if (existing) {
          id = existing.id;
        } else {
          id = nanoid();
          await this._run(
            `INSERT INTO storage_reservations (id, user_id, info_hash, size_bytes, status)
             VALUES (?, ?, ?, ?, 'active')`,
            [id, userId, infoHash, sizeBytes]
          );
        }

        await this._exec('COMMIT');

        return {
          success: true,
          id,
          quotaInfo: {
            storageQuota: u.storageQuota,
            storageUsed:  u.storageUsed,
            totalReserved: r.totalReserved + sizeBytes,
            effectiveRemaining: Math.max(0, effectiveRemaining - sizeBytes)
          }
        };
      } catch (e) {
        try { await this._exec('ROLLBACK'); } catch {}
        throw e;
      }
    });
  }

  // Keep createReservation for legacy calls (non-atomic)
  async createReservation(userId, infoHash, sizeBytes) {
    const id = nanoid();
    try {
      await this._run(
        `INSERT INTO storage_reservations (id, user_id, info_hash, size_bytes, status)
         VALUES (?, ?, ?, ?, 'active')`,
        [id, userId, infoHash, sizeBytes]
      );
      return { id, userId, infoHash, sizeBytes, status: 'active', createdAt: new Date() };
    } catch (err) {
      if (err.message.includes('UNIQUE')) throw new Error('Reservation already exists for this torrent');
      throw err;
    }
  }

  /** Mark ACTIVE reservation as RELEASED (don’t delete) */
  async releaseReservation(userId, infoHash) {
    const res = await this._run(
      `UPDATE storage_reservations
       SET status='released'
       WHERE user_id=? AND info_hash=? AND status='active'`,
      [userId, infoHash]
    );
    return res.changes > 0;
  }

  /**
   * Finalize: move reserved -> used (Model B) and mark FINALIZED (atomic)
   */
  /**
   * Retry helper for transaction conflicts
   */
  async _retryTransaction(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        // Check if it's a transaction conflict
        if (error.code === 'SQLITE_ERROR' &&
            (error.message.includes('transaction') || error.message.includes('locked'))) {
          if (attempt === maxRetries) {
            throw error; // Last attempt, throw the error
          }
          // Wait with exponential backoff
          const delay = Math.pow(2, attempt - 1) * 50; // 50ms, 100ms, 200ms
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        // For non-transaction errors, throw immediately
        throw error;
      }
    }
  }

  /**
   * Update progressive download tracking
   * Moves bytes from reserved to used as download progresses
   */
  async updateProgressiveStorage(userId, infoHash, downloadedBytes) {
    return this._retryTransaction(async () => {
      await this._exec('BEGIN IMMEDIATE');

      try {
        const reservation = await this._get(
          `SELECT id, size_bytes, downloaded_bytes
           FROM storage_reservations
           WHERE user_id=? AND info_hash=? AND status='active'`,
          [userId, infoHash]
        );

        if (!reservation) {
          await this._exec('COMMIT');
          return false;
        }

        // Calculate the increase in downloaded bytes
        const previousDownloaded = reservation.downloaded_bytes || 0;
        const newDownloadedBytes = Math.min(downloadedBytes, reservation.size_bytes);
        const bytesIncrease = newDownloadedBytes - previousDownloaded;

        // Detailed logging for progressive tracking
        console.log(`📊 PROGRESSIVE UPDATE for ${infoHash.substring(0, 8)}...:`);
        console.log(`  Previous: ${this._humanBytes(previousDownloaded)} / ${this._humanBytes(reservation.size_bytes)}`);
        console.log(`  New: ${this._humanBytes(newDownloadedBytes)} / ${this._humanBytes(reservation.size_bytes)}`);
        console.log(`  Increase: ${this._humanBytes(bytesIncrease)}`);

        if (bytesIncrease > 0) {
          // Update user's storage_used
          await this._run(
            `UPDATE users SET storage_used = storage_used + ? WHERE id=?`,
            [bytesIncrease, userId]
          );

          // Update reservation's downloaded_bytes
          await this._run(
            `UPDATE storage_reservations
             SET downloaded_bytes = ?
             WHERE id=?`,
            [newDownloadedBytes, reservation.id]
          );

          console.log(`✅ Progressive update: Added ${this._humanBytes(bytesIncrease)} to storage_used`);
        } else {
          console.log(`⏭️ No increase this cycle (already at ${this._humanBytes(newDownloadedBytes)})`);
        }

        await this._exec('COMMIT');
        return true;
      } catch (e) {
        try { await this._exec('ROLLBACK'); } catch {}
        throw e;
      }
    }).catch(e => {
      console.error('Error updating progressive storage:', e);
      return false;
    });
  }

  async finalizeReservation(userId, infoHash, actualBytes = null) {
    try {
      await this._exec('BEGIN IMMEDIATE');

      const row = await this._get(
        `SELECT id, size_bytes, downloaded_bytes
         FROM storage_reservations
         WHERE user_id=? AND info_hash=? AND status='active'`,
        [userId, infoHash]
      );
      if (!row) {
        await this._exec('COMMIT');
        console.log(`⚠️ No active reservation found for ${infoHash} - already finalized or released`);
        return false;
      }

      const downloadedBytes = row.downloaded_bytes || 0;
      const totalBytes = (Number.isFinite(actualBytes) && actualBytes > 0) ? actualBytes : row.size_bytes;

      // DEFENSIVE: Ensure totalBytes doesn't exceed original reservation
      const cappedTotalBytes = Math.min(totalBytes, row.size_bytes);

      // Add any remaining bytes that weren't progressively tracked
      const remainingBytes = Math.max(0, cappedTotalBytes - downloadedBytes);

      // Detailed logging for debugging quota issues
      console.log(`📊 FINALIZATION DETAILS for ${infoHash}:`);
      console.log(`  Reserved size: ${this._humanBytes(row.size_bytes)}`);
      console.log(`  Already tracked (progressive): ${this._humanBytes(downloadedBytes)}`);
      console.log(`  Actual total bytes: ${this._humanBytes(totalBytes)}`);
      console.log(`  Capped total bytes: ${this._humanBytes(cappedTotalBytes)}`);
      console.log(`  Remaining to add: ${this._humanBytes(remainingBytes)}`);

      // DEFENSIVE: Warn if remainingBytes seems suspiciously large (>10% of total)
      if (remainingBytes > cappedTotalBytes * 0.1) {
        console.warn(`⚠️ WARNING: Large remaining bytes detected (${this._humanBytes(remainingBytes)} / ${this._humanBytes(cappedTotalBytes)})`);
        console.warn(`⚠️ This may indicate a progressive tracking gap. Progressive updates: ${this._humanBytes(downloadedBytes)}`);
      }

      if (remainingBytes > 0) {
        await this._run(
          `UPDATE users SET storage_used = storage_used + ? WHERE id=?`,
          [remainingBytes, userId]
        );
        console.log(`✅ Added ${this._humanBytes(remainingBytes)} to storage_used`);
      } else {
        console.log(`✅ No additional bytes to add (progressive tracking was complete)`);
      }

      await this._run(
        `UPDATE storage_reservations
         SET status='finalized', finalized_at=CURRENT_TIMESTAMP, downloaded_bytes=?
         WHERE id=?`,
        [cappedTotalBytes, row.id]
      );

      await this._exec('COMMIT');
      console.log(`✅ Reservation finalized successfully for ${infoHash}`);
      return true;
    } catch (e) {
      try { await this._exec('ROLLBACK'); } catch {}
      console.error(`💥 Finalization failed for ${infoHash}:`, e);
      throw e;
    }
  }

  // Helper for logging
  _humanBytes(bytes) {
    const thresh = 1024;
    if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
    if (Math.abs(bytes) < thresh) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let u = -1;
    do {
      bytes /= thresh;
      ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return `${bytes.toFixed(2)} ${units[u]}`;
  }

  async getUserReservations(userId) {
    return this._all(
      `SELECT id, info_hash, size_bytes, created_at
       FROM storage_reservations
       WHERE user_id=? AND status='active'
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  async cleanupStaleReservations(activeTorrentHashes = []) {
    let res;
    if (activeTorrentHashes.length === 0) {
      res = await this._run(
        `UPDATE storage_reservations
         SET status='released'
         WHERE status='active'`
      );
    } else {
      const placeholders = activeTorrentHashes.map(() => '?').join(',');
      res = await this._run(
        `UPDATE storage_reservations
         SET status='released'
         WHERE status='active' AND info_hash NOT IN (${placeholders})`,
        activeTorrentHashes
      );
    }
    console.log(`Released ${res.changes} stale reservations`);
    return res.changes;
  }

  async reconcileReservations(activeTorrents = []) {
    let created = 0;
    for (const t of activeTorrents) {
      try {
        await this.reserveSpaceAtomic(t.userId, t.infoHash, t.sizeBytes);
        created++;
        console.log(`Ensured active reservation for ${t.infoHash}`);
      } catch (e) {
        console.warn(`Reconcile warning for ${t.infoHash}: ${e.message}`);
      }
    }
    return created;
  }
}

module.exports = ReservationManager;
