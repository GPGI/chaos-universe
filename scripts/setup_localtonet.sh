#!/usr/bin/env bash
# Setup and start localtonet tunnel

set -e

LOCAL_PORT="8080"
LOG_DIR="$HOME/.tunnel-logs"
mkdir -p "$LOG_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setting up localtonet Tunnel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Install localtonet if not available
if ! command -v localtonet &> /dev/null; then
    echo "Installing localtonet..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        ARCH=$(uname -m)
        case $ARCH in
            x86_64) ARCH="x86_64" ;;
            aarch64|arm64) ARCH="aarch64" ;;
            *) ARCH="x86_64" ;;
        esac
        
        LOCALTONET_URL="https://localtonet.com/download/localtonet-linux-$ARCH"
        
        cd /tmp
        wget -q "$LOCALTONET_URL" -O localtonet || curl -L "$LOCALTONET_URL" -o localtonet
        chmod +x localtonet
        
        # Try to install to /usr/local/bin (may require sudo)
        if sudo -n true 2>/dev/null; then
            sudo mv localtonet /usr/local/bin/ 2>/dev/null && echo "✓ localtonet installed to /usr/local/bin"
        else
            # Install to user bin directory
            mkdir -p "$HOME/.local/bin"
            mv localtonet "$HOME/.local/bin/"
            export PATH="$HOME/.local/bin:$PATH"
            echo "✓ localtonet installed to ~/.local/bin"
            echo "  Add to PATH: export PATH=\"\$HOME/.local/bin:\$PATH\""
        fi
    else
        echo "⚠ Please install localtonet manually:"
        echo "  https://localtonet.com/download"
        exit 1
    fi
fi

# Kill existing localtonet instances
pkill -f "localtonet.*$LOCAL_PORT" 2>/dev/null || true
sleep 1

# Start localtonet tunnel
echo ""
echo "Starting localtonet tunnel..."
echo "Local port: $LOCAL_PORT"
echo ""

localtonet --port "$LOCAL_PORT" \
    > "$LOG_DIR/localtonet.log" 2>&1 &

LOCALTONET_PID=$!
sleep 5

# Extract public URL from logs
PUBLIC_URL=$(grep -oE 'https://[a-z0-9-]+\.localtonet\.com' "$LOG_DIR/localtonet.log" | tail -1)

if [ -n "$PUBLIC_URL" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ localtonet Tunnel Active!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 Public URL: $PUBLIC_URL"
    echo "🏠 Local URL:  http://localhost:$LOCAL_PORT"
    echo ""
    echo "📝 Logs: $LOG_DIR/localtonet.log"
    echo "🆔 PID: $LOCALTONET_PID"
    echo ""
    echo "To stop: pkill -f 'localtonet.*$LOCAL_PORT'"
else
    echo "⚠ Failed to get public URL. Check logs: $LOG_DIR/localtonet.log"
fi

