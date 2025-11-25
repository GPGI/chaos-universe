#!/usr/bin/env bash
# Start Reverse SSH Tunnel with password authentication

SERVER_IP="151.237.142.106"
SSH_USER="eblling"
SSH_PORT="22"
PASSWORD="M3d1@pl@1"
REMOTE_PORT="8080"
LOCAL_PORT="8080"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Starting Reverse SSH Tunnel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Tunnel: ${SERVER_IP}:${REMOTE_PORT} → localhost:${LOCAL_PORT}"
echo "User: ${SSH_USER}"
echo ""

# Kill any existing tunnel
pkill -f "ssh.*-R.*${REMOTE_PORT}.*${SERVER_IP}" 2>/dev/null || true
sleep 1

# Start tunnel with sshpass
if command -v sshpass &> /dev/null; then
    SSHPASS="${PASSWORD}" sshpass -e ssh -f -N \
        -R ${REMOTE_PORT}:localhost:${LOCAL_PORT} \
        -p ${SSH_PORT} \
        -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        -o ExitOnForwardFailure=yes \
        ${SSH_USER}@${SERVER_IP} 2>&1
    
    sleep 2
    
    if ps aux | grep -q "[s]sh.*-R.*${REMOTE_PORT}"; then
        echo "✓ SSH tunnel is running!"
        echo ""
        echo "Your Vite dev server is now accessible at:"
        echo "  🌐 http://${SERVER_IP}:${REMOTE_PORT}"
        echo ""
        echo "Local access:"
        echo "  🏠 http://localhost:${LOCAL_PORT}"
        echo ""
        echo "To stop the tunnel: pkill -f 'ssh.*-R.*${REMOTE_PORT}'"
    else
        echo "⚠ Tunnel failed to start"
        echo "Try running manually:"
        echo "  ssh -R ${REMOTE_PORT}:localhost:${LOCAL_PORT} -p ${SSH_PORT} ${SSH_USER}@${SERVER_IP}"
    fi
else
    echo "sshpass not found. Starting tunnel manually..."
    echo "Enter password when prompted: ${PASSWORD}"
    ssh -R ${REMOTE_PORT}:localhost:${LOCAL_PORT} \
        -p ${SSH_PORT} \
        -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        -o ExitOnForwardFailure=yes \
        ${SSH_USER}@${SERVER_IP}
fi

