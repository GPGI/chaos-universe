#!/usr/bin/env bash
# Simple script to start SSH tunnel with password

PORT="9000"
PASSWORD="M3d1@pl@1"

echo "Starting SSH tunnel on port $PORT..."
echo "This will forward: server:$PORT → localhost:8080"
echo ""

# Stop any existing tunnel
pkill -f "ssh.*-R.*$PORT.*ebilling" 2>/dev/null || true

# Start tunnel with sshpass
if command -v sshpass &> /dev/null; then
    SSHPASS="$PASSWORD" sshpass -e ssh -f -N \
        -R ${PORT}:localhost:8080 \
        -p 22 \
        -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        -o ExitOnForwardFailure=yes \
        ebilling@151.237.142.106 2>&1
    
    sleep 3
    
    if ps aux | grep -q "[s]sh.*-R.*$PORT"; then
        echo "✓ SSH tunnel started on port $PORT"
        echo ""
        echo "Your Vite dev server is accessible at:"
        echo "  🌐 http://151.237.142.106:$PORT"
        echo ""
        echo "To stop: pkill -f 'ssh.*-R.*$PORT'"
    else
        echo "⚠ Tunnel failed to start"
        echo "Try manually: ssh -R $PORT:localhost:8080 -p 22 ebilling@151.237.142.106"
    fi
else
    echo "sshpass not found. Run manually:"
    echo "  ssh -R $PORT:localhost:8080 -p 22 ebilling@151.237.142.106"
fi

