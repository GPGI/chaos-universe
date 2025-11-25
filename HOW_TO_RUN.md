# How to Run the Project

## Quick Start (Recommended)

### First Time Setup (Bootstrap)

For first-time setup or production deployment, run with bootstrap:

```bash
# Development mode with bootstrap
bash scripts/start_all.sh --bootstrap

# Production mode (full bootstrap + production build)
bash scripts/start_all.sh --production
```

The bootstrap process will:
- ✅ Set up Python virtual environment
- ✅ Install backend dependencies
- ✅ Install frontend dependencies
- ✅ Build frontend for production (if `--production`)
- ✅ Run database migrations (Supabase)
- ✅ Deploy smart contracts (Foundry)
- ✅ Seed initial data (Sarakt Prime, Zythera)
- ✅ Verify all components

### Normal Start

Once bootstrapped, you can start normally:

```bash
bash scripts/start_all.sh
```

This script will:
- ✅ Kill any processes on ports 5001 and 8080
- ✅ Start the backend on port 5001
- ✅ Start the frontend on port 8080
- ✅ Verify Avalanche CLI connection
- ✅ Test backend connection
- ✅ Show logs from both servers
- ✅ Press `Ctrl+C` to stop both servers

## Individual Services

### Backend Only

```bash
cd backend
source venv/bin/activate  # or: source .venv/bin/activate
uvicorn app:app --reload --host 0.0.0.0 --port 5001
```

### Frontend Only

```bash
npm run dev
```

## URLs

After starting:

- **Backend**: http://localhost:5001
- **API Docs**: http://localhost:5001/docs
- **Health Check**: http://localhost:5001/health
- **Frontend**: http://localhost:8080

## Production Bootstrap

The bootstrap script (`scripts/bootstrap_production.sh`) can be run standalone or integrated into `start_all.sh`:

```bash
# Standalone bootstrap
bash scripts/bootstrap_production.sh

# Bootstrap for production
bash scripts/bootstrap_production.sh production
```

### Bootstrap Steps

1. **Backend Setup**
   - Creates virtual environment if needed
   - Installs Python dependencies from `requirements.txt`
   - Upgrades pip

2. **Frontend Setup**
   - Installs Node.js dependencies
   - Builds frontend for production (if `--production` mode)

3. **Database Migrations**
   - Runs Supabase migrations (if Supabase CLI available)
   - Creates tables for star_systems, planets, etc.

4. **Contract Deployment**
   - Compiles Solidity contracts (Foundry)
   - Deploys contracts to subnet
   - Extracts ABIs and saves addresses

5. **Seed Data**
   - Creates Sarakt Star System
   - Adds Sarakt Prime and Zythera planets
   - Runs demo seed script (if available)

6. **Verification**
   - Checks all components are ready
   - Verifies Avalanche CLI connection
   - Confirms contract deployment

## Requirements

### Backend
- Python 3.11+
- Virtual environment (auto-created by bootstrap)
- Dependencies (auto-installed by bootstrap)
- Avalanche CLI (optional, for subnet operations)

### Frontend
- Node.js 18+
- npm packages (auto-installed by bootstrap)

### Optional Tools
- **Foundry** - For smart contract compilation/deployment
- **Supabase CLI** - For database migrations
- **Avalanche CLI** - For subnet management

## Troubleshooting

### Port Already in Use

The `start_all.sh` script automatically kills processes on ports 5001 and 8080. If you still have issues:

```bash
# Kill process on port 5001
lsof -ti :5001 | xargs kill -9

# Kill process on port 8080
lsof -ti :8080 | xargs kill -9
```

### Backend Not Starting

1. Check if virtual environment is activated
2. Verify dependencies are installed: `pip install -r backend/requirements.txt`
3. Check backend logs: `tail -f /tmp/backend.log`

### Frontend Not Starting

1. Verify Node.js is installed: `node --version`
2. Install dependencies: `npm install`
3. Check frontend logs: `tail -f /tmp/frontend.log`

## Command Options

### start_all.sh Options

```bash
# Normal start (assumes already bootstrapped)
bash scripts/start_all.sh

# Development mode with bootstrap
bash scripts/start_all.sh --bootstrap

# Production mode (full bootstrap + production build)
bash scripts/start_all.sh --production
# or
bash scripts/start_all.sh --prod
```

### What Happens in Each Mode

**Normal Mode:**
- Starts servers in development mode (with hot-reload)
- Skips bootstrap (assumes setup is complete)
- Uses Vite dev server

**Bootstrap Mode:**
- Runs full bootstrap (migrations, contracts, seed data)
- Starts servers in development mode
- Auto-seeds Sarakt Prime and Zythera

**Production Mode:**
- Runs full bootstrap
- Builds frontend for production
- Starts servers in production mode (no hot-reload)
- Uses production-optimized settings

## Other Scripts

- **Bootstrap standalone**: `bash scripts/bootstrap_production.sh`
- **Verify Avalanche CLI connection**: `bash scripts/verify_avalanche_connection.sh`
- **Test Avalanche connection**: `python3 scripts/test_avalanche_connection.py`
- **Start tunnel** (if configured): `bash scripts/start_tunnel.sh`
- **Deploy contracts manually**: `python3 scripts/manage_contracts.py deploy`

## Logs

When running with `start_all.sh`, logs are shown in the terminal. You can also check log files:

```bash
# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log
```

