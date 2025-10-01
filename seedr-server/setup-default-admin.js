// Script to create default admin user (username: admin, password: admin123)
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/users.db');

async function setupDefaultAdmin() {
  console.log('\n🛡️  Setting up default admin user...\n');

  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Failed to connect to database:', err.message);
      process.exit(1);
    }
    console.log('✅ Connected to database');
  });

  const adminUsername = 'admin';
  const adminPassword = 'admin123';
  const adminEmail = 'admin@seedr-lite.local';

  // Check if admin user already exists
  await new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [adminUsername], async (err, row) => {
      if (err) {
        console.error('❌ Error checking for admin user:', err.message);
        reject(err);
        return;
      }

      if (row) {
        // Admin user exists, check if it's already an admin
        if (row.role === 'admin') {
          console.log('✅ Admin user already exists with correct role');
          console.log(`   Username: ${adminUsername}`);
          console.log(`   Email: ${row.email}`);
          console.log('\nℹ️  No changes needed.\n');
        } else {
          // User exists but not admin, update role
          db.run('UPDATE users SET role = ? WHERE username = ?', ['admin', adminUsername], (err) => {
            if (err) {
              console.error('❌ Failed to update user role:', err.message);
              reject(err);
              return;
            }
            console.log('✅ Updated existing user to admin role');
            console.log(`   Username: ${adminUsername}`);
            console.log(`   Password: ${adminPassword}\n`);
          });
        }
        resolve();
        return;
      }

      // Admin user doesn't exist, create it
      const id = nanoid();
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const storageQuota = 5368709120; // 5GB default

      db.run(
        `INSERT INTO users (id, username, email, password, storage_quota, remaining_quota, plan, role, max_concurrent_downloads, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, adminUsername, adminEmail, hashedPassword, storageQuota, storageQuota, 'free', 'admin', 10, 1],
        function(err) {
          if (err) {
            console.error('❌ Failed to create admin user:', err.message);
            reject(err);
            return;
          }

          console.log('✅ Default admin user created successfully!\n');
          console.log('📋 Admin Credentials:');
          console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`   Username: ${adminUsername}`);
          console.log(`   Password: ${adminPassword}`);
          console.log(`   Email:    ${adminEmail}`);
          console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('⚠️  IMPORTANT: Change the password after first login!\n');
          console.log('Next steps:');
          console.log('1. Start the server: npm run dev');
          console.log('2. Login with username: admin, password: admin123');
          console.log('3. Click "🛡️ Admin Panel" button\n');

          resolve();
        }
      );
    });
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
  });
}

setupDefaultAdmin().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
