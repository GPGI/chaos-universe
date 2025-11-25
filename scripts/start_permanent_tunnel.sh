#!/usr/bin/env bash
# Start permanent tunnel immediately
# This script starts autossh tunnel in background

set -e

SERVER_IP="151.237.142.106"
SERVER_PORT="22"
SSH_USER="ebilling"
FORWARD_PORT="9000"
LOCAL_PORT="8080"
SSH_KEY="$HOME/.ssh/id_rsa"
LOG_DIR="$HOME/.ssh-tunnel-logs"
PID_FILE="$LOG_DIR/tunnel.pid"

# Create log directory
mkdir -p "$LOG_DIR"

# Kill existing tunnels
echo "Cleaning up old tunnels..."
pkill -f "autossh.*9000.*ebilling" 2>/dev/null || true
pkill -f "ssh.*-R.*9000.*ebilling" 2>/dev/null || true
sleep 1

# Check if autossh is available
if ! command -v autossh &> /dev/null; then
    echo "⚠ autossh not found. Installing..."
    sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y autossh >/dev/null 2>&1 || {
        echo "✗ Failed to install autossh. Please install manually:"
        echo "  sudo apt-get install autossh"
        exit 1
    }
fi

# Start autossh tunnel
echo "Starting permanent tunnel..."
AUTOSSH_PATH=$(which autossh)

nohup "$AUTOSSH_PATH" \
    -M 20000 \
    -N \
    -f \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o LogLevel=ERROR \
    -i "$SSH_KEY" \
    -p "$SERVER_PORT" \
    -R "${FORWARD_PORT}:localhost:${LOCAL_PORT}" \
    "${SSH_USER}@${SERVER_IP}" \
    > "$LOG_DIR/tunnel.log" 2>&1 &

TUNNEL_PID=$!
echo $TUNNEL_PID > "$PID_FILE"

sleep 3

# Check if tunnel is running
if ps -p $TUNNEL_PID > /dev/null 2>&1; then
    echo "✓ Tunnel started successfully (PID: $TUNNEL_PID)"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Your app is now public!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 Public URL: http://${SERVER_IP}:${FORWARD_PORT}"
    echo "🏠 Local URL:  http://localhost:${LOCAL_PORT}"
    echo ""
    echo "Logs: $LOG_DIR/tunnel.log"
    echo "PID:  $PID_FILE"
    echo ""
    echo "To stop: pkill -f 'autossh.*9000.*ebilling'"
    echo ""
    
    # Test connection
    echo "Testing connection..."
    sleep 2
    if curl -s -I --max-time 5 "http://${SERVER_IP}:${FORWARD_PORT}/" 2>&1 | head -1 | grep -q "200\|HTTP"; then
        echo "✓ Connection successful!"
    else
        echo "⚠ Connection test failed - tunnel may still be connecting"
        echo "Check if server is configured properly (GatewayPorts, AllowTcpForwarding)"
    fi
else
    echo "✗ Tunnel failed to start"
    echo "Check logs: cat $LOG_DIR/tunnel.log"
    exit 1
fi

