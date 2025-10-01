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
        this.createTables()
          .then(() => this.createDefaultAdminIfNeeded())
          .then(resolve)
          .catch(reject);
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
        role TEXT DEFAULT 'user',                          -- 'user' or 'admin'
        max_concurrent_downloads INTEGER DEFAULT 2,        -- Admin controllable
        is_active INTEGER DEFAULT 1,                       -- 1 = active, 0 = disabled
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await new Promise((resolve, reject) =>
      this.db.exec(createUsersTable, (err) => (err ? reject(err) : resolve()))
    );

    console.log('Users table created or verified');

    // Create upgrade requests table
    const createUpgradeRequestsTable = `
      CREATE TABLE IF NOT EXISTS upgrade_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        target_plan TEXT NOT NULL,
        duration TEXT DEFAULT 'monthly',  -- 'monthly' or 'yearly'
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        status TEXT DEFAULT 'pending',  -- pending, approved, rejected
        admin_notes TEXT,
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        processed_by TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    await new Promise((resolve, reject) =>
      this.db.exec(createUpgradeRequestsTable, (err) => (err ? reject(err) : resolve()))
    );

    console.log('Upgrade requests table created or verified');

    // Create subscriptions table for tracking active subscriptions
    const createSubscriptionsTable = `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        duration TEXT NOT NULL,  -- 'monthly' or 'yearly'
        status TEXT DEFAULT 'active',  -- 'active', 'expired', 'cancelled'
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        auto_renew INTEGER DEFAULT 0,  -- 1 = auto-renew, 0 = manual
        created_by TEXT,  -- admin who activated it
        cancelled_at DATETIME,
        cancelled_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    await new Promise((resolve, reject) =>
      this.db.exec(createSubscriptionsTable, (err) => (err ? reject(err) : resolve()))
    );

    console.log('Subscriptions table created or verified');

    // Create subscription history table for audit trail
    const createSubscriptionHistoryTable = `
      CREATE TABLE IF NOT EXISTS subscription_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subscription_id TEXT,
        action TEXT NOT NULL,  -- 'created', 'renewed', 'expired', 'cancelled', 'downgraded'
        plan_from TEXT,
        plan_to TEXT,
        duration TEXT,
        reason TEXT,
        performed_by TEXT,
        performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT,  -- JSON string for additional data
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
      );
    `;

    await new Promise((resolve, reject) =>
      this.db.exec(createSubscriptionHistoryTable, (err) => (err ? reject(err) : resolve()))
    );

    console.log('Subscription history table created or verified');

    // Create reservations table + indexes via manager
    await this.reservations.createReservationsTable();

    // Optional legacy column (safe no-op if already exists)
    await this.addRemainingQuotaColumnSafely();

    // Add new columns to existing users table
    await this.addUserManagementColumnsSafely();

    // Add duration column to existing upgrade_requests table
    await this.addUpgradeRequestDurationColumnSafely();
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

  // Add new user management columns to existing database
  async addUserManagementColumnsSafely() {
    const getCols = () =>
      new Promise((resolve, reject) =>
        this.db.all('PRAGMA table_info(users);', [], (err, rows) =>
          err ? reject(err) : resolve(rows || [])
        )
      );

    const cols = await getCols();
    const colNames = cols.map(c => c.name);

    // Add role column
    if (!colNames.includes('role')) {
      await new Promise((resolve, reject) =>
        this.db.run(
          "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'",
          (err) => (err ? reject(err) : resolve())
        )
      );
      console.log('role column added successfully');
    }

    // Add max_concurrent_downloads column
    if (!colNames.includes('max_concurrent_downloads')) {
      await new Promise((resolve, reject) =>
        this.db.run(
          'ALTER TABLE users ADD COLUMN max_concurrent_downloads INTEGER DEFAULT 2',
          (err) => (err ? reject(err) : resolve())
        )
      );
      console.log('max_concurrent_downloads column added successfully');
    }

    // Add is_active column
    if (!colNames.includes('is_active')) {
      await new Promise((resolve, reject) =>
        this.db.run(
          'ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1',
          (err) => (err ? reject(err) : resolve())
        )
      );
      console.log('is_active column added successfully');
    }
  }

  // Add duration column to existing upgrade_requests table
  async addUpgradeRequestDurationColumnSafely() {
    const getCols = () =>
      new Promise((resolve, reject) =>
        this.db.all('PRAGMA table_info(upgrade_requests);', [], (err, rows) =>
          err ? reject(err) : resolve(rows || [])
        )
      );

    const cols = await getCols();
    const hasDuration = cols.some((c) => c.name === 'duration');
    if (hasDuration) {
      console.log('duration column already exists in upgrade_requests');
      return;
    }

    await new Promise((resolve, reject) =>
      this.db.run(
        "ALTER TABLE upgrade_requests ADD COLUMN duration TEXT DEFAULT 'monthly'",
        (err) => (err ? reject(err) : resolve())
      )
    );
    console.log('duration column added to upgrade_requests table successfully');
  }

  // Create default admin user if it doesn't exist
  async createDefaultAdminIfNeeded() {
    const adminUsername = 'admin';
    const adminPassword = 'admin123';
    const adminEmail = 'admin@seedr-lite.local';

    return new Promise((resolve, reject) => {
      // Check if admin user exists
      this.db.get('SELECT * FROM users WHERE username = ?', [adminUsername], async (err, row) => {
        if (err) {
          console.error('Error checking for admin user:', err);
          return reject(err);
        }

        if (row) {
          // Admin user exists, ensure it has admin role
          if (row.role !== 'admin') {
            this.db.run('UPDATE users SET role = ? WHERE username = ?', ['admin', adminUsername], (err) => {
              if (err) {
                console.error('Error updating admin role:', err);
                return reject(err);
              }
              console.log('✅ Updated existing user "admin" to admin role');
              resolve();
            });
          } else {
            console.log('✅ Default admin user already exists');
            resolve();
          }
          return;
        }

        // Admin user doesn't exist, create it
        const id = nanoid();
        const hashedPassword = bcrypt.hashSync(adminPassword, 10);
        const storageQuota = 5368709120; // 5GB

        this.db.run(
          `INSERT INTO users (id, username, email, password, storage_quota, storage_used, remaining_quota, plan, role, max_concurrent_downloads, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, adminUsername, adminEmail, hashedPassword, storageQuota, 0, storageQuota, 'free', 'admin', 10, 1],
          (err) => {
            if (err) {
              console.error('Error creating default admin:', err);
              return reject(err);
            }

            console.log('');
            console.log('🛡️  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('   DEFAULT ADMIN USER CREATED');
            console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('   Username: admin');
            console.log('   Password: admin123');
            console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('   ⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!');
            console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('');

            resolve();
          }
        );
      });
    });
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

  async updateUserPlan(userId, plan) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      this.db.run(sql, [plan, userId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
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

  // ---------------------- Upgrade Requests ----------------------
  async createUpgradeRequest({ userId, targetPlan, duration, fullName, email, phone, address }) {
    const id = nanoid();
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO upgrade_requests (id, user_id, target_plan, duration, full_name, email, phone, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [id, userId, targetPlan, duration || 'monthly', fullName, email, phone, address], function (err) {
        if (err) return reject(err);
        resolve({ id, userId, targetPlan, duration: duration || 'monthly', fullName, email, phone, address, status: 'pending' });
      });
    });
  }

  async getUpgradeRequestById(requestId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT r.*, u.username, u.email as user_email, u.plan as current_plan
        FROM upgrade_requests r
        JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `;
      this.db.get(sql, [requestId], (err, row) =>
        err ? reject(err) : resolve(row || null)
      );
    });
  }

  async getAllUpgradeRequests(status = null) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT r.*, u.username, u.email as user_email, u.plan as current_plan
        FROM upgrade_requests r
        JOIN users u ON r.user_id = u.id
      `;
      const params = [];

      if (status) {
        sql += ' WHERE r.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY r.requested_at DESC';

      this.db.all(sql, params, (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
  }

  async getUserUpgradeRequests(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM upgrade_requests
        WHERE user_id = ?
        ORDER BY requested_at DESC
      `;
      this.db.all(sql, [userId], (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
  }

  async updateUpgradeRequestStatus(requestId, status, adminId, adminNotes = null) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE upgrade_requests
        SET status = ?, processed_at = CURRENT_TIMESTAMP, processed_by = ?, admin_notes = ?
        WHERE id = ?
      `;
      this.db.run(sql, [status, adminId, adminNotes, requestId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  // ---------------------- Admin User Management ----------------------
  async getAllUsers() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, username, email, storage_quota, storage_used, plan, role,
               max_concurrent_downloads, is_active, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
      `;
      this.db.all(sql, [], (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
  }

  async updateUserStatus(userId, isActive) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      this.db.run(sql, [isActive ? 1 : 0, userId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async updateUserMaxDownloads(userId, maxDownloads) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET max_concurrent_downloads = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      this.db.run(sql, [maxDownloads, userId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async updateUserRole(userId, role) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      this.db.run(sql, [role, userId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async deleteUser(userId) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM users WHERE id = ?`;
      this.db.run(sql, [userId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async adminUpdateUserQuotaAndPlan(userId, quota, plan, maxDownloads) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE users
        SET storage_quota = ?, plan = ?, max_concurrent_downloads = ?,
            remaining_quota = ? - storage_used, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(sql, [quota, plan, maxDownloads, quota, userId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  // ---------------------- Subscription Management ----------------------
  async createSubscription({ userId, plan, duration, expiresAt, createdBy }) {
    const id = nanoid();
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO subscriptions (id, user_id, plan, duration, expires_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [id, userId, plan, duration, expiresAt, createdBy], function (err) {
        if (err) return reject(err);
        resolve({
          id,
          userId,
          plan,
          duration,
          status: 'active',
          expiresAt,
          createdBy
        });
      });
    });
  }

  async getUserActiveSubscription(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM subscriptions
        WHERE user_id = ? AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      this.db.get(sql, [userId], (err, row) =>
        err ? reject(err) : resolve(row || null)
      );
    });
  }

  async getUserSubscriptionHistory(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM subscriptions
        WHERE user_id = ?
        ORDER BY created_at DESC
      `;
      this.db.all(sql, [userId], (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
  }

  async getExpiredSubscriptions() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT s.*, u.username, u.email
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'active' AND s.expires_at <= datetime('now')
      `;
      this.db.all(sql, [], (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
  }

  async expireSubscription(subscriptionId, performedBy = null) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE subscriptions
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(sql, [subscriptionId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async cancelSubscription(subscriptionId, cancelledBy, reason = null) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE subscriptions
        SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancelled_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(sql, [cancelledBy, subscriptionId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  // ---------------------- Subscription History ----------------------
  async createSubscriptionHistory({ userId, subscriptionId, action, planFrom, planTo, duration, reason, performedBy, details }) {
    const id = nanoid();
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO subscription_history (id, user_id, subscription_id, action, plan_from, plan_to, duration, reason, performed_by, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const detailsJson = details ? JSON.stringify(details) : null;
      this.db.run(sql, [id, userId, subscriptionId, action, planFrom, planTo, duration, reason, performedBy, detailsJson], function (err) {
        if (err) return reject(err);
        resolve({ id, userId, subscriptionId, action, planFrom, planTo, duration, reason, performedBy, details });
      });
    });
  }

  async getUserSubscriptionHistoryLog(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM subscription_history
        WHERE user_id = ?
        ORDER BY performed_at DESC
      `;
      this.db.all(sql, [userId], (err, rows) => {
        if (err) return reject(err);
        // Parse JSON details
        const parsed = rows.map(row => ({
          ...row,
          details: row.details ? JSON.parse(row.details) : null
        }));
        resolve(parsed);
      });
    });
  }

  // ---------------------- Subscription Utilities ----------------------
  async activateUserSubscription(userId, plan, duration, adminId) {
    // First, expire any existing active subscription
    const existing = await this.getUserActiveSubscription(userId);
    if (existing) {
      await this.expireSubscription(existing.id, adminId);
      await this.createSubscriptionHistory({
        userId,
        subscriptionId: existing.id,
        action: 'expired',
        planFrom: existing.plan,
        planTo: null,
        duration: existing.duration,
        reason: 'New subscription activated',
        performedBy: adminId
      });
    }

    // Calculate expiry date
    const now = new Date();
    const expiresAt = new Date(now);
    if (duration === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Create new subscription
    const subscription = await this.createSubscription({
      userId,
      plan,
      duration,
      expiresAt: expiresAt.toISOString(),
      createdBy: adminId
    });

    // Update user's plan
    await this.updateUserPlan(userId, plan);

    // Log the activation
    await this.createSubscriptionHistory({
      userId,
      subscriptionId: subscription.id,
      action: 'created',
      planFrom: existing ? existing.plan : 'free',
      planTo: plan,
      duration,
      reason: 'Admin activation',
      performedBy: adminId,
      details: { expiresAt: expiresAt.toISOString() }
    });

    return subscription;
  }

  async downgradeExpiredUsers() {
    const expiredSubscriptions = await this.getExpiredSubscriptions();
    const results = [];

    for (const subscription of expiredSubscriptions) {
      try {
        // Expire the subscription
        await this.expireSubscription(subscription.id, 'system');

        // Downgrade user to free plan
        await this.updateUserPlan(subscription.user_id, 'free');

        // Log the downgrade
        await this.createSubscriptionHistory({
          userId: subscription.user_id,
          subscriptionId: subscription.id,
          action: 'downgraded',
          planFrom: subscription.plan,
          planTo: 'free',
          duration: subscription.duration,
          reason: 'Subscription expired',
          performedBy: 'system',
          details: {
            expiredAt: new Date().toISOString(),
            originalExpiry: subscription.expires_at
          }
        });

        results.push({
          userId: subscription.user_id,
          username: subscription.username,
          plan: subscription.plan,
          success: true
        });

        console.log(`🔻 User ${subscription.username} downgraded from ${subscription.plan} to free (subscription expired)`);
      } catch (error) {
        console.error(`❌ Failed to downgrade user ${subscription.username}:`, error);
        results.push({
          userId: subscription.user_id,
          username: subscription.username,
          plan: subscription.plan,
          success: false,
          error: error.message
        });
      }
    }

    return results;
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
