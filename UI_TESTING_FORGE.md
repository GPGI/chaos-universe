# UI Testing Guide - Celestial Forge

This guide explains how to test the Celestial Forge UI for creating star systems and planets.

## Quick Start

### Option 1: Automated Setup (Recommended)

Start both backend and frontend automatically:

```bash
bash scripts/test_ui_forge.sh
```

This will:
- Check if backend/frontend are already running
- Start backend on http://localhost:5001
- Start frontend on http://localhost:8080
- Open the browser automatically (if configured)

### Option 2: Manual Setup

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn app:app --reload
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Terminal 3 - Test Simulation:**
```bash
python scripts/simulate_ui_forge.py
```

## UI Testing Flow

### Step 1: Open the Application

1. Open http://localhost:8080 in your browser
2. Navigate to the **"Unified Universe"** page
3. Click on the **"Celestial Forge"** tab

### Step 2: Connect Wallet

1. Click **"Connect Wallet"** button
2. Select your wallet provider (MetaMask, WalletConnect, etc.)
3. Approve the connection

**Note:** For testing without a real wallet, you can use:
- MetaMask test accounts
- A local test wallet
- The API simulation script (see below)

### Step 3: Create a Star System

1. **Enter Star System Name**
   - Minimum 3 characters
   - Example: "Andromeda", "NebulaPrime", "TestSystem"

2. **Set Tribute Percentage**
   - Range: 0-20%
   - Default: 5%
   - This is the treasury contribution percentage

3. **Check Balance**
   - Required: 10,000 AVAX minimum
   - Your current balance is displayed

4. **Click "Spawn Star System"**
   - Button becomes disabled during creation
   - Loading spinner appears
   - Toast notifications show progress

**What Happens:**
- Frontend calls backend API
- Backend uses Avalanche CLI to create subnet
- Subnet configuration is created in `~/.avalanche-cli/subnets/<name>/`
- Database entry created with status "deploying"
- Success message shown with next steps

**Expected Result:**
```
✓ Star system "YourName" creation initiated!
ℹ Next: Deploy the subnet: avalanche subnet deploy YourName
```

### Step 4: Create a Planet

After creating a star system:

1. **Select Your Star System**
   - Dropdown shows your created star systems
   - Shows planet count for each

2. **Enter Planet Name**
   - Minimum 3 characters
   - Example: "Terra Nova", "Elysium", "TestPlanet"

3. **Choose Planet Type**
   - **Habitable**: Standard planet
   - **Resource**: Resource-rich planet
   - **Research**: Research-focused planet
   - **Military**: Military outpost

4. **Click "Spawn Planet"**
   - Button becomes disabled during creation
   - Loading spinner appears

**What Happens:**
- Frontend calls backend API
- Backend adds validator configuration
- Planet entry created in database
- Success message shown

**Expected Result:**
```
✓ Planet "YourPlanet" created successfully!
ℹ Next: Add validator to subnet: avalanche subnet addValidator YourStarSystem
```

## API Simulation (Without UI)

You can test the backend API directly without the UI:

```bash
python scripts/simulate_ui_forge.py
```

This simulates:
1. Creating a star system via API
2. Checking subnet status
3. Creating a planet via API

**Example Output:**
```
======================================================================
  Celestial Forge UI Simulation
======================================================================

✓ Backend is running

======================================================================
  Simulating UI Flow: Create Star System and Planet
======================================================================

[Step 1] Creating Star System: 'TestSystem_1234567890'
  Wallet: 0x1234567890123456789012345678901234567890
  Tribute: 5.0%
✓ Star system 'TestSystem_1234567890' created!
  Subnet ID: TestSystem_1234567890
  RPC URL: http://127.0.0.1:9650/ext/bc/TestSystem_1234567890/rpc
  Status: deploying

[Step 2] Creating Planet: 'TestPlanet_1234567890' in 'TestSystem_1234567890'
...
```

## Manual API Testing

### Create Star System

```bash
curl -X POST http://localhost:5001/celestial-forge/spawn-star-system \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MyTestSystem",
    "owner_wallet": "0x1234567890123456789012345678901234567890",
    "tribute_percent": 5.0
  }'
```

### Create Planet

```bash
curl -X POST http://localhost:5001/celestial-forge/spawn-planet \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MyTestPlanet",
    "star_system_id": "MyTestSystem",
    "star_system_name": "MyTestSystem",
    "owner_wallet": "0x1234567890123456789012345678901234567890",
    "planet_type": "habitable"
  }'
```

### Check Subnet Status

```bash
curl http://localhost:5001/celestial-forge/subnet/MyTestSystem/status
```

## Testing Checklist

### Prerequisites
- [ ] Backend is running (http://localhost:5001)
- [ ] Frontend is running (http://localhost:8080)
- [ ] Avalanche CLI is installed
- [ ] Wallet is connected (or using API simulation)

### Star System Creation
- [ ] Can enter star system name
- [ ] Name validation works (minimum 3 characters)
- [ ] Tribute slider works (0-20%)
- [ ] Balance check works
- [ ] "Spawn Star System" button enabled when valid
- [ ] Loading state shows during creation
- [ ] Success message appears
- [ ] Star system appears in list
- [ ] Subnet created in Avalanche CLI

### Planet Creation
- [ ] Can select star system from dropdown
- [ ] Dropdown shows only user's star systems
- [ ] Can enter planet name
- [ ] Can select planet type
- [ ] "Spawn Planet" button enabled when valid
- [ ] Loading state shows during creation
- [ ] Success message appears
- [ ] Planet appears in star system
- [ ] Planet count updates

### Error Handling
- [ ] Invalid name shows error
- [ ] Duplicate name shows error
- [ ] Insufficient balance shows error
- [ ] Backend errors show in UI
- [ ] Network errors handled gracefully

## Troubleshooting

### UI Shows "Backend API not running"

**Solution:**
```bash
cd backend
uvicorn app:app --reload
```

Check backend is running:
```bash
curl http://localhost:5001/health
```

### "Avalanche CLI is not installed" Error

**Solution:**
```bash
curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh
export PATH=$PATH:$HOME/bin
```

### Wallet Connection Issues

**For Testing:**
- Use MetaMask with test accounts
- Or use the API simulation script (no wallet needed)
- Check browser console for errors

### Subnet Creation Fails

**Check:**
1. Avalanche CLI is installed: `avalanche --version`
2. CLI has permissions: `ls ~/.avalanche-cli`
3. Check backend logs for errors
4. Try creating subnet manually: `avalanche subnet create TestName`

### Planet Creation Fails

**Check:**
1. Star system exists in database
2. You own the star system
3. Planet name is unique within the star system
4. Check backend logs for errors

## Expected UI Behavior

### Creating Star System
1. User enters name → Input validates
2. User sets tribute → Slider updates
3. User clicks button → Button disabled, spinner shows
4. API call succeeds → Success toast, star system added to list
5. API call fails → Error toast, button re-enabled

### Creating Planet
1. User selects star system → Dropdown updates
2. User enters planet name → Input validates
3. User selects type → Type buttons highlight
4. User clicks button → Button disabled, spinner shows
5. API call succeeds → Success toast, planet added
6. API call fails → Error toast, button re-enabled

## Next Steps After Creation

After creating a star system and planet through the UI:

1. **Deploy Subnet** (if needed):
   ```bash
   avalanche subnet deploy YourStarSystemName
   ```

2. **Run Network**:
   ```bash
   avalanche network run YourStarSystemName
   ```

3. **Check Status**:
   ```bash
   avalanche subnet describe YourStarSystemName --local
   avalanche network status
   ```

4. **View in UI**:
   - Refresh the page
   - Your star system and planets should appear
   - Status should update automatically

## Video/Demo Script

For recording a demo:

1. **Setup** (30 seconds):
   - Show backend running
   - Show frontend running
   - Show wallet connected

2. **Create Star System** (1 minute):
   - Enter name "DemoSystem"
   - Set tribute to 5%
   - Click "Spawn Star System"
   - Show success message
   - Show star system in list

3. **Create Planet** (1 minute):
   - Select "DemoSystem"
   - Enter name "DemoPlanet"
   - Select "habitable" type
   - Click "Spawn Planet"
   - Show success message
   - Show planet in star system

4. **Verify** (30 seconds):
   - Show subnet in Avalanche CLI: `avalanche subnet list`
   - Show subnet directory: `ls ~/.avalanche-cli/subnets/`

**Total Time:** ~3 minutes

## Debugging

### Check Backend Logs

Watch backend logs in real-time:
```bash
cd backend
uvicorn app:app --reload  # Logs appear in terminal
```

### Check Frontend Console

Open browser DevTools (F12) → Console tab:
- Look for API calls
- Check for errors
- Verify request/response data

### Check Network Tab

Browser DevTools → Network tab:
- Filter by "celestial-forge"
- Check request payloads
- Check response status codes
- Check response data

### Common Issues

**CORS Errors:**
- Ensure backend CORS allows frontend origin
- Check backend logs for CORS errors

**404 Errors:**
- Verify backend routes are correct
- Check API base URL in frontend config

**500 Errors:**
- Check backend logs for stack traces
- Verify Avalanche CLI is installed
- Check file permissions for `~/.avalanche-cli/`

