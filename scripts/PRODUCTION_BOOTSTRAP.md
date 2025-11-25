# Production Bootstrap Guide

Complete guide for bootstrapping the Octavia Nebula Core project for production deployment.

## Quick Start

```bash
# Full production bootstrap and start
bash scripts/start_all.sh --production

# Development bootstrap and start
bash scripts/start_all.sh --bootstrap

# Standalone bootstrap only
bash scripts/bootstrap_production.sh production
```

## What Gets Bootstrapped

### 1. Backend Setup ✅

- **Virtual Environment**: Creates Python venv if needed
- **Dependencies**: Installs all packages from `backend/requirements.txt`
- **Pip Upgrade**: Ensures latest pip version

**Requirements:**
- Python 3.11+
- `backend/requirements.txt` exists

### 2. Frontend Setup ✅

- **Dependencies**: Installs npm packages from `package.json`
- **Production Build**: Builds optimized production bundle (if `--production`)
- **Static Assets**: Generates optimized assets

**Requirements:**
- Node.js 18+
- `package.json` exists

### 3. Database Migrations ✅

- **Supabase Migrations**: Runs all SQL migrations from `supabase/migrations/`
- **Table Creation**: Creates all required tables (star_systems, planets, etc.)
- **Schema Setup**: Configures database schema

**Requirements:**
- Supabase CLI installed (`npm install -g supabase`)
- Supabase project configured
- Database connection available

**Optional:** If Supabase CLI is not available, migrations can be run manually or skipped.

### 4. Smart Contract Deployment ✅

- **Compilation**: Compiles Solidity contracts using Foundry
- **Deployment**: Deploys contracts to subnet in correct order:
  1. SaraktDigitalID
  2. DummyToken
  3. SaraktTreasury
  4. SaraktLandV2
- **ABI Extraction**: Automatically extracts ABIs from compiled contracts
- **Address Storage**: Saves contract addresses to `deployments/addresses.json`

**Requirements:**
- Foundry installed (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- Avalanche subnet running
- PRIVATE_KEY set (or auto-loaded from Avalanche CLI)
- Sufficient balance for gas fees

**Smart Detection:** Script checks if contracts are already deployed and skips if present.

### 5. Seed Data ✅

- **Sarakt Star System**: Creates the default star system
- **Sarakt Prime**: Adds the habitable planet
- **Zythera**: Adds the research planet
- **Demo Data**: Runs demo seed script (if available)

**Automatic:** Seed data is created automatically when backend API is called. The bootstrap script triggers this via API call.

### 6. Verification ✅

- **Backend Check**: Verifies Python environment and dependencies
- **Frontend Check**: Verifies Node.js dependencies
- **Contracts Check**: Verifies contract addresses file exists
- **Avalanche CLI**: Checks if CLI is installed and configured
- **Subnets**: Lists available subnets

## Production Mode vs Development Mode

### Development Mode (`--bootstrap`)

```bash
bash scripts/start_all.sh --bootstrap
```

- Runs all bootstrap steps
- Starts backend with `--reload` (hot-reload enabled)
- Starts frontend with `npm run dev` (Vite dev server)
- Development-friendly error messages
- Source maps enabled

### Production Mode (`--production`)

```bash
bash scripts/start_all.sh --production
```

- Runs all bootstrap steps
- **Builds frontend** for production (`npm run build`)
- Starts backend **without** `--reload` (no hot-reload)
- Starts frontend with `npm run preview` (serves production build)
- Optimized bundle sizes
- Production-ready configuration

## Manual Bootstrap Steps

If you prefer to bootstrap manually:

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Frontend

```bash
npm install

# For production build:
npm run build
```

### 3. Database

```bash
# If Supabase CLI is installed:
supabase db push

# Or run migrations manually via Supabase dashboard
```

### 4. Contracts

```bash
# Activate backend venv first
cd backend
source venv/bin/activate
cd ..

# Deploy contracts
python3 scripts/manage_contracts.py deploy

# Or via API (after backend is running):
curl -X POST http://localhost:5001/contracts/deploy
```

### 5. Seed Data

```bash
# Seed data is automatically created when API is called
curl http://localhost:5001/celestial-forge/star-systems

# Or run demo seed:
API_BASE=http://localhost:5001 python3 scripts/seed_demo.py
```

## Troubleshooting

### Bootstrap Fails on Dependencies

```bash
# Check Python version
python3 --version  # Should be 3.11+

# Check Node.js version
node --version  # Should be 18+

# Manual install
cd backend && source venv/bin/activate && pip install -r requirements.txt
cd .. && npm install
```

### Database Migrations Fail

```bash
# Install Supabase CLI
npm install -g supabase

# Check Supabase connection
supabase status

# Run migrations manually
supabase db push
```

### Contract Deployment Fails

```bash
# Check Foundry installation
forge --version

# Install Foundry if needed
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Check subnet is running
avalanche subnet list

# Verify PRIVATE_KEY is set or auto-loaded
python3 scripts/test_avalanche_connection.py

# Manual deployment
python3 scripts/manage_contracts.py deploy
```

### Seed Data Not Created

Seed data is automatically created when the API endpoint is called. To manually trigger:

```bash
# Wait for backend to be ready, then:
curl http://localhost:5001/celestial-forge/star-systems
curl http://localhost:5001/celestial-forge/planets
```

## Environment Variables

Bootstrap uses environment variables from `.env` file (optional):

```env
# Optional - keys are auto-loaded from Avalanche CLI
# PRIVATE_KEY=0x...
# ADMIN_PRIVATE_KEY=0x...

# Subnet configuration (auto-discovered from Avalanche CLI)
# AVALANCHE_SUBNET_NAME=ChaosStarNetwork

# Frontend API URL
VITE_API_URL=http://localhost:5001

# Contract addresses (auto-populated after deployment)
# VITE_CONTRACT_ADDRESS=...
# VITE_TREASURY_ADDRESS=...
```

## Production Deployment Checklist

- [ ] Run `bash scripts/start_all.sh --production`
- [ ] Verify backend is running: `curl http://localhost:5001/health`
- [ ] Verify frontend is accessible: `curl http://localhost:8080`
- [ ] Check contracts are deployed: `curl http://localhost:5001/contracts/status`
- [ ] Verify seed data exists: `curl http://localhost:5001/celestial-forge/star-systems`
- [ ] Test Avalanche CLI connection: `bash scripts/verify_avalanche_connection.sh`
- [ ] Check logs for errors: `tail -f /tmp/backend.log /tmp/frontend.log`

## Next Steps

After bootstrap:

1. **Verify Everything Works:**
   ```bash
   # Check all endpoints
   curl http://localhost:5001/health
   curl http://localhost:5001/contracts/status
   curl http://localhost:5001/celestial-forge/star-systems
   ```

2. **Access the Application:**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:5001
   - API Docs: http://localhost:5001/docs

3. **Set Up Public Access** (optional):
   ```bash
   # Use tunnel scripts if needed
   bash scripts/start_tunnel.sh
   ```

## Scripts Reference

- **`scripts/start_all.sh`** - Start both servers (with optional bootstrap)
- **`scripts/bootstrap_production.sh`** - Standalone bootstrap script
- **`scripts/verify_avalanche_connection.sh`** - Verify Avalanche CLI setup
- **`scripts/manage_contracts.py`** - Contract management CLI
- **`scripts/test_avalanche_connection.py`** - Test Avalanche connectivity

