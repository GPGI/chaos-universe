#!/usr/bin/env bash
# Stop Reverse SSH Tunnel

SERVER_FORWARD_PORT="8080"
LOCAL_PORT="8080"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Stopping reverse SSH tunnel..."

# Kill autossh processes
pkill -f "autossh.*${SERVER_FORWARD_PORT}:localhost:${LOCAL_PORT}" 2>/dev/null

sleep 1

if ! pgrep -f "autossh.*${SERVER_FORWARD_PORT}:localhost:${LOCAL_PORT}" > /dev/null; then
    echo -e "${GREEN}✓ Tunnel stopped${NC}"
else
    echo -e "${YELLOW}⚠ Some processes may still be running${NC}"
    echo "Kill manually with: pkill -9 -f autossh"
fi

