#!/usr/bin/env bash
# Quick script to check if backend is running

echo "Checking backend status..."

if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✓ Backend is running on http://localhost:5001"
    curl -s http://localhost:5001/ | head -20
else
    echo "✗ Backend is NOT running"
    echo ""
    echo "Start it with:"
    echo "  cd backend && uvicorn app:app --reload"
    echo ""
    echo "Or use the automated script:"
    echo "  bash scripts/test_ui_forge.sh"
fi

