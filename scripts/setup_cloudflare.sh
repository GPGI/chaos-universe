#!/usr/bin/env bash
# Setup and start Cloudflare Tunnel (cloudflared)

set -e

LOCAL_PORT="8080"
LOG_DIR="$HOME/.tunnel-logs"
mkdir -p "$LOG_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setting up Cloudflare Tunnel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Add user bin to PATH if exists
export PATH="$HOME/.local/bin:$PATH"

# Install cloudflared if not available
if ! command -v cloudflared &> /dev/null; then
    echo "Installing cloudflared..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Detect architecture
        ARCH=$(uname -m)
        case $ARCH in
            x86_64) ARCH="amd64" ;;
            aarch64|arm64) ARCH="arm64" ;;
            armv7l|armv6l) ARCH="arm" ;;
            *) ARCH="amd64" ;;
        esac
        
        CLOUDFLARE_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$ARCH"
        
        cd /tmp
        wget -q "$CLOUDFLARE_URL" -O cloudflared || curl -L "$CLOUDFLARE_URL" -o cloudflared
        chmod +x cloudflared
        
        # Try to install to /usr/local/bin (may require sudo)
        if sudo -n true 2>/dev/null; then
            sudo mv cloudflared /usr/local/bin/ 2>/dev/null && echo "✓ cloudflared installed to /usr/local/bin"
        else
            # Install to user bin directory
            mkdir -p "$HOME/.local/bin"
            mv cloudflared "$HOME/.local/bin/"
            export PATH="$HOME/.local/bin:$PATH"
            echo "✓ cloudflared installed to ~/.local/bin"
            echo "  Add to PATH: export PATH=\"\$HOME/.local/bin:\$PATH\""
        fi
    else
        echo "⚠ Please install cloudflared manually:"
        echo "  https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
        exit 1
    fi
fi

# Kill existing cloudflared instances
pkill -f "cloudflared.*$LOCAL_PORT" 2>/dev/null || true
sleep 1

# Start cloudflared tunnel
echo ""
echo "Starting Cloudflare tunnel..."
echo "Local port: $LOCAL_PORT"
echo ""

cloudflared tunnel --url "http://localhost:$LOCAL_PORT" \
    > "$LOG_DIR/cloudflared.log" 2>&1 &

CLOUDFLARE_PID=$!
sleep 5

# Extract public URL from logs
PUBLIC_URL=$(grep -o 'https://[^.]*\.trycloudflare\.com' "$LOG_DIR/cloudflared.log" | tail -1)

if [ -n "$PUBLIC_URL" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Cloudflare Tunnel Active!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 Public URL: $PUBLIC_URL"
    echo "🏠 Local URL:  http://localhost:$LOCAL_PORT"
    echo ""
    echo "📝 Logs: $LOG_DIR/cloudflared.log"
    echo "🆔 PID: $CLOUDFLARE_PID"
    echo ""
    echo "To stop: pkill -f 'cloudflared.*$LOCAL_PORT'"
    echo ""
    echo "Note: URL may change on restart. Check logs for latest URL."
else
    echo "⚠ Failed to get public URL. Check logs: $LOG_DIR/cloudflared.log"
    echo "The URL should appear in the logs shortly..."
fi

