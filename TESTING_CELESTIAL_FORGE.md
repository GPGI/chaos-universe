# Testing the Celestial Forge

This guide explains how to test the Celestial Forge integration with Avalanche CLI.

## Quick Test

Run the simple test script to verify basic functionality:

```bash
python scripts/test_forge_simple.py
```

This will:
- Check if Forge and Avalanche CLI are installed
- Test subnet interactor functionality
- Verify API module imports
- List available subnets

## Full Test Suite

Run the comprehensive test suite:

```bash
python scripts/test_celestial_forge.py
```

This will:
1. **CLI Detection** - Check if tools are installed
2. **API Tools Status** - Test backend API availability
3. **List Subnets** - List available subnets
4. **Create Star System** - Create a test subnet
5. **Subnet Status** - Get subnet status
6. **Blockchain Describe** - Describe blockchain configuration
7. **Network Status** - Get network status
8. **Key List** - List available keys

## Prerequisites

### 1. Start the Backend API

Before running tests that use the API, start the backend:

```bash
cd backend
uvicorn app:app --reload
```

The API should be available at `http://localhost:5001`

### 2. Install Required Tools

**Avalanche CLI:**
```bash
curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh
```

**Forge (Foundry):**
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 3. Verify Installation

```bash
avalanche --version
forge --version
```

## Manual Testing

### Test 1: Check Tools Status

```bash
curl http://localhost:5001/celestial-forge/tools/status
```

Expected response:
```json
{
  "success": true,
  "tools": {
    "forge": { "installed": true, ... },
    "avalanche_cli": { "installed": true, ... }
  },
  "can_create_star_systems": true,
  "can_deploy_contracts": true
}
```

### Test 2: Create a Star System

```bash
curl -X POST http://localhost:5001/celestial-forge/spawn-star-system \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TestStarSystem",
    "owner_wallet": "0x1234567890123456789012345678901234567890",
    "tribute_percent": 5.0
  }'
```

Expected response:
```json
{
  "success": true,
  "star_system": {
    "name": "TestStarSystem",
    "subnet_id": "TestStarSystem",
    "rpc_url": "http://127.0.0.1:9650/ext/bc/TestStarSystem/rpc",
    "status": "deploying"
  },
  "message": "Star system 'TestStarSystem' creation initiated...",
  "next_steps": [...]
}
```

### Test 3: Get Subnet Status

```bash
curl http://localhost:5001/celestial-forge/subnet/TestStarSystem/status
```

### Test 4: Test Subnet Commands

```python
from backend.subnet_interaction import create_subnet_interactor

interactor = create_subnet_interactor("TestStarSystem")

# Get status
status = interactor.get_status()
print(status)

# Describe blockchain
result = interactor.blockchain_describe("TestStarSystem")
print(result)

# Network status
result = interactor.network_status()
print(result)
```

## Frontend Testing

### 1. Start Frontend

```bash
npm run dev
```

### 2. Open Celestial Forge

Navigate to the Unified Universe page and click on the "Celestial Forge" tab.

### 3. Create a Star System

1. Connect your wallet
2. Enter a star system name (at least 3 characters)
3. Set tribute percentage (0-20%)
4. Click "Forge Star System"
5. Monitor the creation process

### 4. Create a Planet

1. Select a star system you own
2. Enter a planet name
3. Select planet type
4. Click "Spawn Planet"
5. Monitor the creation process

## Expected Behavior

### Success Flow

1. **Create Star System**:
   - Backend validates input
   - Checks if Avalanche CLI is installed
   - Creates subnet using `avalanche subnet create`
   - Returns subnet configuration
   - Frontend saves to Supabase with status "deploying"

2. **Deploy Subnet** (if needed):
   - Backend executes `avalanche subnet deploy`
   - Updates subnet status

3. **Run Network**:
   - Backend executes `avalanche network run`
   - Network becomes available

### Error Handling

**CLI Not Installed:**
- API returns 503 status
- Clear error message displayed
- Instructions for installation provided

**Interactive Commands:**
- Some commands may require interactive input
- System attempts non-interactive mode first
- Provides fallback instructions if needed

**Network Issues:**
- Connection errors handled gracefully
- Timeout errors with appropriate messages
- Detailed error messages for debugging

## Troubleshooting

### Backend API Not Running

**Error:** `ConnectionError` or `503 Service Unavailable`

**Solution:**
```bash
cd backend
uvicorn app:app --reload
```

### Avalanche CLI Not Found

**Error:** `Avalanche CLI is not installed`

**Solution:**
```bash
curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh
export PATH=$PATH:$HOME/bin
```

### Forge Not Found

**Error:** `Forge is not installed`

**Solution:**
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Subnet Creation Requires Interactive Input

**Error:** `Command requires interactive input`

**Solution:**
Run the command manually:
```bash
avalanche subnet create YourSubnetName
```

### Network Status Fails

**Error:** `Network status command failed`

**Note:** This is expected if no network is currently running. Start a network first:
```bash
avalanche network run YourSubnetName
```

## Test Results

After running tests, you should see:

```
======================================================================
  Celestial Forge - Avalanche CLI Integration Test Suite
======================================================================

[Results]
✓ CLI Detection
✓ API Tools Status
✓ List Subnets
✓ Create Star System
✓ Subnet Status
✓ Blockchain Describe
⊘ Network Status (expected if no network running)
⊘ Key List (may require interactive input)

Passed: 6
Failed: 0
Skipped: 2
```

## Continuous Testing

For development, you can watch for changes and run tests automatically:

```bash
# Watch backend changes and rerun tests
watch -n 5 'python scripts/test_celestial_forge.py'

# Or use pytest if you convert to pytest format
pytest scripts/test_celestial_forge.py -v
```

## Next Steps

After successful testing:

1. **Deploy Subnets**: Use the deploy endpoint to deploy created subnets
2. **Run Networks**: Start networks using the run endpoint
3. **Add Validators**: Use the planet creation to add validators
4. **Monitor Status**: Check subnet status regularly
5. **Integrate with Frontend**: Test the full UI flow

