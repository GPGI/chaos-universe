# Quick Start - Make Your App Public NOW

## Step 1: Configure Server (Run on 151.237.142.106)

**SSH into the server:**
```bash
ssh -p 22 ebilling@151.237.142.106
# Password: M3d1@pl@1
```

**Then run these commands on the server:**
```bash
sudo bash << 'EOF'
SSHD_CONFIG="/etc/ssh/sshd_config"
PORT="9000"

# Backup
cp "$SSHD_CONFIG" "${SSHD_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Enable GatewayPorts
if grep -q "^GatewayPorts" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^GatewayPorts.*/GatewayPorts yes/' "$SSHD_CONFIG"
elif grep -q "^#GatewayPorts" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^#GatewayPorts.*/GatewayPorts yes/' "$SSHD_CONFIG"
else
    echo "GatewayPorts yes" >> "$SSHD_CONFIG"
fi

# Enable AllowTcpForwarding
if grep -q "^AllowTcpForwarding" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^AllowTcpForwarding.*/AllowTcpForwarding yes/' "$SSHD_CONFIG"
elif grep -q "^#AllowTcpForwarding" "$SSHD_CONFIG" 2>/dev/null; then
    sed -i 's/^#AllowTcpForwarding.*/AllowTcpForwarding yes/' "$SSHD_CONFIG"
else
    echo "AllowTcpForwarding yes" >> "$SSHD_CONFIG"
fi

# Keep alive
if ! grep -q "^ClientAliveInterval" "$SSHD_CONFIG" 2>/dev/null; then
    echo "ClientAliveInterval 60" >> "$SSHD_CONFIG"
    echo "ClientAliveCountMax 3" >> "$SSHD_CONFIG"
fi

# Restart SSH
sshd -t && systemctl restart sshd

# Allow port in firewall
ufw allow 9000/tcp 2>/dev/null || firewall-cmd --permanent --add-port=9000/tcp && firewall-cmd --reload 2>/dev/null || true

echo "✅ Server configured!"
EOF
```

## Step 2: Start Tunnel (Run on Your Local Machine)

**Option A: Quick Start (Background)**
```bash
cd /home/hades/Videos/octavia-nebula-core
autossh -M 20000 -N -f \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -o StrictHostKeyChecking=no \
    -i ~/.ssh/id_rsa \
    -p 22 \
    -R 9000:localhost:8080 \
    ebilling@151.237.142.106
```

**Option B: Use the Script**
```bash
bash scripts/start_permanent_tunnel.sh
```

**Option C: Manual (Keep Terminal Open)**
```bash
ssh -R 9000:localhost:8080 -p 22 -i ~/.ssh/id_rsa ebilling@151.237.142.106
```

## Step 3: Test

```bash
curl -I http://151.237.142.106:9000/
```

Should see: `HTTP/1.1 200 OK`

## Your App is Now Public! 🎉

**URL:** http://151.237.142.106:9000

## Make It Permanent (Auto-Start on Boot)

After verifying it works, set up systemd service:

```bash
sudo bash scripts/client_setup_permanent.sh
```

Or create service manually:
```bash
sudo nano /etc/systemd/system/reverse-ssh-tunnel.service
```

Paste:
```ini
[Unit]
Description=Reverse SSH Tunnel
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/bin/autossh -M 20000 -N \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -o StrictHostKeyChecking=no \
    -i /home/$USER/.ssh/id_rsa \
    -p 22 \
    -R 9000:localhost:8080 \
    ebilling@151.237.142.106
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable reverse-ssh-tunnel
sudo systemctl start reverse-ssh-tunnel
```

## Troubleshooting

**If tunnel won't start:**
1. Check if server is configured (run Step 1)
2. Verify SSH key auth: `ssh -p 22 ebilling@151.237.142.106`
3. Check if port 9000 is available on server: `sudo lsof -i :9000`
4. Check logs: `cat ~/.ssh-tunnel-logs/tunnel.log`

**If "Cannot GET /":**
- Make sure your Vite dev server is running on `localhost:8080`
- Check tunnel is running: `ps aux | grep autossh`

**If connection drops:**
- Use `autossh` (auto-reconnects)
- Or set up systemd service (auto-restarts)

