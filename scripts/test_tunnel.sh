#!/usr/bin/env bash
# Test SSH tunnel forwarding

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing SSH Tunnel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1. Testing local server:"
LOCAL_RESPONSE=$(curl -s -I http://localhost:8080/ | head -1)
echo "   $LOCAL_RESPONSE"
if echo "$LOCAL_RESPONSE" | grep -q "200"; then
    echo "   ✓ Local server is working"
else
    echo "   ✗ Local server not responding"
    exit 1
fi

echo ""
echo "2. Testing public URL:"
PUBLIC_RESPONSE=$(curl -s -I http://151.237.142.106:8080/ | head -1)
echo "   $PUBLIC_RESPONSE"
echo ""
FULL_RESPONSE=$(curl -s http://151.237.142.106:8080/ | head -10)
echo "   Response body:"
echo "$FULL_RESPONSE" | head -5

echo ""
echo "3. Checking tunnel process:"
if ps aux | grep -q "[s]sh.*-R.*8080"; then
    echo "   ✓ Tunnel process is running"
    ps aux | grep "[s]sh.*-R.*8080" | head -1
else
    echo "   ✗ No tunnel process found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Troubleshooting:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If public URL shows Express/404, it means:"
echo "  1. Another service is running on port 8080 on the server"
echo "  2. SSH tunnel is binding to localhost only (need GatewayPorts yes)"
echo "  3. Try using a different port:"
echo "     ssh -R 8081:localhost:8080 -p 22 ebilling@151.237.142.106"
echo ""
echo "To fix, run on the server:"
echo "  1. Check what's using port 8080: sudo lsof -i :8080"
echo "  2. Kill it if needed: sudo kill -9 <PID>"
echo "  3. Verify GatewayPorts: grep GatewayPorts /etc/ssh/sshd_config"
echo "  4. Restart SSH: sudo systemctl restart sshd"

