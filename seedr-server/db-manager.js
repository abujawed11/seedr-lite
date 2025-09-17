#!/usr/bin/env node

// Database Manager - Easy way to view and manage users
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/users.db');

class DatabaseManager {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH);
  }

  // List all users
  async listUsers() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          id,
          username,
          email,
          ROUND(storage_used / 1024.0 / 1024.0, 2) as storage_used_mb,
          ROUND(storage_quota / 1024.0 / 1024.0 / 1024.0, 2) as storage_quota_gb,
          ROUND((storage_used * 100.0 / storage_quota), 1) as usage_percentage,
          plan,
          created_at
        FROM users
        ORDER BY created_at DESC
      `;

      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Get specific user
  async getUser(identifier) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM users
        WHERE username = ? OR email = ? OR id = ?
      `;

      this.db.get(sql, [identifier, identifier, identifier], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Update user quota
  async updateQuota(identifier, newQuotaGB) {
    const newQuotaBytes = newQuotaGB * 1024 * 1024 * 1024;
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE users
        SET storage_quota = ?, updated_at = CURRENT_TIMESTAMP
        WHERE username = ? OR email = ? OR id = ?
      `;

      this.db.run(sql, [newQuotaBytes, identifier, identifier, identifier], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  // Delete user
  async deleteUser(identifier) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM users WHERE username = ? OR email = ? OR id = ?`;

      this.db.run(sql, [identifier, identifier, identifier], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  // Get storage statistics
  async getStorageStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          COUNT(*) as total_users,
          ROUND(AVG(storage_used) / 1024.0 / 1024.0, 2) as avg_used_mb,
          ROUND(SUM(storage_used) / 1024.0 / 1024.0 / 1024.0, 2) as total_used_gb,
          ROUND(SUM(storage_quota) / 1024.0 / 1024.0 / 1024.0, 2) as total_quota_gb
        FROM users
      `;

      this.db.get(sql, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  close() {
    this.db.close();
  }
}

// Command line interface
async function main() {
  const dbManager = new DatabaseManager();
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  try {
    switch (command) {
      case 'list':
      case 'users':
        const users = await dbManager.listUsers();
        console.log('\n📋 ALL USERS:');
        console.log('================================================================================');
        console.log('Username'.padEnd(15), 'Email'.padEnd(25), 'Used(MB)'.padEnd(10), 'Quota(GB)'.padEnd(10), 'Usage%'.padEnd(8), 'Plan'.padEnd(8));
        console.log('================================================================================');
        users.forEach(user => {
          console.log(
            user.username.padEnd(15),
            user.email.padEnd(25),
            user.storage_used_mb.toString().padEnd(10),
            user.storage_quota_gb.toString().padEnd(10),
            (user.usage_percentage + '%').padEnd(8),
            user.plan.padEnd(8)
          );
        });
        console.log('================================================================================');
        break;

      case 'user':
        if (!arg1) {
          console.log('Usage: node db-manager.js user <username|email|id>');
          return;
        }
        const user = await dbManager.getUser(arg1);
        if (user) {
          console.log('\n👤 USER DETAILS:');
          console.log('================================================================================');
          console.log(`ID:           ${user.id}`);
          console.log(`Username:     ${user.username}`);
          console.log(`Email:        ${user.email}`);
          console.log(`Storage Used: ${Math.round(user.storage_used / 1024 / 1024)} MB`);
          console.log(`Storage Quota: ${Math.round(user.storage_quota / 1024 / 1024 / 1024)} GB`);
          console.log(`Usage:        ${Math.round((user.storage_used / user.storage_quota) * 100)}%`);
          console.log(`Plan:         ${user.plan}`);
          console.log(`Created:      ${user.created_at}`);
          console.log('================================================================================');
        } else {
          console.log(`❌ User not found: ${arg1}`);
        }
        break;

      case 'quota':
      case 'upgrade':
        if (!arg1 || !arg2) {
          console.log('Usage: node db-manager.js quota <username|email|id> <new_quota_in_GB>');
          console.log('Example: node db-manager.js quota john 100');
          return;
        }
        const success = await dbManager.updateQuota(arg1, parseFloat(arg2));
        if (success) {
          console.log(`✅ Updated quota for ${arg1} to ${arg2} GB`);
        } else {
          console.log(`❌ User not found: ${arg1}`);
        }
        break;

      case 'delete':
        if (!arg1) {
          console.log('Usage: node db-manager.js delete <username|email|id>');
          return;
        }
        const deleted = await dbManager.deleteUser(arg1);
        if (deleted) {
          console.log(`✅ Deleted user: ${arg1}`);
        } else {
          console.log(`❌ User not found: ${arg1}`);
        }
        break;

      case 'stats':
        const stats = await dbManager.getStorageStats();
        console.log('\n📊 STORAGE STATISTICS:');
        console.log('================================================================================');
        console.log(`Total Users:      ${stats.total_users}`);
        console.log(`Average Used:     ${stats.avg_used_mb} MB per user`);
        console.log(`Total Used:       ${stats.total_used_gb} GB`);
        console.log(`Total Allocated:  ${stats.total_quota_gb} GB`);
        console.log('================================================================================');
        break;

      case 'sql':
        if (!arg1) {
          console.log('Usage: node db-manager.js sql "SELECT * FROM users LIMIT 5"');
          return;
        }
        // Raw SQL execution
        dbManager.db.all(arg1, [], (err, rows) => {
          if (err) {
            console.error('❌ SQL Error:', err.message);
          } else {
            console.log('\n📋 SQL RESULT:');
            console.table(rows);
          }
          dbManager.close();
        });
        return; // Don't close DB in finally block

      default:
        console.log(`
🗄️  SEEDR DATABASE MANAGER
================================================================================

Usage: node db-manager.js <command> [arguments]

Commands:
  list                              - List all users with storage info
  user <username|email|id>          - Show detailed user information
  quota <user> <gb>                 - Update user storage quota
  delete <username|email|id>        - Delete a user
  stats                            - Show storage statistics
  sql "SELECT * FROM users"        - Execute raw SQL query

Examples:
  node db-manager.js list
  node db-manager.js user john
  node db-manager.js quota john 100
  node db-manager.js stats
  node db-manager.js sql "SELECT username, storage_used FROM users WHERE plan='premium'"

================================================================================
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (command !== 'sql') {
      dbManager.close();
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseManager;