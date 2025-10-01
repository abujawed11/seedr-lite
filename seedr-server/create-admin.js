// Script to create admin user
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

const DB_PATH = path.join(__dirname, 'data/users.db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function makeAdmin() {
  console.log('\n🛡️  Admin User Creator\n');

  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Failed to connect to database:', err.message);
      process.exit(1);
    }
    console.log('✅ Connected to database\n');
  });

  // Show all users
  await new Promise((resolve) => {
    db.all('SELECT id, username, email, role FROM users', [], (err, rows) => {
      if (err) {
        console.error('❌ Error fetching users:', err.message);
        process.exit(1);
      }

      if (rows.length === 0) {
        console.log('❌ No users found. Please register a user first.\n');
        process.exit(1);
      }

      console.log('📋 Existing Users:\n');
      rows.forEach((row, index) => {
        const roleLabel = row.role === 'admin' ? '👑 ADMIN' : '👤 User';
        console.log(`${index + 1}. ${row.username} (${row.email}) - ${roleLabel}`);
      });
      console.log('');
      resolve();
    });
  });

  // Ask for username
  const username = await askQuestion('Enter username to make admin: ');

  if (!username.trim()) {
    console.log('❌ Username cannot be empty');
    rl.close();
    db.close();
    process.exit(1);
  }

  // Update user to admin
  db.run(
    'UPDATE users SET role = ? WHERE username = ?',
    ['admin', username.trim()],
    function(err) {
      if (err) {
        console.error('❌ Failed to update user:', err.message);
        db.close();
        rl.close();
        process.exit(1);
      }

      if (this.changes === 0) {
        console.log(`❌ User "${username}" not found`);
      } else {
        console.log(`\n✅ Success! User "${username}" is now an admin!\n`);
        console.log('Next steps:');
        console.log('1. Start the server: npm run dev');
        console.log('2. Login as', username);
        console.log('3. Look for the "ADMIN" badge');
        console.log('4. Click "🛡️ Admin Panel" button\n');
      }

      db.close();
      rl.close();
    }
  );
}

makeAdmin().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
