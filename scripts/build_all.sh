#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[1/5] Building smart contracts with Foundry..."
# Ensure Foundry libs are installed
if [ ! -d "lib/openzeppelin-contracts" ]; then
  echo "Installing OpenZeppelin Contracts..."
  forge install OpenZeppelin/openzeppelin-contracts --no-commit
fi
if [ ! -d "lib/forge-std" ]; then
  echo "Installing forge-std..."
  forge install foundry-rs/forge-std --no-commit
fi
forge build

echo "[2/5] Running Foundry tests..."
forge test -vvv

echo "[3/5] Verifying Python environment and CLI syntax..."
python -m pip -q install --upgrade pip >/dev/null 2>&1 || true
if [ -f "backend/requirements.txt" ]; then
  python -m pip -q install -r backend/requirements.txt
fi
python -m py_compile scripts/admin_cli.py scripts/deploy_plot_registry.py || true

echo "[4/5] Installing frontend deps (if missing)..."
if [ ! -d "node_modules" ]; then
  npm ci || npm install
fi

echo "[5/5] Building frontend..."
npm run build

echo "✅ Build complete."


