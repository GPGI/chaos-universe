#!/usr/bin/env bash
# Setup and start ngrok tunnel

set -e

LOCAL_PORT="8080"
LOG_DIR="$HOME/.tunnel-logs"
mkdir -p "$LOG_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setting up ngrok Tunnel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Install ngrok if not available
if ! command -v ngrok &> /dev/null; then
    echo "Installing ngrok..."
    
    # Download ngrok
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        NGROK_URL="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz"
        cd /tmp
        wget -q "$NGROK_URL" -O ngrok.tgz || curl -L "$NGROK_URL" -o ngrok.tgz
        tar xzf ngrok.tgz
        chmod +x ngrok
        
        # Try to install to /usr/local/bin (may require sudo)
        if sudo -n true 2>/dev/null; then
            sudo mv ngrok /usr/local/bin/ 2>/dev/null && echo "✓ ngrok installed to /usr/local/bin"
        else
            # Install to user bin directory
            mkdir -p "$HOME/.local/bin"
            mv ngrok "$HOME/.local/bin/"
            export PATH="$HOME/.local/bin:$PATH"
            echo "✓ ngrok installed to ~/.local/bin"
            echo "  Add to PATH: export PATH=\"\$HOME/.local/bin:\$PATH\""
        fi
    else
        echo "⚠ Please install ngrok manually:"
        echo "  https://ngrok.com/download"
        exit 1
    fi
fi

# Check if authtoken is set
if ! ngrok config check &>/dev/null; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠ ngrok requires authentication"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Sign up at: https://dashboard.ngrok.com/signup"
    echo "2. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "3. Run: ngrok config add-authtoken YOUR_TOKEN"
    echo ""
    read -p "Do you have an authtoken? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your ngrok authtoken: " authtoken
        ngrok config add-authtoken "$authtoken"
    else
        echo "⚠ Please set up ngrok authentication first"
        exit 1
    fi
fi

# Kill existing ngrok instances
pkill -f "ngrok.*$LOCAL_PORT" 2>/dev/null || true
sleep 1

# Start ngrok
echo ""
echo "Starting ngrok tunnel..."
echo "Local port: $LOCAL_PORT"
echo ""

ngrok http "$LOCAL_PORT" \
    --log=stdout \
    > "$LOG_DIR/ngrok.log" 2>&1 &

NGROK_PID=$!
sleep 3

# Get public URL from ngrok API
PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok[^"]*' | head -1)

if [ -n "$PUBLIC_URL" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ ngrok Tunnel Active!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 Public URL: $PUBLIC_URL"
    echo "🏠 Local URL:  http://localhost:$LOCAL_PORT"
    echo ""
    echo "📊 Web Interface: http://localhost:4040"
    echo "📝 Logs: $LOG_DIR/ngrok.log"
    echo "🆔 PID: $NGROK_PID"
    echo ""
    echo "To stop: pkill -f 'ngrok.*$LOCAL_PORT'"
    echo ""
else
    echo "⚠ Failed to get public URL. Check logs: $LOG_DIR/ngrok.log"
    echo "Or visit: http://localhost:4040"
fi

