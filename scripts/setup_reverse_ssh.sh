#!/usr/bin/env bash
# Setup Reverse SSH Tunnel for Vite Dev Server
# Exposes localhost:8080 through server 151.237.142.106:8080

set -e

# Configuration
SERVER_IP="151.237.142.106"
SERVER_SSH_PORT="22"
SERVER_FORWARD_PORT="8080"
LOCAL_PORT="8080"
SSH_USER="${SSH_USER:-$USER}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Reverse SSH Tunnel Setup for Vite Dev Server        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if autossh is installed
if ! command -v autossh &> /dev/null; then
    echo -e "${YELLOW}⚠ autossh not found. Installing...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y autossh
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install autossh
        else
            echo -e "${RED}✗ Please install Homebrew first: https://brew.sh${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Please install autossh manually${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ autossh is installed${NC}"

# Check SSH key
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${YELLOW}⚠ SSH key not found at $SSH_KEY${NC}"
    echo -e "${YELLOW}Generating SSH key...${NC}"
    ssh-keygen -t rsa -b 4096 -f "$SSH_KEY" -N ""
    echo -e "${GREEN}✓ SSH key generated${NC}"
    echo -e "${YELLOW}⚠ You need to copy your public key to the server:${NC}"
    echo -e "   ssh-copy-id -i $SSH_KEY.pub ${SSH_USER}@${SERVER_IP}"
    echo ""
    read -p "Press Enter after copying the key, or Ctrl+C to abort..."
fi

# Test SSH connection (optional - skip if connection test fails)
echo -e "${BLUE}Testing SSH connection...${NC}"
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -p "$SERVER_SSH_PORT" -i "$SSH_KEY" "${SSH_USER}@${SERVER_IP}" "echo 'Connection successful'" &>/dev/null; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${YELLOW}⚠ Connection test failed, but proceeding anyway${NC}"
    echo -e "${YELLOW}  (Tunnel will attempt to connect and auto-retry)${NC}"
fi

# Check if port is already in use locally
if lsof -i :"$LOCAL_PORT" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port $LOCAL_PORT is already in use${NC}"
    echo -e "${YELLOW}Make sure Vite is running on port $LOCAL_PORT${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Kill any existing autossh processes for this tunnel
echo -e "${BLUE}Cleaning up existing tunnels...${NC}"
pkill -f "autossh.*${SERVER_FORWARD_PORT}:localhost:${LOCAL_PORT}" 2>/dev/null || true
sleep 1

# Create log directory
LOG_DIR="$HOME/.reverse_ssh_tunnel"
mkdir -p "$LOG_DIR"

echo ""
echo -e "${BLUE}Starting reverse SSH tunnel...${NC}"
echo -e "  Server: ${SERVER_IP}:${SERVER_SSH_PORT}"
echo -e "  Forward: ${SERVER_IP}:${SERVER_FORWARD_PORT} → localhost:${LOCAL_PORT}"
echo ""

# Start autossh with reverse tunnel
autossh -M 20000 -N \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -p "$SERVER_SSH_PORT" \
    -i "$SSH_KEY" \
    -R "${SERVER_FORWARD_PORT}:localhost:${LOCAL_PORT}" \
    -f \
    -l "$SSH_USER" \
    "$SERVER_IP" \
    > "$LOG_DIR/tunnel.log" 2>&1

sleep 2

# Check if tunnel is running
if pgrep -f "autossh.*${SERVER_FORWARD_PORT}:localhost:${LOCAL_PORT}" > /dev/null; then
    echo -e "${GREEN}✓ Reverse SSH tunnel is running!${NC}"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Your Vite dev server is now accessible at:${NC}"
    echo -e "${GREEN}  ${YELLOW}http://${SERVER_IP}:${SERVER_FORWARD_PORT}${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}Tunnel Status:${NC}"
    ps aux | grep "[a]utossh.*${SERVER_FORWARD_PORT}:localhost:${LOCAL_PORT}" | head -1
    echo ""
    echo -e "${BLUE}To stop the tunnel:${NC}"
    echo -e "  bash scripts/stop_reverse_ssh.sh"
    echo ""
    echo -e "${BLUE}To view logs:${NC}"
    echo -e "  tail -f $LOG_DIR/tunnel.log"
else
    echo -e "${RED}✗ Failed to start tunnel${NC}"
    echo -e "${YELLOW}Check logs:${NC}"
    cat "$LOG_DIR/tunnel.log"
    exit 1
fi

