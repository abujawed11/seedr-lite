# Seedr-Lite VPS Deployment Guide

Complete step-by-step guide to deploy Seedr-Lite (Node.js backend + React frontend + aria2 Docker container) on a fresh Ubuntu/Debian VPS.

---

## Table of Contents

1. [Server Requirements](#1-server-requirements)
2. [Initial VPS Setup](#2-initial-vps-setup)
3. [Install Dependencies](#3-install-dependencies)
4. [Install Docker & Docker Compose](#4-install-docker--docker-compose)
5. [Create Directory Structure & Permissions](#5-create-directory-structure--permissions)
6. [Clone & Configure the Project](#6-clone--configure-the-project)
7. [Configure Environment Variables](#7-configure-environment-variables)
8. [Build the Frontend](#8-build-the-frontend)
9. [Start aria2 Docker Container](#9-start-aria2-docker-container)
10. [Start the Backend Server](#10-start-the-backend-server)
11. [Configure Nginx Reverse Proxy](#11-configure-nginx-reverse-proxy)
12. [SSL with Let's Encrypt](#12-ssl-with-lets-encrypt)
13. [Firewall Rules](#13-firewall-rules)
14. [PM2 Process Manager](#14-pm2-process-manager)
15. [Systemd Service (Alternative to PM2)](#15-systemd-service-alternative-to-pm2)
16. [Verify Everything is Working](#16-verify-everything-is-working)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| Disk | 40 GB SSD | 100+ GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Ports needed | 22, 80, 443 | 22, 80, 443 |

> **Note:** Port 5002 (backend) and 6800 (aria2 RPC) should NOT be exposed publicly — only accessible via localhost through Nginx.

---

## 2. Initial VPS Setup

SSH into your VPS as root:

```bash
ssh root@YOUR_VPS_IP
```

Update the system:

```bash
apt update && apt upgrade -y
```

Create a non-root user (recommended):

```bash
adduser seedr
usermod -aG sudo seedr
# Switch to new user
su - seedr
```

---

## 3. Install Dependencies

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node -v    # should be v20.x.x
npm -v     # should be 10.x.x

# Install build tools (needed for native npm packages)
sudo apt install -y build-essential python3 git curl wget nginx redis-server

# Install PM2 globally
sudo npm install -g pm2
```

---

## 4. Install Docker & Docker Compose

```bash
# Install Docker
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group so you can run docker without sudo
sudo usermod -aG docker $USER

# IMPORTANT: Log out and log back in for group change to take effect
exit
# SSH back in
ssh seedr@YOUR_VPS_IP

# Verify Docker works without sudo
docker ps
```

---

## 5. Create Directory Structure & Permissions

This is the most important step. The aria2 Docker container runs as a specific user and needs write access to the download directory.

### Create all required directories:

```bash
# Create project directory
sudo mkdir -p /var/www/seedr-lite
sudo chown -R $USER:$USER /var/www/seedr-lite

# Create storage directories
mkdir -p /var/www/seedr-lite/seedr-server/srv/storage/library
mkdir -p /var/www/seedr-lite/seedr-server/srv/storage/hls
mkdir -p /var/www/seedr-lite/seedr-server/srv/storage/thumbs
mkdir -p /var/www/seedr-lite/seedr-server/srv/storage/tmp
mkdir -p /var/www/seedr-lite/seedr-server/srv/storage/cache
mkdir -p /var/www/seedr-lite/seedr-server/data
```

### Set correct permissions for Docker (aria2):

The aria2 container needs write access to the `library` folder. The `docker-compose.yml` previously used `user: "1000:1000"` — this means the container process runs as UID 1000. You need the host directory to be writable by that UID.

**Option A — Run aria2 container as root (simplest):**

In `seedr-server/docker-compose.yml`, make sure there is NO `user:` line. Root inside the container can write anywhere on the mounted volume.

**Option B — Match UID 1000 (more secure):**

```bash
# Check if your current user is UID 1000
id   # look for "uid=1000"

# If your user is UID 1000, just ensure they own the directory:
chown -R 1000:1000 /var/www/seedr-lite/seedr-server/srv/storage/library

# If your user is NOT UID 1000 (e.g., uid=1001), do this:
sudo chown -R 1000:1000 /var/www/seedr-lite/seedr-server/srv/storage/library
sudo chmod -R 775 /var/www/seedr-lite/seedr-server/srv/storage/library
```

> **Root cause of Permission denied error:** When the `library` directory is created by root (UID 0) or a different user, but the container runs as UID 1000, writes fail. Always ensure UID ownership matches.

### Full permissions summary:

```bash
# Storage directories — aria2 (UID 1000) needs full write access
sudo chown -R 1000:1000 /var/www/seedr-lite/seedr-server/srv/

# Node.js process (your user) needs read access to translate paths
sudo chmod -R 775 /var/www/seedr-lite/seedr-server/srv/

# Data directory (SQLite DB) — owned by your user
chown -R $USER:$USER /var/www/seedr-lite/seedr-server/data
chmod -R 755 /var/www/seedr-lite/seedr-server/data
```

---

## 6. Clone & Configure the Project

```bash
cd /var/www/seedr-lite

# Clone the repo (replace with your actual repo URL)
git clone https://github.com/YOUR_USERNAME/seedr-lite.git .

# Install backend dependencies
cd seedr-server
npm install --production

# Install frontend dependencies
cd ../seedr-web
npm install
```

---

## 7. Configure Environment Variables

### Backend — `seedr-server/.env`

```bash
cd /var/www/seedr-lite/seedr-server
cp .env.example .env
nano .env
```

Fill in these values (minimum required):

```env
# Server
PORT=5002
WEB_BASE_URL=https://yourdomain.com

# Storage paths — must match what you created in step 5
ROOT=./srv/storage/library
HLS=./srv/storage/hls
THUMBS=./srv/storage/thumbs
TMP=./srv/storage/tmp
CACHE_DIR=./srv/storage/cache

# aria2 — Docker mode
ARIA2_MODE=docker
ARIA2_HOST=127.0.0.1
ARIA2_PORT=6800
ARIA2_SECRET=your_strong_secret_here_change_this
ARIA2_CONTAINER_DIR=/downloads

# Auth — CHANGE THIS to a long random string
JWT_SECRET=your_very_long_random_jwt_secret_here

# CORS — your frontend domain(s), comma separated
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM_NAME=Seedr-Lite
SMTP_FROM_EMAIL=your_gmail@gmail.com

# Admin
ADMIN_EMAIL=your_admin@email.com

# Google reCAPTCHA v3 (get from console.google.com)
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# Redis (for job queue)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
QUEUE_ENABLED=true

# Storage mode
STORAGE_MODE=local

# Payment (Razorpay — optional, can leave blank to disable)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Cloudflare R2 (optional)
R2_ENABLED=false
```

### Frontend — `seedr-web/.env.production`

```bash
cd /var/www/seedr-lite/seedr-web
nano .env.production
```

```env
# Leave empty so frontend uses relative paths (served from same domain via Nginx)
VITE_API_BASE_URL=

# Your reCAPTCHA v3 site key (public key, safe to expose)
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

> **If frontend and backend are on different domains/ports**, set `VITE_API_BASE_URL=https://api.yourdomain.com`

---

## 8. Build the Frontend

```bash
cd /var/www/seedr-lite/seedr-web
npm run build
```

This creates a `dist/` folder. Nginx will serve files from here.

---

## 9. Start aria2 Docker Container

The `docker-compose.yml` is in `seedr-server/`. Before starting, verify the volume mount path.

```bash
cd /var/www/seedr-lite/seedr-server
```

Open `docker-compose.yml` and verify it looks like this:

```yaml
services:
  aria2:
    build:
      context: .
      dockerfile: Dockerfile.aria2
    environment:
      - ARIA2_SECRET=${ARIA2_SECRET:-seedr_aria2_secret}
      - ARIA2_RPC_PORT=${ARIA2_PORT:-6800}
      - ARIA2_DOWNLOAD_DIR=/downloads
    ports:
      - "127.0.0.1:6800:6800"    # Bind to localhost only — never expose publicly
    volumes:
      - ${ROOT:-./srv/storage/library}:/downloads
      - aria2-cache:/root/.cache/aria2
    restart: unless-stopped

volumes:
  aria2-cache:
```

> **Security:** Use `127.0.0.1:6800:6800` (not `6800:6800`) so aria2 RPC is only accessible from localhost, not from the internet.

### Build and start aria2:

```bash
# Make sure you're in seedr-server/ and .env is present
cd /var/www/seedr-lite/seedr-server

# Build the aria2 Docker image
docker compose build

# Start in background
docker compose up -d

# Verify it's running
docker compose ps

# Check logs
docker compose logs -f aria2
```

### Verify aria2 is reachable:

```bash
curl -s -X POST http://127.0.0.1:6800/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"test","method":"aria2.getVersion","params":["token:your_secret_here"]}'
# Should return: {"id":"test","jsonrpc":"2.0","result":{"enabledFeatures":[...],"version":"..."}}
```

---

## 10. Start the Backend Server

### Test run first (to catch errors):

```bash
cd /var/www/seedr-lite/seedr-server
node src/index.js
# Watch for errors, then Ctrl+C
```

### Start with PM2 (production):

```bash
cd /var/www/seedr-lite/seedr-server

# Start the server
pm2 start src/index.js --name seedr-server

# Save PM2 config so it restarts on reboot
pm2 save

# Enable PM2 startup on boot
pm2 startup
# Copy and run the command it outputs (looks like: sudo env PATH=... pm2 startup ...)
```

### Useful PM2 commands:

```bash
pm2 status              # Check all processes
pm2 logs seedr-server   # View live logs
pm2 restart seedr-server
pm2 stop seedr-server
pm2 delete seedr-server
```

---

## 11. Configure Nginx Reverse Proxy

The frontend (`dist/`) is served as static files. The backend API is proxied from `/api`, `/stream`, `/download`, `/direct`, and `/health`.

```bash
sudo nano /etc/nginx/sites-available/seedr-lite
```

Paste this config (replace `yourdomain.com` and paths):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend static files
    root /var/www/seedr-lite/seedr-web/dist;
    index index.html;

    # Increase max upload size if needed
    client_max_body_size 10M;

    # Serve React SPA — all unknown routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Streaming endpoints (long-lived connections)
    location /stream/ {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;           # Important for streaming
        proxy_read_timeout 3600s;      # 1 hour timeout for streams
    }

    # Download endpoint
    location /download/ {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }

    # Direct signed links
    location /direct/ {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5002;
        proxy_set_header Host $host;
    }

    # SSE (Server-Sent Events) for real-time torrent progress
    location /api/torrents/events {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;     # 24 hours for SSE
        chunked_transfer_encoding on;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/seedr-lite /etc/nginx/sites-enabled/
sudo nginx -t          # Test config — must say "syntax is ok"
sudo systemctl reload nginx
```

---

## 12. SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically update your nginx config to use HTTPS
# Test auto-renewal
sudo certbot renew --dry-run
```

After SSL, Certbot modifies your Nginx config to redirect HTTP → HTTPS automatically.

---

## 13. Firewall Rules

```bash
sudo ufw allow OpenSSH         # Port 22 — keep SSH open!
sudo ufw allow 'Nginx Full'    # Ports 80 and 443

# DO NOT open these ports publicly:
# - Port 5002 (backend API — only accessible via Nginx)
# - Port 6800 (aria2 RPC — only accessible via localhost)
# - Port 6379 (Redis — only accessible via localhost)

sudo ufw enable
sudo ufw status
```

Expected output:
```
To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
Nginx Full                 ALLOW       Anywhere
```

---

## 14. PM2 Process Manager

### Ecosystem file (optional but recommended):

```bash
cd /var/www/seedr-lite/seedr-server
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'seedr-server',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/seedr/error.log',
    out_file: '/var/log/seedr/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

```bash
# Create log directory
sudo mkdir -p /var/log/seedr
sudo chown -R $USER:$USER /var/log/seedr

# Start using ecosystem file
pm2 start ecosystem.config.js

pm2 save
pm2 startup   # Run the command it outputs
```

---

## 15. Systemd Service (Alternative to PM2)

If you prefer not to use PM2, you can run the backend as a native systemd service. Systemd is built into every modern Linux distro — no extra tools needed, and it integrates directly with `journald` for logging.

### Create the service file:

```bash
sudo nano /etc/systemd/system/seedr-server.service
```

Paste the following (replace `seedr` with your actual Linux username and adjust paths if needed):

```ini
[Unit]
Description=Seedr-Lite Node.js Backend
Documentation=https://github.com/YOUR_USERNAME/seedr-lite
After=network.target redis.service docker.service
Wants=redis.service

[Service]
Type=simple
User=seedr
Group=seedr
WorkingDirectory=/var/www/seedr-lite/seedr-server

# Load environment variables from .env file
EnvironmentFile=/var/www/seedr-lite/seedr-server/.env

# Start command
ExecStart=/usr/bin/node src/index.js

# Restart policy
Restart=always
RestartSec=5
StartLimitInterval=60
StartLimitBurst=3

# Logging — viewable via: journalctl -u seedr-server -f
StandardOutput=journal
StandardError=journal
SyslogIdentifier=seedr-server

# Security hardening (optional but recommended)
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

> **Note:** `EnvironmentFile` loads your `.env` file directly — no need to hardcode secrets in the service file.

### Enable and start the service:

```bash
# Reload systemd to pick up the new service file
sudo systemctl daemon-reload

# Enable so it starts automatically on boot
sudo systemctl enable seedr-server

# Start the service
sudo systemctl start seedr-server

# Check status
sudo systemctl status seedr-server
```

### Useful systemd commands:

```bash
sudo systemctl start seedr-server      # Start
sudo systemctl stop seedr-server       # Stop
sudo systemctl restart seedr-server    # Restart
sudo systemctl status seedr-server     # Status + last few log lines

# View live logs (like pm2 logs)
journalctl -u seedr-server -f

# View last 100 lines
journalctl -u seedr-server -n 100

# View logs since last boot
journalctl -u seedr-server -b

# View logs between timestamps
journalctl -u seedr-server --since "2024-01-01 10:00" --until "2024-01-01 11:00"
```

### PM2 vs Systemd — quick comparison:

| Feature | PM2 | Systemd |
|---------|-----|---------|
| Auto-restart on crash | Yes | Yes |
| Start on boot | Yes (via `pm2 startup`) | Yes (via `systemctl enable`) |
| Log management | Built-in (`pm2 logs`) | `journalctl` |
| Cluster mode | Yes (multiple CPU cores) | No (single process) |
| Extra install needed | Yes (`npm i -g pm2`) | No (built into Linux) |
| Memory limit restart | Yes | No (needs manual config) |
| `.env` file support | Via ecosystem config | Yes (via `EnvironmentFile`) |

> Use **PM2** if you want cluster mode or a simple dashboard (`pm2 monit`). Use **systemd** if you want zero extra dependencies and native OS integration.

---

## 16. Verify Everything is Working

### Checklist:

```bash
# 1. aria2 container running
docker compose -f /var/www/seedr-lite/seedr-server/docker-compose.yml ps

# 2. Backend API responding
curl http://127.0.0.1:5002/health
# Expected: {"ok":true}

# 3. Redis running
sudo systemctl status redis-server

# 4. Nginx running
sudo systemctl status nginx

# 5. PM2 process running
pm2 status

# 6. Public health check via Nginx
curl https://yourdomain.com/health
# Expected: {"ok":true}

# 7. Check backend logs for errors
pm2 logs seedr-server --lines 50

# 8. Check aria2 logs
docker compose -f /var/www/seedr-lite/seedr-server/docker-compose.yml logs aria2
```

---

## 17. Troubleshooting

### aria2 Permission Denied

**Error:** `Permission denied` when creating directories under `/downloads/users/...`

```bash
# Check who owns the library directory
ls -la /var/www/seedr-lite/seedr-server/srv/storage/

# Check what UID the container runs as (check docker-compose.yml)
# If user: "1000:1000" is set, run:
sudo chown -R 1000:1000 /var/www/seedr-lite/seedr-server/srv/storage/library

# If no user: line (runs as root), directory can be owned by anyone
# Just make sure it exists and is writable:
chmod -R 755 /var/www/seedr-lite/seedr-server/srv/storage/library
```

### Backend won't start — EADDRINUSE

Port 5002 already in use:

```bash
sudo lsof -i :5002
kill -9 <PID>
```

### CORS errors in browser

Make sure `CORS_ORIGIN` in `.env` includes your exact frontend URL (with https, no trailing slash):

```env
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### Database locked / SQLite errors

```bash
# Check file permissions
ls -la /var/www/seedr-lite/seedr-server/data/
# Node.js process user must own users.db
chown $USER:$USER /var/www/seedr-lite/seedr-server/data/users.db
```

### Redis connection refused

```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
redis-cli ping    # Should return: PONG
```

### Docker permission denied (running docker commands)

```bash
# Make sure your user is in docker group
groups $USER   # should include 'docker'

# If not:
sudo usermod -aG docker $USER
# Log out and log back in
```

### Check disk space

```bash
df -h
# If /downloads is full, aria2 will fail silently
# Clean up old downloads via the admin panel
```

---

## Quick Reference — File Locations

| File | Location |
|------|----------|
| Backend env | `seedr-server/.env` |
| Frontend env | `seedr-web/.env.production` |
| Docker Compose | `seedr-server/docker-compose.yml` |
| Nginx config | `/etc/nginx/sites-available/seedr-lite` |
| PM2 config | `seedr-server/ecosystem.config.js` |
| SQLite DB | `seedr-server/data/users.db` |
| Downloads | `seedr-server/srv/storage/library/` |
| PM2 logs | `/var/log/seedr/` |

## Quick Reference — Ports

| Port | Service | Exposed? |
|------|---------|----------|
| 80 / 443 | Nginx (public) | Yes |
| 5002 | Node.js backend | No (localhost only) |
| 6800 | aria2 RPC | No (localhost only) |
| 6379 | Redis | No (localhost only) |

---

## Updating the App

```bash
cd /var/www/seedr-lite
git pull

# Rebuild frontend
cd seedr-web && npm install && npm run build

# Restart backend
cd ../seedr-server && npm install --production
pm2 restart seedr-server

# Rebuild aria2 container (only if Dockerfile.aria2 changed)
docker compose down && docker compose build && docker compose up -d
```
