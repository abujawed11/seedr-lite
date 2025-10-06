# qBittorrent Integration Guide

This guide explains how to set up and use qBittorrent-nox as an alternative torrent engine for Seedr-Lite.

## Table of Contents

1. [Overview](#overview)
2. [Benefits of qBittorrent](#benefits-of-qbittorrent)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Switching Between Engines](#switching-between-engines)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

---

## Overview

Seedr-Lite now supports two torrent engines:

- **WebTorrent** (default) - JavaScript-based BitTorrent client
- **qBittorrent** - Native C++ BitTorrent client with WebUI API

You can switch between engines without changing any frontend code or API endpoints.

### Architecture

```
┌─────────────────────────────────────────────────┐
│           Frontend (React)                      │
│      Same API endpoints for both engines        │
└────────────────┬────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────┐
│     Backend API (torrents.controller.js)        │
│           Unified Interface                     │
└────────────────┬────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────┐
│      Torrent Engine Factory                     │
│    (torrentEngineFactory.js)                    │
└───────────┬─────────────────────┬───────────────┘
            │                     │
            v                     v
    ┌───────────────┐     ┌──────────────────┐
    │  WebTorrent   │     │   qBittorrent    │
    │    Engine     │     │     Engine       │
    └───────────────┘     └──────────────────┘
                                  │
                                  v
                          ┌──────────────────┐
                          │  qBittorrent-nox │
                          │   (localhost)    │
                          └──────────────────┘
```

---

## Benefits of qBittorrent

### Performance Improvements

1. **Native Code** - C++ implementation is faster than JavaScript WebTorrent
2. **Better Peer Management** - Handles high peer counts more efficiently
3. **Lower CPU Usage** - No JavaScript engine overhead
4. **Better Memory Management** - More efficient resource utilization
5. **Faster Downloads** - Optimized protocol implementation

### Scalability

1. **Concurrent Downloads** - Handle many torrents simultaneously
2. **Reduced Node.js Load** - Torrent logic runs in separate process
3. **Process Isolation** - qBittorrent crash won't affect Node.js server

### Features

1. **Sequential Download** - Download pieces in order (useful for streaming)
2. **Better DHT Support** - More reliable peer discovery
3. **Tracker Management** - Advanced tracker configuration
4. **Disk Caching** - Optimized disk I/O
5. **UPnP/NAT-PMP** - Better connectivity

---

## Installation

### Option 1: Automated Setup (Linux)

Run the automated setup script:

```bash
cd seedr-server
sudo bash scripts/setup-qbittorrent.sh
```

This script will:
- Install qBittorrent-nox for your OS
- Create a system user (`qbittorrent`)
- Configure systemd service
- Set up default configuration
- Start the service

### Option 2: Manual Installation

#### Ubuntu/Debian

```bash
# Install qBittorrent-nox
sudo apt-get update
sudo apt-get install -y qbittorrent-nox

# Create system user
sudo useradd --system --create-home --home-dir /var/lib/qbittorrent \
  --shell /usr/sbin/nologin qbittorrent

# Create directories
sudo mkdir -p /var/lib/qbittorrent/.config/qBittorrent
sudo mkdir -p /var/lib/qbittorrent/downloads
sudo chown -R qbittorrent:qbittorrent /var/lib/qbittorrent
```

#### CentOS/RHEL/Fedora

```bash
# Enable EPEL repository
sudo yum install -y epel-release

# Install qBittorrent-nox
sudo yum install -y qbittorrent-nox

# Create system user
sudo useradd --system --create-home --home-dir /var/lib/qbittorrent \
  --shell /usr/sbin/nologin qbittorrent

# Create directories
sudo mkdir -p /var/lib/qbittorrent/.config/qBittorrent
sudo mkdir -p /var/lib/qbittorrent/downloads
sudo chown -R qbittorrent:qbittorrent /var/lib/qbittorrent
```

#### Windows (Development Only)

1. Download qBittorrent from: https://www.qbittorrent.org/download.php
2. Install normally
3. Enable WebUI in settings:
   - Tools → Options → Web UI
   - Check "Enable Web User Interface"
   - Port: 8080
   - Username: admin
   - Password: (set your password)

---

## Configuration

### 1. Create systemd Service (Linux)

Create `/etc/systemd/system/qbittorrent-nox.service`:

```ini
[Unit]
Description=qBittorrent-nox
After=network.target

[Service]
Type=simple
User=qbittorrent
Group=qbittorrent
UMask=002
ExecStart=/usr/bin/qbittorrent-nox
Restart=on-failure
RestartSec=5s

# Security settings
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/qbittorrent
NoNewPrivileges=true
ProtectKernelTunables=true
ProtectControlGroups=true
ProtectKernelModules=true

[Install]
WantedBy=multi-user.target
```

### 2. Configure qBittorrent

Create `/var/lib/qbittorrent/.config/qBittorrent/qBittorrent.conf`:

```ini
[Preferences]
Connection\PortRangeMin=6881
Connection\ResolvePeerCountries=true
Connection\UPnP=false
Downloads\SavePath=/var/lib/qbittorrent/downloads/
Downloads\TempPath=/var/lib/qbittorrent/downloads/temp/
General\Locale=en
WebUI\Address=127.0.0.1
WebUI\Port=8080
WebUI\Username=admin
WebUI\CSRFProtection=true
WebUI\ClickjackingProtection=true
WebUI\HostHeaderValidation=true
WebUI\LocalHostAuth=false
BitTorrent\Session\DefaultSavePath=/var/lib/qbittorrent/downloads/
BitTorrent\Session\QueueingSystemEnabled=true
BitTorrent\Session\MaxActiveDownloads=5
BitTorrent\Session\MaxActiveTorrents=10
BitTorrent\Session\MaxActiveUploads=5
```

**Important:** Set the password via WebUI on first login!

### 3. Start qBittorrent Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable qbittorrent-nox

# Start service
sudo systemctl start qbittorrent-nox

# Check status
sudo systemctl status qbittorrent-nox

# View logs
sudo journalctl -u qbittorrent-nox -f
```

### 4. Configure Seedr Backend

Update your `.env` file:

```bash
# Torrent Engine Configuration
TORRENT_ENGINE=qbittorrent

# qBittorrent Configuration
QBITTORRENT_URL=http://localhost:8080
QBITTORRENT_USERNAME=admin
QBITTORRENT_PASSWORD=your-secure-password
```

---

## Switching Between Engines

### Switch to qBittorrent

1. Update `.env`:
   ```bash
   TORRENT_ENGINE=qbittorrent
   ```

2. Restart your backend:
   ```bash
   npm restart
   ```

3. Verify in logs:
   ```
   🚀 Initializing torrent engine: qbittorrent
   ✅ qBittorrent connected: v4.5.0 (API v2.8.3)
   ✅ Torrent engine initialized: qbittorrent
   ```

### Switch to WebTorrent

1. Update `.env`:
   ```bash
   TORRENT_ENGINE=webtorrent
   ```

2. Restart your backend:
   ```bash
   npm restart
   ```

### No Frontend Changes Required

The frontend uses the same API endpoints regardless of engine:
- `POST /api/torrents` - Add torrent
- `GET /api/torrents` - List torrents
- `GET /api/torrents/:id` - Get torrent details
- `DELETE /api/torrents/:id` - Remove torrent
- `GET /stream/:hash/:index` - Stream file
- `GET /download/:hash/:index` - Download file

---

## Testing

### 1. Test qBittorrent Connection

```bash
cd seedr-server
node scripts/test-qbittorrent.js
```

Expected output:
```
============================================================
  qBittorrent Integration Test Suite
============================================================

1️⃣  Testing Authentication
✅ Authentication successful

2️⃣  Testing Version Info
✅ qBittorrent version: v4.5.0
✅ WebUI API version: 2.8.3

...

✅ Passed: 7
❌ Failed: 0

🎉 All tests passed! qBittorrent integration is working correctly.
```

### 2. Test Full Integration

1. Start your backend with qBittorrent enabled
2. Use your frontend to add a torrent
3. Monitor logs:
   ```bash
   # Backend logs
   npm run dev

   # qBittorrent logs
   sudo journalctl -u qbittorrent-nox -f
   ```

4. Verify:
   - Torrent appears in frontend
   - Download progresses
   - Files appear in user storage directory
   - Streaming/downloading works

---

## Troubleshooting

### qBittorrent not starting

**Check service status:**
```bash
sudo systemctl status qbittorrent-nox
```

**Check logs:**
```bash
sudo journalctl -u qbittorrent-nox -n 100
```

**Common issues:**
- Port 8080 already in use → Change port in config
- Permission denied → Check file ownership
- Config file syntax error → Validate config file

### Authentication Failed

**Reset password:**
1. Stop qBittorrent
2. Edit config file and set known password hash
3. Start qBittorrent
4. Login and change password

**Check credentials:**
```bash
# Test with curl
curl -i --data 'username=admin&password=adminpass' \
  http://localhost:8080/api/v2/auth/login
```

### Backend Connection Failed

**Verify qBittorrent is running:**
```bash
sudo systemctl status qbittorrent-nox
curl http://localhost:8080/api/v2/app/version
```

**Check environment variables:**
```bash
# In your backend
console.log(process.env.QBITTORRENT_URL);
console.log(process.env.QBITTORRENT_USERNAME);
```

**Test connection:**
```bash
node scripts/test-qbittorrent.js
```

### Torrents Not Appearing

**Check user isolation:**
- qBittorrent uses categories to isolate user torrents
- Each user's torrents have category set to their userId
- Check category in qBittorrent WebUI

**Check file paths:**
- Verify `ROOT` env variable matches qBittorrent download path
- Check permissions on storage directories

**Debug:**
```javascript
// In qBittorrentEngine.js, enable verbose logging
logger.info('All torrents:', await this.client.getTorrents());
logger.info('User torrents:', userTorrents);
```

### Download Performance Issues

**Adjust qBittorrent settings:**
```bash
# Edit qBittorrent.conf
BitTorrent\Session\MaxActiveDownloads=10
BitTorrent\Session\MaxConnections=500
```

**Monitor system resources:**
```bash
# CPU usage
top -p $(pgrep qbittorrent-nox)

# Network usage
iftop

# Disk I/O
iotop
```

---

## Production Deployment

### Security Best Practices

1. **Bind to localhost only:**
   ```ini
   WebUI\Address=127.0.0.1
   ```

2. **Use strong password:**
   - Change default password immediately
   - Use 20+ character random password

3. **Enable CSRF protection:**
   ```ini
   WebUI\CSRFProtection=true
   WebUI\ClickjackingProtection=true
   ```

4. **Firewall rules:**
   ```bash
   # Block external access to qBittorrent WebUI
   sudo ufw deny 8080/tcp
   ```

5. **Use systemd security features:**
   - See systemd service file above

### Remote qBittorrent (Advanced)

If running qBittorrent on a different server:

1. **Set up WireGuard VPN** between servers

2. **Update configuration:**
   ```bash
   # On NVME VPS (.env)
   QBITTORRENT_URL=http://10.0.0.2:8080  # WireGuard IP
   ```

3. **Configure qBittorrent to listen on VPN interface:**
   ```ini
   WebUI\Address=10.0.0.2
   ```

4. **DO NOT expose qBittorrent to public internet**

### Monitoring

**Set up monitoring:**

```bash
# Check if qBittorrent is running
#!/bin/bash
if ! systemctl is-active --quiet qbittorrent-nox; then
  echo "qBittorrent is down!" | mail -s "Alert" admin@example.com
  systemctl start qbittorrent-nox
fi
```

**Monitor via API:**

```javascript
const health = await client.healthCheck();
if (health.status !== 'healthy') {
  // Send alert
}
```

### Backup

**Backup qBittorrent configuration:**

```bash
# Backup script
sudo tar -czf qbittorrent-backup-$(date +%Y%m%d).tar.gz \
  /var/lib/qbittorrent/.config/qBittorrent/
```

**Restore configuration:**

```bash
sudo systemctl stop qbittorrent-nox
sudo tar -xzf qbittorrent-backup-20250101.tar.gz -C /
sudo systemctl start qbittorrent-nox
```

### Performance Tuning

**For high-speed connections (1Gbps+):**

```ini
BitTorrent\Session\MaxConnections=1000
BitTorrent\Session\MaxConnectionsPerTorrent=200
BitTorrent\Session\MaxActiveDownloads=10
BitTorrent\Session\MaxUploads=20
Connection\PortRangeMin=6881
Connection\PortRangeMax=6889
```

**For NVME storage:**

```ini
BitTorrent\Session\DiskCacheSize=256
BitTorrent\Session\DiskCacheTTL=600
BitTorrent\Session\AsyncIOThreads=8
```

---

## API Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TORRENT_ENGINE` | `webtorrent` | Engine to use: `webtorrent` or `qbittorrent` |
| `QBITTORRENT_URL` | `http://localhost:8080` | qBittorrent WebUI URL |
| `QBITTORRENT_USERNAME` | `admin` | WebUI username |
| `QBITTORRENT_PASSWORD` | `adminpass` | WebUI password |

### qBittorrent Client Methods

See `src/services/qbittorrent/qBittorrentClient.js` for full API.

Key methods:
- `login()` - Authenticate
- `addTorrent(options)` - Add torrent
- `getTorrents(filter)` - List torrents
- `deleteTorrents(hashes, deleteFiles)` - Remove torrents
- `pauseTorrents(hashes)` - Pause torrents
- `resumeTorrents(hashes)` - Resume torrents

---

## Comparison: WebTorrent vs qBittorrent

| Feature | WebTorrent | qBittorrent |
|---------|------------|-------------|
| **Language** | JavaScript | C++ |
| **Performance** | Good | Excellent |
| **CPU Usage** | Higher | Lower |
| **Memory Usage** | Higher | Lower |
| **Setup Complexity** | Easy (built-in) | Moderate (external service) |
| **Peer Connectivity** | Good | Excellent |
| **DHT Support** | Basic | Advanced |
| **Protocol Support** | WebRTC, TCP, UTP | TCP, UTP, µTP |
| **Disk I/O** | Basic | Optimized |
| **Concurrent Downloads** | Limited | Excellent |
| **Production Ready** | Yes | Yes |
| **Dependencies** | None | qBittorrent-nox service |

---

## Conclusion

qBittorrent integration provides significant performance improvements for high-volume torrent operations while maintaining full compatibility with your existing frontend and API.

Choose qBittorrent when you need:
- Higher download speeds
- Better resource efficiency
- More concurrent downloads
- Production-scale performance

Choose WebTorrent when you need:
- Simpler deployment
- No external dependencies
- Lower setup complexity

Both engines use the same database, quota system, and user isolation, making it easy to switch between them as your needs evolve.
