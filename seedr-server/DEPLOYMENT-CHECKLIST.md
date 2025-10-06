# qBittorrent Deployment Checklist

Use this checklist to deploy qBittorrent integration to your production environment.

---

## Pre-Deployment

### 1. Review Documentation

- [ ] Read [Quick Start Guide](docs/QBITTORRENT-QUICKSTART.md)
- [ ] Read [Full Integration Guide](docs/QBITTORRENT-INTEGRATION.md)
- [ ] Review [Implementation Summary](QBITTORRENT-IMPLEMENTATION-SUMMARY.md)
- [ ] Understand architecture changes

### 2. Backup Current System

```bash
# Backup database
cp seedr.db seedr.db.backup-$(date +%Y%m%d)

# Backup .env file
cp .env .env.backup-$(date +%Y%m%d)

# Backup current torrents (if any)
tar -czf torrents-backup-$(date +%Y%m%d).tar.gz src/storage/library/

# Test restore procedure
# ...
```

- [ ] Database backed up
- [ ] Configuration backed up
- [ ] Storage backed up
- [ ] Restore procedure tested

### 3. System Requirements Check

```bash
# Check OS
cat /etc/os-release

# Check available disk space
df -h

# Check memory
free -h

# Check if port 8080 is available
netstat -tuln | grep 8080
```

- [ ] Supported OS (Ubuntu/Debian/CentOS/Fedora/Arch)
- [ ] At least 10GB free disk space
- [ ] At least 1GB free RAM
- [ ] Port 8080 available (or choose different port)

---

## Installation

### 4. Install qBittorrent-nox

**Option A: Automated (Recommended)**

```bash
cd seedr-server
sudo bash scripts/setup-qbittorrent.sh
```

**Option B: Manual**

See [Full Integration Guide](docs/QBITTORRENT-INTEGRATION.md#option-2-manual-installation)

**Verification:**

```bash
# Check service status
sudo systemctl status qbittorrent-nox

# Should show: Active: active (running)
```

- [ ] qBittorrent-nox installed
- [ ] systemd service created
- [ ] Service is running
- [ ] No errors in logs: `journalctl -u qbittorrent-nox -n 20`

### 5. Configure qBittorrent

```bash
# Access WebUI (if on remote server, use SSH tunnel)
ssh -L 8080:localhost:8080 user@your-server

# Open in browser
# http://localhost:8080
```

**Configuration steps:**

- [ ] Login with default credentials (admin/adminpass)
- [ ] **Change default password** (Tools → Options → Web UI)
- [ ] Verify download path: `/var/lib/qbittorrent/downloads/`
- [ ] Check connection settings
- [ ] Save changes

### 6. Test qBittorrent

```bash
# Run test script
cd seedr-server
node scripts/test-qbittorrent.js
```

**Expected output:**
```
✅ Passed: 7
❌ Failed: 0
🎉 All tests passed!
```

- [ ] All tests passed
- [ ] Authentication works
- [ ] Can add/remove torrents
- [ ] API accessible

---

## Backend Configuration

### 7. Update Environment Variables

```bash
# Edit .env file
nano .env
```

**Add these lines:**

```bash
# Torrent Engine Configuration
TORRENT_ENGINE=qbittorrent

# qBittorrent Configuration
QBITTORRENT_URL=http://localhost:8080
QBITTORRENT_USERNAME=admin
QBITTORRENT_PASSWORD=your-secure-password-here
```

**Notes:**
- Replace `your-secure-password-here` with actual password
- Keep `QBITTORRENT_URL` as localhost for security
- Do NOT commit `.env` to version control

- [ ] Environment variables added
- [ ] Password is secure (20+ characters)
- [ ] URL is correct
- [ ] `.env` not in git

### 8. Update Code (Optional)

**Only if you want to use the unified manager:**

Edit `src/index.js`:

```javascript
// Add before starting server
const torrentManager = require('./services/torrentManagerV2');

async function initServer() {
  // ... existing code ...

  // Initialize torrent engine
  await torrentManager.initializeEngine();

  // ... rest of code ...
}
```

- [ ] Code updated (if using unified manager)
- [ ] Syntax checked
- [ ] No errors

---

## Testing

### 9. Start Backend with qBittorrent

```bash
# Method 1: Direct
npm start

# Method 2: PM2
pm2 restart seedr-server

# Method 3: systemd
sudo systemctl restart seedr-server
```

**Check logs:**

```bash
# PM2
pm2 logs seedr-server

# Direct (in terminal)
# Watch console output

# systemd
sudo journalctl -u seedr-server -f
```

**Look for:**
```
🚀 Initializing torrent engine: qbittorrent
✅ qBittorrent connected: v4.x.x (API v2.x.x)
✅ Torrent engine initialized: qbittorrent
```

- [ ] Backend started successfully
- [ ] qBittorrent connection successful
- [ ] No errors in logs
- [ ] API server responding

### 10. Health Check

```bash
# Run health check
bash scripts/health-check-qbittorrent.sh

# Or use npm script
npm run health:qbittorrent
```

- [ ] All health checks passed
- [ ] Service is healthy
- [ ] Resources normal (CPU/RAM)
- [ ] No recent errors

### 11. Test API Endpoints

```bash
# Get torrents (should return empty array initially)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/torrents

# Add a test torrent from frontend
# Use the web interface to add a small torrent
```

- [ ] API endpoints responding
- [ ] Authentication works
- [ ] Can list torrents
- [ ] Can add torrents

### 12. Test Complete Flow

**Add test torrent:**

1. Login to frontend
2. Add magnet link (use Sintel demo):
   ```
   magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel
   ```
3. Wait for metadata
4. Watch download progress

**Verify:**

- [ ] Torrent appears in frontend
- [ ] Progress updates in real-time
- [ ] Download speed shows correctly
- [ ] Quota updates properly
- [ ] Completion notification received
- [ ] Files appear in storage
- [ ] Can stream/download completed file
- [ ] Torrent auto-removed after completion

### 13. Test Multi-User Isolation

**Create test users:**

1. Register two test accounts
2. Add different torrents to each
3. Verify isolation

**Verification:**

```bash
# Check qBittorrent categories
curl --cookie "SID=..." http://localhost:8080/api/v2/torrents/info

# Each user's torrents should have different categories (userId)
```

- [ ] Each user sees only their torrents
- [ ] Categories properly set
- [ ] Storage directories isolated
- [ ] Quotas tracked separately

---

## Security Hardening

### 14. Firewall Configuration

```bash
# Block external access to qBittorrent WebUI
sudo ufw deny 8080/tcp

# Allow only from localhost
sudo ufw allow from 127.0.0.1 to any port 8080

# Reload firewall
sudo ufw reload
```

- [ ] Port 8080 blocked externally
- [ ] Only localhost can access
- [ ] Firewall rules tested

### 15. Security Review

```bash
# Check qBittorrent config
sudo cat /var/lib/qbittorrent/.config/qBittorrent/qBittorrent.conf | grep WebUI
```

**Verify:**

- [ ] `WebUI\Address=127.0.0.1` (localhost only)
- [ ] `WebUI\CSRFProtection=true`
- [ ] `WebUI\ClickjackingProtection=true`
- [ ] Strong password set
- [ ] No default credentials in use

### 16. systemd Security

```bash
# Check systemd security settings
systemctl show qbittorrent-nox | grep -E 'Protect|Private|NoNew'
```

**Should show:**
- [ ] `PrivateTmp=yes`
- [ ] `ProtectSystem=strict`
- [ ] `ProtectHome=yes`
- [ ] `NoNewPrivileges=yes`

---

## Monitoring Setup

### 17. Configure Monitoring

**Option A: Cron job**

```bash
crontab -e

# Add health check every 15 minutes
*/15 * * * * /path/to/scripts/health-check-qbittorrent.sh >> /var/log/qbittorrent-health.log 2>&1
```

**Option B: systemd timer**

See [scripts/README.md](scripts/README.md#automation)

- [ ] Monitoring configured
- [ ] Health checks running
- [ ] Logs being written
- [ ] Alerts configured (optional)

### 18. Log Rotation

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/qbittorrent
```

**Content:**

```
/var/log/qbittorrent-health.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
```

- [ ] Log rotation configured
- [ ] Tested: `sudo logrotate -f /etc/logrotate.d/qbittorrent`

---

## Performance Tuning

### 19. Optimize qBittorrent Settings

**Edit config for your use case:**

```bash
sudo nano /var/lib/qbittorrent/.config/qBittorrent/qBittorrent.conf
```

**For high-speed (1Gbps+):**

```ini
BitTorrent\Session\MaxConnections=1000
BitTorrent\Session\MaxConnectionsPerTorrent=200
BitTorrent\Session\MaxActiveDownloads=10
```

**For NVME storage:**

```ini
BitTorrent\Session\DiskCacheSize=256
BitTorrent\Session\AsyncIOThreads=8
```

- [ ] Settings optimized for your hardware
- [ ] Tested performance
- [ ] Service restarted: `sudo systemctl restart qbittorrent-nox`

### 20. Benchmark Performance

**Compare WebTorrent vs qBittorrent:**

1. Switch to WebTorrent:
   ```bash
   # .env: TORRENT_ENGINE=webtorrent
   npm restart
   ```

2. Download test file, note speed

3. Switch to qBittorrent:
   ```bash
   # .env: TORRENT_ENGINE=qbittorrent
   npm restart
   ```

4. Download same file, compare speed

**Document results:**

- [ ] WebTorrent speed: _______ MB/s
- [ ] qBittorrent speed: _______ MB/s
- [ ] Improvement: _______ x
- [ ] CPU usage compared
- [ ] Memory usage compared

---

## Documentation

### 21. Update Internal Docs

- [ ] Document chosen configuration
- [ ] Record passwords in secure location (password manager)
- [ ] Create runbook for common operations
- [ ] Document troubleshooting steps
- [ ] Update team wiki/docs

### 22. Team Training

- [ ] Share documentation with team
- [ ] Demonstrate new features
- [ ] Explain monitoring procedures
- [ ] Review troubleshooting steps
- [ ] Document on-call procedures

---

## Rollback Plan

### 23. Prepare Rollback Procedure

**If issues arise, rollback:**

```bash
# 1. Stop qBittorrent
sudo systemctl stop qbittorrent-nox

# 2. Switch back to WebTorrent
nano .env
# Change: TORRENT_ENGINE=webtorrent

# 3. Restart backend
npm restart

# 4. Restore database if needed
cp seedr.db.backup-YYYYMMDD seedr.db

# 5. Verify system works
```

- [ ] Rollback procedure documented
- [ ] Rollback tested on staging
- [ ] Team knows how to rollback
- [ ] Backup restoration tested

---

## Final Verification

### 24. Production Smoke Tests

**After deployment, verify:**

- [ ] Frontend loads correctly
- [ ] User login works
- [ ] Can add torrents
- [ ] Downloads are fast
- [ ] Quota system works
- [ ] Notifications work
- [ ] Streaming works
- [ ] Multi-user works
- [ ] No errors in logs
- [ ] Performance acceptable

### 25. 24-Hour Monitoring

**Monitor for 24 hours:**

- [ ] Check logs every 4 hours
- [ ] Monitor CPU/RAM usage
- [ ] Check download speeds
- [ ] Verify completions work
- [ ] Watch for errors
- [ ] Test during peak hours

**Log findings:**

- Issues encountered: ___________________________________
- Performance notes: ___________________________________
- User feedback: ________________________________________

---

## Post-Deployment

### 26. Optimization

**Based on 24-hour monitoring:**

- [ ] Adjust qBittorrent settings if needed
- [ ] Tune concurrent downloads limit
- [ ] Optimize disk cache
- [ ] Adjust polling interval if needed

### 27. Long-term Maintenance

**Set up:**

- [ ] Weekly backups
- [ ] Monthly security updates
- [ ] Quarterly performance reviews
- [ ] Regular log reviews
- [ ] Capacity planning

---

## Sign-Off

**Deployment completed by:** ___________________________

**Date:** _______________

**Verified by:** _______________________

**Date:** _______________

**Issues/Notes:**

_____________________________________________________
_____________________________________________________
_____________________________________________________

---

## Quick Command Reference

```bash
# Service management
sudo systemctl status qbittorrent-nox
sudo systemctl restart qbittorrent-nox
sudo systemctl stop qbittorrent-nox
sudo systemctl start qbittorrent-nox

# Logs
sudo journalctl -u qbittorrent-nox -f
sudo journalctl -u qbittorrent-nox -n 100
sudo journalctl -u qbittorrent-nox --since "1 hour ago"

# Health checks
npm run health:qbittorrent
npm run test:qbittorrent

# Backend management
npm restart
pm2 restart seedr-server
pm2 logs seedr-server

# Switch engines
# Edit .env: TORRENT_ENGINE=webtorrent or qbittorrent
# Then: npm restart
```

---

**Status:** ☐ Not Started | ☑ Completed | ⚠ Issues Found

**Overall Status:** ________________

**Production Ready:** YES / NO

**Notes:**
_____________________________________________________
_____________________________________________________
_____________________________________________________
