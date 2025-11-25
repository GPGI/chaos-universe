#!/usr/bin/env bash
# Start both backend and frontend servers
# Press Ctrl+C to stop both servers

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

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all servers and related processes...${NC}"
    
    # Kill tracked background processes first
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || kill -9 $BACKEND_PID 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || kill -9 $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Kill all related processes by pattern and port
    pkill -f "uvicorn app:app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    lsof -ti :5001 2>/dev/null | xargs kill -9 2>/dev/null || true
    lsof -ti :8080 2>/dev/null | xargs kill -9 2>/dev/null || true
    
    # Kill blockchain network if we started it
    if [ -f /tmp/avalanche_network.pid ]; then
        NETWORK_PID=$(cat /tmp/avalanche_network.pid 2>/dev/null)
        if [ -n "$NETWORK_PID" ] && kill -0 $NETWORK_PID 2>/dev/null; then
            echo -e "${YELLOW}   Stopping blockchain network...${NC}"
            kill $NETWORK_PID 2>/dev/null || kill -9 $NETWORK_PID 2>/dev/null || true
        fi
        rm -f /tmp/avalanche_network.pid
    fi
    
    # Clean up all PID files
    rm -f /tmp/backend.pid /tmp/frontend.pid /tmp/avalanche_network.pid
    
    sleep 1
    echo -e "${GREEN}✓ All processes stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}  🚀 Starting Backend & Frontend${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if bootstrap is requested
BOOTSTRAP_MODE=false
PRODUCTION_MODE=false

# Check command line arguments
for arg in "$@"; do
    case $arg in
        --bootstrap|--init|bootstrap)
            BOOTSTRAP_MODE=true
            shift
            ;;
        --production|production|--prod)
            PRODUCTION_MODE=true
            BOOTSTRAP_MODE=true
            shift
            ;;
        *)
            ;;
    esac
done

# Run bootstrap if requested
if [ "$BOOTSTRAP_MODE" = "true" ]; then
    echo -e "${BLUE}🔧 Running Production Bootstrap...${NC}"
    echo ""
    
    if [ "$PRODUCTION_MODE" = "true" ]; then
        bash "$SCRIPT_DIR/bootstrap_production.sh" production
    else
        bash "$SCRIPT_DIR/bootstrap_production.sh"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi

# Function to verify Avalanche CLI connection
verify_avalanche_cli() {
    echo -e "${BLUE}🔍 Verifying Avalanche CLI Connection...${NC}"
    
    # Check if Avalanche CLI is installed
    if command -v avalanche &> /dev/null; then
        VERSION=$(avalanche --version 2>&1 | head -1)
        echo -e "   ${GREEN}✓ Avalanche CLI is installed: ${VERSION}${NC}"
        
        # Check subnets
        if [ -d ~/.avalanche-cli/subnets ]; then
            SUBNET_COUNT=$(ls -1 ~/.avalanche-cli/subnets 2>/dev/null | wc -l)
            if [ "$SUBNET_COUNT" -gt 0 ]; then
                echo -e "   ${GREEN}✓ Found $SUBNET_COUNT subnet(s)${NC}"
            else
                echo -e "   ${YELLOW}⚠ No subnets found${NC}"
            fi
        fi
        
        # Check keys
        if [ -d ~/.avalanche-cli/key ]; then
            KEY_COUNT=$(ls -1 ~/.avalanche-cli/key/*.pk 2>/dev/null | wc -l)
            if [ "$KEY_COUNT" -gt 0 ]; then
                echo -e "   ${GREEN}✓ Found $KEY_COUNT key file(s)${NC}"
            fi
        fi
    else
        echo -e "   ${YELLOW}⚠ Avalanche CLI is not installed (optional)${NC}"
        echo "   Install: curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh"
    fi
    echo ""
}

# Function to test backend connection and Avalanche CLI integration
test_backend_connection() {
    echo -e "${BLUE}🧪 Testing Backend Connection...${NC}"
    
    # Wait a bit for backend to fully start
    sleep 3
    
    # Test health endpoint
    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo -e "   ${GREEN}✓ Backend health check passed${NC}"
    else
        echo -e "   ${YELLOW}⚠ Backend health check failed (may still be starting)${NC}"
        return 1
    fi
    
    # Wait a bit more for all endpoints to be ready
    sleep 2
    
    # Test CLI detection endpoint with retry
    local cli_detection_ok=false
    for i in {1..5}; do
        RESPONSE=$(curl -s http://localhost:5001/cli/detection 2>&1)
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/cli/detection 2>/dev/null)
        
        # Check if endpoint exists and returns valid JSON
        if [ "$HTTP_CODE" = "200" ] && echo "$RESPONSE" | grep -q "avalanche_cli\|forge"; then
            cli_detection_ok=true
            echo -e "   ${GREEN}✓ CLI detection endpoint is working${NC}"
            
            # Extract Avalanche CLI status
            if echo "$RESPONSE" | grep -q '"installed":true'; then
                echo -e "   ${GREEN}✓ Avalanche CLI is connected to backend${NC}"
            fi
            break
        elif [ "$HTTP_CODE" = "404" ]; then
            # Endpoint doesn't exist - CLI detector may not be available
            echo -e "   ${YELLOW}⚠ CLI detection endpoint not available (CLI detector may not be installed)${NC}"
            break
        else
            # Endpoint might not be ready yet, wait and retry
            if [ $i -lt 5 ]; then
                sleep 1
            fi
        fi
    done
    
    if [ "$cli_detection_ok" = false ] && [ "$HTTP_CODE" != "404" ]; then
        echo -e "   ${YELLOW}⚠ CLI detection endpoint not responding (endpoint may still be initializing)${NC}"
    fi
    
    # Run Python connection test if available
    if [ -f "$PROJECT_DIR/scripts/test_avalanche_connection.py" ]; then
        echo -e "   ${BLUE}Running detailed connection test...${NC}"
        cd "$PROJECT_DIR"
        # Run test and extract key results
        TEST_OUTPUT=$(python3 scripts/test_avalanche_connection.py 2>&1)
        
        # Check for subnet discovery
        if echo "$TEST_OUTPUT" | grep -q "Found.*subnet"; then
            echo "$TEST_OUTPUT" | grep -E "Found.*subnet|• .*\(configured\)" | sed 's/^/      /'
        fi
        
        # Check for RPC URL discovery
        if echo "$TEST_OUTPUT" | grep -q "RPC URL discovered"; then
            echo "$TEST_OUTPUT" | grep "RPC URL discovered" | sed 's/^/      /'
        fi
        
        # Check for key loading
        if echo "$TEST_OUTPUT" | grep -q "Private key loaded"; then
            echo "$TEST_OUTPUT" | grep "Private key loaded" | sed 's/^/      /'
        fi
        
        # Check for subnet info
        if echo "$TEST_OUTPUT" | grep -q "Subnet info retrieved"; then
            echo "$TEST_OUTPUT" | grep -A 2 "Subnet info retrieved" | sed 's/^/      /'
        fi
    fi
    
    echo ""
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill all related processes
kill_all_related_processes() {
    echo -e "${BLUE}🧹 Cleaning up all related processes...${NC}"
    
    # Kill processes by PID files first
    local killed_any=false
    
    if [ -f /tmp/backend.pid ]; then
        local pid=$(cat /tmp/backend.pid 2>/dev/null)
        if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
            echo -e "   ${YELLOW}Killing backend process (PID: $pid)...${NC}"
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
            killed_any=true
        fi
        rm -f /tmp/backend.pid
    fi
    
    if [ -f /tmp/frontend.pid ]; then
        local pid=$(cat /tmp/frontend.pid 2>/dev/null)
        if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
            echo -e "   ${YELLOW}Killing frontend process (PID: $pid)...${NC}"
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
            killed_any=true
        fi
        rm -f /tmp/frontend.pid
    fi
    
    if [ -f /tmp/avalanche_network.pid ]; then
        local pid=$(cat /tmp/avalanche_network.pid 2>/dev/null)
        if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
            echo -e "   ${YELLOW}Killing blockchain network process (PID: $pid)...${NC}"
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
            killed_any=true
        fi
        rm -f /tmp/avalanche_network.pid
    fi
    
    # Kill processes by pattern matching
    if pgrep -f "uvicorn app:app" > /dev/null 2>&1; then
        echo -e "   ${YELLOW}Killing uvicorn processes...${NC}"
        pkill -f "uvicorn app:app" 2>/dev/null || true
        sleep 1
        pkill -9 -f "uvicorn app:app" 2>/dev/null || true
        killed_any=true
    fi
    
    if pgrep -f "vite" > /dev/null 2>&1; then
        echo -e "   ${YELLOW}Killing vite processes...${NC}"
        pkill -f "vite" 2>/dev/null || true
        sleep 1
        pkill -9 -f "vite" 2>/dev/null || true
        killed_any=true
    fi
    
    # Kill processes on specific ports
    for port in 5001 8080; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local service_name="Backend"
            [ "$port" = "8080" ] && service_name="Frontend"
            echo -e "   ${YELLOW}Killing process on port $port ($service_name)...${NC}"
            lsof -ti :$port 2>/dev/null | xargs kill -9 2>/dev/null || true
            killed_any=true
            sleep 1
        fi
    done
    
    if [ "$killed_any" = true ]; then
        sleep 2  # Wait for processes to fully terminate
        echo -e "   ${GREEN}✓ All related processes killed${NC}"
    else
        echo -e "   ${GREEN}✓ No related processes found${NC}"
    fi
    echo ""
}

# Function to kill process on a port
kill_port() {
    local port=$1
    local service_name=$2
    
    if check_port $port; then
        echo -e "${YELLOW}   Killing process on port $port ($service_name)...${NC}"
        
        # Try to get PID and kill gracefully first
        local pid=$(lsof -ti :$port 2>/dev/null | head -1)
        if [ -n "$pid" ]; then
            kill $pid 2>/dev/null || true
            sleep 1
            
            # If still running, force kill
            if check_port $port; then
                kill -9 $pid 2>/dev/null || true
                sleep 1
            fi
        fi
        
        # Alternative method: kill all processes on the port
        lsof -ti :$port 2>/dev/null | xargs kill -9 2>/dev/null || true
        sleep 1
        
        # Verify port is free
        if check_port $port; then
            echo -e "${RED}   ✗ Failed to free port $port${NC}"
            return 1
        else
            echo -e "${GREEN}   ✓ Port $port is now free${NC}"
            return 0
        fi
    fi
}

# Pre-startup verification
verify_avalanche_cli

# Function to check network status and verify nodes/RPC
check_network_ready() {
    echo -e "${BLUE}🔍 Checking Network Status...${NC}"
    
    # Check if Avalanche CLI is installed
    if ! command -v avalanche &> /dev/null; then
        echo -e "   ${YELLOW}⚠ Avalanche CLI not found - skipping network check${NC}"
        echo ""
        return 1
    fi
    
    # Try to get network status with timeout (10 seconds max)
    local status_output=""
    local check_success=false
    
    if command -v timeout &> /dev/null; then
        status_output=$(timeout 10 avalanche network status 2>&1)
        if [ $? -eq 0 ] && [ -n "$status_output" ]; then
            check_success=true
        fi
    else
        # Fallback: try without timeout (may hang)
        status_output=$(avalanche network status 2>&1) && check_success=true
    fi
    
    if [ "$check_success" = false ] || [ -z "$status_output" ]; then
        echo -e "   ${YELLOW}⚠ Could not check network status (network may still be starting)${NC}"
        echo ""
        return 1
    fi
    
    # Check for nodes and RPC endpoints
    local nodes_ok=false
    local rpc_ok=false
    
    # Look for node information in the status output
    if echo "$status_output" | grep -qi "node\|validator\|network\|running"; then
        nodes_ok=true
    fi
    
    # Look for RPC endpoint information
    if echo "$status_output" | grep -qi "rpc\|endpoint\|http.*9650\|http.*:.*ext"; then
        rpc_ok=true
    fi
    
    # Display status
    echo "   Network Status:"
    echo "$status_output" | head -20 | sed 's/^/      /'
    
    if [ "$nodes_ok" = true ] && [ "$rpc_ok" = true ]; then
        echo -e "   ${GREEN}✓ Nodes and RPC endpoints detected${NC}"
        echo ""
        return 0
    elif [ "$nodes_ok" = true ]; then
        echo -e "   ${YELLOW}⚠ Nodes detected but RPC status unclear${NC}"
        echo ""
        return 0
    else
        echo -e "   ${YELLOW}⚠ Network may still be starting...${NC}"
        echo -e "   ${YELLOW}   Check logs: tail -f /tmp/avalanche_network.log${NC}"
        echo ""
        return 1
    fi
}

# Function to start blockchain network
start_blockchain_network() {
    echo -e "${BLUE}🔗 Starting Blockchain Network...${NC}"
    
    # Check if Avalanche CLI is installed
    if ! command -v avalanche &> /dev/null; then
        echo -e "   ${YELLOW}⚠ Avalanche CLI not found - skipping blockchain start${NC}"
        echo ""
        return 0
    fi
    
    # Check if we already have a running network process
    if [ -f /tmp/avalanche_network.pid ]; then
        local old_pid=$(cat /tmp/avalanche_network.pid 2>/dev/null)
        if [ -n "$old_pid" ] && kill -0 $old_pid 2>/dev/null; then
            echo -e "   ${GREEN}✓ Blockchain network already running (PID: $old_pid)${NC}"
            # Check status of existing network
            echo ""
            if check_network_ready; then
                return 0
            else
                echo -e "   ${YELLOW}⚠ Network process exists but status check incomplete${NC}"
                echo ""
                return 0
            fi
        else
            # Stale PID file, remove it
            rm -f /tmp/avalanche_network.pid
        fi
    fi
    
    # Start the network in background (non-blocking)
    echo -e "   ${BLUE}→ Starting blockchain network...${NC}"
    
    # Start the network in background with nohup (non-blocking)
    nohup avalanche network start > /tmp/avalanche_network.log 2>&1 &
    NETWORK_PID=$!
    echo $NETWORK_PID > /tmp/avalanche_network.pid
    
    echo -e "   ${GREEN}✓ Blockchain network start initiated (PID: $NETWORK_PID)${NC}"
    echo -e "   ${YELLOW}   Waiting for network to initialize...${NC}"
    
    # Wait a bit for network to start, then check status
    echo -e "   ${BLUE}   Waiting 5 seconds for network to start...${NC}"
    sleep 5
    
    # Check network status
    local max_attempts=12  # 12 attempts = 60 seconds total
    local attempt=0
    local network_ready=false
    
    while [ $attempt -lt $max_attempts ]; do
        if check_network_ready; then
            network_ready=true
            break
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -lt $max_attempts ]; then
            echo -e "   ${YELLOW}   Waiting... (attempt $attempt/$max_attempts)${NC}"
            sleep 5
        fi
    done
    
    if [ "$network_ready" = true ]; then
        echo -e "   ${GREEN}✓ Network is ready with nodes and RPC running${NC}"
    else
        echo -e "   ${YELLOW}⚠ Network is starting but not fully ready yet${NC}"
        echo -e "   ${YELLOW}   It will continue starting in background${NC}"
        echo -e "   ${YELLOW}   Check status: avalanche network status${NC}"
        echo -e "   ${YELLOW}   Check logs: tail -f /tmp/avalanche_network.log${NC}"
    fi
    echo ""
    
    return 0
}

# Start blockchain network first
start_blockchain_network

# Kill all related processes before starting
kill_all_related_processes

# Start Backend
echo -e "${BLUE}📦 Starting Backend...${NC}"
cd "$PROJECT_DIR/backend" || exit 1

# Create venv if needed
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "   Creating virtual environment..."
    python3 -m venv venv
    # Auto-bootstrap if venv was just created
    if [ "$BOOTSTRAP_MODE" = "false" ]; then
        echo -e "${YELLOW}   ℹ️  Virtual environment created. Run with --bootstrap for full setup.${NC}"
    fi
fi

# Activate venv
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Install dependencies if needed (only if bootstrap wasn't run)
if [ "$BOOTSTRAP_MODE" = "false" ]; then
    if ! python -c "import uvicorn" 2>/dev/null; then
        echo "   Installing dependencies..."
        pip install -q -r requirements.txt
    fi
fi

# Start backend in background (use --reload only in dev mode)
if [ "$PRODUCTION_MODE" = "true" ]; then
    echo -e "${GREEN}   → Backend starting in PRODUCTION mode on http://localhost:5001${NC}"
    uvicorn app:app --host 0.0.0.0 --port 5001 > /tmp/backend.log 2>&1 &
else
    echo -e "${GREEN}   → Backend starting in DEVELOPMENT mode on http://localhost:5001${NC}"
    uvicorn app:app --reload --host 0.0.0.0 --port 5001 > /tmp/backend.log 2>&1 &
fi
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/backend.pid

# Wait for backend to be ready
echo "   Waiting for backend to be ready..."
for i in {1..30}; do
    # Check if backend process is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}   ✗ Backend process died during startup${NC}"
        echo ""
        echo -e "${YELLOW}   Last 20 lines of backend log:${NC}"
        echo "   ──────────────────────────────────────────"
        tail -20 /tmp/backend.log 2>/dev/null | sed 's/^/   /' || echo "   (No log file found)"
        echo "   ──────────────────────────────────────────"
        echo ""
        echo "   Check full logs: tail -f /tmp/backend.log"
        cleanup
        exit 1
    fi
    
    # Check if health endpoint responds
    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Backend is ready!${NC}"
        
        # If bootstrap was run, seed initial data now that backend is ready
        if [ "$BOOTSTRAP_MODE" = "true" ]; then
            echo "   Seeding initial data (Sarakt Prime & Zythera)..."
            # Trigger seed data creation via API
            curl -s http://localhost:5001/celestial-forge/star-systems > /dev/null 2>&1 || true
            sleep 1
        fi
        
        break
    fi
    
    # Show progress every 5 seconds
    if [ $((i % 5)) -eq 0 ] && [ $i -lt 30 ]; then
        echo -e "   ${YELLOW}Still waiting... (${i}/30 seconds)${NC}"
    fi
    
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}   ✗ Backend failed to start (timeout after 30 seconds)${NC}"
        echo ""
        echo -e "${YELLOW}   Last 20 lines of backend log:${NC}"
        echo "   ──────────────────────────────────────────"
        tail -20 /tmp/backend.log 2>/dev/null | sed 's/^/   /' || echo "   (No log file found)"
        echo "   ──────────────────────────────────────────"
        echo ""
        echo "   Check full logs: tail -f /tmp/backend.log"
        cleanup
        exit 1
    fi
done

# Test backend connection and Avalanche CLI integration
test_backend_connection

echo ""

# Start Frontend
echo -e "${BLUE}🎨 Starting Frontend...${NC}"
cd "$PROJECT_DIR" || exit 1

# Install frontend dependencies if needed (only if bootstrap wasn't run)
if [ "$BOOTSTRAP_MODE" = "false" ]; then
    if [ ! -d "node_modules" ]; then
        echo "   Installing frontend dependencies..."
        npm install
    fi
fi

# Start frontend (use preview for production build, dev for development)
if [ "$PRODUCTION_MODE" = "true" ] && [ -d "dist" ]; then
    echo -e "${GREEN}   → Frontend starting in PRODUCTION mode on http://localhost:8080${NC}"
    npm run preview -- --host 0.0.0.0 --port 8080 > /tmp/frontend.log 2>&1 &
else
    echo -e "${GREEN}   → Frontend starting in DEVELOPMENT mode on http://localhost:8080${NC}"
    npm run dev > /tmp/frontend.log 2>&1 &
fi
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/frontend.pid

# Wait a moment for frontend to start
sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$PRODUCTION_MODE" = "true" ]; then
    echo -e "${GREEN}  ✅ All servers are running in PRODUCTION mode!${NC}"
else
    echo -e "${GREEN}  ✅ All servers are running in DEVELOPMENT mode!${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "📍 ${GREEN}Backend:${NC}  http://localhost:5001"
echo -e "   ${GREEN}API Docs:${NC}  http://localhost:5001/docs"
echo -e "   ${GREEN}Health:${NC}    http://localhost:5001/health"
echo -e "   ${GREEN}CLI Detection:${NC} http://localhost:5001/cli/detection"
echo ""
echo -e "📍 ${GREEN}Frontend:${NC} http://localhost:8080"
echo ""
if [ "$BOOTSTRAP_MODE" = "true" ]; then
    echo -e "${GREEN}✓ Production bootstrap completed${NC}"
    echo ""
fi
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
if [ -f /tmp/avalanche_network.pid ]; then
    echo "   Blockchain: tail -f /tmp/avalanche_network.log"
fi
echo ""
echo "🔍 Verification:"
echo "   Run: bash scripts/verify_avalanche_connection.sh"
echo "   Run: python3 scripts/test_avalanche_connection.py"
echo ""
if [ "$BOOTSTRAP_MODE" = "false" ]; then
    echo "💡 Tip: Run with --bootstrap to auto-setup everything:"
    echo "   bash scripts/start_all.sh --bootstrap"
    echo ""
fi
echo ""

# Keep script running and show logs
tail -f /tmp/backend.log /tmp/frontend.log 2>/dev/null || {
    # If tail fails (no file), just wait
    while true; do
        sleep 1
    done
}

