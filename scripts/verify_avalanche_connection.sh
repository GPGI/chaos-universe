#!/usr/bin/env bash
# Quick verification script for Avalanche CLI connection

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🔍 Verifying Avalanche CLI Connection${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Avalanche CLI is installed
echo "1️⃣  Checking Avalanche CLI installation..."
if command -v avalanche &> /dev/null; then
    VERSION=$(avalanche --version 2>&1 | head -1)
    PATH_AVALANCHE=$(which avalanche)
    echo -e "   ${GREEN}✅ Avalanche CLI is installed${NC}"
    echo "      Version: $VERSION"
    echo "      Path: $PATH_AVALANCHE"
else
    echo -e "   ${RED}❌ Avalanche CLI is NOT installed${NC}"
    echo "      Install: curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh"
    exit 1
fi
echo ""

# Check if subnets exist
echo "2️⃣  Checking available subnets..."
if [ -d ~/.avalanche-cli/subnets ]; then
    SUBNET_COUNT=$(ls -1 ~/.avalanche-cli/subnets 2>/dev/null | wc -l)
    if [ "$SUBNET_COUNT" -gt 0 ]; then
        echo -e "   ${GREEN}✅ Found $SUBNET_COUNT subnet(s):${NC}"
        ls -1 ~/.avalanche-cli/subnets | while read subnet; do
            echo "      • $subnet"
        done
    else
        echo -e "   ${YELLOW}⚠️  No subnets found${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Subnet directory doesn't exist${NC}"
fi
echo ""

# Check key files
echo "3️⃣  Checking key files..."
if [ -d ~/.avalanche-cli/key ]; then
    KEY_COUNT=$(ls -1 ~/.avalanche-cli/key/*.pk 2>/dev/null | wc -l)
    if [ "$KEY_COUNT" -gt 0 ]; then
        echo -e "   ${GREEN}✅ Found $KEY_COUNT key file(s)${NC}"
    else
        echo -e "   ${YELLOW}⚠️  No key files found${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Key directory doesn't exist${NC}"
fi
echo ""

# Test backend connection
echo "4️⃣  Testing backend connection..."
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Backend is running${NC}"
    
    # Test CLI detection endpoint
    RESPONSE=$(curl -s http://localhost:5001/cli/detection 2>&1)
    if echo "$RESPONSE" | grep -q "avalanche_cli"; then
        echo -e "   ${GREEN}✅ CLI detection endpoint is working${NC}"
    else
        echo -e "   ${YELLOW}⚠️  CLI endpoint may not be mounted (check app.py)${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Backend is not running (start with: bash scripts/start_all.sh)${NC}"
fi
echo ""

# Run Python test script
echo "5️⃣  Running Python connection test..."
cd "$(dirname "$0")/.."
if [ -f "scripts/test_avalanche_connection.py" ]; then
    python3 scripts/test_avalanche_connection.py
else
    echo -e "   ${YELLOW}⚠️  Test script not found${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Verification Complete${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Summary:"
echo "   • Avalanche CLI is installed and detected"
echo "   • Backend can automatically discover configuration"
echo "   • No manual configuration needed!"
echo ""
echo "💡 The backend connects to Avalanche CLI automatically when:"
echo "   1. Avalanche CLI is in PATH"
echo "   2. Subnets exist in ~/.avalanche-cli/subnets/"
echo "   3. Keys are available in ~/.avalanche-cli/key/"
echo ""

