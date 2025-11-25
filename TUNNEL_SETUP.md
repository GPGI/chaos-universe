# SSH Tunnel Setup Guide

## Current Setup
- **Local App**: http://localhost:8080 (Vite dev server)
- **Server**: 151.237.142.106
- **Username**: ebilling
- **Password**: M3d1@pl@1

## Issue
Port 8080 on the server is already in use by an Express app, so we need to either:
1. Kill the app on port 8080 on the server
2. Use a different port for forwarding

## Solution 1: Free Port 8080 on Server

**On the server, run:**
```bash
# Check what's using port 8080
sudo lsof -i :8080

# Kill the process (replace <PID> with actual process ID)
sudo kill -9 <PID>
```

**Then from your local machine:**
```bash
ssh -R 8080:localhost:8080 -p 22 ebilling@151.237.142.106
```

## Solution 2: Use Different Port (Easier)

**From your local machine:**
```bash
# Use port 9000 on server, forward to localhost:8080
ssh -R 9000:localhost:8080 -p 22 ebilling@151.237.142.106
```

Then access your app at: **http://151.237.142.106:9000**

## Manual Connection Steps

1. **Stop any background tunnels:**
   ```bash
   pkill -f 'ssh.*-R.*ebilling'
   ```

2. **Connect manually (enter password when prompted):**
   ```bash
   ssh -R 9000:localhost:8080 -p 22 ebilling@151.237.142.106
   ```
   Password: `M3d1@pl@1`

3. **Keep that terminal open** - the tunnel runs while connected

4. **Test in a new terminal:**
   ```bash
   curl -I http://151.237.142.106:9000/
   ```

5. **Access your app:**
   Open browser: http://151.237.142.106:9000

## Quick Script

Use the simple script:
```bash
bash scripts/start_tunnel_simple.sh
```

This tries to start on port 9000 automatically.

