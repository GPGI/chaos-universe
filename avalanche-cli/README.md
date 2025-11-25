# Avalanche CLI Transfer Module

This module provides utilities for transferring AVAX and tokens using Avalanche CLI discovered configuration.

## Features

- **Automatic Configuration Discovery**: Automatically discovers RPC URLs and private keys from Avalanche CLI
- **AVAX Transfers**: Transfer native AVAX between addresses
- **Token Transfers**: Transfer ERC20 tokens between addresses
- **Balance Queries**: Check AVAX and token balances
- **Network Discovery**: Discover subnet information from Avalanche CLI

## Installation

The module uses the following dependencies (should already be in `backend/requirements.txt`):
- `web3`
- `eth-account`

## Usage

### Basic AVAX Transfer

```python
from avalanche_cli.transfer import transfer_avax
from decimal import Decimal

# Transfer 1 AVAX (auto-discovers RPC and key from CLI)
result = transfer_avax(
    to_address="0x...",
    amount_avax=Decimal("1.0"),
    subnet_name="ChaosStarNetwork"
)

if result.success:
    print(f"Transfer successful! TX: {result.tx_hash}")
else:
    print(f"Transfer failed: {result.error}")
```

### Token Transfer

```python
from avalanche_cli.transfer import transfer_token
from decimal import Decimal

# Transfer 100 tokens
result = transfer_token(
    to_address="0x...",
    token_address="0x...",  # ERC20 token address
    amount=Decimal("100.0"),
    subnet_name="ChaosStarNetwork"
)
```

### Check Balance

```python
from avalanche_cli.transfer import get_balance, get_token_balance

# Check AVAX balance
balance = get_balance("0x...", subnet_name="ChaosStarNetwork")
print(f"Balance: {balance} AVAX")

# Check token balance
token_balance = get_token_balance(
    "0x...",
    "0x...",  # token address
    subnet_name="ChaosStarNetwork"
)
print(f"Token balance: {token_balance}")
```

### Discover Network Info

```python
from avalanche_cli.cli_utils import discover_from_cli, get_network_info

# Discover RPC and key
rpc_url, private_key = discover_from_cli("ChaosStarNetwork")

# Get comprehensive network info
info = get_network_info("ChaosStarNetwork")
print(f"RPC: {info['rpc_url']}")
print(f"Blockchain ID: {info.get('blockchain_id')}")
```

## Manual Configuration

You can also provide RPC URL and private key manually:

```python
result = transfer_avax(
    to_address="0x...",
    amount_avax=Decimal("1.0"),
    rpc_url="http://127.0.0.1:9650/ext/bc/.../rpc",
    from_key="0x..."
)
```

## Environment Variables

The module respects these environment variables:
- `VITE_AVALANCHE_RPC` or `AVALANCHE_RPC`: RPC URL
- `PRIVATE_KEY`: Private key (takes precedence over CLI discovery)
- `AVALANCHE_SUBNET_NAME`: Default subnet name

## Error Handling

All transfer functions return a `TransferResult` named tuple:
- `success`: Boolean indicating if transfer succeeded
- `tx_hash`: Transaction hash (if successful)
- `error`: Error message (if failed)
- `gas_used`: Gas used in transaction
- `block_number`: Block number where transaction was mined

## Integration with Backend API

This module can be integrated into the FastAPI backend to provide transfer endpoints.

