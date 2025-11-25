#!/usr/bin/env bash
# Manual Reverse SSH Tunnel Start Script
# Run this script and enter the password when prompted

set -e

SERVER_IP="151.237.142.106"
SERVER_PORT="22"
FORWARD_PORT="8080"
LOCAL_PORT="8080"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Starting Reverse SSH Tunnel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This will forward: server:${FORWARD_PORT} → localhost:${LOCAL_PORT}"
echo ""
echo "Enter password when prompted: M3d1@pl@1"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo ""

# Kill any existing tunnel
pkill -f "ssh.*-R.*${FORWARD_PORT}.*${SERVER_IP}" 2>/dev/null || true
sleep 1

# Start tunnel (will prompt for password)
ssh -R ${FORWARD_PORT}:localhost:${LOCAL_PORT} \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -p ${SERVER_PORT} \
    hades@${SERVER_IP}

echo ""
echo "Tunnel stopped."

