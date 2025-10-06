# Seedr-Lite Server Scripts

Utility scripts for qBittorrent integration and system management.

## qBittorrent Scripts

### setup-qbittorrent.sh

**Purpose:** Automated installation and configuration of qBittorrent-nox service.

**Usage:**
```bash
sudo bash scripts/setup-qbittorrent.sh
```

**What it does:**
- Detects your OS (Ubuntu/Debian/CentOS/Fedora/Arch)
- Installs qbittorrent-nox package
- Creates system user (`qbittorrent`)
- Sets up systemd service with security hardening
- Configures default settings
- Starts the service

**Requirements:**
- Root/sudo access
- Supported OS (Ubuntu, Debian, CentOS, RHEL, Fedora, Arch)

**After running:**
1. Change default password at http://localhost:8080
2. Update `.env` with your credentials
3. Restart your backend

---

### test-qbittorrent.js

**Purpose:** Comprehensive test suite for qBittorrent integration.

**Usage:**
```bash
node scripts/test-qbittorrent.js
```

**What it tests:**
1. Authentication
2. Version information
3. Preferences retrieval
4. Torrent listing
5. Transfer statistics
6. Adding/removing torrents
7. Health check

**Output:**
```
✅ Passed: 7
❌ Failed: 0
🎉 All tests passed!
```

**Requirements:**
- qBittorrent-nox service running
- Credentials in `.env` file
- Node.js

---

### health-check-qbittorrent.sh

**Purpose:** Automated health checks for qBittorrent service.

**Usage:**
```bash
bash scripts/health-check-qbittorrent.sh
```

**What it checks:**
1. systemd service status
2. Port accessibility
3. WebUI API availability
4. Authentication
5. qBittorrent version
6. Transfer statistics
7. Active torrents
8. Disk space
9. Process resources (CPU/RAM)
10. Recent log errors

**Use cases:**
- Manual health verification
- Monitoring scripts
- Cron jobs
- CI/CD pipelines

**Example cron job:**
```bash
# Check every 15 minutes and restart if unhealthy
*/15 * * * * /path/to/scripts/health-check-qbittorrent.sh || systemctl restart qbittorrent-nox
```

**Exit codes:**
- `0` - All checks passed
- `1` - Some checks failed

---

## Usage Examples

### First-time setup

```bash
# 1. Install qBittorrent
sudo bash scripts/setup-qbittorrent.sh

# 2. Change default password
# Open http://localhost:8080 in browser
# Login: admin / adminpass
# Change password in settings

# 3. Update .env
nano .env
# Add:
# TORRENT_ENGINE=qbittorrent
# QBITTORRENT_URL=http://localhost:8080
# QBITTORRENT_USERNAME=admin
# QBITTORRENT_PASSWORD=your-new-password

# 4. Test connection
node scripts/test-qbittorrent.js

# 5. Verify health
bash scripts/health-check-qbittorrent.sh
```

### Regular monitoring

```bash
# Quick health check
bash scripts/health-check-qbittorrent.sh

# Full integration test
node scripts/test-qbittorrent.js

# Check service status
sudo systemctl status qbittorrent-nox

# View logs
sudo journalctl -u qbittorrent-nox -f
```

### Troubleshooting

```bash
# Service not running?
sudo systemctl status qbittorrent-nox
sudo journalctl -u qbittorrent-nox -n 50

# Connection issues?
node scripts/test-qbittorrent.js

# Health problems?
bash scripts/health-check-qbittorrent.sh

# Restart service
sudo systemctl restart qbittorrent-nox

# Restart backend
npm restart
```

---

## Script Permissions

Make scripts executable:

```bash
chmod +x scripts/setup-qbittorrent.sh
chmod +x scripts/health-check-qbittorrent.sh
chmod +x scripts/test-qbittorrent.js
```

---

## Automation

### Systemd timer for health checks

Create `/etc/systemd/system/qbittorrent-health.service`:

```ini
[Unit]
Description=qBittorrent Health Check
After=qbittorrent-nox.service

[Service]
Type=oneshot
ExecStart=/path/to/scripts/health-check-qbittorrent.sh
User=root
```

Create `/etc/systemd/system/qbittorrent-health.timer`:

```ini
[Unit]
Description=Run qBittorrent health check every 15 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=15min

[Install]
WantedBy=timers.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable qbittorrent-health.timer
sudo systemctl start qbittorrent-health.timer
```

### Cron job for monitoring

```bash
# Edit crontab
crontab -e

# Add health check every 15 minutes
*/15 * * * * /path/to/scripts/health-check-qbittorrent.sh >> /var/log/qbittorrent-health.log 2>&1

# Restart service if unhealthy (every 5 minutes)
*/5 * * * * /path/to/scripts/health-check-qbittorrent.sh || systemctl restart qbittorrent-nox
```

---

## Environment Variables

All scripts respect these environment variables (from `.env`):

- `QBITTORRENT_URL` - WebUI URL (default: http://localhost:8080)
- `QBITTORRENT_USERNAME` - Username (default: admin)
- `QBITTORRENT_PASSWORD` - Password (default: adminpass)

---

## See Also

- [Quick Start Guide](../docs/QBITTORRENT-QUICKSTART.md)
- [Full Integration Guide](../docs/QBITTORRENT-INTEGRATION.md)
- [Implementation Summary](../QBITTORRENT-IMPLEMENTATION-SUMMARY.md)
