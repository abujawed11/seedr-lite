#!/bin/bash
# =============================================================================
#  Seedr-Lite — Automated VPS Deployment Script
#  Run as: bash deploy.sh
#  Tested on: Ubuntu 22.04 LTS
# =============================================================================

set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Helpers ─────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}━━━  $*  ━━━${NC}"; }

ask() {
  # ask <var_name> <prompt> [default]
  local varname="$1"
  local prompt="$2"
  local default="${3:-}"
  local value

  if [[ -n "$default" ]]; then
    read -rp "$(echo -e "${YELLOW}?${NC} $prompt [${default}]: ")" value
    value="${value:-$default}"
  else
    read -rp "$(echo -e "${YELLOW}?${NC} $prompt: ")" value
    while [[ -z "$value" ]]; do
      read -rp "$(echo -e "${RED}  Required.${NC} $prompt: ")" value
    done
  fi
  printf -v "$varname" '%s' "$value"
}

ask_secret() {
  local varname="$1"
  local prompt="$2"
  local value
  read -rsp "$(echo -e "${YELLOW}?${NC} $prompt: ")" value
  echo
  printf -v "$varname" '%s' "$value"
}

ask_yn() {
  # ask_yn <prompt> → returns 0 for yes, 1 for no
  local prompt="$1"
  local default="${2:-y}"
  local reply
  read -rp "$(echo -e "${YELLOW}?${NC} $prompt [Y/n]: ")" reply
  reply="${reply:-$default}"
  [[ "$reply" =~ ^[Yy]$ ]]
}

gen_secret() {
  # Generate a 48-char random hex string
  openssl rand -hex 24 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 48 | head -n 1
}

require_root() {
  if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root. Use: sudo bash deploy.sh"
  fi
}

# ─── Banner ──────────────────────────────────────────────────────────────────
clear
echo -e "${BOLD}${CYAN}"
echo "  ███████╗███████╗███████╗██████╗ ██████╗      ██╗     ██╗████████╗███████╗"
echo "  ██╔════╝██╔════╝██╔════╝██╔══██╗██╔══██╗     ██║     ██║╚══██╔══╝██╔════╝"
echo "  ███████╗█████╗  █████╗  ██║  ██║██████╔╝     ██║     ██║   ██║   █████╗  "
echo "  ╚════██║██╔══╝  ██╔══╝  ██║  ██║██╔══██╗     ██║     ██║   ██║   ██╔══╝  "
echo "  ███████║███████╗███████╗██████╔╝██║  ██║     ███████╗██║   ██║   ███████╗"
echo "  ╚══════╝╚══════╝╚══════╝╚═════╝ ╚═╝  ╚═╝     ╚══════╝╚═╝   ╚═╝   ╚══════╝"
echo -e "${NC}"
echo -e "${BOLD}         Automated VPS Deployment Script${NC}"
echo -e "         Ubuntu 22.04 LTS\n"

require_root

# ─── Pre-flight OS check ─────────────────────────────────────────────────────
if ! grep -qi "ubuntu" /etc/os-release 2>/dev/null; then
  warn "This script is tested on Ubuntu 22.04. Other distros may need adjustments."
  ask_yn "Continue anyway?" || exit 0
fi

# =============================================================================
#  STEP 1 — Collect configuration from user
# =============================================================================
step "Configuration"
echo -e "Answer the questions below. Press Enter to accept defaults.\n"

ask     DEPLOY_USER     "Linux username to run the app as (will be created if missing)" "seedr"
ask     APP_DIR         "Install directory" "/var/www/seedr-lite"
ask     REPO_URL        "Git repository URL (SSH or HTTPS)"
ask     DOMAIN          "Your domain name (e.g. yourdomain.com)"
ask     BACKEND_PORT    "Backend API port" "5002"

echo ""
info "Generating secrets automatically. You can override them."

DEFAULT_JWT=$(gen_secret)
DEFAULT_ARIA2=$(gen_secret)

ask     JWT_SECRET      "JWT secret (leave blank to use generated)" "$DEFAULT_JWT"
ask     ARIA2_SECRET    "aria2 RPC secret (leave blank to use generated)" "$DEFAULT_ARIA2"

echo ""
info "Email / SMTP settings (used for OTP registration emails)"
ask         SMTP_HOST   "SMTP host" "smtp.gmail.com"
ask         SMTP_PORT   "SMTP port" "587"
ask         SMTP_USER   "SMTP username (email address)"
ask_secret  SMTP_PASS   "SMTP password (App Password for Gmail)"
ask         ADMIN_EMAIL "Admin email address" "$SMTP_USER"

echo ""
info "Google reCAPTCHA v3 keys (get from console.cloud.google.com)"
ask RECAPTCHA_SECRET  "reCAPTCHA secret key  (server-side)"
ask RECAPTCHA_SITE    "reCAPTCHA site key    (frontend)"

echo ""
info "Process manager"
echo -e "  ${BOLD}1)${NC} PM2        (recommended — easy log management)"
echo -e "  ${BOLD}2)${NC} systemd    (no extra tools — native Linux service)"
ask PROCESS_MGR "Choose [1/2]" "1"

echo ""
info "SSL (Let's Encrypt)"
if ask_yn "Set up HTTPS with Let's Encrypt automatically?"; then
  SETUP_SSL=true
else
  SETUP_SSL=false
fi

echo ""
echo -e "${BOLD}Summary of your choices:${NC}"
echo -e "  User:        ${GREEN}$DEPLOY_USER${NC}"
echo -e "  App dir:     ${GREEN}$APP_DIR${NC}"
echo -e "  Repo:        ${GREEN}$REPO_URL${NC}"
echo -e "  Domain:      ${GREEN}$DOMAIN${NC}"
echo -e "  Port:        ${GREEN}$BACKEND_PORT${NC}"
echo -e "  Process mgr: ${GREEN}$([ "$PROCESS_MGR" = "1" ] && echo PM2 || echo systemd)${NC}"
echo -e "  SSL:         ${GREEN}$SETUP_SSL${NC}"
echo ""
ask_yn "Proceed with deployment?" || exit 0

# =============================================================================
#  STEP 2 — System update
# =============================================================================
step "System Update"
apt update -y
apt upgrade -y
apt autoremove -y
success "System updated"

# =============================================================================
#  STEP 3 — Create deploy user
# =============================================================================
step "Deploy User"
if id "$DEPLOY_USER" &>/dev/null; then
  info "User '$DEPLOY_USER' already exists — skipping creation"
else
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  success "User '$DEPLOY_USER' created"
fi

# =============================================================================
#  STEP 4 — Install system dependencies
# =============================================================================
step "System Dependencies"

# Node.js 20
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  info "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
else
  info "Node.js $(node -v) already installed"
fi

# Other packages
apt install -y build-essential python3 git curl wget nginx redis-server certbot python3-certbot-nginx
success "System packages installed"

# Start Redis
systemctl start redis-server
systemctl enable redis-server
success "Redis started and enabled"

# Install PM2 if chosen
if [[ "$PROCESS_MGR" == "1" ]]; then
  if ! command -v pm2 &>/dev/null; then
    npm install -g pm2
    success "PM2 installed"
  else
    info "PM2 already installed"
  fi
fi

# =============================================================================
#  STEP 5 — Install Docker & Docker Compose
# =============================================================================
step "Docker"

if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  apt install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt update -y
  apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  success "Docker installed"
else
  info "Docker already installed"
fi

systemctl start docker
systemctl enable docker

# Add deploy user to docker group
usermod -aG docker "$DEPLOY_USER"
success "User '$DEPLOY_USER' added to docker group"

# =============================================================================
#  STEP 6 — Create directory structure
# =============================================================================
step "Directory Structure"

mkdir -p "$APP_DIR"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

# Storage directories
mkdir -p "$APP_DIR/seedr-server/srv/storage/library"
mkdir -p "$APP_DIR/seedr-server/srv/storage/hls"
mkdir -p "$APP_DIR/seedr-server/srv/storage/thumbs"
mkdir -p "$APP_DIR/seedr-server/srv/storage/tmp"
mkdir -p "$APP_DIR/seedr-server/srv/storage/cache"
mkdir -p "$APP_DIR/seedr-server/data"

# Log directory
mkdir -p /var/log/seedr
chown -R "$DEPLOY_USER:$DEPLOY_USER" /var/log/seedr

# Permissions:
# aria2 runs as root inside the container (no user: line in compose)
# so just make sure the deploy user owns everything
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
chmod -R 775 "$APP_DIR/seedr-server/srv/storage"
chmod -R 755 "$APP_DIR/seedr-server/data"

success "Directories created with correct permissions"

# =============================================================================
#  STEP 7 — Clone the repository
# =============================================================================
step "Clone Repository"

if [[ -d "$APP_DIR/.git" ]]; then
  info "Repository already cloned — pulling latest changes..."
  sudo -u "$DEPLOY_USER" git -C "$APP_DIR" pull
else
  sudo -u "$DEPLOY_USER" git clone "$REPO_URL" "$APP_DIR"
  success "Repository cloned to $APP_DIR"
fi

# =============================================================================
#  STEP 8 — Install npm dependencies
# =============================================================================
step "npm Install"

info "Installing backend dependencies..."
sudo -u "$DEPLOY_USER" bash -c "cd $APP_DIR/seedr-server && npm install --production"
success "Backend deps installed"

info "Installing frontend dependencies..."
sudo -u "$DEPLOY_USER" bash -c "cd $APP_DIR/seedr-web && npm install"
success "Frontend deps installed"

# =============================================================================
#  STEP 9 — Write environment files
# =============================================================================
step "Environment Files"

# ── Backend .env ──────────────────────────────────────────────────────────────
BACKEND_ENV="$APP_DIR/seedr-server/.env"

cat > "$BACKEND_ENV" <<EOF
# ── Server ────────────────────────────────────────────────────────────────────
PORT=$BACKEND_PORT
WEB_BASE_URL=https://$DOMAIN

# ── Storage paths ─────────────────────────────────────────────────────────────
ROOT=./srv/storage/library
HLS=./srv/storage/hls
THUMBS=./srv/storage/thumbs
TMP=./srv/storage/tmp
CACHE_DIR=./srv/storage/cache

# ── aria2 ─────────────────────────────────────────────────────────────────────
ARIA2_MODE=docker
ARIA2_HOST=127.0.0.1
ARIA2_PORT=6800
ARIA2_SECRET=$ARIA2_SECRET
ARIA2_CONTAINER_DIR=/downloads

# ── Auth ──────────────────────────────────────────────────────────────────────
JWT_SECRET=$JWT_SECRET
LINK_TTL_SECONDS=604800

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN

# ── Email / SMTP ──────────────────────────────────────────────────────────────
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_SECURE=false
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_FROM_NAME=Seedr-Lite
SMTP_FROM_EMAIL=$SMTP_USER

# ── Admin ─────────────────────────────────────────────────────────────────────
ADMIN_EMAIL=$ADMIN_EMAIL

# ── reCAPTCHA ─────────────────────────────────────────────────────────────────
RECAPTCHA_SECRET_KEY=$RECAPTCHA_SECRET

# ── Redis / Queue ─────────────────────────────────────────────────────────────
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
QUEUE_ENABLED=true
QUEUE_MAX_CONCURRENT_GLOBAL=5
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY=5000
QUEUE_JOB_TIMEOUT=3600000

# ── Storage strategy ──────────────────────────────────────────────────────────
STORAGE_MODE=local

# ── Cloudflare R2 (disabled by default) ──────────────────────────────────────
R2_ENABLED=false

# ── Payment / Razorpay (fill in if using payments) ───────────────────────────
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
EOF

chown "$DEPLOY_USER:$DEPLOY_USER" "$BACKEND_ENV"
chmod 600 "$BACKEND_ENV"   # Only owner can read — protects secrets
success "Backend .env written to $BACKEND_ENV"

# ── Frontend .env.production ─────────────────────────────────────────────────
FRONTEND_ENV="$APP_DIR/seedr-web/.env.production"

cat > "$FRONTEND_ENV" <<EOF
# Leave empty — frontend is served from same domain via Nginx (relative paths)
VITE_API_BASE_URL=

# Google reCAPTCHA v3 public site key
VITE_RECAPTCHA_SITE_KEY=$RECAPTCHA_SITE
EOF

chown "$DEPLOY_USER:$DEPLOY_USER" "$FRONTEND_ENV"
success "Frontend .env.production written"

# =============================================================================
#  STEP 10 — Patch docker-compose.yml (ensure localhost binding & no user:)
# =============================================================================
step "Patch docker-compose.yml"

COMPOSE_FILE="$APP_DIR/seedr-server/docker-compose.yml"

# Replace any "6800:6800" with "127.0.0.1:6800:6800" for security
sed -i 's|"6800:6800"|"127.0.0.1:6800:6800"|g' "$COMPOSE_FILE"

# Remove any "user: ..." line — run aria2 as root inside container
# This avoids UID mismatch permission errors on the mounted volume
sed -i '/^\s*user:.*$/d' "$COMPOSE_FILE"

success "docker-compose.yml patched (localhost binding, removed user: line)"

# =============================================================================
#  STEP 11 — Build frontend
# =============================================================================
step "Build Frontend"

sudo -u "$DEPLOY_USER" bash -c "cd $APP_DIR/seedr-web && npm run build"
success "Frontend built → $APP_DIR/seedr-web/dist"

# =============================================================================
#  STEP 12 — Build & start aria2 Docker container
# =============================================================================
step "aria2 Docker Container"

# Pass ARIA2_SECRET and ROOT to docker compose via the .env it reads
cd "$APP_DIR/seedr-server"
sudo -u "$DEPLOY_USER" docker compose build
sudo -u "$DEPLOY_USER" docker compose up -d

# Wait a moment and verify
sleep 3
if sudo -u "$DEPLOY_USER" docker compose ps | grep -q "Up\|running"; then
  success "aria2 container is running"
else
  warn "aria2 container may not have started correctly. Check: docker compose logs aria2"
fi

cd - > /dev/null

# =============================================================================
#  STEP 13 — Configure Nginx
# =============================================================================
step "Nginx Configuration"

NGINX_CONF="/etc/nginx/sites-available/seedr-lite"

cat > "$NGINX_CONF" <<NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Frontend static files
    root $APP_DIR/seedr-web/dist;
    index index.html;

    client_max_body_size 10M;

    # React SPA — unknown routes → index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # SSE — Server-Sent Events (real-time torrent progress)
    location /api/torrents/events {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        chunked_transfer_encoding on;
    }

    # Streaming
    location /stream/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }

    # Downloads
    location /download/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }

    # Direct signed links
    location /direct/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_set_header Host \$host;
    }
}
NGINX

# Enable site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/seedr-lite

# Remove default site if present
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t
systemctl reload nginx
success "Nginx configured and reloaded"

# =============================================================================
#  STEP 14 — Firewall
# =============================================================================
step "Firewall (UFW)"

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
success "Firewall enabled: SSH + HTTP/HTTPS allowed"

# =============================================================================
#  STEP 15 — SSL (Let's Encrypt)
# =============================================================================
if [[ "$SETUP_SSL" == "true" ]]; then
  step "SSL — Let's Encrypt"
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL"
  success "SSL certificate obtained for $DOMAIN"
  # Test renewal
  certbot renew --dry-run
fi

# =============================================================================
#  STEP 16 — Process Manager
# =============================================================================
step "Process Manager"

if [[ "$PROCESS_MGR" == "1" ]]; then
  # ── PM2 ───────────────────────────────────────────────────────────────────

  PM2_ECOSYSTEM="$APP_DIR/seedr-server/ecosystem.config.js"

  cat > "$PM2_ECOSYSTEM" <<EOF
module.exports = {
  apps: [{
    name: 'seedr-server',
    script: 'src/index.js',
    cwd: '$APP_DIR/seedr-server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/seedr/error.log',
    out_file:   '/var/log/seedr/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
EOF

  chown "$DEPLOY_USER:$DEPLOY_USER" "$PM2_ECOSYSTEM"

  # Start via PM2 as deploy user
  sudo -u "$DEPLOY_USER" bash -c "cd $APP_DIR/seedr-server && pm2 start ecosystem.config.js"
  sudo -u "$DEPLOY_USER" pm2 save

  # Set PM2 to start on boot
  PM2_STARTUP=$(sudo -u "$DEPLOY_USER" pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER" | grep "sudo env")
  if [[ -n "$PM2_STARTUP" ]]; then
    eval "$PM2_STARTUP"
  fi

  success "Backend started with PM2"
  info "Useful commands:"
  info "  pm2 status"
  info "  pm2 logs seedr-server"
  info "  pm2 restart seedr-server"

else
  # ── Systemd ──────────────────────────────────────────────────────────────
  NODE_BIN=$(which node)

  cat > /etc/systemd/system/seedr-server.service <<EOF
[Unit]
Description=Seedr-Lite Node.js Backend
After=network.target redis.service docker.service
Wants=redis.service

[Service]
Type=simple
User=$DEPLOY_USER
Group=$DEPLOY_USER
WorkingDirectory=$APP_DIR/seedr-server
EnvironmentFile=$APP_DIR/seedr-server/.env
ExecStart=$NODE_BIN src/index.js
Restart=always
RestartSec=5
StartLimitInterval=60
StartLimitBurst=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=seedr-server
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable seedr-server
  systemctl start seedr-server

  success "Backend started as systemd service"
  info "Useful commands:"
  info "  systemctl status seedr-server"
  info "  journalctl -u seedr-server -f"
  info "  systemctl restart seedr-server"
fi

# =============================================================================
#  STEP 17 — Verify
# =============================================================================
step "Verification"

sleep 5  # Give Node.js time to boot

echo ""
info "Checking services..."

# Redis
if systemctl is-active --quiet redis-server; then
  success "Redis            ✓ running"
else
  warn    "Redis            ✗ not running — run: systemctl start redis-server"
fi

# Nginx
if systemctl is-active --quiet nginx; then
  success "Nginx            ✓ running"
else
  warn    "Nginx            ✗ not running — run: systemctl start nginx"
fi

# aria2
if sudo -u "$DEPLOY_USER" docker compose -f "$APP_DIR/seedr-server/docker-compose.yml" ps 2>/dev/null | grep -qiE "up|running"; then
  success "aria2 (Docker)   ✓ running"
else
  warn    "aria2 (Docker)   ✗ not running — check: docker compose logs aria2"
fi

# Backend health
sleep 2
if curl -sf "http://127.0.0.1:$BACKEND_PORT/health" | grep -q '"ok":true'; then
  success "Backend API      ✓ healthy (http://127.0.0.1:$BACKEND_PORT/health)"
else
  warn    "Backend API      ✗ not responding yet — check logs"
  if [[ "$PROCESS_MGR" == "1" ]]; then
    warn  "  Run: pm2 logs seedr-server"
  else
    warn  "  Run: journalctl -u seedr-server -f"
  fi
fi

# =============================================================================
#  Done
# =============================================================================
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}  Deployment Complete!${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BOLD}App URL:${NC}     https://$DOMAIN"
echo -e "  ${BOLD}Health:${NC}      https://$DOMAIN/health"
echo -e "  ${BOLD}App dir:${NC}     $APP_DIR"
echo -e "  ${BOLD}.env file:${NC}   $APP_DIR/seedr-server/.env"
echo -e "  ${BOLD}Logs:${NC}        /var/log/seedr/"
echo ""
echo -e "${YELLOW}  Important — docker group change requires re-login:${NC}"
echo -e "  If you run docker commands as '$DEPLOY_USER' and get permission errors,"
echo -e "  log out and back in as that user once."
echo ""
echo -e "${YELLOW}  To update the app in future, run:${NC}"
echo -e "  bash $APP_DIR/update.sh"
echo ""

# =============================================================================
#  Write a quick update script too
# =============================================================================
UPDATE_SCRIPT="$APP_DIR/update.sh"
cat > "$UPDATE_SCRIPT" <<UPDATESCRIPT
#!/bin/bash
# Quick update script — pull latest code and restart
set -e

APP_DIR="$APP_DIR"
DEPLOY_USER="$DEPLOY_USER"

echo "Pulling latest code..."
sudo -u "\$DEPLOY_USER" git -C "\$APP_DIR" pull

echo "Rebuilding frontend..."
sudo -u "\$DEPLOY_USER" bash -c "cd \$APP_DIR/seedr-web && npm install && npm run build"

echo "Updating backend deps..."
sudo -u "\$DEPLOY_USER" bash -c "cd \$APP_DIR/seedr-server && npm install --production"

echo "Restarting backend..."
UPDATESCRIPT

if [[ "$PROCESS_MGR" == "1" ]]; then
  echo 'sudo -u "$DEPLOY_USER" pm2 restart seedr-server' >> "$UPDATE_SCRIPT"
else
  echo 'systemctl restart seedr-server' >> "$UPDATE_SCRIPT"
fi

cat >> "$UPDATE_SCRIPT" <<'UPDATESCRIPT'

echo ""
echo "Done! If Dockerfile.aria2 changed, rebuild with:"
echo "  cd $APP_DIR/seedr-server && docker compose down && docker compose build && docker compose up -d"
UPDATESCRIPT

chmod +x "$UPDATE_SCRIPT"
chown "$DEPLOY_USER:$DEPLOY_USER" "$UPDATE_SCRIPT"
success "Update script written to $APP_DIR/update.sh"
