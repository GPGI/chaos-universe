/**
 * Avalanche SDK Account Management
 * Uses the official @avalanche-sdk/client/accounts for multi-chain account support
 * Supports EVM (C-Chain), X-Chain, and P-Chain addresses
 * 
 * Documentation: https://build.avax.network/docs/tooling/avalanche-sdk/client/accounts/
 */

import { privateKeyToAvalancheAccount } from '@avalanche-sdk/client/accounts';
import { createAvalancheWalletClient } from '@avalanche-sdk/client';
import { avalanche, avalancheFuji } from '@avalanche-sdk/client/chains';
import type { Account } from 'viem';

// Determine which chain to use based on environment
const getChainId = (): string => {
  const rpcUrl = import.meta.env.VITE_AVALANCHE_RPC || '';
  
  if (rpcUrl.includes('api.avax.network') || rpcUrl.includes('43114')) {
    return '43114'; // Mainnet
  }
  if (rpcUrl.includes('api.avax-test.network') || rpcUrl.includes('43113')) {
    return '43113'; // Fuji Testnet
  }
  
  // Default to Fuji for local development
  return '43113';
};

const chainId = getChainId();
const isMainnet = chainId === '43114';

/**
 * Create an Avalanche account from a private key
 * Supports all three chains: C-Chain (EVM), X-Chain, and P-Chain
 */
export function createAvalancheAccount(privateKey: `0x${string}`) {
  try {
    return privateKeyToAvalancheAccount(privateKey);
  } catch (error) {
    console.error('Failed to create Avalanche account:', error);
    throw error;
  }
}

/**
 * Get all addresses for an account (EVM, X-Chain, P-Chain)
 */
export function getAllAccountAddresses(privateKey: `0x${string}`) {
  try {
    const account = createAvalancheAccount(privateKey);
    
    return {
      evm: account.getEVMAddress(), // C-Chain: 0x...
      xChain: account.getXPAddress('X', isMainnet ? 'avax' : 'fuji'), // X-Chain: X-avax1... or X-fuji1...
      pChain: account.getXPAddress('P', isMainnet ? 'avax' : 'fuji'), // P-Chain: P-avax1... or P-fuji1...
    };
  } catch (error) {
    console.error('Failed to get account addresses:', error);
    throw error;
  }
}

/**
 * Create a wallet client with an Avalanche account
 */
export function createWalletClientWithAccount(privateKey: `0x${string}`) {
  try {
    const account = createAvalancheAccount(privateKey);
    const rpcUrl = import.meta.env.VITE_AVALANCHE_RPC || 
      (isMainnet 
        ? 'https://api.avax.network/ext/bc/C/rpc'
        : 'https://api.avax-test.network/ext/bc/C/rpc'
      );

    return createAvalancheWalletClient({
      account,
      chain: isMainnet ? avalanche : avalancheFuji,
      transport: {
        type: 'http',
        url: rpcUrl,
      },
    });
  } catch (error) {
    console.error('Failed to create wallet client:', error);
    throw error;
  }
}

/**
 * Get account information including all chain addresses
 */
export interface AvalancheAccountInfo {
  evmAddress: string;
  xChainAddress: string;
  pChainAddress: string;
  hasXPAccount: boolean;
}

export function getAccountInfo(privateKey: `0x${string}`): AvalancheAccountInfo {
  try {
    const account = createAvalancheAccount(privateKey);
    
    return {
      evmAddress: account.getEVMAddress(),
      xChainAddress: account.getXPAddress('X', isMainnet ? 'avax' : 'fuji'),
      pChainAddress: account.getXPAddress('P', isMainnet ? 'avax' : 'fuji'),
      hasXPAccount: !!account.xpAccount,
    };
  } catch (error) {
    console.error('Failed to get account info:', error);
    throw error;
  }
}

/**
 * Validate a private key and return account info
 */
export function validatePrivateKey(privateKey: string): {
  valid: boolean;
  accountInfo?: AvalancheAccountInfo;
  error?: string;
} {
  try {
    // Ensure 0x prefix
    const formattedKey = privateKey.startsWith('0x') 
      ? privateKey as `0x${string}`
      : `0x${privateKey}` as `0x${string}`;
    
    const accountInfo = getAccountInfo(formattedKey);
    
    return {
      valid: true,
      accountInfo,
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Invalid private key',
    };
  }
}

