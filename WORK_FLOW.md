 📁 File System Structure

  Where User Folders Are Created:

● Read(seedr-server\src\utils\storage.js)
  ⎿  Read 20 lines (ctrl+o to expand)

● 🗂️ Directory Structure on Your VPS:

  /your-app-directory/
  ├── seedr-server/
  │   ├── src/storage/library/users/     ← User folders created here
  │   │   ├── abc123def456/              ← User 1's folder (userId)
  │   │   │   ├── Movie1/
  │   │   │   ├── Song.mp3
  │   │   │   └── Document.pdf
  │   │   ├── xyz789ghi012/              ← User 2's folder (userId)
  │   │   │   ├── Series/
  │   │   │   └── Music/
  │   │   └── ...more users
  │   └── data/
  │       └── users.db                   ← SQLite database with user info

  🔄 Complete Workflow:

  1. User Registration:

  // When user registers:
  POST /api/auth/register
  {
    "username": "john",
    "email": "john@example.com",
    "password": "mypassword"
  }

  // System automatically:
  1. Creates user in database with 30GB quota
  2. Generates unique userId (e.g., "abc123def456")
  3. No folder created yet (created on first torrent)

  2. First Torrent Download:

  // When user adds first magnet:
  POST /api/torrents
  {
    "magnet": "magnet:?xt=urn:btih:..."
  }

  // System automatically:
  1. Creates /src/storage/library/users/abc123def456/
  2. Downloads torrent files to this folder
  3. Updates user's storage_used in database

  3. Storage Tracking:

  // Real-time monitoring:
  - Before download: Check if user has space
  - During download: Monitor file sizes
  - After download: Update database with actual usage

  🖥️ Managing on Your Hostinger VPS:

  1. Check User Folders:

  # SSH into your VPS
  ssh your-username@your-vps-ip

  # Navigate to your app
  cd /path/to/your-app/seedr-server

  # List all user folders
  ls -la src/storage/library/users/

  # Check specific user's files
  ls -la src/storage/library/users/USER_ID/

  # Check folder sizes
  du -sh src/storage/library/users/*/

  2. Database Management:

  # Install sqlite3 if not installed
  sudo apt install sqlite3

  # Access user database
  sqlite3 src/data/users.db

  # Check all users
  SELECT id, username, email, storage_quota, storage_used, plan FROM users;

  # Check specific user
  SELECT * FROM users WHERE username = 'john';

  # Update user quota (give more space)
  UPDATE users SET storage_quota = 107374182400 WHERE username = 'john'; -- 100GB

  # Exit sqlite
  .exit

  3. Monitoring Storage:

  # Check total storage used by all users
  du -sh src/storage/library/users/

  # Monitor disk space
  df -h

  # Find largest user directories
  du -sh src/storage/library/users/* | sort -hr

  # Clean up specific user's files
  rm -rf src/storage/library/users/USER_ID/

  4. Environment Configuration:

  # Your .env file in seedr-server/
  ROOT=/home/your-username/seedr-app/seedr-server/src/storage/library
  PORT=5000
  JWT_SECRET=your-secure-secret-key

  ⚙️ Production Management Scripts:

  Storage Cleanup Script:

  # Create cleanup.sh
  #!/bin/bash
  # Remove users with 0 storage and no activity for 30 days
  find src/storage/library/users -type d -mtime +30 -empty -delete

  # Log storage usage
  echo "$(date): $(du -sh src/storage/library/users/)" >> storage.log

  User Management Script:

  # Create user-manager.sh
  #!/bin/bash
  case $1 in
    "list")
      sqlite3 src/data/users.db "SELECT username, storage_used, storage_quota FROM users;"
      ;;
    "upgrade")
      sqlite3 src/data/users.db "UPDATE users SET storage_quota = $3 WHERE username = '$2';"
      echo "User $2 upgraded to $3 bytes"
      ;;
    "usage")
      du -sh src/storage/library/users/*
      ;;
  esac

  # Usage:
  # ./user-manager.sh list
  # ./user-manager.sh upgrade john 107374182400  # 100GB
  # ./user-manager.sh usage

  🔍 Real Example on VPS:

  # After deployment, you'll see:
  /var/www/seedr-app/seedr-server/src/storage/library/users/
  ├── k2j9X8mNq1/        # User "alice"
  │   ├── Ubuntu.iso     # 2.8GB
  │   └── Movies/        # 15.2GB
  │       └── movie.mp4
  ├── p5L3nW7rZ9/        # User "bob"
  │   └── Music/         # 850MB
  └── m8R6tY4uH2/        # User "charlie"
      └── Documents/     # 125MB

  # Database shows:
  sqlite> SELECT username, storage_used, storage_quota FROM users;
  alice|19327352832|32212254720    # Used 18GB / 30GB
  bob|891289600|32212254720        # Used 850MB / 30GB
  charlie|131072000|32212254720    # Used 125MB / 30GB

  The system automatically handles everything - you just need to monitor disk space and optionally manage user quotas through the        
  database!



