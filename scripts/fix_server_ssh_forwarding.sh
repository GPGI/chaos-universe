#!/usr/bin/env bash
# Script to fix SSH remote forwarding on the server
# Run this ON THE SERVER (ebilling@151.237.142.106) with: sudo bash fix_server_ssh_forwarding.sh

set -e

PORT="8080"
SSHD_CONFIG="/etc/ssh/sshd_config"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SSH Remote Forwarding Fix Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Check what's using port 8080
echo "Step 1: Checking what's using port $PORT..."
if sudo lsof -i :$PORT 2>/dev/null; then
    echo "⚠ Port $PORT is in use!"
    echo "   PID and process:"
    sudo lsof -i :$PORT | tail -n +2
    echo ""
    read -p "Do you want to kill the process using port $PORT? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        PID=$(sudo lsof -t -i :$PORT 2>/dev/null | head -1)
        if [ -n "$PID" ]; then
            echo "Killing process $PID..."
            sudo kill -9 $PID
            sleep 1
            echo "✓ Process killed"
        fi
    else
        echo "⚠ Port $PORT is still in use. You may need to use a different port."
    fi
elif sudo netstat -tlnp 2>/dev/null | grep :$PORT; then
    echo "⚠ Port $PORT is in use (netstat)"
    sudo netstat -tlnp | grep :$PORT
elif sudo ss -tlnp 2>/dev/null | grep :$PORT; then
    echo "⚠ Port $PORT is in use (ss)"
    sudo ss -tlnp | grep :$PORT
else
    echo "✓ Port $PORT is available"
fi

echo ""

# Step 2: Configure SSH for remote forwarding
echo "Step 2: Configuring SSH for remote forwarding..."

# Backup config
if [ -f "$SSHD_CONFIG" ]; then
    BACKUP_FILE="${SSHD_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    sudo cp "$SSHD_CONFIG" "$BACKUP_FILE"
    echo "✓ Backup created: $BACKUP_FILE"
fi

# Configure GatewayPorts
if grep -q "^GatewayPorts" "$SSHD_CONFIG" 2>/dev/null; then
    sudo sed -i 's/^GatewayPorts.*/GatewayPorts yes/' "$SSHD_CONFIG"
    echo "✓ Updated GatewayPorts to yes"
elif grep -q "^#GatewayPorts" "$SSHD_CONFIG" 2>/dev/null; then
    sudo sed -i 's/^#GatewayPorts.*/GatewayPorts yes/' "$SSHD_CONFIG"
    echo "✓ Enabled GatewayPorts (was commented)"
else
    echo "GatewayPorts yes" | sudo tee -a "$SSHD_CONFIG" > /dev/null
    echo "✓ Added GatewayPorts yes"
fi

# Configure AllowTcpForwarding
if grep -q "^AllowTcpForwarding" "$SSHD_CONFIG" 2>/dev/null; then
    sudo sed -i 's/^AllowTcpForwarding.*/AllowTcpForwarding yes/' "$SSHD_CONFIG"
    echo "✓ Updated AllowTcpForwarding to yes"
elif grep -q "^#AllowTcpForwarding" "$SSHD_CONFIG" 2>/dev/null; then
    sudo sed -i 's/^#AllowTcpForwarding.*/AllowTcpForwarding yes/' "$SSHD_CONFIG"
    echo "✓ Enabled AllowTcpForwarding (was commented)"
else
    echo "AllowTcpForwarding yes" | sudo tee -a "$SSHD_CONFIG" > /dev/null
    echo "✓ Added AllowTcpForwarding yes"
fi

# Verify changes
echo ""
echo "Verifying SSH configuration:"
grep -E "^GatewayPorts|^AllowTcpForwarding" "$SSHD_CONFIG" | grep -v "^#" || echo "Settings not found (will use defaults)"

echo ""

# Step 3: Restart SSH
echo "Step 3: Restarting SSH service..."
if sudo systemctl restart sshd; then
    echo "✓ SSH service restarted"
else
    echo "⚠ Failed to restart SSH - trying alternative method..."
    sudo service ssh restart || sudo service sshd restart || echo "⚠ Please restart SSH manually: sudo systemctl restart sshd"
fi

echo ""

# Step 4: Check firewall
echo "Step 4: Checking firewall..."
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status | head -1)
    echo "UFW status: $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -qi "active"; then
        if sudo ufw status | grep -q "$PORT"; then
            echo "✓ Port $PORT is already configured in UFW"
        else
            echo "⚠ Port $PORT not explicitly allowed in UFW"
            read -p "Do you want to allow port $PORT in UFW? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                sudo ufw allow $PORT/tcp
                echo "✓ Port $PORT allowed in UFW"
            fi
        fi
    else
        echo "✓ UFW is inactive"
    fi
elif command -v firewall-cmd &> /dev/null; then
    if sudo firewall-cmd --list-ports 2>/dev/null | grep -q "$PORT"; then
        echo "✓ Port $PORT is allowed in firewalld"
    else
        echo "⚠ Port $PORT not explicitly allowed in firewalld"
        read -p "Do you want to allow port $PORT in firewalld? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo firewall-cmd --permanent --add-port=$PORT/tcp
            sudo firewall-cmd --reload
            echo "✓ Port $PORT allowed in firewalld"
        fi
    fi
else
    echo "⚠ No firewall tool found (UFW or firewalld)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Configuration complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Exit this server session: exit"
echo "2. From your local machine, connect with tunnel:"
echo "   ssh -R 8080:localhost:8080 -p 22 ebilling@151.237.142.106"
echo ""
echo "Your Vite dev server will be accessible at:"
echo "  http://151.237.142.106:8080"

