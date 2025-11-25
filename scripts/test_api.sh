#!/bin/bash
# Quick API test script

echo "Testing Backend API Endpoints"
echo "=============================="
echo ""

# Check if server is running
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✓ Backend API is running"
    echo ""
    
    echo "Testing /health endpoint:"
    curl -s http://localhost:5001/health | jq . || curl -s http://localhost:5001/health
    echo ""
    
    echo "Testing / endpoint:"
    curl -s http://localhost:5001/ | jq . || curl -s http://localhost:5001/
    echo ""
    
    echo "Testing /contracts/status endpoint:"
    curl -s http://localhost:5001/contracts/status | jq . || curl -s http://localhost:5001/contracts/status
    echo ""
    
    echo "Testing /contracts/addresses endpoint:"
    curl -s http://localhost:5001/contracts/addresses | jq . || curl -s http://localhost:5001/contracts/addresses
    echo ""
else
    echo "✗ Backend API is not running"
    echo ""
    echo "To start the backend API:"
    echo "  cd backend"
    echo "  uvicorn app:app --reload"
    echo ""
fi

