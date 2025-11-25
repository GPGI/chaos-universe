#!/usr/bin/env bash
# Commands to run ON THE SERVER (151.237.142.106)
# Copy and paste these commands into your server terminal

cat << 'EOF'
# ============================================================
# SERVER CONFIGURATION - Run these commands ON THE SERVER
# ============================================================
# Connect to server first: ssh -p 22 ebilling@151.237.142.106
# Then run these commands:

sudo bash << 'SERVER_EOF'
SSHD_CONFIG="/etc/ssh/sshd_config"
PORT="9000"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Configuring Server for SSH Forwarding"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backup config
BACKUP_FILE="${SSHD_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SSHD_CONFIG" "$BACKUP_FILE"
echo "✓ Backup: $BACKUP_FILE"

# Configure GatewayPorts (allows binding to all interfaces)
if grep -q "^GatewayPorts" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^GatewayPorts.*/GatewayPorts yes/' "$SSHD_CONFIG"
    echo "✓ Updated GatewayPorts to yes"
elif grep -q "^#GatewayPorts" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^#GatewayPorts.*/GatewayPorts yes/' "$SSHD_CONFIG"
    echo "✓ Enabled GatewayPorts"
else
    echo "GatewayPorts yes" >> "$SSHD_CONFIG"
    echo "✓ Added GatewayPorts yes"
fi

# Configure AllowTcpForwarding
if grep -q "^AllowTcpForwarding" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^AllowTcpForwarding.*/AllowTcpForwarding yes/' "$SSHD_CONFIG"
    echo "✓ Updated AllowTcpForwarding to yes"
elif grep -q "^#AllowTcpForwarding" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^#AllowTcpForwarding.*/AllowTcpForwarding yes/' "$SSHD_CONFIG"
    echo "✓ Enabled AllowTcpForwarding"
else
    echo "AllowTcpForwarding yes" >> "$SSHD_CONFIG"
    echo "✓ Added AllowTcpForwarding yes"
fi

# Keep connections alive
if ! grep -q "^ClientAliveInterval" "$SSHD_CONFIG" 2>/dev/null; then
    echo "ClientAliveInterval 60" >> "$SSHD_CONFIG"
    echo "ClientAliveCountMax 3" >> "$SSHD_CONFIG"
    echo "✓ Added connection keep-alive settings"
fi

# Verify configuration
echo ""
echo "Current configuration:"
grep -E "^GatewayPorts|^AllowTcpForwarding|^ClientAlive" "$SSHD_CONFIG" | grep -v "^#"

# Test SSH config
echo ""
if sshd -t; then
    echo "✓ SSH configuration is valid"
else
    echo "✗ SSH configuration has errors!"
    exit 1
fi

# Restart SSH service
echo ""
echo "Restarting SSH service..."
if systemctl restart sshd; then
    echo "✓ SSH service restarted"
else
    service ssh restart || service sshd restart || {
        echo "⚠ Please restart SSH manually: sudo systemctl restart sshd"
    }
fi

# Configure firewall
echo ""
echo "Configuring firewall..."
if command -v ufw &> /dev/null && ufw status | grep -qi "active"; then
    ufw allow $PORT/tcp >/dev/null 2>&1
    echo "✓ Port $PORT allowed in UFW"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=$PORT/tcp >/dev/null 2>&1
    firewall-cmd --reload >/dev/null 2>&1
    echo "✓ Port $PORT allowed in firewalld"
else
    echo "⚠ No firewall detected (or inactive)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Server configured successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SERVER_EOF

EOF

