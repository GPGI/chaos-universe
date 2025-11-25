#!/usr/bin/env bash
# Verify SSH Tunnel Status

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SSH Tunnel Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if tunnel process is running
if ps aux | grep -q "[s]sh.*-R.*8080"; then
    echo "✓ SSH tunnel process is running"
    ps aux | grep "[s]sh.*-R.*8080" | head -1
else
    echo "✗ No SSH tunnel process found"
fi

echo ""

# Check local server
echo "Local Vite server status:"
if curl -s -I http://localhost:8080/ | head -1 | grep -q "200"; then
    echo "✓ Local server is running on port 8080"
else
    echo "✗ Local server not responding on port 8080"
fi

echo ""

# Check public URL
echo "Public URL status:"
PUBLIC_RESPONSE=$(curl -s -I http://151.237.142.106:8080/ 2>&1 | head -1)
echo "Response: $PUBLIC_RESPONSE"

if echo "$PUBLIC_RESPONSE" | grep -q "200\|html"; then
    echo "✓ Public URL is accessible!"
else
    echo "✗ Public URL not working - tunnel may not be forwarding correctly"
    echo ""
    echo "To fix, you may need to:"
    echo "1. Run the server configuration script on the server:"
    echo "   bash scripts/server_configure_ssh.sh"
    echo "2. Make sure the server allows remote port forwarding in sshd_config"
    echo "3. Check if port 8080 is available on the server"
fi

echo ""
echo "To manually start the tunnel:"
echo "  ssh -R 8080:localhost:8080 -p 22 hades@151.237.142.106"
echo ""
echo "Or with password:"
echo "  SSHPASS='M3d1@pl@1' sshpass -e ssh -R 8080:localhost:8080 -p 22 hades@151.237.142.106"

