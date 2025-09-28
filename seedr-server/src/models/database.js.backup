const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const DB_PATH = path.join(__dirname, '../../data/users.db');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        storage_quota INTEGER DEFAULT 5368709120,
        storage_used INTEGER DEFAULT 0,
        remaining_quota INTEGER DEFAULT 5368709120,
        plan TEXT DEFAULT 'free',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return new Promise((resolve, reject) => {
      this.db.run(createUsersTable, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
        } else {
          console.log('Users table created or verified');
          // Add migration for existing tables without remaining_quota column
          this.addRemainingQuotaColumn().then(resolve).catch(reject);
        }
      });
    });
  }

  async addRemainingQuotaColumn() {
    return new Promise((resolve, reject) => {
      // Check if column exists first
      this.db.get("PRAGMA table_info(users)", (err, rows) => {
        if (err) {
          console.error('Error checking table info:', err);
          reject(err);
          return;
        }

        // Add the column if it doesn't exist
        this.db.run("ALTER TABLE users ADD COLUMN remaining_quota INTEGER DEFAULT 5368709120", (err) => {
          if (err) {
            // Column might already exist, check if it's a duplicate column error
            if (err.message.includes('duplicate column name')) {
              console.log('remaining_quota column already exists');
              resolve();
            } else {
              console.error('Error adding remaining_quota column:', err);
              reject(err);
            }
          } else {
            console.log('remaining_quota column added successfully');
            // Update existing users to have correct remaining_quota
            this.updateExistingUsersRemainingQuota().then(resolve).catch(reject);
          }
        });
      });
    });
  }

  async updateExistingUsersRemainingQuota() {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET remaining_quota = storage_quota - storage_used WHERE remaining_quota IS NULL OR remaining_quota = storage_quota`;
      this.db.run(sql, function(err) {
        if (err) {
          console.error('Error updating existing users remaining quota:', err);
          reject(err);
        } else {
          console.log(`Updated remaining_quota for ${this.changes} users`);
          resolve();
        }
      });
    });
  }

  async createUser({ username, email, password }) {
    const id = nanoid();
    const hashedPassword = await bcrypt.hash(password, 10);
    const storageQuota = 5368709120; // 5GB in bytes

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (id, username, email, password, storage_quota, remaining_quota)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [id, username, email, hashedPassword, storageQuota, storageQuota], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id,
            username,
            email,
            storageQuota,
            storageUsed: 0,
            remainingQuota: storageQuota,
            plan: 'free'
          });
        }
      });
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ?';
      this.db.get(sql, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE username = ?';
      this.db.get(sql, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE id = ?';
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async updateUserStorage(userId, storageUsed) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users
                   SET storage_used = ?,
                       remaining_quota = storage_quota - ?,
                       updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?`;
      this.db.run(sql, [storageUsed, storageUsed, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
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
      this.db.run(sql, [newQuota, newQuota, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  async getUserStorageInfo(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT storage_quota, storage_used, remaining_quota FROM users WHERE id = ?';
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async checkUserQuota(userId, requiredSpace) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT remaining_quota FROM users WHERE id = ?';
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          reject(new Error('User not found'));
        } else {
          const hasSpace = row.remaining_quota >= requiredSpace;
          resolve({
            hasSpace,
            remainingQuota: row.remaining_quota,
            requiredSpace
          });
        }
      });
    });
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;