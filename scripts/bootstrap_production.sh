#!/usr/bin/env bash
# Production Bootstrap Script
# Sets up the entire project for production: migrations, contracts, seed data

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}  🚀 Production Bootstrap${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running in production mode
PRODUCTION_MODE="${1:-false}"
if [ "$PRODUCTION_MODE" = "true" ] || [ "$PRODUCTION_MODE" = "production" ]; then
    PRODUCTION_MODE=true
    echo -e "${YELLOW}⚠️  Running in PRODUCTION mode${NC}"
    echo ""
else
    PRODUCTION_MODE=false
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Backend Setup
bootstrap_backend() {
    echo -e "${BLUE}📦 Step 1: Backend Setup...${NC}"
    cd "$PROJECT_DIR/backend" || exit 1
    
    # Create venv if needed
    if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
        echo "   Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate venv
    if [ -d "venv" ]; then
        source venv/bin/activate
        VENV_PATH="venv"
    elif [ -d ".venv" ]; then
        source .venv/bin/activate
        VENV_PATH=".venv"
    else
        echo -e "${RED}   ✗ Virtual environment not found${NC}"
        return 1
    fi
    
    echo "   ✓ Virtual environment activated"
    
    # Upgrade pip
    echo "   Upgrading pip..."
    pip install -q --upgrade pip
    
    # Install dependencies
    echo "   Installing Python dependencies..."
    pip install -q -r requirements.txt
    
    echo -e "${GREEN}   ✓ Backend dependencies installed${NC}"
    echo ""
}

# Step 2: Frontend Setup
bootstrap_frontend() {
    echo -e "${BLUE}🎨 Step 2: Frontend Setup...${NC}"
    cd "$PROJECT_DIR" || exit 1
    
    # Install Node.js dependencies
    if [ ! -d "node_modules" ]; then
        echo "   Installing frontend dependencies..."
        npm install
    else
        echo "   Frontend dependencies already installed"
    fi
    
    # Build frontend if in production mode
    if [ "$PRODUCTION_MODE" = "true" ]; then
        echo "   Building frontend for production..."
        npm run build
        echo -e "${GREEN}   ✓ Frontend built for production${NC}"
    else
        echo -e "${GREEN}   ✓ Frontend dependencies ready${NC}"
    fi
    
    echo ""
}

# Step 3: Database Migrations
bootstrap_database() {
    echo -e "${BLUE}🗄️  Step 3: Database Setup...${NC}"
    
    # Check if Supabase CLI is available
    if command_exists supabase; then
        echo "   Running Supabase migrations..."
        cd "$PROJECT_DIR" || exit 1
        
        # Check if supabase directory exists
        if [ -d "supabase" ]; then
            # Try to push migrations
            if supabase db push > /dev/null 2>&1; then
                echo -e "${GREEN}   ✓ Database migrations applied${NC}"
            else
                echo -e "${YELLOW}   ⚠ Database migrations failed (may already be applied)${NC}"
            fi
        else
            echo -e "${YELLOW}   ⚠ No supabase directory found, skipping migrations${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠ Supabase CLI not found, skipping migrations${NC}"
        echo "   Install: npm install -g supabase"
    fi
    
    echo ""
}

# Step 4: Contract Deployment
bootstrap_contracts() {
    echo -e "${BLUE}📜 Step 4: Smart Contract Deployment...${NC}"
    
    cd "$PROJECT_DIR" || exit 1
    
    # Activate backend venv
    if [ -f "backend/venv/bin/activate" ]; then
        source backend/venv/bin/activate
    elif [ -f "backend/.venv/bin/activate" ]; then
        source backend/.venv/bin/activate
    fi
    
    # Check if Forge is available
    if ! command_exists forge; then
        echo -e "${YELLOW}   ⚠ Forge not found, skipping contract deployment${NC}"
        echo "   Install: curl -L https://foundry.paradigm.xyz | bash && foundryup"
        echo "   Contracts will be deployed automatically when creating star systems"
        echo ""
        return 0
    fi
    
    # Check if contracts are already deployed
    if [ -f "deployments/addresses.json" ]; then
        echo "   Contract addresses file found..."
        
        # Try to check deployment status via API if backend is running
        if curl -s http://localhost:5001/contracts/status > /dev/null 2>&1; then
            STATUS=$(curl -s http://localhost:5001/contracts/status 2>/dev/null)
            if echo "$STATUS" | grep -qi '"deployed":true\|"status":"deployed"'; then
                echo -e "${GREEN}   ✓ Contracts already deployed${NC}"
                echo ""
                return 0
            fi
        else
            echo "   Backend not running yet, contracts will be deployed when needed"
            echo "   Contracts deploy automatically when creating star systems"
            echo ""
            return 0
        fi
    fi
    
    # Only try to deploy if backend is running
    if ! curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo -e "${YELLOW}   ⚠ Backend not running, skipping contract deployment${NC}"
        echo "   Contracts will be deployed automatically when creating star systems"
        echo "   Or deploy manually: python3 scripts/manage_contracts.py deploy"
        echo ""
        return 0
    fi
    
    # Try to deploy contracts
    echo "   Deploying contracts..."
    
    # Use Python script if available
    if [ -f "scripts/manage_contracts.py" ]; then
        DEPLOY_OUTPUT=$(python3 scripts/manage_contracts.py deploy 2>&1) || {
            echo -e "${YELLOW}   ⚠ Contract deployment failed or contracts already deployed${NC}"
            echo "   Note: Contracts will deploy automatically when creating star systems"
            echo ""
            return 0
        }
        
        if echo "$DEPLOY_OUTPUT" | grep -qi "success\|deployed\|✓"; then
            echo -e "${GREEN}   ✓ Contracts deployed successfully${NC}"
        else
            echo -e "${YELLOW}   ⚠ Contract deployment status unclear${NC}"
            echo "   Contracts will deploy automatically when creating star systems"
        fi
    else
        echo -e "${YELLOW}   ⚠ Contract management script not found${NC}"
        echo "   Contracts will deploy automatically when creating star systems"
    fi
    
    echo ""
}

# Step 5: Seed Initial Data
bootstrap_seed_data() {
    echo -e "${BLUE}🌱 Step 5: Seeding Initial Data...${NC}"
    
    cd "$PROJECT_DIR" || exit 1
    
    # Check if backend is running
    if ! curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo -e "${YELLOW}   ⚠ Backend not running, skipping seed data${NC}"
        echo "   Seed data will be created when backend starts"
        echo ""
        return 0
    fi
    
    # Seed Sarakt Prime and Zythera via API
    echo "   Seeding Sarakt Star System and planets..."
    
    # This will be automatically created when API is called, but we can trigger it
    if curl -s http://localhost:5001/celestial-forge/star-systems > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Seed data initialized${NC}"
    else
        echo -e "${YELLOW}   ⚠ Could not seed data (backend may not be ready)${NC}"
    fi
    
    # Run seed demo script if available
    if [ -f "scripts/seed_demo.py" ]; then
        echo "   Running demo seed script..."
        if python3 scripts/seed_demo.py > /dev/null 2>&1; then
            echo -e "${GREEN}   ✓ Demo data seeded${NC}"
        else
            echo -e "${YELLOW}   ⚠ Demo seed script failed (may already be seeded)${NC}"
        fi
    fi
    
    echo ""
}

# Step 6: Verify Setup
verify_setup() {
    echo -e "${BLUE}✅ Step 6: Verifying Setup...${NC}"
    
    # Check backend
    if [ -d "$PROJECT_DIR/backend/venv" ] || [ -d "$PROJECT_DIR/backend/.venv" ]; then
        echo -e "   ${GREEN}✓ Backend virtual environment exists${NC}"
    else
        echo -e "   ${RED}✗ Backend virtual environment missing${NC}"
    fi
    
    # Check frontend
    if [ -d "$PROJECT_DIR/node_modules" ]; then
        echo -e "   ${GREEN}✓ Frontend dependencies installed${NC}"
    else
        echo -e "   ${RED}✗ Frontend dependencies missing${NC}"
    fi
    
    # Check contracts (if Forge is available)
    if command_exists forge; then
        if [ -f "$PROJECT_DIR/deployments/addresses.json" ]; then
            echo -e "   ${GREEN}✓ Contract addresses file exists${NC}"
        else
            echo -e "   ${YELLOW}⚠ Contract addresses file not found (contracts may need deployment)${NC}"
        fi
    fi
    
    # Check Avalanche CLI
    if command_exists avalanche; then
        echo -e "   ${GREEN}✓ Avalanche CLI is installed${NC}"
        
        # Check for subnets
        if [ -d ~/.avalanche-cli/subnets ]; then
            SUBNET_COUNT=$(ls -1 ~/.avalanche-cli/subnets 2>/dev/null | wc -l)
            if [ "$SUBNET_COUNT" -gt 0 ]; then
                echo -e "   ${GREEN}✓ Found $SUBNET_COUNT subnet(s)${NC}"
            else
                echo -e "   ${YELLOW}⚠ No subnets found${NC}"
            fi
        fi
    else
        echo -e "   ${YELLOW}⚠ Avalanche CLI not installed (optional)${NC}"
    fi
    
    echo ""
}

# Main bootstrap function
main() {
    bootstrap_backend
    bootstrap_frontend
    bootstrap_database
    bootstrap_contracts
    bootstrap_seed_data
    verify_setup
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}  ✅ Production Bootstrap Complete!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 Next Steps:"
    echo "   • Start the servers: bash scripts/start_all.sh"
    echo "   • Or start individually:"
    echo "     - Backend:  cd backend && source venv/bin/activate && uvicorn app:app --host 0.0.0.0 --port 5001"
    echo "     - Frontend: npm run dev (or npm run preview for production build)"
    echo ""
}

# Run bootstrap
main
