#!/usr/bin/env bash
# Client-side setup for permanent SSH tunnel
# Run this on your LOCAL MACHINE

set -e

SERVER_IP="151.237.142.106"
SERVER_PORT="22"
SSH_USER="ebilling"
FORWARD_PORT="9000"
LOCAL_PORT="8080"
PASSWORD="M3d1@pl@1"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Client Setup for Permanent SSH Tunnel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Install autossh if not available
echo "Step 1: Installing autossh..."
if ! command -v autossh &> /dev/null; then
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update -qq
            sudo DEBIAN_FRONTEND=noninteractive apt-get install -y autossh sshpass >/dev/null 2>&1
        elif command -v yum &> /dev/null; then
            sudo yum install -y autossh sshpass >/dev/null 2>&1
        elif command -v pacman &> /dev/null; then
            sudo pacman -S --noconfirm autossh sshpass >/dev/null 2>&1
        fi
    fi
fi

if command -v autossh &> /dev/null; then
    echo "✓ autossh is installed"
else
    echo "⚠ autossh not installed. Please install manually:"
    echo "  sudo apt-get install autossh"
    exit 1
fi

# Step 2: Generate SSH key if it doesn't exist
echo ""
echo "Step 2: Setting up SSH key authentication..."
SSH_KEY="$HOME/.ssh/id_rsa"
if [ ! -f "$SSH_KEY" ]; then
    echo "Generating SSH key..."
    ssh-keygen -t rsa -b 4096 -f "$SSH_KEY" -N "" -q
    echo "✓ SSH key generated"
fi

# Step 3: Copy SSH key to server
echo ""
echo "Step 3: Copying SSH key to server..."
echo "Enter password when prompted: $PASSWORD"

if command -v sshpass &> /dev/null; then
    SSHPASS="$PASSWORD" sshpass -e ssh-copy-id \
        -o StrictHostKeyChecking=no \
        -p "$SERVER_PORT" \
        "${SSH_USER}@${SERVER_IP}" 2>&1 | grep -v "attempting\|successfully" || true
else
    ssh-copy-id -o StrictHostKeyChecking=no -p "$SERVER_PORT" "${SSH_USER}@${SERVER_IP}"
fi

# Test key authentication
echo "Testing SSH key authentication..."
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -i "$SSH_KEY" -p "$SERVER_PORT" "${SSH_USER}@${SERVER_IP}" "echo 'Key auth successful'" 2>&1 | grep -q "successful"; then
    echo "✓ SSH key authentication working"
else
    echo "⚠ SSH key authentication may not be working"
    echo "You may need to copy the key manually:"
    echo "  cat ~/.ssh/id_rsa.pub | ssh -p $SERVER_PORT $SSH_USER@$SERVER_IP 'cat >> ~/.ssh/authorized_keys'"
fi

# Step 4: Create systemd service for auto-start
echo ""
echo "Step 4: Creating systemd service..."

SERVICE_FILE="/etc/systemd/system/reverse-ssh-tunnel.service"
SERVICE_USER="$USER"
AUTOSSH_PATH=$(which autossh)
SSH_PATH=$(which ssh)

sudo bash << EOF
cat > $SERVICE_FILE << SERVICE_EOF
[Unit]
Description=Reverse SSH Tunnel for Vite Dev Server
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Environment="AUTOSSH_GATETIME=0"
Environment="AUTOSSH_PORT=20000"
ExecStart=$AUTOSSH_PATH -M 20000 -N \\
    -o ServerAliveInterval=60 \\
    -o ServerAliveCountMax=3 \\
    -o ExitOnForwardFailure=yes \\
    -o StrictHostKeyChecking=no \\
    -o UserKnownHostsFile=/dev/null \\
    -i $SSH_KEY \\
    -p $SERVER_PORT \\
    -R ${FORWARD_PORT}:localhost:${LOCAL_PORT} \\
    ${SSH_USER}@${SERVER_IP}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_EOF

echo "✓ Systemd service file created"
EOF

# Step 5: Enable and start the service
echo ""
echo "Step 5: Enabling and starting the service..."
sudo systemctl daemon-reload
sudo systemctl enable reverse-ssh-tunnel.service
sudo systemctl start reverse-ssh-tunnel.service

sleep 3

if sudo systemctl is-active --quiet reverse-ssh-tunnel.service; then
    echo "✓ Service is running"
else
    echo "⚠ Service may not be running. Check status:"
    echo "  sudo systemctl status reverse-ssh-tunnel.service"
fi

# Step 6: Test the connection
echo ""
echo "Step 6: Testing connection..."
sleep 3
if curl -s -I --max-time 5 "http://${SERVER_IP}:${FORWARD_PORT}/" 2>&1 | head -1 | grep -q "200\|HTTP"; then
    echo "✓ Connection successful!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Tunnel is now permanent and will auto-start on boot!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Your app is accessible at:"
    echo "  🌐 http://${SERVER_IP}:${FORWARD_PORT}"
    echo ""
    echo "Service commands:"
    echo "  sudo systemctl status reverse-ssh-tunnel  # Check status"
    echo "  sudo systemctl stop reverse-ssh-tunnel     # Stop tunnel"
    echo "  sudo systemctl start reverse-ssh-tunnel    # Start tunnel"
    echo "  sudo systemctl restart reverse-ssh-tunnel  # Restart tunnel"
    echo ""
else
    echo "⚠ Connection test failed"
    echo "Check service logs: sudo journalctl -u reverse-ssh-tunnel -f"
fi

