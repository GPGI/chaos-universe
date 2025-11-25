#!/usr/bin/env bash
# Start backend server for Celestial Forge testing

cd "$(dirname "$0")/../backend" || exit 1

echo "Starting backend server..."
echo ""

# Check if virtual environment exists
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

echo "Backend starting on http://localhost:5001"
echo "API docs: http://localhost:5001/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

uvicorn app:app --reload --host 0.0.0.0 --port 5001

