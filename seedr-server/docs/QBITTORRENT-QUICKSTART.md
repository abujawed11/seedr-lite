# qBittorrent Quick Start Guide

Get qBittorrent running in 5 minutes!

## Prerequisites

- Linux VPS (Ubuntu/Debian/CentOS)
- Root/sudo access
- Node.js backend already installed

## Step 1: Install qBittorrent-nox

```bash
cd seedr-server
sudo bash scripts/setup-qbittorrent.sh
```

This automated script will:
- ✅ Install qBittorrent-nox
- ✅ Create system user and directories
- ✅ Set up systemd service
- ✅ Configure default settings
- ✅ Start the service

Expected output:
```
✅ qBittorrent-nox installed and running!

🌐 WebUI Access:
   URL:      http://localhost:8080
   Username: admin
   Password: adminpass
```

## Step 2: Change Default Password

**IMPORTANT:** Change the default password!

1. Access WebUI (if on VPS, use SSH tunnel):
   ```bash
   # On your local machine
   ssh -L 8080:localhost:8080 user@your-vps-ip
   ```

2. Open browser: http://localhost:8080

3. Login with default credentials:
   - Username: `admin`
   - Password: `adminpass`

4. Change password:
   - Tools → Options → Web UI
   - Change password
   - Save

## Step 3: Configure Backend

Edit `.env` file:

```bash
nano .env
```

Add/update these lines:

```bash
# Switch to qBittorrent engine
TORRENT_ENGINE=qbittorrent

# qBittorrent connection details
QBITTORRENT_URL=http://localhost:8080
QBITTORRENT_USERNAME=admin
QBITTORRENT_PASSWORD=your-new-password-here
```

Save and exit (Ctrl+X, Y, Enter)

## Step 4: Restart Backend

```bash
# If using PM2
pm2 restart seedr-server

# If using npm directly
npm restart

# If using systemd
sudo systemctl restart seedr-server
```

## Step 5: Verify

**Check backend logs:**

```bash
# PM2
pm2 logs seedr-server

# NPM
# (logs in terminal)

# Systemd
sudo journalctl -u seedr-server -f
```

Look for:
```
🚀 Initializing torrent engine: qbittorrent
✅ qBittorrent connected: v4.x.x (API v2.x.x)
✅ Torrent engine initialized: qbittorrent
```

**Test connection:**

```bash
node scripts/test-qbittorrent.js
```

Expected:
```
✅ Passed: 7
❌ Failed: 0
🎉 All tests passed!
```

## Step 6: Test with Frontend

1. Open your Seedr-Lite frontend
2. Add a torrent (magnet link)
3. Watch it download!

The torrent should appear immediately and start downloading faster than with WebTorrent.

---

## Verification Checklist

- [ ] qBittorrent-nox service is running (`systemctl status qbittorrent-nox`)
- [ ] Default password changed
- [ ] `.env` file updated with qBittorrent settings
- [ ] Backend restarted
- [ ] Backend logs show qBittorrent connection
- [ ] Test script passes
- [ ] Can add torrents from frontend
- [ ] Downloads are faster

---

## Troubleshooting

### Service not starting

```bash
# Check status
sudo systemctl status qbittorrent-nox

# View logs
sudo journalctl -u qbittorrent-nox -n 50

# Restart service
sudo systemctl restart qbittorrent-nox
```

### Backend can't connect

```bash
# Verify qBittorrent is accessible
curl http://localhost:8080/api/v2/app/version

# Check credentials
node scripts/test-qbittorrent.js
```

### Port already in use

Edit qBittorrent config:

```bash
sudo nano /var/lib/qbittorrent/.config/qBittorrent/qBittorrent.conf
```

Change port:
```ini
WebUI\Port=8090
```

Update `.env`:
```bash
QBITTORRENT_URL=http://localhost:8090
```

Restart:
```bash
sudo systemctl restart qbittorrent-nox
pm2 restart seedr-server
```

---

## Useful Commands

```bash
# Service management
sudo systemctl start qbittorrent-nox
sudo systemctl stop qbittorrent-nox
sudo systemctl restart qbittorrent-nox
sudo systemctl status qbittorrent-nox

# View logs
sudo journalctl -u qbittorrent-nox -f

# Test connection
node scripts/test-qbittorrent.js

# Switch back to WebTorrent
# Edit .env: TORRENT_ENGINE=webtorrent
# Restart backend
```

---

## Next Steps

- Read the [full integration guide](./QBITTORRENT-INTEGRATION.md) for advanced configuration
- Set up monitoring and alerts
- Tune performance settings for your use case
- Configure automatic backups

---

## Support

Having issues?

1. Check [Troubleshooting section](./QBITTORRENT-INTEGRATION.md#troubleshooting) in full guide
2. Review logs: `sudo journalctl -u qbittorrent-nox -n 100`
3. Run test script: `node scripts/test-qbittorrent.js`
4. Verify environment variables are set correctly

---

**That's it! You're now using qBittorrent for faster, more efficient torrent downloads! 🚀**
