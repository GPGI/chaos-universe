#!/usr/bin/env bash
# Quick start script for backend and frontend

set -e

echo "======================================================================"
echo "  Quick Start - Backend & Frontend"
echo "======================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check backend
if check_port 5001; then
    echo -e "${GREEN}✓${NC} Backend is already running on port 5001"
    BACKEND_RUNNING=true
else
    echo -e "${YELLOW}⚠${NC} Backend is not running on port 5001"
    BACKEND_RUNNING=false
fi

# Check frontend
if check_port 8080; then
    echo -e "${GREEN}✓${NC} Frontend is already running on port 8080"
    FRONTEND_RUNNING=true
else
    echo -e "${YELLOW}⚠${NC} Frontend is not running on port 8080"
    FRONTEND_RUNNING=false
fi

echo ""

# Start backend if not running
if [ "$BACKEND_RUNNING" = false ]; then
    echo "Starting backend..."
    cd "$(dirname "$0")/../backend" || exit 1
    
    # Create venv if needed
    if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
        echo "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate venv
    if [ -d "venv" ]; then
        source venv/bin/activate
    elif [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    
    # Install deps if needed
    if ! python -c "import uvicorn" 2>/dev/null; then
        echo "Installing dependencies..."
        pip install -q -r requirements.txt
    fi
    
    echo -e "${GREEN}Starting backend on http://localhost:5001${NC}"
    uvicorn app:app --reload --host 0.0.0.0 --port 5001 > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > /tmp/backend.pid
    
    # Wait for backend to start
    echo "Waiting for backend to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:5001/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend is ready!${NC}"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo -e "${RED}✗ Backend failed to start${NC}"
            echo "Check logs: cat /tmp/backend.log"
            exit 1
        fi
    done
fi

# Start frontend if not running
if [ "$FRONTEND_RUNNING" = false ]; then
    echo ""
    echo "Starting frontend..."
    cd "$(dirname "$0")/.." || exit 1
    
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    echo -e "${GREEN}Starting frontend on http://localhost:8080${NC}"
    npm run dev > /tmp/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > /tmp/frontend.pid
    
    sleep 3
fi

echo ""
echo "======================================================================"
echo -e "${GREEN}  All set!${NC}"
echo "======================================================================"
echo ""
echo -e "Backend:  ${GREEN}http://localhost:5001${NC}"
echo -e "Frontend: ${GREEN}http://localhost:8080${NC}"
echo -e "API Docs: ${GREEN}http://localhost:5001/docs${NC}"
echo ""
echo "To stop servers, run: pkill -f 'uvicorn app:app' && pkill -f 'vite'"
echo "Or: kill \$(cat /tmp/backend.pid) && kill \$(cat /tmp/frontend.pid)"
echo ""

