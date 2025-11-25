# Mock Star System & Planet Interaction Guide

You can now create mock star systems and planets and interact with them through the API!

## Features

### ✅ Create Mock Star Systems & Planets
- Create star systems without Avalanche CLI
- Create planets without balance requirements
- All data saved to Supabase

### ✅ View & List
- List all star systems
- Get details of a specific star system
- List planets (filtered by star system or owner)
- Get details of a specific planet

### ✅ Interact & Manage
- Update star system status (active, deploying, inactive)
- Update planet status (active, deploying, inactive)
- Deploy star systems (for mock systems, just activates them)

## API Endpoints

### List Star Systems

```bash
# List all star systems
GET /celestial-forge/star-systems

# List star systems by owner
GET /celestial-forge/star-systems?owner_wallet=0x...
```

**Response:**
```json
{
  "success": true,
  "star_systems": [
    {
      "id": "...",
      "name": "MyStarSystem",
      "subnet_id": "mock-mystarsystem-1234567890",
      "owner_wallet": "0x...",
      "rpc_url": "http://127.0.0.1:9650/ext/bc/...",
      "status": "active",
      "treasury_balance": {"xBGL": 0, "AVAX": 0},
      "planets": [],
      "created_at": "..."
    }
  ],
  "count": 1
}
```

### Get Star System Details

```bash
GET /celestial-forge/star-systems/{system_id}
# or by name
GET /celestial-forge/star-systems/MyStarSystem
```

**Response:**
```json
{
  "success": true,
  "star_system": {
    "id": "...",
    "name": "MyStarSystem",
    "subnet_id": "mock-mystarsystem-1234567890",
    "owner_wallet": "0x...",
    "rpc_url": "http://127.0.0.1:9650/ext/bc/...",
    "chain_id": 950123,
    "status": "active",
    "tribute_percent": 5.0,
    "treasury_balance": {"xBGL": 0, "AVAX": 0},
    "planets": [],
    "created_at": "..."
  },
  "planets": [
    {
      "id": "...",
      "name": "MyPlanet",
      "star_system_id": "...",
      "node_type": "master",
      "owner_wallet": "0x...",
      "status": "active",
      "planet_type": "habitable",
      "created_at": "..."
    }
  ]
}
```

### List Planets

```bash
# List all planets
GET /celestial-forge/planets

# List planets by star system
GET /celestial-forge/planets?star_system_id=...

# List planets by owner
GET /celestial-forge/planets?owner_wallet=0x...
```

### Get Planet Details

```bash
GET /celestial-forge/planets/{planet_id}
# or by name
GET /celestial-forge/planets/MyPlanet
```

**Response:**
```json
{
  "success": true,
  "planet": {
    "id": "...",
    "name": "MyPlanet",
    "star_system_id": "...",
    "node_type": "master",
    "owner_wallet": "0x...",
    "ip_address": "10.123.45.67",
    "status": "active",
    "planet_type": "habitable",
    "created_at": "..."
  },
  "star_system": {
    "id": "...",
    "name": "MyStarSystem",
    ...
  }
}
```

### Update Star System Status

```bash
PATCH /celestial-forge/star-systems/{system_id}/status
Content-Type: application/json

{
  "status": "active"  # or "deploying" or "inactive"
}
```

### Update Planet Status

```bash
PATCH /celestial-forge/planets/{planet_id}/status
Content-Type: application/json

{
  "status": "active"  # or "deploying" or "inactive"
}
```

### Deploy Star System

```bash
POST /celestial-forge/star-systems/{system_id}/deploy
```

**For mock systems:**
- Immediately updates status to "active"
- Returns success message

**Response:**
```json
{
  "success": true,
  "star_system": {...},
  "message": "Star system 'MyStarSystem' deployed successfully (mock mode)",
  "mock": true
}
```

## Frontend Usage

### Using the Hook

```typescript
import { useCelestialForge } from "@/hooks/useCelestialForge";

const {
  starSystems,
  userStarSystems,
  spawnStarSystem,
  spawnPlanet,
  fetchStarSystems,
  updateStarSystemStatus,
  updatePlanetStatus,
  deployStarSystem,
  getStarSystemDetails,
  getPlanetDetails,
} = useCelestialForge();

// Create a mock star system
await spawnStarSystem("MyStarSystem", 5.0);

// Deploy a star system
await deployStarSystem(systemId);

// Update status
await updateStarSystemStatus(systemId, "active");

// Get details
const details = await getStarSystemDetails(systemId);
console.log(details.star_system);
console.log(details.planets);
```

## Example Workflow

### 1. Create a Mock Star System

```bash
curl -X POST "http://localhost:5001/celestial-forge/spawn-star-system?mock=true" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TestSystem",
    "owner_wallet": "0x96ddab023a0e95e61a976b1a2fc98d7ab4901c33",
    "tribute_percent": 5.0
  }'
```

### 2. List Your Star Systems

```bash
curl "http://localhost:5001/celestial-forge/star-systems?owner_wallet=0x96ddab023a0e95e61a976b1a2fc98d7ab4901c33"
```

### 3. Get Star System Details

```bash
curl "http://localhost:5001/celestial-forge/star-systems/TestSystem"
```

### 4. Create a Planet

```bash
curl -X POST "http://localhost:5001/celestial-forge/spawn-planet?mock=true" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TestPlanet",
    "star_system_id": "...",
    "star_system_name": "TestSystem",
    "owner_wallet": "0x96ddab023a0e95e61a976b1a2fc98d7ab4901c33",
    "planet_type": "habitable"
  }'
```

### 5. List Planets

```bash
curl "http://localhost:5001/celestial-forge/planets?star_system_id=..."
```

### 6. Deploy Star System

```bash
curl -X POST "http://localhost:5001/celestial-forge/star-systems/{system_id}/deploy"
```

### 7. Update Status

```bash
curl -X PATCH "http://localhost:5001/celestial-forge/star-systems/{system_id}/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

## Status Values

### Star System Status
- `deploying` - System is being created/deployed
- `active` - System is active and operational
- `inactive` - System is inactive (stopped)

### Planet Status
- `deploying` - Planet is being created/deployed
- `active` - Planet is active and operational
- `inactive` - Planet is inactive (stopped)

## Notes

- **Mock Mode**: All star systems and planets created with `mock=true` are fully functional in the database
- **No Balance Required**: You can create unlimited mock star systems and planets
- **Real Data**: All mock data is saved to Supabase and behaves like real data
- **Status Management**: You can update statuses to simulate deployment lifecycle
- **Interactions**: All CRUD operations work on mock star systems and planets

## UI Integration

The frontend hook provides all the necessary functions to interact with star systems and planets. You can:

1. Create star systems/planets from UI
2. View your star systems/planets
3. Deploy star systems
4. Update statuses
5. View details

All interactions work seamlessly with mock data!

