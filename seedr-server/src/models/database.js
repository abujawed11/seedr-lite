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
        email_verified INTEGER DEFAULT 0,                  -- 0 = not verified, 1 = verified
        age_confirmed INTEGER DEFAULT 0,                   -- Legal: Age 18+ confirmation
        terms_accepted_at DATETIME,                        -- Legal: Terms acceptance timestamp
        privacy_accepted_at DATETIME,                      -- Legal: Privacy policy acceptance timestamp
        registration_ip TEXT,                              -- Legal: IP address during registration
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await new Promise((resolve, reject) =>
      this.db.exec(createUsersTable, (err) => (err ? reject(err) : resolve()))
    );

    console.log('Users table created or verified');

    // Add new columns to existing users table (for migration)
    const alterTableQueries = [
      'ALTER TABLE users ADD COLUMN age_confirmed INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN terms_accepted_at DATETIME',
      'ALTER TABLE users ADD COLUMN privacy_accepted_at DATETIME',
      'ALTER TABLE users ADD COLUMN registration_ip TEXT'
    ];

    for (const query of alterTableQueries) {
      await new Promise((resolve) => {
        this.db.run(query, (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.warn(`Column migration warning: ${err.message}`);
          }
          resolve();
        });
      });
    }

    console.log('Users table migration completed');

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

    // Create OTP verification table
    const createOtpTable = `
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        otp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        verified INTEGER DEFAULT 0,
        age_confirmed INTEGER DEFAULT 0,
        registration_ip TEXT
      );
    `;

    await new Promise((resolve, reject) =>
      this.db.exec(createOtpTable, (err) => (err ? reject(err) : resolve()))
    );

    console.log('OTP verifications table created or verified');

    // Add new columns to existing OTP table (for migration)
    const alterOTPTableQueries = [
      'ALTER TABLE otp_verifications ADD COLUMN age_confirmed INTEGER DEFAULT 0',
      'ALTER TABLE otp_verifications ADD COLUMN registration_ip TEXT',
      'ALTER TABLE otp_verifications ADD COLUMN type TEXT DEFAULT \'registration\'' // 'registration' or 'password_reset'
    ];

    for (const query of alterOTPTableQueries) {
      await new Promise((resolve) => {
        this.db.run(query, (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.warn(`OTP table migration warning: ${err.message}`);
          }
          resolve();
        });
      });
    }

    console.log('OTP table migration completed');

    // Create DMCA reports table
    const createDMCAReportsTable = `
      CREATE TABLE IF NOT EXISTS dmca_reports (
        id TEXT PRIMARY KEY,
        reporter_name TEXT NOT NULL,
        reporter_email TEXT NOT NULL,
        reporter_phone TEXT,
        reporter_address TEXT,
        copyrighted_work TEXT NOT NULL,
        infringing_content TEXT NOT NULL,
        good_faith_statement INTEGER DEFAULT 0,
        accuracy_statement INTEGER DEFAULT 0,
        signature TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        client_ip TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        processed_by TEXT,
        admin_notes TEXT,
        FOREIGN KEY (processed_by) REFERENCES users(id)
      );
    `;

    await new Promise((resolve, reject) =>
      this.db.exec(createDMCAReportsTable, (err) => (err ? reject(err) : resolve()))
    );

    console.log('DMCA reports table created or verified');

    // Create activity logs table
    const createActivityLogsTable = `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        action_type TEXT NOT NULL,
        torrent_name TEXT,
        torrent_hash TEXT,
        magnet_link TEXT,
        file_path TEXT,
        file_size INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    await new Promise((resolve, reject) =>
      this.db.exec(createActivityLogsTable, (err) => (err ? reject(err) : resolve()))
    );

    console.log('Activity logs table created or verified');

    // Migration: Fix any existing activity logs with null IDs
    await new Promise((resolve) => {
      this.db.all('SELECT rowid FROM activity_logs WHERE id IS NULL', [], (err, rows) => {
        if (err || !rows || rows.length === 0) {
          return resolve();
        }

        console.log(`🔧 Migrating ${rows.length} activity logs with null IDs...`);

        const updatePromises = rows.map((row) => {
          return new Promise((resolveUpdate) => {
            const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.db.run(
              'UPDATE activity_logs SET id = ? WHERE rowid = ?',
              [newId, row.rowid],
              (updateErr) => {
                if (updateErr) {
                  console.error(`⚠️ Failed to update activity log rowid ${row.rowid}:`, updateErr);
                }
                resolveUpdate();
              }
            );
          });
        });

        Promise.all(updatePromises).then(() => {
          console.log(`✅ Activity logs migration completed`);
          resolve();
        });
      });
    });

    // Create index for faster queries
    const createActivityLogsIndexes = `
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
    `;

    await new Promise((resolve, reject) =>
      this.db.exec(createActivityLogsIndexes, (err) => (err ? reject(err) : resolve()))
    );

    console.log('Activity logs indexes created or verified');

    // Create reservations table + indexes via manager
    await this.reservations.createReservationsTable();

    // Optional legacy column (safe no-op if already exists)
    await this.addRemainingQuotaColumnSafely();

    // Add new columns to existing users table
    await this.addUserManagementColumnsSafely();

    // Add duration column to existing upgrade_requests table
    await this.addUpgradeRequestDurationColumnSafely();

    // Add email_verified column to existing users table
    await this.addEmailVerifiedColumnSafely();
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

  // Add email_verified column to existing users table
  async addEmailVerifiedColumnSafely() {
    const getCols = () =>
      new Promise((resolve, reject) =>
        this.db.all('PRAGMA table_info(users);', [], (err, rows) =>
          err ? reject(err) : resolve(rows || [])
        )
      );

    const cols = await getCols();
    const hasEmailVerified = cols.some((c) => c.name === 'email_verified');
    if (hasEmailVerified) {
      console.log('email_verified column already exists in users');
      return;
    }

    await new Promise((resolve, reject) =>
      this.db.run(
        'ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0',
        (err) => (err ? reject(err) : resolve())
      )
    );
    console.log('email_verified column added to users table successfully');
  }

  // Create default admin user if it doesn't exist
  async createDefaultAdminIfNeeded() {
    const adminUsername = 'admin';
    const adminPassword = 'admin123';
    const adminEmail = 'admin@mypeercloud.local';

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
  async createUser({ username, email, password, ageConfirmed, registrationIp }) {
    const id = nanoid();
    const hashedPassword = await bcrypt.hash(password, 10);
    const storageQuota = 5368709120; // 5GB
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (
          id, username, email, password, storage_quota, remaining_quota,
          age_confirmed, terms_accepted_at, privacy_accepted_at, registration_ip
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db.run(
        sql,
        [
          id,
          username,
          email,
          hashedPassword,
          storageQuota,
          storageQuota,
          ageConfirmed ? 1 : 0,
          now,  // terms_accepted_at
          now,  // privacy_accepted_at
          registrationIp || null
        ],
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

  // ---------------------- OTP Verification ----------------------
  async createOTP(email, otp, metadata = {}) {
    const id = nanoid();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const { ageConfirmed, registrationIp, type = 'registration' } = metadata;

    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO otp_verifications (id, email, otp, expires_at, age_confirmed, registration_ip, type) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      this.db.run(
        sql,
        [id, email, otp, expiresAt.toISOString(), ageConfirmed ? 1 : 0, registrationIp || null, type],
        function (err) {
          if (err) return reject(err);
          resolve({ id, email, otp, expiresAt, ageConfirmed, registrationIp, type });
        }
      );
    });
  }

  async getOTPByEmail(email, type = null) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM otp_verifications WHERE email = ? AND verified = 0 AND expires_at > datetime('now')`;
      const params = [email];

      if (type) {
        sql += ` AND type = ?`;
        params.push(type);
      }

      sql += ` ORDER BY created_at DESC LIMIT 1`;

      this.db.get(sql, params, (err, row) =>
        err ? reject(err) : resolve(row || null)
      );
    });
  }

  async getVerifiedOTPByEmail(email, type = null) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM otp_verifications WHERE email = ? AND verified = 1 AND expires_at > datetime('now')`;
      const params = [email];

      if (type) {
        sql += ` AND type = ?`;
        params.push(type);
      }

      sql += ` ORDER BY created_at DESC LIMIT 1`;

      this.db.get(sql, params, (err, row) =>
        err ? reject(err) : resolve(row || null)
      );
    });
  }

  async markOTPAsVerified(otpId) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE otp_verifications SET verified = 1 WHERE id = ?`;
      this.db.run(sql, [otpId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async deleteOTP(otpId) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM otp_verifications WHERE id = ?`;
      this.db.run(sql, [otpId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async markEmailAsVerified(email) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET email_verified = 1 WHERE email = ?`;
      this.db.run(sql, [email], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async cleanupExpiredOTPs() {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM otp_verifications WHERE expires_at < datetime('now')`;
      this.db.run(sql, [], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  }

  async resetUserPassword(email, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?`;
      this.db.run(sql, [hashedPassword, email], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM users WHERE email = ?`;
      this.db.get(sql, [email], (err, row) =>
        err ? reject(err) : resolve(row || null)
      );
    });
  }

  close() {
    if (!this.db) return;
    this.db.close((err) => {
      if (err) console.error('Error closing database:', err);
      else console.log('Database connection closed');
    });
  }

  // ---------------------- DMCA Reports ----------------------
  async createDMCAReport(reportData) {
    const {
      id,
      reporterName,
      reporterEmail,
      reporterPhone,
      reporterAddress,
      copyrightedWork,
      infringingContent,
      goodFaithStatement,
      accuracyStatement,
      signature,
      clientIp
    } = reportData;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO dmca_reports (
          id, reporter_name, reporter_email, reporter_phone, reporter_address,
          copyrighted_work, infringing_content, good_faith_statement,
          accuracy_statement, signature, client_ip
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        sql,
        [
          id,
          reporterName,
          reporterEmail,
          reporterPhone || null,
          reporterAddress || null,
          copyrightedWork,
          infringingContent,
          goodFaithStatement ? 1 : 0,
          accuracyStatement ? 1 : 0,
          signature,
          clientIp || null
        ],
        function (err) {
          if (err) return reject(err);
          resolve({ id, reporterEmail });
        }
      );
    });
  }

  async getAllDMCAReports() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          r.*,
          u.username as processed_by_username
        FROM dmca_reports r
        LEFT JOIN users u ON r.processed_by = u.id
        ORDER BY r.submitted_at DESC
      `;
      this.db.all(sql, [], (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
  }

  async getDMCAReportById(reportId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM dmca_reports WHERE id = ?`;
      this.db.get(sql, [reportId], (err, row) =>
        err ? reject(err) : resolve(row || null)
      );
    });
  }

  async updateDMCAReport(reportId, updates) {
    const { status, processedBy, adminNotes, processedAt } = updates;

    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE dmca_reports
        SET status = ?, processed_by = ?, admin_notes = ?, processed_at = ?
        WHERE id = ?
      `;

      this.db.run(
        sql,
        [status, processedBy || null, adminNotes || null, processedAt || null, reportId],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  async deleteDMCAReport(reportId) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM dmca_reports WHERE id = ?`;
      this.db.run(sql, [reportId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  // ---------------------- Activity Logging ----------------------
  async logActivity(activityData) {
    const {
      userId,
      username,
      actionType,
      torrentName,
      torrentHash,
      magnetLink,
      filePath,
      fileSize,
      ipAddress,
      userAgent
    } = activityData;

    // Generate unique ID if not provided
    const activityId = activityData.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO activity_logs (
          id, user_id, username, action_type, torrent_name, torrent_hash,
          magnet_link, file_path, file_size, ip_address, user_agent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        sql,
        [
          activityId,
          userId,
          username,
          actionType,
          torrentName || null,
          torrentHash || null,
          magnetLink || null,
          filePath || null,
          fileSize || null,
          ipAddress || null,
          userAgent || null
        ],
        function (err) {
          if (err) return reject(err);
          resolve({ id: activityId });
        }
      );
    });
  }

  async getAllActivityLogs(limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM activity_logs
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      this.db.all(sql, [limit, offset], (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
  }

  async getActivityLogsByUser(userId, limit = 50) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM activity_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      this.db.get(sql, [userId, limit], (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
  }

  async getActivityLogsByActionType(actionType, limit = 100) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM activity_logs
        WHERE action_type = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      this.db.all(sql, [actionType, limit], (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
  }

  async searchActivityLogs(searchTerm, limit = 100) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM activity_logs
        WHERE torrent_name LIKE ? OR username LIKE ? OR file_path LIKE ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      const searchPattern = `%${searchTerm}%`;
      this.db.all(sql, [searchPattern, searchPattern, searchPattern, limit], (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
  }

  async deleteActivityLog(logId) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM activity_logs WHERE id = ?`;
      this.db.run(sql, [logId], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async clearOldActivityLogs(daysToKeep = 90) {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM activity_logs
        WHERE created_at < datetime('now', '-' || ? || ' days')
      `;
      this.db.run(sql, [daysToKeep], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  }

}

// Singleton
const database = new Database();
module.exports = database;
