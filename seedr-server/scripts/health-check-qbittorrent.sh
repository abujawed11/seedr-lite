#!/bin/bash

# qBittorrent Health Check Script
# Can be used for monitoring, cron jobs, or manual checks

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
QBITTORRENT_URL=${QBITTORRENT_URL:-"http://localhost:8080"}
QBITTORRENT_USERNAME=${QBITTORRENT_USERNAME:-"admin"}
QBITTORRENT_PASSWORD=${QBITTORRENT_PASSWORD:-"adminpass"}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}qBittorrent Health Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Exit codes
EXIT_SUCCESS=0
EXIT_FAILURE=1

CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

# Function to print failure
failure() {
    echo -e "${RED}✗${NC} $1"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to print info
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check 1: systemd service status
echo -e "\n${BLUE}1. Checking systemd service...${NC}"
if systemctl is-active --quiet qbittorrent-nox; then
    success "qBittorrent service is running"

    # Get service uptime
    UPTIME=$(systemctl show qbittorrent-nox --property=ActiveEnterTimestamp | cut -d'=' -f2)
    info "Service started: $UPTIME"
else
    failure "qBittorrent service is not running"
    info "Try: sudo systemctl start qbittorrent-nox"
fi

# Check 2: Port accessibility
echo -e "\n${BLUE}2. Checking port accessibility...${NC}"
PORT=$(echo $QBITTORRENT_URL | grep -oP ':\K\d+' || echo "8080")
if nc -z localhost $PORT 2>/dev/null; then
    success "Port $PORT is accessible"
else
    failure "Port $PORT is not accessible"
    info "Check if qBittorrent is listening on the correct port"
fi

# Check 3: WebUI API version
echo -e "\n${BLUE}3. Checking WebUI API...${NC}"
API_VERSION=$(curl -s "$QBITTORRENT_URL/api/v2/app/webapiVersion" 2>/dev/null || echo "")
if [ -n "$API_VERSION" ]; then
    success "WebUI API is accessible (version: $API_VERSION)"
else
    failure "Cannot reach WebUI API"
    info "URL: $QBITTORRENT_URL"
fi

# Check 4: Authentication
echo -e "\n${BLUE}4. Testing authentication...${NC}"
COOKIE=$(curl -s -i --data "username=$QBITTORRENT_USERNAME&password=$QBITTORRENT_PASSWORD" \
    "$QBITTORRENT_URL/api/v2/auth/login" 2>/dev/null | grep -i "set-cookie" | cut -d' ' -f2 | cut -d';' -f1)

if [ -n "$COOKIE" ]; then
    success "Authentication successful"
else
    failure "Authentication failed"
    info "Check username and password in .env file"
fi

# Check 5: qBittorrent version
echo -e "\n${BLUE}5. Checking qBittorrent version...${NC}"
if [ -n "$COOKIE" ]; then
    VERSION=$(curl -s --cookie "$COOKIE" "$QBITTORRENT_URL/api/v2/app/version" 2>/dev/null)
    if [ -n "$VERSION" ]; then
        success "qBittorrent version: $VERSION"
    else
        warning "Could not get version info"
    fi
else
    warning "Skipped (authentication failed)"
fi

# Check 6: Transfer info
echo -e "\n${BLUE}6. Checking transfer stats...${NC}"
if [ -n "$COOKIE" ]; then
    TRANSFER_INFO=$(curl -s --cookie "$COOKIE" "$QBITTORRENT_URL/api/v2/transfer/info" 2>/dev/null)
    if [ -n "$TRANSFER_INFO" ]; then
        DL_SPEED=$(echo $TRANSFER_INFO | grep -oP '"dl_info_speed":\K\d+' || echo "0")
        UP_SPEED=$(echo $TRANSFER_INFO | grep -oP '"up_info_speed":\K\d+' || echo "0")

        DL_MBPS=$(echo "scale=2; $DL_SPEED / 1024 / 1024" | bc 2>/dev/null || echo "0")
        UP_MBPS=$(echo "scale=2; $UP_SPEED / 1024 / 1024" | bc 2>/dev/null || echo "0")

        success "Transfer stats retrieved"
        info "Download: ${DL_MBPS} MB/s"
        info "Upload: ${UP_MBPS} MB/s"
    else
        warning "Could not get transfer info"
    fi
else
    warning "Skipped (authentication failed)"
fi

# Check 7: Active torrents
echo -e "\n${BLUE}7. Checking active torrents...${NC}"
if [ -n "$COOKIE" ]; then
    TORRENTS=$(curl -s --cookie "$COOKIE" "$QBITTORRENT_URL/api/v2/torrents/info" 2>/dev/null)
    if [ -n "$TORRENTS" ]; then
        TORRENT_COUNT=$(echo $TORRENTS | grep -o '"hash":' | wc -l)
        success "Found $TORRENT_COUNT active torrent(s)"

        if [ $TORRENT_COUNT -gt 0 ]; then
            # Get first torrent name as example
            FIRST_NAME=$(echo $TORRENTS | grep -oP '"name":"\K[^"]+' | head -1 || echo "")
            if [ -n "$FIRST_NAME" ]; then
                info "Example: ${FIRST_NAME:0:50}..."
            fi
        fi
    else
        warning "Could not get torrent list"
    fi
else
    warning "Skipped (authentication failed)"
fi

# Check 8: Disk space
echo -e "\n${BLUE}8. Checking disk space...${NC}"
DOWNLOAD_PATH="/var/lib/qbittorrent/downloads"
if [ -d "$DOWNLOAD_PATH" ]; then
    DISK_USAGE=$(df -h "$DOWNLOAD_PATH" | tail -1 | awk '{print $5}' | sed 's/%//')
    DISK_AVAIL=$(df -h "$DOWNLOAD_PATH" | tail -1 | awk '{print $4}')

    if [ $DISK_USAGE -lt 90 ]; then
        success "Disk space OK (${DISK_USAGE}% used, ${DISK_AVAIL} available)"
    else
        warning "Disk space is running low (${DISK_USAGE}% used, ${DISK_AVAIL} available)"
    fi
else
    warning "Download path not found: $DOWNLOAD_PATH"
fi

# Check 9: Process resources
echo -e "\n${BLUE}9. Checking process resources...${NC}"
if pgrep -x "qbittorrent-nox" > /dev/null; then
    PID=$(pgrep -x "qbittorrent-nox")
    CPU=$(ps -p $PID -o %cpu | tail -1 | xargs)
    MEM=$(ps -p $PID -o %mem | tail -1 | xargs)

    success "Process resources"
    info "CPU: ${CPU}%"
    info "Memory: ${MEM}%"
    info "PID: $PID"
else
    warning "Could not find qbittorrent-nox process"
fi

# Check 10: Log errors
echo -e "\n${BLUE}10. Checking recent log errors...${NC}"
ERROR_COUNT=$(journalctl -u qbittorrent-nox --since "1 hour ago" -p err 2>/dev/null | wc -l)
if [ $ERROR_COUNT -eq 0 ]; then
    success "No errors in last hour"
else
    warning "Found $ERROR_COUNT error(s) in last hour"
    info "View logs: journalctl -u qbittorrent-nox -p err -n 20"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}Failed: $CHECKS_FAILED${NC}"

echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! qBittorrent is healthy.${NC}"
    exit $EXIT_SUCCESS
else
    echo -e "${RED}✗ Some checks failed. Please review the issues above.${NC}"
    echo ""
    echo -e "${YELLOW}Quick fixes:${NC}"
    echo "  - Service not running: sudo systemctl start qbittorrent-nox"
    echo "  - Auth failed: Check credentials in .env file"
    echo "  - Port issues: Check firewall and qBittorrent config"
    echo "  - View logs: sudo journalctl -u qbittorrent-nox -n 50"
    exit $EXIT_FAILURE
fi
