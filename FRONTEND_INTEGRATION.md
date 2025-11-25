# Frontend Blockchain Integration Guide

This document explains how the frontend is connected to the Avalanche subnet and uses live blockchain data.

## Architecture Overview

### 1. Wallet Connection System
- **WalletContext**: Global wallet state management
- **WalletProvider**: Wraps the app and manages wallet connection
- **useWallet Hook**: Provides wallet state to components
- Auto-connects if wallet was previously connected
- Listens for account/chain changes

### 2. Contract Services
- **contracts.ts**: Contract instance factories
- **contractAddressLoader.ts**: Automatically loads addresses from backend
- Supports all contracts: Land, DigitalID, Treasury, ERC20

### 3. Custom Hooks

#### `useWallet()`
- Connection state, address, signer, balance
- Auto-refreshes balance every 10 seconds
- Handles wallet switching and disconnection

#### `useDigitalID()`
- Checks if user has registered Digital ID
- Registers new Digital IDs on-chain
- Auto-refreshes when wallet changes

#### `useLandPlots()`
- Fetches total plots, sold count, remaining
- Tracks user's owned plots
- Real-time event listeners for new mints
- Purchase functions (single and batch)

#### `useTreasury()`
- Fetches treasury AVAX balance
- Fetches ERC20 token balances
- Auto-refreshes every 30 seconds

## Connected Pages

### Digital ID Page (`/digital-id`)
- ✅ **Real wallet connection** - Requires MetaMask/compatible wallet
- ✅ **On-chain registration** - Stores username and hashed email on blockchain
- ✅ **Live ID checking** - Verifies Digital ID status from contract
- ✅ **Real land ownership** - Shows user's actual plots from blockchain
- ✅ **Live balance** - Shows actual AVAX balance from wallet

### Marketplace/Treasury Page (`/economy`)
- ✅ **Real treasury balances** - Fetches AVAX and token balances from contract
- ✅ **Live plot data** - Shows sold/remaining plots from contract
- ✅ **Available plots** - Lists plots that can be purchased (first 100 checked)
- ✅ **Real purchases** - Connects to wallet and purchases via smart contract
- ✅ **Portfolio tracking** - Shows user's owned plots from blockchain
- ✅ **Digital ID requirement** - Checks for Digital ID before purchase
- ✅ **Sales status** - Shows if sales are active from contract

## Contract Integration Flow

```
User Action → Wallet Connection → Contract Check → Transaction → Event Listener → UI Update
```

### Example: Purchasing a Plot

1. User clicks "Buy" on a plot
2. System checks:
   - Wallet connected? ✅
   - Digital ID registered? ✅
   - Sales active? ✅
   - Sufficient balance? ✅
3. Transaction sent via wallet
4. Event listener detects `LandMinted` event
5. UI automatically refreshes with new data

## Contract Addresses

Addresses are loaded in this priority:
1. Backend API (`/contracts/addresses`)
2. LocalStorage (cached from previous session)
3. Environment variables (`.env`)

**Auto-loading**: On app start, addresses are fetched from backend and cached.

## Real-time Updates

### Event Listeners
- `LandMinted` - Updates plot counts and user portfolio
- `IDRegistered` - Updates Digital ID status
- `DepositAVAX` - Updates treasury balances

### Polling
- Treasury balances: Every 30 seconds
- Wallet balance: Every 10 seconds
- Land data: Every 30 seconds

## Environment Variables

Required in `.env`:
```env
VITE_AVALANCHE_RPC=http://127.0.0.1:9650/ext/bc/ChaosStarNetwork/rpc
VITE_CONTRACT_ADDRESS=<auto-loaded after deployment>
```

Optional:
```env
VITE_API_URL=http://localhost:5001
VITE_DIGITAL_ID_ADDRESS=<auto-loaded>
VITE_TREASURY_ADDRESS=<auto-loaded>
```

## Usage Examples

### Check Digital ID
```typescript
const { hasDigitalID, digitalID } = useDigitalID();
if (hasDigitalID) {
  console.log("Username:", digitalID.username);
}
```

### Buy a Plot
```typescript
const { buyPlot } = useLandPlots();
const txHash = await buyPlot(42); // Buy plot #42
```

### Get Treasury Balance
```typescript
const { balances } = useTreasury();
console.log("AVAX:", balances.avax);
```

## Features Implemented

✅ Wallet connection (MetaMask compatible)
✅ Digital ID registration on-chain
✅ Digital ID verification
✅ Real-time plot availability
✅ Plot purchasing (single & batch)
✅ Treasury balance fetching
✅ Portfolio tracking
✅ Event listeners for real-time updates
✅ Auto-refresh mechanisms
✅ Contract address auto-loading
✅ Error handling and user feedback

## Next Steps (Future Enhancements)

- [ ] Fractional asset integration
- [ ] Loan/bond smart contracts
- [ ] Transaction history
- [ ] Multi-token support in treasury
- [ ] Plot metadata from IPFS
- [ ] Advanced filtering/sorting for plots

## Testing

To test the integration:

1. **Deploy contracts first**:
   ```bash
   python3 scripts/manage_contracts.py deploy
   ```

2. **Start backend**:
   ```bash
   cd backend && uvicorn app:app --reload
   ```

3. **Start frontend**:
   ```bash
   npm run dev
   ```

4. **Connect wallet** and ensure it's on the correct network (Chain ID: 8987)

5. **Register Digital ID** on the Digital ID page

6. **Purchase plots** from the Economy/Marketplace page

All data is now live from the blockchain! 🚀

