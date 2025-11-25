# Celestial Forge - Avalanche CLI Integration

The Celestial Forge frontend feature is now connected to Avalanche CLI, enabling actual subnet creation and management through the UI.

## Overview

The Celestial Forge allows users to:
- **Create Star Systems** (Avalanche subnets) using Avalanche CLI
- **Spawn Planets** (validator nodes) for star systems
- **Deploy and manage** subnets through the UI

Previously, the Celestial Forge only created database entries. Now it:
1. Creates actual Avalanche subnets using `avalanche subnet create`
2. Configures subnet networks
3. Manages subnet lifecycle (deploy, run, status)
4. Integrates with the automatic CLI detection system

## Architecture

### Backend API (`backend/celestial_forge_api.py`)

**Endpoints:**
- `POST /celestial-forge/spawn-star-system` - Create a new subnet
- `POST /celestial-forge/spawn-planet` - Add a validator node
- `GET /celestial-forge/subnet/{name}/status` - Get subnet status
- `POST /celestial-forge/subnet/{name}/deploy` - Deploy a subnet
- `POST /celestial-forge/subnet/{name}/run` - Run/start a subnet network
- `GET /celestial-forge/tools/status` - Check CLI tools availability

### Frontend Integration

**Updated Files:**
- `src/hooks/useCelestialForge.ts` - Now calls backend API instead of directly inserting into Supabase
- `src/lib/api.ts` - Added Celestial Forge API functions

**Flow:**
1. User clicks "Forge Star System" in UI
2. Frontend calls `spawnStarSystem()` API function
3. Backend validates request and checks for Avalanche CLI
4. Backend creates subnet using `avalanche subnet create`
5. Backend returns subnet configuration (RPC URL, subnet ID, etc.)
6. Frontend creates database entry in Supabase with real subnet info
7. User can then deploy/run the subnet through the UI

## Usage

### Creating a Star System (Subnet)

When a user creates a star system through the Celestial Forge:

1. **Frontend** validates wallet connection and balance
2. **Backend** checks if Avalanche CLI is installed
3. **Backend** executes `avalanche subnet create <name>`
4. **Backend** creates subnet configuration in `~/.avalanche-cli/subnets/<name>/`
5. **Backend** returns subnet information
6. **Frontend** saves to Supabase with status "deploying"

**Response Example:**
```json
{
  "success": true,
  "star_system": {
    "name": "MyStarSystem",
    "subnet_id": "MyStarSystem",
    "rpc_url": "http://127.0.0.1:9650/ext/bc/MyStarSystem/rpc",
    "chain_id": null,
    "owner_wallet": "0x...",
    "tribute_percent": 5.0,
    "status": "deploying"
  },
  "message": "Star system 'MyStarSystem' creation initiated...",
  "next_steps": [
    "Deploy the subnet: avalanche subnet deploy MyStarSystem",
    "Check subnet status: avalanche subnet describe MyStarSystem --local",
    "Run the network: avalanche network run MyStarSystem"
  ]
}
```

### Deploying a Subnet

After creating a star system, users can deploy it:

```typescript
import { deploySubnet } from "@/lib/api";

const result = await deploySubnet("MyStarSystem");
```

This executes `avalanche subnet deploy MyStarSystem`.

### Running a Subnet Network

To start the subnet network:

```typescript
import { runSubnet } from "@/lib/api";

const result = await runSubnet("MyStarSystem");
```

This executes `avalanche network run MyStarSystem`.

### Checking Subnet Status

```typescript
import { getSubnetStatus } from "@/lib/api";

const status = await getSubnetStatus("MyStarSystem");
```

This uses `avalanche subnet describe` and `avalanche network status`.

## Integration Details

### Automatic CLI Detection

The integration uses the CLI detection system to:
- Check if Avalanche CLI is installed before attempting operations
- Provide clear error messages if CLI tools are missing
- Discover available commands automatically

### Error Handling

The system handles various scenarios:
- **CLI Not Installed**: Returns 503 with helpful message
- **Interactive Commands**: Some commands (like `subnet create`) may require interactive input. The system attempts non-interactive mode first, then provides fallback instructions.
- **Timeout**: Long-running operations have appropriate timeouts

### Configuration Discovery

After subnet creation, the system automatically discovers:
- RPC URLs from subnet configuration files
- Blockchain IDs
- Network parameters
- Private keys (if available)

## Workflow

### Complete Star System Creation Flow

1. **User creates star system** in Celestial Forge UI
2. **Backend creates subnet** using Avalanche CLI
   - `avalanche subnet create <name>`
   - Creates configuration in `~/.avalanche-cli/subnets/<name>/`
3. **Backend returns subnet info** (RPC URL, subnet ID, etc.)
4. **Frontend saves to database** with status "deploying"
5. **User can deploy** subnet (`avalanche subnet deploy`)
6. **User can run** network (`avalanche network run`)
7. **Subnet becomes active** and can accept transactions

### Adding a Planet (Validator Node)

1. **User creates planet** for a star system
2. **Backend adds validator** (or provides instructions)
3. **Frontend saves** planet to database
4. **Planet becomes part** of the subnet's validator set

## API Examples

### Check Tools Status

```bash
curl http://localhost:5001/celestial-forge/tools/status
```

Response:
```json
{
  "success": true,
  "tools": {
    "forge": { "installed": true, "version": "..." },
    "avalanche_cli": { "installed": true, "version": "..." }
  },
  "can_create_star_systems": true,
  "can_deploy_contracts": true
}
```

### Create Star System

```bash
curl -X POST http://localhost:5001/celestial-forge/spawn-star-system \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MyStarSystem",
    "owner_wallet": "0x...",
    "tribute_percent": 5.0
  }'
```

### Deploy Subnet

```bash
curl -X POST http://localhost:5001/celestial-forge/subnet/MyStarSystem/deploy
```

## Notes

1. **Interactive Commands**: Some Avalanche CLI commands require interactive input. The system attempts non-interactive mode but may require manual execution for some operations.

2. **Subnet Deployment**: Creating a subnet is separate from deploying it. After creation, use the deploy endpoint or run `avalanche subnet deploy <name>` manually.

3. **Network Running**: A deployed subnet still needs to be run with `avalanche network run <name>` to start the network.

4. **Local Development**: Subnets created locally use local RPC URLs (`http://127.0.0.1:9650/...`). For production, configure appropriate RPC endpoints.

5. **Permissions**: Ensure the backend process has permission to:
   - Write to `~/.avalanche-cli/`
   - Execute Avalanche CLI commands
   - Create subnet configurations

## Future Enhancements

- Automatic deployment after subnet creation
- Async subnet creation with status polling
- Integration with validator staking
- Support for custom VM configurations
- Automatic RPC endpoint configuration for frontend
- Subnet monitoring and health checks

