#!/usr/bin/env bash
# Test UI for Celestial Forge - Star System and Planet Creation
# This script starts the backend and frontend for UI testing

set -e

echo "======================================================================"
echo "  Celestial Forge UI Testing Setup"
echo "======================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backend is running
check_backend() {
    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend is running on http://localhost:5001"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Backend is not running"
        return 1
    fi
}

# Check if frontend is running
check_frontend() {
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Frontend is running on http://localhost:8080"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Frontend is not running"
        return 1
    fi
}

# Start backend
start_backend() {
    echo ""
    echo "Starting backend server..."
    cd backend
    if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
        echo "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    source venv/bin/activate 2>/dev/null || source .venv/bin/activate 2>/dev/null || true
    
    if ! command -v uvicorn &> /dev/null; then
        echo "Installing dependencies..."
        pip install -q -r requirements.txt
    fi
    
    echo -e "${GREEN}Starting backend on http://localhost:5001${NC}"
    echo "  Press Ctrl+C to stop"
    echo ""
    
    uvicorn app:app --reload --host 0.0.0.0 --port 5001 &
    BACKEND_PID=$!
    echo $BACKEND_PID > /tmp/forge_backend.pid
    
    # Wait for backend to be ready
    echo "Waiting for backend to be ready..."
    for i in {1..30}; do
        if check_backend; then
            break
        fi
        sleep 1
    done
}

# Start frontend
start_frontend() {
    echo ""
    echo "Starting frontend server..."
    
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    echo -e "${GREEN}Starting frontend on http://localhost:8080${NC}"
    echo "  Press Ctrl+C to stop"
    echo ""
    
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > /tmp/forge_frontend.pid
    
    # Wait for frontend to be ready
    echo "Waiting for frontend to be ready..."
    sleep 5
}

# Stop servers
stop_servers() {
    echo ""
    echo "Stopping servers..."
    
    if [ -f /tmp/forge_backend.pid ]; then
        kill $(cat /tmp/forge_backend.pid) 2>/dev/null || true
        rm /tmp/forge_backend.pid
    fi
    
    if [ -f /tmp/forge_frontend.pid ]; then
        kill $(cat /tmp/forge_frontend.pid) 2>/dev/null || true
        rm /tmp/forge_frontend.pid
    fi
    
    # Kill any remaining processes
    pkill -f "uvicorn app:app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    echo "Servers stopped"
}

# Check dependencies
check_dependencies() {
    echo "Checking dependencies..."
    
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}✗${NC} Python 3 is not installed"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗${NC} Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}✗${NC} npm is not installed"
        exit 1
    fi
    
    echo -e "${GREEN}✓${NC} All dependencies found"
}

# Main
main() {
    # Trap Ctrl+C
    trap stop_servers EXIT INT TERM
    
    check_dependencies
    
    # Check if already running
    BACKEND_RUNNING=false
    FRONTEND_RUNNING=false
    
    if check_backend; then
        BACKEND_RUNNING=true
    fi
    
    if check_frontend; then
        FRONTEND_RUNNING=true
    fi
    
    # Start what's needed
    if [ "$BACKEND_RUNNING" = false ]; then
        start_backend
    fi
    
    if [ "$FRONTEND_RUNNING" = false ]; then
        start_frontend
    fi
    
    # Give servers a moment to fully start
    sleep 2
    
    echo ""
    echo "======================================================================"
    echo "  Ready for UI Testing!"
    echo "======================================================================"
    echo ""
    echo -e "${GREEN}Backend:${NC}  http://localhost:5001"
    echo -e "${GREEN}Frontend:${NC} http://localhost:8080"
    echo ""
    echo "Testing Instructions:"
    echo "  1. Open http://localhost:8080 in your browser"
    echo "  2. Navigate to the 'Unified Universe' page"
    echo "  3. Click on the 'Celestial Forge' tab"
    echo "  4. Connect your wallet"
    echo "  5. Create a star system:"
    echo "     - Enter a name (at least 3 characters)"
    echo "     - Set tribute percentage (0-20%)"
    echo "     - Click 'Spawn Star System'"
    echo "  6. Create a planet:"
    echo "     - Select your star system"
    echo "     - Enter a planet name"
    echo "     - Choose planet type"
    echo "     - Click 'Spawn Planet'"
    echo ""
    echo "Press Ctrl+C to stop all servers"
    echo ""
    
    # Keep script running
    wait
}

main "$@"

