# Mock Mode - Celestial Forge

The Celestial Forge now operates in **mock mode by default**, allowing you to create star systems and planets without:
- Balance checks
- Avalanche CLI installation
- Real subnet deployment
- Blockchain transactions

## What Changed

### ✅ Removed Balance Checks
- **Frontend**: No longer checks wallet balance before creating star systems or planets
- **Backend**: Always uses mock mode by default
- **UI**: Updated message indicates mock mode is active

### ✅ Mock Mode Default
- Star systems are created as mock subnets
- Planets are created as mock validator nodes
- All data is saved to Supabase but no real blockchain operations occur
- Perfect for UI testing and development

## How It Works

### Creating a Star System

**Before (with balance check):**
```typescript
// Check user balance
const balance = await signer.provider!.getBalance(address);
const cost = ethers.parseEther(STAR_SYSTEM_COST.toString());
if (balance < cost) {
  throw new Error(`Insufficient balance. Need ${STAR_SYSTEM_COST} AVAX`);
}
```

**After (mock mode):**
```typescript
// Balance check removed - allowing mock star system creation
const apiResult = await apiSpawnStarSystem({
  name,
  owner_wallet: address,
  tribute_percent: tributePercent,
  mock: true, // Always use mock mode
});
```

### Backend Response

**Mock Star System:**
```json
{
  "success": true,
  "star_system": {
    "name": "TestSystem",
    "subnet_id": "mock-testsystem-1234567890",
    "rpc_url": "http://127.0.0.1:9650/ext/bc/mock-testsystem-1234567890/rpc",
    "chain_id": 950123,
    "status": "active",
    "mock": true
  },
  "message": "Star system 'TestSystem' created successfully!",
  "next_steps": [
    "This is a MOCK star system (for testing)",
    "Create planets to populate your star system"
  ]
}
```

## UI Changes

### Updated Messages

**Star System Creation:**
- ❌ Old: "Spawning a star system creates a new Avalanche subnet tied to the primary network. Deployment takes 10-15 minutes. Your wallet balance: X AVAX"
- ✅ New: "Spawning a star system creates a mock subnet for testing. No balance required - you can create star systems and planets freely!"

### No Balance Requirements

- ✅ Create unlimited star systems
- ✅ Create unlimited planets
- ✅ No wallet balance needed
- ✅ No real AVAX required
- ✅ Perfect for UI testing

## Testing

You can now test the entire flow without any prerequisites:

1. **Start Backend:**
   ```bash
   cd backend && uvicorn app:app --reload
   ```

2. **Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Create Star Systems:**
   - Navigate to Unified Universe → Celestial Forge
   - Enter any name (minimum 3 characters)
   - Set tribute percentage (0-20%)
   - Click "Spawn Star System"
   - ✅ Works without balance!

4. **Create Planets:**
   - Select your created star system
   - Enter planet name
   - Choose planet type
   - Click "Spawn Planet"
   - ✅ Works without balance!

## API Usage

### Create Mock Star System

```bash
curl -X POST "http://localhost:5001/celestial-forge/spawn-star-system?mock=true" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MyTestSystem",
    "owner_wallet": "0x1234567890123456789012345678901234567890",
    "tribute_percent": 5.0
  }'
```

### Create Mock Planet

```bash
curl -X POST "http://localhost:5001/celestial-forge/spawn-planet?mock=true" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MyTestPlanet",
    "star_system_id": "MyTestSystem",
    "star_system_name": "MyTestSystem",
    "owner_wallet": "0x1234567890123456789012345678901234567890",
    "planet_type": "habitable"
  }'
```

### Auto-Mock Mode

If `mock` parameter is not specified, the system:
1. **Defaults to mock=True** (always mock for testing)
2. Falls back to real mode only if explicitly requested and CLI is available

## Mock Data Structure

### Mock Star System
- **Subnet ID**: `mock-{name}-{timestamp}`
- **Chain ID**: Random 900000-999999
- **RPC URL**: `http://127.0.0.1:9650/ext/bc/{blockchain_id}/rpc`
- **Status**: `active` (immediately)
- **Mock Flag**: `true`

### Mock Planet
- **Node Type**: `master`
- **Status**: `active` (immediately)
- **Mock Flag**: `true`
- **Planet Type**: As specified (habitable, resource, research, military)

## Benefits

1. **Fast Testing**: No need to wait for blockchain transactions
2. **No Costs**: No real AVAX needed for testing
3. **Simple Setup**: Works without Avalanche CLI installation
4. **UI Development**: Perfect for frontend development
5. **Data Validation**: All UI flows work the same way

## Production Mode

To use real subnets in production:

1. **Install Avalanche CLI**
2. **Set `mock=false`** in API calls
3. **Enable balance checks** (if needed)
4. **Configure real RPC endpoints**

## Notes

- Mock data is saved to Supabase normally
- All UI flows work identically
- Mock subnets have realistic data structures
- Perfect for demos and testing
- Can be switched to real mode later

