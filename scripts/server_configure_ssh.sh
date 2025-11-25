#!/usr/bin/env bash
# Server-side SSH and Firewall Configuration Script
# Run this script ON THE SERVER (151.237.142.106) as root or with sudo

set -e

# Configuration
SERVER_FORWARD_PORT="8080"
SSHD_CONFIG="/etc/ssh/sshd_config"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Server SSH and Firewall Configuration                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}✗ Please run as root or with sudo${NC}"
    exit 1
fi

# 1. Configure SSH to allow remote forwarding
echo -e "${BLUE}1. Configuring SSH for remote forwarding...${NC}"

# Backup sshd_config
cp "$SSHD_CONFIG" "${SSHD_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✓ Backup created: ${SSHD_CONFIG}.backup.*${NC}"

# Check if GatewayPorts is set
if grep -q "^GatewayPorts" "$SSHD_CONFIG"; then
    # Update existing GatewayPorts
    sed -i 's/^GatewayPorts.*/GatewayPorts yes/' "$SSHD_CONFIG"
    echo -e "${GREEN}✓ Updated GatewayPorts to yes${NC}"
else
    # Add GatewayPorts
    echo "GatewayPorts yes" >> "$SSHD_CONFIG"
    echo -e "${GREEN}✓ Added GatewayPorts yes${NC}"
fi

# Check if AllowTcpForwarding is set
if grep -q "^AllowTcpForwarding" "$SSHD_CONFIG"; then
    # Update existing AllowTcpForwarding
    sed -i 's/^AllowTcpForwarding.*/AllowTcpForwarding yes/' "$SSHD_CONFIG"
    echo -e "${GREEN}✓ Updated AllowTcpForwarding to yes${NC}"
else
    # Add AllowTcpForwarding
    echo "AllowTcpForwarding yes" >> "$SSHD_CONFIG"
    echo -e "${GREEN}✓ Added AllowTcpForwarding yes${NC}"
fi

# 2. Configure firewall
echo ""
echo -e "${BLUE}2. Configuring firewall...${NC}"

# Check for ufw (Ubuntu/Debian)
if command -v ufw &> /dev/null; then
    echo -e "${YELLOW}Detected UFW firewall${NC}"
    
    # Allow SSH port
    ufw allow 22/tcp
    
    # Allow forward port
    ufw allow "$SERVER_FORWARD_PORT/tcp"
    echo -e "${GREEN}✓ UFW rules added${NC}"
    
    # Enable firewall if not already enabled
    if ! ufw status | grep -q "Status: active"; then
        echo -e "${YELLOW}Enabling UFW...${NC}"
        ufw --force enable
    fi
    
    echo -e "${GREEN}✓ Firewall configured${NC}"
    
# Check for firewalld (CentOS/RHEL)
elif command -v firewall-cmd &> /dev/null; then
    echo -e "${YELLOW}Detected firewalld${NC}"
    
    firewall-cmd --permanent --add-port=22/tcp
    firewall-cmd --permanent --add-port="$SERVER_FORWARD_PORT/tcp"
    firewall-cmd --reload
    echo -e "${GREEN}✓ firewalld rules added${NC}"
    
# Check for iptables
elif command -v iptables &> /dev/null; then
    echo -e "${YELLOW}Detected iptables${NC}"
    
    iptables -I INPUT -p tcp --dport 22 -j ACCEPT
    iptables -I INPUT -p tcp --dport "$SERVER_FORWARD_PORT" -j ACCEPT
    
    # Try to save rules (distribution-specific)
    if command -v iptables-save &> /dev/null; then
        if command -v netfilter-persistent &> /dev/null; then
            netfilter-persistent save
        elif [ -d /etc/iptables ]; then
            iptables-save > /etc/iptables/rules.v4
        fi
    fi
    
    echo -e "${GREEN}✓ iptables rules added${NC}"
else
    echo -e "${YELLOW}⚠ No firewall detected. Please configure manually.${NC}"
fi

# 3. Restart SSH service
echo ""
echo -e "${BLUE}3. Restarting SSH service...${NC}"

if systemctl restart sshd 2>/dev/null; then
    echo -e "${GREEN}✓ SSH service restarted (systemd)${NC}"
elif systemctl restart ssh 2>/dev/null; then
    echo -e "${GREEN}✓ SSH service restarted (systemd - alternative)${NC}"
elif service sshd restart 2>/dev/null; then
    echo -e "${GREEN}✓ SSH service restarted (service)${NC}"
else
    echo -e "${RED}✗ Failed to restart SSH service${NC}"
    echo -e "${YELLOW}Please restart manually:${NC}"
    echo -e "  sudo systemctl restart sshd"
    echo -e "  or"
    echo -e "  sudo service sshd restart"
    exit 1
fi

# Wait for SSH to be ready
sleep 2

# Verify SSH is running
if systemctl is-active --quiet sshd || systemctl is-active --quiet ssh || service sshd status &>/dev/null; then
    echo -e "${GREEN}✓ SSH service is running${NC}"
else
    echo -e "${RED}✗ SSH service is not running${NC}"
    exit 1
fi

# 4. Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Server Configuration Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Configuration Summary:${NC}"
echo -e "  ✓ GatewayPorts: yes"
echo -e "  ✓ AllowTcpForwarding: yes"
echo -e "  ✓ Firewall: Port ${SERVER_FORWARD_PORT} allowed"
echo -e "  ✓ SSH service: Restarted"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. On your laptop, run: bash scripts/setup_reverse_ssh.sh"
echo -e "  2. Your Vite dev server will be accessible at:"
echo -e "     ${YELLOW}http://$(hostname -I | awk '{print $1}'):${SERVER_FORWARD_PORT}${NC}"
echo -e "     ${YELLOW}or http://151.237.106.142:${SERVER_FORWARD_PORT}${NC}"
echo ""

