# Avalanche SDK Account Management Integration

This project now uses the official [Avalanche SDK Account Management](https://build.avax.network/docs/tooling/avalanche-sdk/client/accounts/) for multi-chain account support.

## Overview

The Avalanche SDK provides unified account management across all three Avalanche chains:
- **C-Chain (EVM)**: Smart contracts, ERC-20 tokens, standard EVM operations
- **X-Chain**: UTXO transactions, asset transfers
- **P-Chain**: Staking, validator operations

## Account Structure

Every Avalanche account has:
- **EVM Account**: For C-Chain operations (address: `0x...`)
- **XP Account**: For X-Chain and P-Chain operations (addresses: `X-avax1...`, `P-avax1...`)

## Implementation

### Account Utilities (`src/lib/avalanche-accounts.ts`)

Provides functions for:
- `createAvalancheAccount()` - Create account from private key
- `getAllAccountAddresses()` - Get all chain addresses (EVM, X-Chain, P-Chain)
- `createWalletClientWithAccount()` - Create wallet client with account
- `getAccountInfo()` - Get complete account information
- `validatePrivateKey()` - Validate and get account info from private key

### Usage Example

```typescript
import { createAvalancheAccount, getAllAccountAddresses } from '@/lib/avalanche-accounts';

// Create account from private key
const account = createAvalancheAccount('0x...');

// Get all addresses
const addresses = getAllAccountAddresses('0x...');
console.log(addresses.evm);      // 0x742d35Cc... (C-Chain)
console.log(addresses.xChain);   // X-avax1... (X-Chain)
console.log(addresses.pChain);   // P-avax1... (P-Chain)
```

## Account Types

### Private Key Accounts
- Simple and direct
- Best for server-side apps and bots
- Used in our backend services

### Mnemonic Accounts
- Easy recovery with seed phrases
- Good for user-facing applications
- Not yet implemented (can be added)

### HD Key Accounts
- Advanced key derivation
- Multiple accounts from one seed
- Not yet implemented (can be added)

### JSON-RPC Accounts
- External wallet integration (MetaMask, Core, etc.)
- Used in our frontend wallet connection
- Perfect for browser-based dApps

## Security

**Important**: Never expose private keys in client-side code or commit them to version control.

```typescript
// ✅ Good - Use environment variables
const account = createAvalancheAccount(process.env.PRIVATE_KEY!);

// ❌ Bad - Never hardcode keys
const account = createAvalancheAccount("0x1234...");
```

## Integration Points

### Current Implementation

1. **Backend**: Uses private keys from Avalanche CLI for contract operations
2. **Frontend**: Uses JSON-RPC accounts (MetaMask/WalletConnect) for user interactions
3. **Key Selector**: Displays C-Chain addresses (EVM addresses)
4. **Future**: Can add X-Chain and P-Chain address display when private keys are securely available

### Multi-Chain Support

The system is ready for multi-chain operations:
- C-Chain addresses are displayed in the key selector
- X-Chain and P-Chain addresses can be derived when needed
- Account utilities support all three chains

## Documentation

- **Official Docs**: https://build.avax.network/docs/tooling/avalanche-sdk/client/accounts/
- **Account Types**: https://build.avax.network/docs/tooling/avalanche-sdk/client/accounts/local-accounts/
- **JSON-RPC Accounts**: https://build.avax.network/docs/tooling/avalanche-sdk/client/accounts/json-rpc-accounts/

## Next Steps

Potential enhancements:
- [ ] Add mnemonic account support for user wallets
- [ ] Display X-Chain and P-Chain addresses in key selector (when securely available)
- [ ] Add X-Chain asset transfer functionality
- [ ] Add P-Chain staking operations
- [ ] Implement HD key derivation for multiple accounts

