#!/usr/bin/env bash
# Get the current public tunnel URL

LOG_DIR="$HOME/.tunnel-logs"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Current Public Tunnel URLs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Cloudflare
if ps aux | grep -q "[c]loudflared.*tunnel"; then
    CF_URL=$(cat "$LOG_DIR/cloudflared.log" 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
    if [ -n "$CF_URL" ]; then
        echo "☁️  Cloudflare Tunnel:"
        echo "   $CF_URL"
        echo ""
    fi
fi

# Check ngrok
if ps aux | grep -q "[n]grok"; then
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -oE 'https://[^"]*\.ngrok[^"]*' | head -1)
    if [ -n "$NGROK_URL" ]; then
        echo "🔷 ngrok Tunnel:"
        echo "   $NGROK_URL"
        echo "   Web UI: http://localhost:4040"
        echo ""
    fi
fi

# Check localtunnel
if ps aux | grep -q "[l]ocaltunnel"; then
    LT_URL=$(cat "$LOG_DIR/localtunnel.log" 2>/dev/null | grep -oE 'https://[^[:space:]]+loca\.lt[^[:space:]]*' | tail -1)
    if [ -n "$LT_URL" ]; then
        echo "📦 localtunnel:"
        echo "   $LT_URL"
        echo ""
    fi
fi

# Check localtonet
if ps aux | grep -q "[l]ocaltonet"; then
    LTN_URL=$(cat "$LOG_DIR/localtonet.log" 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.localtonet\.com' | tail -1)
    if [ -n "$LTN_URL" ]; then
        echo "🔶 localtonet:"
        echo "   $LTN_URL"
        echo ""
    fi
fi

# Check SSH tunnel
if ps aux | grep -q "[a]utossh.*9000\|[s]sh.*-R.*9000"; then
    echo "🔐 SSH Tunnel:"
    echo "   http://151.237.142.106:9000"
    echo ""
fi

if ! ps aux | grep -qE "[c]loudflared|[n]grok|[l]ocaltunnel|[l]ocaltonet|[a]utossh.*9000"; then
    echo "⚠ No active tunnels found"
    echo ""
    echo "Start a tunnel:"
    echo "  bash scripts/start_tunnel.sh"
fi

