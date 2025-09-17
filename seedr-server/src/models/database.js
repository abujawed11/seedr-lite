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
        storage_quota INTEGER DEFAULT 32212254720,
        storage_used INTEGER DEFAULT 0,
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
          resolve();
        }
      });
    });
  }

  async createUser({ username, email, password }) {
    const id = nanoid();
    const hashedPassword = await bcrypt.hash(password, 10);
    const storageQuota = 32212254720; // 30GB in bytes

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (id, username, email, password, storage_quota)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [id, username, email, hashedPassword, storageQuota], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id,
            username,
            email,
            storageQuota,
            storageUsed: 0,
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
      const sql = 'UPDATE users SET storage_used = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      this.db.run(sql, [storageUsed, userId], function(err) {
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
      const sql = 'UPDATE users SET storage_quota = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      this.db.run(sql, [newQuota, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
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