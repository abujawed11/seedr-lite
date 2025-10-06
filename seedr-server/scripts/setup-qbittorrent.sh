#!/bin/bash

# qBittorrent-nox Setup Script
# This script installs and configures qBittorrent-nox as a system service

set -e

echo "🚀 qBittorrent-nox Setup Script"
echo "================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo "❌ Please run as root (use sudo)"
   exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "❌ Cannot detect OS"
    exit 1
fi

echo "✅ Detected OS: $OS"

# Install qBittorrent-nox based on OS
case $OS in
    ubuntu|debian)
        echo "📦 Installing qBittorrent-nox on Ubuntu/Debian..."
        apt-get update
        apt-get install -y qbittorrent-nox
        ;;
    centos|rhel|fedora)
        echo "📦 Installing qBittorrent-nox on CentOS/RHEL/Fedora..."
        yum install -y epel-release
        yum install -y qbittorrent-nox
        ;;
    arch)
        echo "📦 Installing qBittorrent-nox on Arch Linux..."
        pacman -S --noconfirm qbittorrent-nox
        ;;
    *)
        echo "❌ Unsupported OS: $OS"
        echo "Please install qbittorrent-nox manually"
        exit 1
        ;;
esac

# Create qbittorrent user
echo "👤 Creating qbittorrent system user..."
if ! id -u qbittorrent > /dev/null 2>&1; then
    useradd --system --create-home --home-dir /var/lib/qbittorrent --shell /usr/sbin/nologin qbittorrent
    echo "✅ User created"
else
    echo "✅ User already exists"
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p /var/lib/qbittorrent/.config/qBittorrent
mkdir -p /var/lib/qbittorrent/downloads
chown -R qbittorrent:qbittorrent /var/lib/qbittorrent

# Create qBittorrent configuration
echo "⚙️  Creating qBittorrent configuration..."

cat > /var/lib/qbittorrent/.config/qBittorrent/qBittorrent.conf << 'EOF'
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
WebUI\Password_PBKDF2="@ByteArray(ARQ77eY1NUZaQsuDHbIMCA==:0WMRkYTUWVT9wVvdDtHAjU9b3b7uB8NR1Gur2hmQCvCDpm39Q+PsJRJPaCU51dEiz+dTzh8qbPsL8WkFljQYFQ==)"
WebUI\CSRFProtection=true
WebUI\ClickjackingProtection=true
WebUI\HostHeaderValidation=true
WebUI\LocalHostAuth=false
WebUI\ServerDomains=*
WebUI\UseUPnP=false
BitTorrent\Session\DefaultSavePath=/var/lib/qbittorrent/downloads/
BitTorrent\Session\QueueingSystemEnabled=true
BitTorrent\Session\MaxActiveDownloads=5
BitTorrent\Session\MaxActiveTorrents=10
BitTorrent\Session\MaxActiveUploads=5
BitTorrent\Session\TempPath=/var/lib/qbittorrent/downloads/temp/
BitTorrent\Session\TempPathEnabled=true
EOF

# Set default password (admin:adminpass)
# Note: Users should change this after first login!
chown qbittorrent:qbittorrent /var/lib/qbittorrent/.config/qBittorrent/qBittorrent.conf
chmod 600 /var/lib/qbittorrent/.config/qBittorrent/qBittorrent.conf

# Create systemd service
echo "🔧 Creating systemd service..."

cat > /etc/systemd/system/qbittorrent-nox.service << 'EOF'
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
EOF

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Enable and start service
echo "▶️  Starting qBittorrent-nox service..."
systemctl enable qbittorrent-nox
systemctl start qbittorrent-nox

# Wait for service to start
sleep 3

# Check status
if systemctl is-active --quiet qbittorrent-nox; then
    echo ""
    echo "✅ qBittorrent-nox installed and running!"
    echo ""
    echo "📋 Service Information:"
    echo "   Status: systemctl status qbittorrent-nox"
    echo "   Logs:   journalctl -u qbittorrent-nox -f"
    echo ""
    echo "🌐 WebUI Access:"
    echo "   URL:      http://localhost:8080"
    echo "   Username: admin"
    echo "   Password: adminpass"
    echo ""
    echo "⚠️  IMPORTANT:"
    echo "   1. WebUI is bound to localhost only for security"
    echo "   2. Change the default password after first login!"
    echo "   3. Add this to your .env file:"
    echo "      TORRENT_ENGINE=qbittorrent"
    echo "      QBITTORRENT_URL=http://localhost:8080"
    echo "      QBITTORRENT_USERNAME=admin"
    echo "      QBITTORRENT_PASSWORD=adminpass"
    echo ""
    echo "🔧 Useful Commands:"
    echo "   Start:   sudo systemctl start qbittorrent-nox"
    echo "   Stop:    sudo systemctl stop qbittorrent-nox"
    echo "   Restart: sudo systemctl restart qbittorrent-nox"
    echo "   Status:  sudo systemctl status qbittorrent-nox"
    echo ""
else
    echo "❌ Failed to start qBittorrent-nox"
    echo "Check logs: journalctl -u qbittorrent-nox -n 50"
    exit 1
fi
