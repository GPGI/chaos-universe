import { ethers } from "ethers";
import EthereumProvider from "@walletconnect/ethereum-provider";

const DEFAULT_FUJI_RPC = "https://api.avax-test.network/ext/bc/C/rpc"; // public Fuji endpoint
const CHAOSSTARNETWORK_RPC = "http://127.0.0.1:41773/ext/bc/wtHFpLKd93iiPmBBsCdeTEPz6Quj9MoCL8NpuxoFXHtvTVeT1/rpc"; // Primary ChaosStarNetwork RPC

// Get RPC URL - ALWAYS use Chaos Star Network RPC
function getRpcUrl(): string {
  // ALWAYS return Chaos Star Network RPC - never use Avalanche C-Chain
  return CHAOSSTARNETWORK_RPC;
}

export function getRpcProvider(): ethers.JsonRpcProvider | null {
	try {
		const rpcUrl = getRpcUrl();
		return new ethers.JsonRpcProvider(rpcUrl);
	} catch {
		return null;
	}
}

let walletConnectProvider: any = null;

export async function connectWallet(useWalletConnect = false) {
  if (useWalletConnect) {
    // WalletConnect for mobile wallets - Connected to Chaos Star Network
    walletConnectProvider = await EthereumProvider.init({
      projectId: "4c6f927e5c0e8a7d8f3b2e1a6d9c4f8b", // Public WalletConnect project ID
      chains: [43113], // Using Fuji chain ID for compatibility, but RPC points to Chaos Star Network
      showQrModal: true,
      rpcMap: {
        43113: CHAOSSTARNETWORK_RPC, // Map to Chaos Star Network RPC
      },
    });

    await walletConnectProvider.enable();
    const web3Provider = new ethers.BrowserProvider(walletConnectProvider);
    const signer = await web3Provider.getSigner();
    const address = await signer.getAddress();

    return { signer, address, provider: walletConnectProvider };
  }

  // Browser extension wallet (MetaMask) - Connected to Chaos Star Network
  const { ethereum } = window as any;
  if (!ethereum) throw new Error("No wallet found. Install MetaMask or use WalletConnect for mobile.");

  await ethereum.request({ method: "eth_requestAccounts" });

  // Use MetaMask's provider but transactions will go through Chaos Star Network
  // The actual RPC connection is handled by getRpcProvider() in contract calls
  const web3Provider = new ethers.BrowserProvider(ethereum);
  const signer = await web3Provider.getSigner();
  const address = await signer.getAddress();

  return { signer, address, provider: ethereum };
}

export async function disconnectWalletConnect() {
  if (walletConnectProvider) {
    await walletConnectProvider.disconnect();
    walletConnectProvider = null;
  }
}

export async function getConnectedAddress(): Promise<string | null> {
  const { ethereum } = window as any;
  if (!ethereum) return null;

  const accounts = await ethereum.request({ method: "eth_accounts" });
  return accounts.length ? accounts[0] : null;
}

export async function connectWithPrivateKey(privateKey: string) {
  // Ensure private key has 0x prefix
  const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  
  // Create a wallet from the private key
  const wallet = new ethers.Wallet(formattedKey, getRpcProvider());
  const address = await wallet.getAddress();
  
  return { signer: wallet, address, provider: getRpcProvider() };
}

// Legacy function - use getLandContract from @/lib/contracts instead
export function getContract(signer: ethers.Signer) {
  const { getLandContract } = require("./contracts");
  return getLandContract(signer);
}
