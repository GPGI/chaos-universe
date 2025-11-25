#!/usr/bin/env bash
# Fix backend - kill stuck processes and restart

echo "Fixing backend..."
echo ""

# Kill any stuck uvicorn processes
echo "Killing stuck uvicorn processes..."
pkill -f "uvicorn app:app" 2>/dev/null
sleep 2

# Check if port 5001 is free
if lsof -i :5001 >/dev/null 2>&1; then
    echo "Port 5001 is still in use. Killing processes on port 5001..."
    lsof -ti :5001 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Verify port is free
if lsof -i :5001 >/dev/null 2>&1; then
    echo "✗ Failed to free port 5001"
    echo "Manually kill processes with: sudo lsof -ti :5001 | xargs kill -9"
    exit 1
else
    echo "✓ Port 5001 is now free"
fi

echo ""
echo "Starting backend..."
cd "$(dirname "$0")/../backend" || exit 1

# Check virtual environment
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Install dependencies if needed
if ! python -c "import uvicorn" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -q -r requirements.txt
fi

echo ""
echo "Backend starting on http://localhost:5001"
echo "API docs: http://localhost:5001/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start backend
uvicorn app:app --reload --host 0.0.0.0 --port 5001

