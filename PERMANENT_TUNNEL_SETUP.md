# Permanent SSH Tunnel Setup Guide

## Overview
This guide sets up a permanent SSH tunnel that:
- Auto-starts on boot
- Automatically reconnects if connection drops
- Uses SSH keys (no password needed)
- Runs as a systemd service

## Prerequisites
- Server IP: 151.237.142.106
- Username: ebilling
- Password: M3d1@pl@1
- Local app port: 8080
- Forward port on server: 9000

## Step 1: Server-Side Setup

**On the server (151.237.142.106), run:**

```bash
# Copy the script to the server first, or run commands directly:
sudo bash << 'EOF'
SSHD_CONFIG="/etc/ssh/sshd_config"

# Backup config
cp "$SSHD_CONFIG" "$SSHD_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"

# Configure GatewayPorts (allows binding to all interfaces)
if grep -q "^GatewayPorts" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^GatewayPorts.*/GatewayPorts yes/' "$SSHD_CONFIG"
elif grep -q "^#GatewayPorts" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^#GatewayPorts.*/GatewayPorts yes/' "$SSHD_CONFIG"
else
    echo "GatewayPorts yes" >> "$SSHD_CONFIG"
fi

# Configure AllowTcpForwarding
if grep -q "^AllowTcpForwarding" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^AllowTcpForwarding.*/AllowTcpForwarding yes/' "$SSHD_CONFIG"
elif grep -q "^#AllowTcpForwarding" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^#AllowTcpForwarding.*/AllowTcpForwarding yes/' "$SSHD_CONFIG"
else
    echo "AllowTcpForwarding yes" >> "$SSHD_CONFIG"
fi

# Keep connections alive
if ! grep -q "^ClientAliveInterval" "$SSHD_CONFIG" 2>/dev/null; then
    echo "ClientAliveInterval 60" >> "$SSHD_CONFIG"
    echo "ClientAliveCountMax 3" >> "$SSHD_CONFIG"
fi

# Test config and restart
sshd -t && systemctl restart sshd
echo "✓ SSH configured for permanent forwarding"
EOF

# Allow port in firewall (if using UFW)
sudo ufw allow 9000/tcp

# Or for firewalld:
# sudo firewall-cmd --permanent --add-port=9000/tcp
# sudo firewall-cmd --reload
```

**Or use the script:**
```bash
# Copy script to server first, then:
sudo bash scripts/server_setup_permanent.sh
```

## Step 2: Client-Side Setup (Your Local Machine)

**On your local machine, run:**

```bash
bash scripts/client_setup_permanent.sh
```

This script will:
1. Install `autossh` if needed
2. Generate SSH key if it doesn't exist
3. Copy SSH key to server (no more password!)
4. Create systemd service for auto-start
5. Enable and start the service

## Step 3: Verify

**Check service status:**
```bash
sudo systemctl status reverse-ssh-tunnel
```

**Test the connection:**
```bash
curl -I http://151.237.142.106:9000/
```

**View service logs:**
```bash
sudo journalctl -u reverse-ssh-tunnel -f
```

## Service Management

```bash
# Start tunnel
sudo systemctl start reverse-ssh-tunnel

# Stop tunnel
sudo systemctl stop reverse-ssh-tunnel

# Restart tunnel
sudo systemctl restart reverse-ssh-tunnel

# Enable auto-start on boot
sudo systemctl enable reverse-ssh-tunnel

# Disable auto-start
sudo systemctl disable reverse-ssh-tunnel

# Check status
sudo systemctl status reverse-ssh-tunnel
```

## Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Generate SSH key (if needed):
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
```

### 2. Copy key to server:
```bash
ssh-copy-id -p 22 ebilling@151.237.142.106
# Enter password: M3d1@pl@1
```

### 3. Test key authentication:
```bash
ssh -p 22 ebilling@151.237.142.106
# Should connect without password
```

### 4. Create systemd service:
```bash
sudo nano /etc/systemd/system/reverse-ssh-tunnel.service
```

Paste this content:
```ini
[Unit]
Description=Reverse SSH Tunnel for Vite Dev Server
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
Environment="AUTOSSH_GATETIME=0"
Environment="AUTOSSH_PORT=20000"
ExecStart=/usr/bin/autossh -M 20000 -N \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -o StrictHostKeyChecking=no \
    -i /home/YOUR_USERNAME/.ssh/id_rsa \
    -p 22 \
    -R 9000:localhost:8080 \
    ebilling@151.237.142.106
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Replace `YOUR_USERNAME` with your actual username.

### 5. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable reverse-ssh-tunnel
sudo systemctl start reverse-ssh-tunnel
```

## Troubleshooting

**Connection refused:**
- Check if server SSH is configured correctly
- Verify firewall allows port 9000
- Check server logs: `sudo journalctl -u sshd -f`

**Service won't start:**
- Check logs: `sudo journalctl -u reverse-ssh-tunnel -f`
- Verify SSH key authentication works: `ssh -p 22 ebilling@151.237.142.106`
- Check if port 9000 is available on server

**Tunnel drops:**
- autossh should auto-reconnect
- Check network stability
- Verify ServerAliveInterval settings

## Access Your App

Once set up, your app will always be available at:
- **Public**: http://151.237.142.106:9000
- **Local**: http://localhost:8080

The tunnel will automatically start on boot and reconnect if it drops!

