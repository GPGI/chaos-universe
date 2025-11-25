# Reverse SSH Tunnel Setup

This guide explains how to set up a reverse SSH tunnel to expose your local Vite dev server (localhost:8080) through your server at `151.237.142.106:8080`.

## Overview

```
┌─────────────┐         SSH Reverse Tunnel          ┌─────────────┐
│   Laptop    │  <────────────────────────────────>  │   Server    │
│ localhost:  │                                        │ 151.237.   │
│    8080     │                                        │  106.142:  │
│  (Vite)     │                                        │    8080    │
└─────────────┘                                        └─────────────┘
     ↑                                                        ↑
     │                                                        │
     └────────────────────────────────────────────────────────┘
                    Public Access via Server
```

## Quick Start

### 1. Server Configuration (One-time setup)

**Run on the server** (151.237.142.106) as root:

```bash
# Copy the script to your server
scp scripts/server_configure_ssh.sh user@151.237.142.106:/tmp/

# SSH into the server
ssh user@151.237.142.106

# Run the configuration script
sudo bash /tmp/server_configure_ssh.sh
```

This script will:
- ✅ Configure SSH to allow remote forwarding (`GatewayPorts yes`)
- ✅ Add firewall rules for port 8080
- ✅ Restart SSH service
- ✅ Create backup of sshd_config

### 2. Client Setup (On Your Laptop)

**Automatic setup** (recommended):

```bash
bash scripts/setup_reverse_ssh.sh
```

**Manual setup**:

```bash
# Install autossh (if not installed)
sudo apt-get install autossh  # Ubuntu/Debian
# or
brew install autossh  # macOS

# Start tunnel manually
autossh -M 20000 -N \
  -o ServerAliveInterval=60 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -o StrictHostKeyChecking=no \
  -p 22 \
  -R 8080:localhost:8080 \
  user@151.237.142.106
```

### 3. Verify

Once the tunnel is running, your Vite dev server will be accessible at:

**🌐 http://151.237.142.106:8080**

Test it:
```bash
curl http://151.237.142.106:8080
```

## Configuration

### Environment Variables

You can customize the connection using environment variables:

```bash
export SSH_USER="your_username"
export SSH_KEY="$HOME/.ssh/id_rsa"
bash scripts/setup_reverse_ssh.sh
```

### Default Values

- **Server IP**: `151.237.142.106`
- **Server SSH Port**: `22`
- **Server Forward Port**: `8080`
- **Local Port**: `8080`
- **SSH User**: Current user (`$USER`)
- **SSH Key**: `~/.ssh/id_rsa`

## Managing the Tunnel

### Start Tunnel

```bash
bash scripts/setup_reverse_ssh.sh
```

### Stop Tunnel

```bash
bash scripts/stop_reverse_ssh.sh
```

### Check Tunnel Status

```bash
ps aux | grep autossh
```

### View Logs

```bash
tail -f ~/.reverse_ssh_tunnel/tunnel.log
```

## Auto-Start on Boot (Systemd Service)

To automatically start the tunnel when your laptop boots:

### 1. Install the systemd service

```bash
# Edit the service file to set your username
sed "s/%USER%/$USER/g" scripts/reverse-ssh-tunnel.service > /tmp/reverse-ssh-tunnel.service

# Copy to systemd directory
sudo cp /tmp/reverse-ssh-tunnel.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable the service
sudo systemctl enable reverse-ssh-tunnel.service

# Start the service
sudo systemctl start reverse-ssh-tunnel.service

# Check status
sudo systemctl status reverse-ssh-tunnel.service
```

### 2. Service Management

```bash
# Start
sudo systemctl start reverse-ssh-tunnel

# Stop
sudo systemctl stop reverse-ssh-tunnel

# Restart
sudo systemctl restart reverse-ssh-tunnel

# View logs
sudo journalctl -u reverse-ssh-tunnel -f

# Disable auto-start
sudo systemctl disable reverse-ssh-tunnel
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to server

**Solutions**:
1. Verify server is accessible:
   ```bash
   ping 151.237.142.106
   ssh user@151.237.142.106
   ```

2. Check SSH key is copied:
   ```bash
   ssh-copy-id -i ~/.ssh/id_rsa.pub user@151.237.142.106
   ```

3. Verify SSH port:
   ```bash
   ssh -p 22 user@151.237.142.106
   ```

### Tunnel Not Working

**Problem**: Tunnel starts but port is not accessible

**Solutions**:
1. Check server SSH configuration:
   ```bash
   # On server
   grep GatewayPorts /etc/ssh/sshd_config
   # Should show: GatewayPorts yes
   ```

2. Check firewall on server:
   ```bash
   # On server
   sudo ufw status
   # Should show port 8080 allowed
   ```

3. Verify Vite is running locally:
   ```bash
   curl http://localhost:8080
   ```

4. Check tunnel is actually running:
   ```bash
   ps aux | grep autossh
   ```

### Port Already in Use

**Problem**: Port 8080 is already in use

**Solutions**:
1. Kill existing tunnel:
   ```bash
   bash scripts/stop_reverse_ssh.sh
   ```

2. Change local port (edit script):
   ```bash
   # Edit scripts/setup_reverse_ssh.sh
   LOCAL_PORT="3000"  # Use different port
   ```

3. Kill process on port:
   ```bash
   lsof -ti :8080 | xargs kill -9
   ```

### SSH Key Issues

**Problem**: Permission denied (publickey)

**Solutions**:
1. Generate SSH key:
   ```bash
   ssh-keygen -t rsa -b 4096
   ```

2. Copy public key to server:
   ```bash
   ssh-copy-id -i ~/.ssh/id_rsa.pub user@151.237.142.106
   ```

3. Test connection:
   ```bash
   ssh user@151.237.142.106
   ```

### Server SSH Configuration

**Problem**: Remote forwarding not working

**Check on server**:
```bash
# View SSH config
sudo grep -E "GatewayPorts|AllowTcpForwarding" /etc/ssh/sshd_config

# Should show:
# GatewayPorts yes
# AllowTcpForwarding yes

# Restart SSH if needed
sudo systemctl restart sshd
```

### Firewall Issues

**On server**, check firewall:

```bash
# UFW (Ubuntu/Debian)
sudo ufw status
sudo ufw allow 8080/tcp

# firewalld (CentOS/RHEL)
sudo firewall-cmd --list-ports
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# iptables
sudo iptables -L -n | grep 8080
```

## Security Considerations

1. **SSH Keys**: Always use SSH keys instead of passwords
2. **Firewall**: Only open necessary ports
3. **Access Control**: Consider restricting which IPs can connect
4. **Monitoring**: Monitor SSH logs for unauthorized access

## Advanced Usage

### Multiple Tunnels

To tunnel multiple ports:

```bash
autossh -M 20000 -N \
  -R 8080:localhost:8080 \
  -R 5001:localhost:5001 \
  user@151.237.142.106
```

### Persistent Connection

The autossh tool automatically reconnects if the connection drops. Monitor port 20000 is used for connection monitoring.

### Custom SSH Config

Add to `~/.ssh/config`:

```
Host reverse-tunnel
    HostName 151.237.142.106
    User your_username
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then use:
```bash
autossh -M 20000 -N -R 8080:localhost:8080 reverse-tunnel
```

## Scripts Reference

- **`scripts/setup_reverse_ssh.sh`**: Client-side setup script
- **`scripts/stop_reverse_ssh.sh`**: Stop the tunnel
- **`scripts/server_configure_ssh.sh`**: Server-side configuration (run once)
- **`scripts/reverse-ssh-tunnel.service`**: Systemd service file for auto-start

## Support

For issues or questions:
1. Check logs: `~/.reverse_ssh_tunnel/tunnel.log`
2. Verify server configuration
3. Test SSH connection manually
4. Check firewall rules

