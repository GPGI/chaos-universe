#!/usr/bin/env bash
# Manual SSH tunnel connection - keeps terminal open

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SSH Tunnel Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This will connect to the server and create a reverse tunnel:"
echo "  Server:8080 → localhost:8080"
echo ""
echo "IMPORTANT: Keep this terminal open! The tunnel runs while connected."
echo "           Press Ctrl+C to stop the tunnel."
echo ""
echo "If port 8080 is in use on the server, you'll see a warning."
echo "In that case, use a different port (see alternatives below)."
echo ""
read -p "Press Enter to connect... (or Ctrl+C to cancel)"

# Try port 8080 first
echo ""
echo "Attempting connection with port 8080..."
echo "Password: M3d1@pl@1"
echo ""

ssh -R 8080:localhost:8080 \
    -p 22 \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    ebilling@151.237.142.106

echo ""
echo "Tunnel disconnected."

