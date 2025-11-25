#!/usr/bin/env bash
# Unified tunnel manager - choose your tunneling solution

set -e

LOCAL_PORT="${1:-8080}"
TUNNEL_TYPE="${2:-cloudflare}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Public Tunnel Manager"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if local server is running
if ! curl -s --max-time 2 "http://localhost:$LOCAL_PORT" > /dev/null 2>&1; then
    echo "⚠ Warning: Local server doesn't appear to be running on port $LOCAL_PORT"
    echo "   Make sure your Vite dev server is started first!"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

case "$TUNNEL_TYPE" in
    cloudflare|cf)
        echo "Using: Cloudflare Tunnel (cloudflared)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        bash "$(dirname "$0")/setup_cloudflare.sh"
        ;;
    
    ngrok)
        echo "Using: ngrok"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        bash "$(dirname "$0")/setup_ngrok.sh"
        ;;
    
    localtonet|ltn)
        echo "Using: localtonet"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        bash "$(dirname "$0")/setup_localtonet.sh"
        ;;
    
    localtunnel|lt)
        echo "Using: localtunnel (npm)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        bash "$(dirname "$0")/setup_localtunnel.sh"
        ;;
    
    ssh)
        echo "Using: SSH Tunnel"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        bash "$(dirname "$0")/start_permanent_tunnel.sh"
        ;;
    
    *)
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "Available Tunneling Solutions:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "1. cloudflare (default) - Free, fast, reliable"
        echo "   Usage: bash scripts/start_tunnel.sh [port] cloudflare"
        echo ""
        echo "2. ngrok - Popular, requires signup"
        echo "   Usage: bash scripts/start_tunnel.sh [port] ngrok"
        echo ""
        echo "3. localtonet - Simple alternative"
        echo "   Usage: bash scripts/start_tunnel.sh [port] localtonet"
        echo ""
        echo "4. localtunnel - npm-based, no install needed"
        echo "   Usage: bash scripts/start_tunnel.sh [port] localtunnel"
        echo ""
        echo "5. ssh - SSH reverse tunnel (requires server)"
        echo "   Usage: bash scripts/start_tunnel.sh [port] ssh"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Recommendation: Use 'cloudflare' (no signup required)"
        echo ""
        echo "Quick start:"
        echo "  bash scripts/start_tunnel.sh 8080 cloudflare"
        echo ""
        exit 1
        ;;
esac

