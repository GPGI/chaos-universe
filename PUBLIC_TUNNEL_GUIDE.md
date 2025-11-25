# 🌐 Public Tunnel Solutions - Make Your App Public!

This guide provides **multiple alternatives** to SSH tunneling to make your local app publicly accessible.

## Quick Start (Recommended)

**Use Cloudflare Tunnel - No signup required!**
```bash
bash scripts/start_tunnel.sh 8080 cloudflare
```

## Available Solutions

### 1. ☁️ Cloudflare Tunnel (Recommended - FREE, No Signup)

**Pros:**
- ✅ Free forever
- ✅ No account/signup needed
- ✅ Fast and reliable
- ✅ HTTPS by default
- ✅ No port limitations

**Start:**
```bash
bash scripts/start_tunnel.sh 8080 cloudflare
# or
bash scripts/setup_cloudflare.sh
```

**Get URL from logs:**
```bash
cat ~/.tunnel-logs/cloudflared.log | grep -o 'https://[^.]*\.trycloudflare\.com'
```

---

### 2. 🔷 ngrok (Popular - Requires Free Signup)

**Pros:**
- ✅ Very popular
- ✅ Custom domains (paid)
- ✅ Web dashboard
- ✅ Request inspection

**Cons:**
- ❌ Requires free signup
- ❌ Free tier has limitations

**Setup:**
1. Sign up: https://dashboard.ngrok.com/signup
2. Get authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
3. Run:
```bash
ngrok config add-authtoken YOUR_TOKEN
bash scripts/start_tunnel.sh 8080 ngrok
```

**Web Interface:** http://localhost:4040

---

### 3. 🔶 localtonet (Simple Alternative)

**Pros:**
- ✅ Simple setup
- ✅ No signup required

**Start:**
```bash
bash scripts/start_tunnel.sh 8080 localtonet
```

---

### 4. 📦 localtunnel (npm-based)

**Pros:**
- ✅ No installation (uses npx)
- ✅ No signup required
- ✅ Already have Node.js

**Start:**
```bash
bash scripts/start_tunnel.sh 8080 localtunnel
```

---

### 5. 🔐 SSH Tunnel (Your Original Method)

**Start:**
```bash
bash scripts/start_tunnel.sh 8080 ssh
```

**Note:** Requires server configuration (see `PERMANENT_TUNNEL_SETUP.md`)

---

## Unified Command

Use the main script to choose your tunnel:

```bash
bash scripts/start_tunnel.sh [PORT] [TUNNEL_TYPE]
```

**Examples:**
```bash
# Use Cloudflare (default)
bash scripts/start_tunnel.sh 8080 cloudflare

# Use ngrok
bash scripts/start_tunnel.sh 8080 ngrok

# Use localtunnel
bash scripts/start_tunnel.sh 8080 localtunnel

# Different port
bash scripts/start_tunnel.sh 3000 cloudflare
```

**If no arguments provided, shows all options:**
```bash
bash scripts/start_tunnel.sh
```

---

## Checking Your Tunnel

**Get public URL from logs:**
```bash
# Cloudflare
cat ~/.tunnel-logs/cloudflared.log | grep -o 'https://[^.]*\.trycloudflare\.com'

# ngrok
curl http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok[^"]*'

# localtunnel
cat ~/.tunnel-logs/localtunnel.log | grep -oE 'https://[^[:space:]]+loca\.lt[^[:space:]]*'
```

**Test your tunnel:**
```bash
curl -I YOUR_PUBLIC_URL
```

**Check if tunnel is running:**
```bash
# Cloudflare
ps aux | grep cloudflared

# ngrok
ps aux | grep ngrok

# localtunnel
ps aux | grep localtunnel
```

---

## Stopping Tunnels

**Stop all tunnels:**
```bash
pkill -f cloudflared
pkill -f ngrok
pkill -f localtunnel
pkill -f localtonet
pkill -f autossh
```

**Stop specific tunnel:**
```bash
# Cloudflare
pkill -f 'cloudflared.*8080'

# ngrok
pkill -f 'ngrok.*8080'

# localtunnel
pkill -f 'localtunnel.*8080'
```

---

## Recommendations

### For Quick Testing
→ **Cloudflare Tunnel** (no setup needed)

### For Production-like Testing
→ **ngrok** (has dashboard, request inspection)

### If Already Using npm
→ **localtunnel** (no installation)

### For Permanent Setup
→ **SSH Tunnel** (most control, but requires server config)

---

## Troubleshooting

### "Connection refused" or "Cannot GET /"
- Make sure your local dev server is running on port 8080
- Check: `curl http://localhost:8080/`
- Start your app: `npm run dev`

### Tunnel won't start
- Check logs: `cat ~/.tunnel-logs/[tunnel-type].log`
- Make sure port 8080 is not in use: `lsof -i :8080`
- Try a different tunnel type

### URL not showing in logs
- Wait a few seconds for tunnel to establish
- Check process is running: `ps aux | grep [tunnel-type]`
- Some tunnels show URL on stderr, check both log and terminal output

### Multiple tunnels conflict
- Only run one tunnel at a time per port
- Stop existing tunnels before starting new one

---

## Comparison Table

| Solution | Free | Signup | Setup Time | Reliability | Custom Domain |
|----------|------|--------|------------|-------------|---------------|
| Cloudflare | ✅ | ❌ | ⚡ Instant | ⭐⭐⭐⭐⭐ | ❌ |
| ngrok | ✅* | ✅ | ⚡ 2 min | ⭐⭐⭐⭐⭐ | ✅ (paid) |
| localtonet | ✅ | ❌ | ⚡ Instant | ⭐⭐⭐⭐ | ❌ |
| localtunnel | ✅ | ❌ | ⚡ Instant | ⭐⭐⭐ | ❌ |
| SSH Tunnel | ✅ | ✅** | 🐌 10 min | ⭐⭐⭐⭐⭐ | ✅ |

*Free tier with limitations  
**Requires server access

---

## Quick Reference

```bash
# Start tunnel (Cloudflare - recommended)
bash scripts/start_tunnel.sh

# Check status
ps aux | grep cloudflared

# View logs
cat ~/.tunnel-logs/cloudflared.log

# Stop tunnel
pkill -f cloudflared

# Get public URL
cat ~/.tunnel-logs/cloudflared.log | grep -o 'https://[^.]*\.trycloudflare\.com'
```

Your app is now accessible from anywhere in the world! 🌍

