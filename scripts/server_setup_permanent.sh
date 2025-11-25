#!/usr/bin/env bash
# Server-side setup for permanent SSH forwarding
# Run this ON THE SERVER as root or with sudo

set -e

SSHD_CONFIG="/etc/ssh/sshd_config"
PORT="9000"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Server Setup for Permanent SSH Forwarding"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠ Please run as root or with sudo"
    exit 1
fi

# 1. Backup sshd_config
if [ -f "$SSHD_CONFIG" ]; then
    BACKUP_FILE="${SSHD_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$SSHD_CONFIG" "$BACKUP_FILE"
    echo "✓ Backup created: $BACKUP_FILE"
fi

# 2. Configure GatewayPorts (allows binding to all interfaces)
if grep -q "^GatewayPorts" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^GatewayPorts.*/GatewayPorts yes/' "$SSHD_CONFIG"
    echo "✓ Updated GatewayPorts to yes"
elif grep -q "^#GatewayPorts" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^#GatewayPorts.*/GatewayPorts yes/' "$SSHD_CONFIG"
    echo "✓ Enabled GatewayPorts (was commented)"
else
    echo "GatewayPorts yes" >> "$SSHD_CONFIG"
    echo "✓ Added GatewayPorts yes"
fi

# 3. Configure AllowTcpForwarding
if grep -q "^AllowTcpForwarding" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^AllowTcpForwarding.*/AllowTcpForwarding yes/' "$SSHD_CONFIG"
    echo "✓ Updated AllowTcpForwarding to yes"
elif grep -q "^#AllowTcpForwarding" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^#AllowTcpForwarding.*/AllowTcpForwarding yes/' "$SSHD_CONFIG"
    echo "✓ Enabled AllowTcpForwarding (was commented)"
else
    echo "AllowTcpForwarding yes" >> "$SSHD_CONFIG"
    echo "✓ Added AllowTcpForwarding yes"
fi

# 4. Configure ClientAliveInterval (keep connections alive)
if ! grep -q "^ClientAliveInterval" "$SSHD_CONFIG" 2>/dev/null; then
    echo "ClientAliveInterval 60" >> "$SSHD_CONFIG"
    echo "ClientAliveCountMax 3" >> "$SSHD_CONFIG"
    echo "✓ Added ClientAlive settings"
fi

# 5. Verify configuration
echo ""
echo "Verifying configuration:"
grep -E "^GatewayPorts|^AllowTcpForwarding|^ClientAlive" "$SSHD_CONFIG" | grep -v "^#"

# 6. Test SSH config
echo ""
echo "Testing SSH configuration..."
if sshd -t; then
    echo "✓ SSH configuration is valid"
else
    echo "✗ SSH configuration has errors!"
    exit 1
fi

# 7. Restart SSH service
echo ""
echo "Restarting SSH service..."
if systemctl restart sshd; then
    echo "✓ SSH service restarted successfully"
else
    echo "⚠ Failed to restart SSH - trying alternative method..."
    service ssh restart || service sshd restart || {
        echo "✗ Failed to restart SSH. Please restart manually:"
        echo "  sudo systemctl restart sshd"
        exit 1
    }
fi

# 8. Configure firewall (if UFW is active)
echo ""
echo "Configuring firewall..."
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status | head -1)
    if echo "$UFW_STATUS" | grep -qi "active"; then
        if ufw status | grep -q "$PORT"; then
            echo "✓ Port $PORT is already allowed in UFW"
        else
            ufw allow $PORT/tcp
            echo "✓ Port $PORT allowed in UFW"
        fi
    else
        echo "ℹ UFW is inactive"
    fi
elif command -v firewall-cmd &> /dev/null; then
    if firewall-cmd --list-ports 2>/dev/null | grep -q "$PORT"; then
        echo "✓ Port $PORT is already allowed in firewalld"
    else
        firewall-cmd --permanent --add-port=$PORT/tcp
        firewall-cmd --reload
        echo "✓ Port $PORT allowed in firewalld"
    fi
else
    echo "⚠ No firewall tool found (UFW or firewalld)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Server configuration complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps on your local machine:"
echo "1. Set up SSH key authentication (no password needed)"
echo "2. Install autossh for automatic reconnection"
echo "3. Create systemd service for auto-start on boot"
echo ""
echo "Run the client setup script:"
echo "  bash scripts/client_setup_permanent.sh"

