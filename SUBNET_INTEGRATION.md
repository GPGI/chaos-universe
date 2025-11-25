# Subnet Integration - Automatic Admin Key Connection

## Overview

The project is now fully integrated with Avalanche CLI subnets. All admin keys are automatically discovered from your subnet configuration, and the RPC URLs are automatically detected.

## How It Works

### 1. Automatic RPC URL Discovery

The system automatically discovers RPC URLs from Avalanche CLI subnet configuration:

- **Primary**: Reads from `~/.avalanche-cli/subnets/<subnet_name>/sidecar.json`
- **Network Priority**: 
  1. Local network (for local testnets)
  2. Fuji network (for testnet deployments)
  3. Any available network
- **Fallback**: Uses subnet name as blockchain ID if config not found

### 2. Automatic Admin Key Loading

Admin private keys are automatically loaded from:

- **Primary**: `~/.avalanche-cli/key/*.pk` files
- **Subnet Config**: From subnet configuration files
- **CLI Commands**: From `avalanche subnet describe` output
- **Environment**: Falls back to `PRIVATE_KEY` or `ADMIN_PRIVATE_KEY` in `.env` if not found

### 3. Integrated Components

All parts of the project now use subnet admin keys:

- ✅ **`backend/config.py`** - Auto-loads admin keys and RPC URLs
- ✅ **`backend/services/wallet.py`** - Uses subnet admin keys and RPC
- ✅ **`backend/contract_manager.py`** - Uses subnet admin keys for deployments
- ✅ **`backend/blockchain.py`** - Uses subnet admin keys
- ✅ **`scripts/admin_cli.py`** - Auto-discovers admin keys
- ✅ **`backend/subnet_interaction.py`** - Manages subnet connections

## Configuration

### Setting Subnet Name

By default, the system uses `ChaosStarNetwork`. To use a different subnet:

```bash
# In .env file
AVALANCHE_SUBNET_NAME=Nether
```

Or set environment variable:
```bash
export AVALANCHE_SUBNET_NAME=Nether
```

### Manual Override

If you want to use a specific key or RPC URL instead of auto-discovery:

```env
# .env file
AVALANCHE_SUBNET_NAME=ChaosStarNetwork
PRIVATE_KEY=0x...your_key...
# or
ADMIN_PRIVATE_KEY=0x...your_key...
VITE_AVALANCHE_RPC=http://127.0.0.1:9650/ext/bc/ChaosStarNetwork/rpc
```

Manual settings take precedence over auto-discovery.

## Verification

### Check Configuration

```bash
python3 -c "from backend.config import PRIVATE_KEY, ADMIN_PRIVATE_KEY, AVALANCHE_RPC, SUBNET_NAME; from eth_account import Account; print('Subnet:', SUBNET_NAME); print('RPC:', AVALANCHE_RPC); print('Admin Address:', Account.from_key(PRIVATE_KEY or ADMIN_PRIVATE_KEY).address if (PRIVATE_KEY or ADMIN_PRIVATE_KEY) else 'Not found')"
```

### Test Connection

```bash
python3 scripts/test_avalanche_connection.py
```

### Verify in Backend

When the backend starts, you'll see:

```
✓ Automatically loaded admin private key from Avalanche CLI subnet 'ChaosStarNetwork'
  Admin Account: 0x7852031cbD4b980457962D30D11e7CC684109fEa
  RPC URL: http://127.0.0.1:9650/ext/bc/2vZ2ti5M3zH9PgQt8rfXfwL6mSo1xHgfe97dhpLY5wVhuWsNJd/rpc
```

## Available Subnets

Current subnets configured:
- **ChaosStarNetwork** (default)
- **Nether**

To switch subnets, set `AVALANCHE_SUBNET_NAME` environment variable.

## Admin Operations

All admin operations (contract deployment, transactions, etc.) now automatically use:

1. **Subnet RPC URL** - Discovered from subnet configuration
2. **Subnet Admin Key** - Loaded from key files or subnet config
3. **Subnet Chain ID** - Automatically detected

No manual configuration needed!

## Benefits

✅ **Zero Configuration** - Everything auto-discovers from Avalanche CLI  
✅ **Consistent** - All services use the same admin keys and RPC  
✅ **Secure** - Keys are loaded from secure Avalanche CLI storage  
✅ **Flexible** - Can override with environment variables if needed  
✅ **Multi-Subnet** - Easy to switch between subnets  

## Troubleshooting

### Key Not Found

If admin key is not found:

1. Check if Avalanche CLI is installed: `avalanche --version`
2. Verify subnet exists: `avalanche subnet list`
3. Check key files: `ls ~/.avalanche-cli/key/*.pk`
4. Verify subnet config: `ls ~/.avalanche-cli/subnets/<subnet_name>/`

### RPC URL Not Found

If RPC URL is not discovered:

1. Check subnet sidecar.json: `cat ~/.avalanche-cli/subnets/<subnet_name>/sidecar.json`
2. Verify blockchain ID exists in Networks section
3. Manually set `VITE_AVALANCHE_RPC` in `.env` if needed

### Connection Issues

If connections fail:

1. Ensure subnet is running: `avalanche network status`
2. Verify RPC endpoint is accessible
3. Check network configuration in sidecar.json

## Summary

The project is now fully integrated with Avalanche CLI subnets. All admin keys and RPC URLs are automatically discovered, making it easy to work with different subnets without manual configuration.

