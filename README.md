# Sarakt Land Registry - Octavia Nebula Core

A decentralized land registry system built on Avalanche, featuring digital identity management, fractional asset ownership, and an integrated treasury system.

## Project Overview

This project consists of:
- **Frontend**: React + TypeScript + Vite + shadcn-ui
- **Backend**: FastAPI Python backend with blockchain integration
- **Smart Contracts**: Solidity contracts deployed on Avalanche subnet
  - SaraktLandV2: ERC1155 land registry (10,000 plots)
  - SaraktDigitalID: Digital identity management
  - SaraktTreasury: Payment collection system
  - FractionalAsset: Fractional ownership of assets
  - DummyToken: Test ERC20 token

## Quick Start

### Prerequisites

1. **Node.js & npm** - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
2. **Python 3.11+** - For backend services
3. **Foundry** - For smart contract compilation
4. **Avalanche CLI** - For subnet management

### Setup

```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
cd backend
pip install -r requirements.txt

# 3. Install OpenZeppelin contracts (if not already done)
cd ..
forge install OpenZeppelin/openzeppelin-contracts

# 4. Configure environment (optional - keys auto-load from Avalanche CLI)
cp .env.example .env
# Edit .env if you need custom settings (PRIVATE_KEY auto-loads from Avalanche CLI)
```

### Running the Application

**Quick Start (Recommended)**:
```bash
# Linux/Mac
./start.sh

# Windows
start.bat

# Or using npm
npm start        # Linux/Mac
npm run start:win # Windows
```

This will:
- ✅ Check and install dependencies automatically
- ✅ Start backend server on port 5001
- ✅ Start frontend server on port 8080
- ✅ Open browser automatically
- ✅ Show server logs

**Manual Start**:
```bash
# Terminal 1 - Backend
cd backend && uvicorn app:app --reload

# Terminal 2 - Frontend
npm run dev
```

### New Backend APIs (Phase 1)

- Economy
  - GET `/economy/currencies`
  - GET `/economy/treasury`
  - POST `/economy/treasury/config`
  - POST `/economy/treasury/adjust-inflation`
- NPCs
  - POST `/npcs/spawn`
  - GET `/npcs/`
  - POST `/npcs/evolve`
- City
  - GET `/city/zones`
  - POST `/city/plots`
  - GET `/city/plots`
  - POST `/city/plots/occupancy`
  - POST `/city/plots/project-rent`
- Governance
  - POST `/governance/factions`
  - GET `/governance/factions`
  - POST `/governance/policies`
  - GET `/governance/policies`
  - GET `/governance/black-market`
  - POST `/governance/black-market/liquidity`
- Portfolio
  - POST `/portfolio/upsert`
  - GET `/portfolio/{wallet}`
  - GET `/portfolio/{wallet}/loans`
  - POST `/portfolio/project`

Set `VITE_API_URL` (e.g. `http://localhost:5001`) for the frontend to call the backend.

### Admin CLI Enhancements

The CLI at `scripts/admin_cli.py` now supports economy/NPC/city/governance/portfolio management via the backend API.

Examples:

```bash
# Treasury
python3 scripts/admin_cli.py treasury-show
python3 scripts/admin_cli.py treasury-config --btc 0.30 --stable 0.20 --avax 0.125 --eth 0.125 --matic 0.125 --xrp 0.125 --coverage 1.0 --mode elastic
python3 scripts/admin_cli.py treasury-adjust --growth 0.02 --utilization 1.05

# NPCs
python3 scripts/admin_cli.py npcs-list
python3 scripts/admin_cli.py npcs-spawn --count 5 --cohort child

# City
python3 scripts/admin_cli.py city-zones
python3 scripts/admin_cli.py city-plots
python3 scripts/admin_cli.py city-create-plot --zone residential --subtype hut --base-rent 10

# Governance
python3 scripts/admin_cli.py gov-factions
python3 scripts/admin_cli.py gov-create-faction --name "Octavia Guild" --description "Builders and traders"
python3 scripts/admin_cli.py gov-black-market
python3 scripts/admin_cli.py gov-liquidity --asset XMR --amount 100

# Portfolio
python3 scripts/admin_cli.py portfolio-upsert --wallet 0xabc... --holding plot,42,1000,0.05 --monthly 100
python3 scripts/admin_cli.py portfolio-show --wallet 0xabc...
python3 scripts/admin_cli.py portfolio-loans --wallet 0xabc...
python3 scripts/admin_cli.py portfolio-project --wallet 0xabc... --years 5 --return-rate 0.07
```

### Demo Seeding

Seed basic demo data (NPCs, plots, factions, black market liquidity, demo portfolio):

```bash
API_BASE=http://localhost:5001 DEMO_WALLET=0x000000000000000000000000000000000000dEaD python3 scripts/seed_demo.py
```

### Supabase Managers Schema

Run migrations to create portfolio managers tables:

```bash
# Using Supabase CLI (ensure supabase/config.toml is configured)
supabase db push
```

Tables created:
- `portfolio_managers` (approved managers with performance stats)
- `portfolio_followers` (followers and allocations)

### Smart Contract Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

Quick deployment:
```bash
# Check contract status
python3 scripts/manage_contracts.py status

# Deploy all contracts
python3 scripts/manage_contracts.py deploy
```

## Project info

**URL**: https://lovable.dev/projects/1923dca6-e967-4648-a412-7756ea630ca1

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1923dca6-e967-4648-a412-7756ea630ca1) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1923dca6-e967-4648-a412-7756ea630ca1) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
