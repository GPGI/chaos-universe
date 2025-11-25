# Avalanche SDK TypeScript Integration

This project now uses the official [Avalanche SDK TypeScript](https://github.com/ava-labs/avalanche-sdk-typescript) for enhanced blockchain interactions.

## Installed Packages

- **@avalanche-sdk/client**: Direct blockchain interaction (RPC, transactions, balances)
- **@avalanche-sdk/chainkit**: Indexed data access (Glacier API) for better performance

## Benefits

### 1. Better Data Access
- **ChainKit SDK** provides indexed data from Glacier API
- Faster queries for ERC20 balances, transaction history, and analytics
- No need to query blockchain directly for historical data

### 2. Enhanced Balance Fetching
- Native AVAX balance via Client SDK
- ERC20 token balances via ChainKit (indexed)
- Better performance and reliability

### 3. Transaction History
- Access to full transaction history via ChainKit
- Better than direct RPC queries for historical data

### 4. Network Metrics
- Real-time network health data
- Validator statistics
- Throughput and latency metrics

## Usage

### Enhanced Balance Fetching

```typescript
import { getEnhancedBalances } from '@/lib/avalanche-sdk';

const balances = await getEnhancedBalances(address);
// Returns: { native: {...}, tokens: [...] }
```

### Transaction History

```typescript
import { getTransactionHistory } from '@/lib/avalanche-sdk';

const transactions = await getTransactionHistory(address, 50);
```

### Network Metrics

```typescript
import { getNetworkMetrics } from '@/lib/avalanche-sdk';

const metrics = await getNetworkMetrics();
```

## Integration Points

### Current Implementation

1. **WalletContext**: Uses Client SDK for balance fetching (with ethers.js fallback)
2. **AccountManagementContext**: Uses ChainKit for CSN token balance (with contract fallback)
3. **Future**: Can enhance transaction history, analytics, and more

### Fallback Strategy

The integration maintains backward compatibility:
- Primary: Avalanche SDK (better performance)
- Fallback: ethers.js / direct contract calls (if SDK unavailable)

## Documentation

- **Official SDK Docs**: https://build.avax.network/docs/tooling/avalanche-sdk
- **Client SDK**: Direct RPC interactions
- **ChainKit SDK**: Indexed data and metrics
- **GitHub**: https://github.com/ava-labs/avalanche-sdk-typescript

## Next Steps

Potential enhancements:
- [ ] Add transaction history display using ChainKit
- [ ] Implement address analytics dashboard
- [ ] Add network health monitoring
- [ ] Use ChainKit for token metadata
- [ ] Implement cross-chain features with Interchain SDK

## API Keys (Optional)

For higher rate limits, you can add a Glacier API key:

```env
VITE_GLACIER_API_KEY=your_api_key_here
```

This is optional - the SDK works without it but with lower rate limits.

