#!/usr/bin/env bash
# Script to run ON THE SERVER to fix port 8080 forwarding
# Run this on the server: bash fix_server_port.sh

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Server Port 8080 Fix Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PORT="8080"

# Check what's using port 8080
echo "1. Checking what's using port $PORT..."
if command -v lsof &> /dev/null; then
    lsof -i :$PORT 2>/dev/null || echo "   Port $PORT is not in use"
elif command -v netstat &> /dev/null; then
    netstat -tlnp | grep :$PORT || echo "   Port $PORT is not in use"
elif command -v ss &> /dev/null; then
    ss -tlnp | grep :$PORT || echo "   Port $PORT is not in use"
fi

echo ""

# Check SSH config for GatewayPorts
echo "2. Checking SSH configuration..."
SSHD_CONFIG="/etc/ssh/sshd_config"

if [ -f "$SSHD_CONFIG" ]; then
    if grep -q "GatewayPorts" "$SSHD_CONFIG"; then
        echo "   Current GatewayPorts setting:"
        grep "GatewayPorts" "$SSHD_CONFIG" | grep -v "^#"
    else
        echo "   GatewayPorts not set (will use default)"
    fi
    
    if grep -q "AllowTcpForwarding" "$SSHD_CONFIG"; then
        echo "   Current AllowTcpForwarding setting:"
        grep "AllowTcpForwarding" "$SSHD_CONFIG" | grep -v "^#"
    else
        echo "   AllowTcpForwarding not set (will use default: yes)"
    fi
fi

echo ""

# Check firewall
echo "3. Checking firewall..."
if command -v ufw &> /dev/null; then
    ufw status | grep $PORT || echo "   Port $PORT not explicitly allowed/denied in UFW"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --list-ports 2>/dev/null | grep $PORT || echo "   Port $PORT not explicitly allowed in firewalld"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Recommendations:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If port 8080 is in use, you can:"
echo "  1. Kill the process using: sudo kill -9 <PID>"
echo "  2. Or use a different port: ssh -R 8081:localhost:8080 -p 22 ebilling@151.237.142.106"
echo ""
echo "To allow remote forwarding in SSH, run (as root):"
echo "  sudo bash scripts/server_configure_ssh.sh"
echo ""
echo "Or manually configure /etc/ssh/sshd_config:"
echo "  GatewayPorts yes"
echo "  AllowTcpForwarding yes"
echo "Then restart SSH: sudo systemctl restart sshd"

