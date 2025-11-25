# Sarakt Project - Phase 1

## Contracts
- `src/contracts/PlotRegistry1155.sol`: ERC-1155 land registry
  - IDs 1..10000, max supply 1
  - Admin/minter activates with `activate(plotId, wallet, uri)`
  - Owner requests transfer via `requestTransfer(plotId, newOwner)`
  - Admin approves via `adminApproveTransfer(plotId)`
  - Metadata per id via `uri(id)`

### Build & Test
```bash
forge build
forge test -vvv
```

### Auto-Deploy PlotRegistry1155
```bash
# 1) Build contracts
forge build

# 2) Deploy (auto-discovers RPC and key from Avalanche CLI if not set)
python scripts/deploy_plot_registry.py

# Writes deployments/addresses.json (or .testnet.json in SIMULATION_MODE) with:
# {
#   "plotRegistry": "0x..."
# }
```

## Admin CLI (Python)
`scripts/admin_cli.py`

### .env
```
VITE_AVALANCHE_RPC=http://127.0.0.1:9650/ext/bc/YourSubnet/rpc
TESTNET_RPC=...
PRIVATE_KEY=0x...               # admin key (subnet funded)
PLOT_REGISTRY_ADDRESS=0x...     # deployed address
# Optional for owner actions:
OWNER_PRIVATE_KEY=0x...
# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=app_password
EMAIL_FROM=your@gmail.com
# Optional Avalanche CLI auto-discovery
AVALANCHE_SUBNET_NAME=ChaosStarNetwork
```

### Commands
```bash
# Activate single plot
python scripts/admin_cli.py activate --plot 123 --wallet 0xBuyer --uri ipfs://...

# Activate batch from CSV (headers: plot,wallet,uri)
python scripts/admin_cli.py activate-batch --csv buyers.csv

# Owner-side: request transfer
OWNER_PRIVATE_KEY=0x... python scripts/admin_cli.py request-transfer --plot 123 --buyer 0xNew

# Admin approval
python scripts/admin_cli.py approve-transfer --plot 123
```

CLI writes logs to `scripts/admin_logs.sqlite`.

### Avalanche CLI Auto-Discovery
- If `VITE_AVALANCHE_RPC`/`TESTNET_RPC` is not set, the CLI will attempt to read `~/.avalanche-cli/subnets/<AVALANCHE_SUBNET_NAME>/network.json` to obtain the RPC URL.
- If `PRIVATE_KEY` is not set, the CLI will try to read a funded key from `~/.avalanche-cli/key/` (e.g., `<subnet>.pk`).

## Backend Activation (optional)
`POST /contracts/activate` accepts `{ plotId, recipient?, owner_email? }` and will email a PDF deed when configured.

## Avalanche CLI Integration
- Create and start your subnet via Avalanche CLI
- Set RPC URL in `.env` (`VITE_AVALANCHE_RPC` or `TESTNET_RPC`)
- Fund your admin wallet and set `PRIVATE_KEY`


