// src/models/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const ReservationManager = require('./reservations');

const DB_PATH = path.join(__dirname, '../../data/users.db');

class Database {
  constructor() {
    this.db = null;
    this.reservations = null;
  }

  async init() {
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) return reject(err);
        console.log('Connected to SQLite database');
        this.reservations = new ReservationManager(this.db);
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  async createTables() {
    // Base users table (logical accounting: storage_quota, storage_used)
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        storage_quota INTEGER NOT NULL DEFAULT 5368709120, -- 5GB
        storage_used  INTEGER NOT NULL DEFAULT 0,
        remaining_quota INTEGER DEFAULT 5368709120,       -- legacy/display only
        plan TEXT DEFAULT 'free',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await new Promise((resolve, reject) =>
      this.db.exec(createUsersTable, (err) => (err ? reject(err) : resolve()))
    );

    console.log('Users table created or verified');

    // Create reservations table + indexes via manager
    await this.reservations.createReservationsTable();

    // Optional legacy column (safe no-op if already exists)
    await this.addRemainingQuotaColumnSafely();
  }

  // ---- Legacy column support (do not use it for enforcement decisions) ----
  async addRemainingQuotaColumnSafely() {
    const getCols = () =>
      new Promise((resolve, reject) =>
        this.db.all('PRAGMA table_info(users);', [], (err, rows) =>
          err ? reject(err) : resolve(rows || [])
        )
      );

    const cols = await getCols();
    const hasRemaining = cols.some((c) => c.name === 'remaining_quota');
    if (hasRemaining) {
      console.log('remaining_quota column already exists');
      return;
    }

    await new Promise((resolve, reject) =>
      this.db.run(
        'ALTER TABLE users ADD COLUMN remaining_quota INTEGER DEFAULT 5368709120',
        (err) => (err ? reject(err) : resolve())
      )
    );
    console.log('remaining_quota column added successfully');

    await new Promise((resolve, reject) =>
      this.db.run(
        `UPDATE users
         SET remaining_quota = storage_quota - storage_used
         WHERE remaining_quota IS NULL`,
        function (err) {
          if (err) return reject(err);
          console.log(`Initialized remaining_quota for ${this.changes} users`);
          resolve();
        }
      )
    );
  }

  // ---------------------- Users CRUD / helpers ----------------------
  async createUser({ username, email, password }) {
    const id = nanoid();
    const hashedPassword = await bcrypt.hash(password, 10);
    const storageQuota = 5368709120; // 5GB

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (id, username, email, password, storage_quota, remaining_quota)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      this.db.run(
        sql,
        [id, username, email, hashedPassword, storageQuota, storageQuota],
        function (err) {
          if (err) return reject(err);
          resolve({
            id,
            username,
            email,
            storageQuota,
            storageUsed: 0,
            remainingQuota: storageQuota,
            plan: 'free',
          });
        }
      );
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) =>
        err ? reject(err) : resolve(row || null)
      );
    });
  }

  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) =>
        err ? reject(err) : resolve(row || null)
      );
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) =>
        err ? reject(err) : resolve(row || null)
      );
    });
  }

  // If you follow Model B (logical used bytes), updateUserStorage is rarely needed;
  // used is driven by finalizeReservation. Kept for completeness:
  async updateUserStorage(userId, storageUsed) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users
                   SET storage_used = ?,
                       remaining_quota = storage_quota - ?,
                       updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?`;
      this.db.run(sql, [storageUsed, storageUsed, userId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async updateUserQuota(userId, newQuota) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users
                   SET storage_quota = ?,
                       remaining_quota = ? - storage_used,
                       updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?`;
      this.db.run(sql, [newQuota, newQuota, userId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async getUserStorageInfo(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT storage_quota, storage_used, remaining_quota FROM users WHERE id = ?';
      this.db.get(sql, [userId], (err, row) => (err ? reject(err) : resolve(row || null)));
    });
  }

  // ---------------------- Quota (with reservations) ----------------------
  async getUserStorageInfoWithReservations(userId) {
    return this.reservations.getUserQuotaWithReservations(userId);
  }

  // Legacy simple check (don’t use this for enforcement—informational only)
  async checkUserQuota(userId, requiredSpace) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT storage_quota, storage_used FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) return reject(err);
        if (!row) return reject(new Error('User not found'));
        const remaining = row.storage_quota - row.storage_used;
        resolve({ hasSpace: remaining >= requiredSpace, remainingQuota: remaining, requiredSpace });
      });
    });
  }

  async checkUserQuotaWithReservations(userId, requiredSpace) {
    return this.reservations.checkQuotaWithReservations(userId, requiredSpace);
  }

  // ---------------------- Reservations Facade ----------------------
  // IMPORTANT: Use this atomic method from controllers before starting downloads
  async reserveSpaceAtomic(userId, infoHash, sizeBytes) {
    return this.reservations.reserveSpaceAtomic(userId, infoHash, sizeBytes);
  }

  async createReservation(userId, infoHash, sizeBytes) {
    return this.reservations.createReservation(userId, infoHash, sizeBytes);
  }

  async releaseReservation(userId, infoHash) {
    return this.reservations.releaseReservation(userId, infoHash);
  }

  async updateProgressiveStorage(userId, infoHash, downloadedBytes) {
    return this.reservations.updateProgressiveStorage(userId, infoHash, downloadedBytes);
  }

  async finalizeReservation(userId, infoHash, actualBytes = null) {
    return this.reservations.finalizeReservation(userId, infoHash, actualBytes);
  }

  async getUserReservations(userId) {
    return this.reservations.getUserReservations(userId);
  }

  async reconcileReservations(activeTorrents) {
    const activeHashes = activeTorrents.map((t) => t.infoHash);
    const cleanedCount = await this.reservations.cleanupStaleReservations(activeHashes);
    const createdCount = await this.reservations.reconcileReservations(activeTorrents);
    return { cleanedCount, createdCount };
  }

  // ---------------------- Auth utils ----------------------
  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  close() {
    if (!this.db) return;
    this.db.close((err) => {
      if (err) console.error('Error closing database:', err);
      else console.log('Database connection closed');
    });
  }
}

// Singleton
const database = new Database();
module.exports = database;
