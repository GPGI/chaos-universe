# Smart Contract Deployment Guide

This guide explains how to deploy and manage smart contracts for the Sarakt Land Registry system using Avalanche CLI and Foundry.

## Prerequisites

1. **Avalanche CLI** - Installed and configured
2. **Foundry** - For compiling and deploying contracts
3. **Python 3.11+** - For backend services
4. **Avalanche Subnet Running** - The ChaosStarNetwork subnet should be running

## Setup

### 1. Install Dependencies

```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Configure Environment

Create a `.env` file in the project root (optional - keys are auto-loaded from Avalanche CLI):

```env
# Optional - PRIVATE_KEY is automatically loaded from Avalanche CLI if not set
# PRIVATE_KEY=0x...your_private_key...
VITE_AVALANCHE_RPC=http://127.0.0.1:9650/ext/bc/ChaosStarNetwork/rpc
VITE_CONTRACT_ADDRESS=  # Will be populated after deployment
CHAIN_ID=8987

# Optional: Override subnet name (defaults to ChaosStarNetwork)
# AVALANCHE_SUBNET_NAME=YourSubnetName
```

**Automatic Key Loading**: The system automatically loads the funded account private key from Avalanche CLI. You don't need to manually set PRIVATE_KEY unless you want to use a different account.

### 3. Verify Avalanche Subnet

```bash
avalanche subnet list
```

Ensure the ChaosStarNetwork subnet is running.

## Contract Management

### Using Python CLI

The easiest way to manage contracts:

```bash
# Check deployment status
python scripts/manage_contracts.py status

# Compile contracts
python scripts/manage_contracts.py compile

# Deploy all contracts
python scripts/manage_contracts.py deploy

# Verify deployed contracts
python scripts/manage_contracts.py verify
```

### Using API Endpoints

Start the backend server:

```bash
cd backend
uvicorn app:app --reload
```

Then access contract management endpoints:

- `GET /contracts/status` - Check deployment status
- `GET /contracts/addresses` - Get all contract addresses
- `POST /contracts/deploy` - Deploy all contracts
- `POST /contracts/compile` - Compile contracts
- `POST /contracts/verify` - Verify contracts
- `GET /contracts/check/{contract_name}` - Check specific contract

### Using Foundry Directly

```bash
# Compile
forge build

# Deploy
forge script scripts/deploy_all.s.sol \
  --rpc-url http://127.0.0.1:9650/ext/bc/ChaosStarNetwork/rpc \
  --private-key $PRIVATE_KEY \
  --broadcast

# Check deployment
forge script scripts/check_deployment.s.sol \
  --rpc-url http://127.0.0.1:9650/ext/bc/ChaosStarNetwork/rpc
```

## Contract Deployment Order

Contracts are deployed in this order:

1. **SaraktDigitalID** - Digital identity management
2. **DummyToken** - Test ERC20 token
3. **SaraktTreasury** - Treasury for collecting payments
4. **SaraktLandV2** - Main land registry contract

## Deployment Output

After deployment, addresses are saved to:
- `deployments/addresses.json` - JSON file with all addresses
- `backend/abi/` - Compiled ABIs for each contract

## Contract Addresses

After deployment, update your `.env` file:

```env
VITE_CONTRACT_ADDRESS=<SaraktLandV2_address>
```

Or the addresses will be automatically loaded from `deployments/addresses.json`.

## Verification

The system automatically verifies:
- Contract code exists at addresses
- Contracts are properly connected (Land -> Treasury, Land -> DigitalID)
- Contracts respond to view function calls

## Troubleshooting

### Compilation Errors

If contracts fail to compile:
- Ensure OpenZeppelin contracts are installed: `forge install OpenZeppelin/openzeppelin-contracts`
- Check Solidity version compatibility

### Deployment Errors

- Verify RPC endpoint is accessible
- Check private key has sufficient balance
- Ensure subnet is running: `avalanche subnet status ChaosStarNetwork`

### Connection Issues

- Verify RPC URL is correct
- Check chain ID matches (8987 for ChaosStarNetwork)
- Ensure contracts are deployed before using them

## Smart Contracts

### SaraktLandV2
- Main ERC1155 land registry contract
- Manages 10,000 land plots
- Requires Digital ID for purchases
- Sends payments to Treasury

### SaraktDigitalID
- Manages user digital identities
- Required for land purchases
- Stores username and email hash

### SaraktTreasury
- Collects AVAX and ERC20 payments
- Owner can withdraw funds
- Supports multiple ERC20 tokens

### DummyToken
- Test ERC20 token for development
- 1,000,000 tokens minted to deployer

## Next Steps

After deployment:
1. Activate sales: Call `toggleSales(true)` on SaraktLandV2
2. Register test users: Call `registerID()` on SaraktDigitalID
3. Start selling plots!

