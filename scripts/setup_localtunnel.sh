#!/usr/bin/env bash
# Setup and start localtunnel (npm package)

set -e

LOCAL_PORT="8080"
LOG_DIR="$HOME/.tunnel-logs"
mkdir -p "$LOG_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setting up localtunnel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "✗ Node.js is required but not installed"
    exit 1
fi

# Install localtunnel globally if not available
if ! command -v lt &> /dev/null && ! command -v npx &> /dev/null; then
    echo "✗ npx is required but not installed"
    exit 1
fi

# Kill existing localtunnel instances
pkill -f "lt.*$LOCAL_PORT" 2>/dev/null || true
pkill -f "localtunnel.*$LOCAL_PORT" 2>/dev/null || true
sleep 1

# Start localtunnel using npx (no installation needed)
echo ""
echo "Starting localtunnel..."
echo "Local port: $LOCAL_PORT"
echo ""

# Generate random subdomain
SUBDOMAIN=$(openssl rand -hex 4 2>/dev/null || echo "tunnel-$(date +%s)")

npx -y localtunnel --port "$LOCAL_PORT" --subdomain "$SUBDOMAIN" \
    > "$LOG_DIR/localtunnel.log" 2>&1 &

LOCALTUNNEL_PID=$!
sleep 5

# Extract public URL from logs
PUBLIC_URL=$(grep -oE 'https://[a-z0-9-]+\.loca\.lt' "$LOG_DIR/localtunnel.log" | tail -1)

if [ -z "$PUBLIC_URL" ]; then
    # Sometimes the URL is on a different line
    PUBLIC_URL=$(grep -oE 'https://[^[:space:]]+loca\.lt[^[:space:]]*' "$LOG_DIR/localtunnel.log" | tail -1)
fi

if [ -n "$PUBLIC_URL" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ localtunnel Active!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 Public URL: $PUBLIC_URL"
    echo "🏠 Local URL:  http://localhost:$LOCAL_PORT"
    echo ""
    echo "📝 Logs: $LOG_DIR/localtunnel.log"
    echo "🆔 PID: $LOCALTUNNEL_PID"
    echo ""
    echo "To stop: pkill -f 'localtunnel.*$LOCAL_PORT'"
else
    echo "⚠ Failed to get public URL. Check logs: $LOG_DIR/localtunnel.log"
    echo "The URL should be displayed in the logs..."
fi

