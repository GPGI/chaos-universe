import { ethers } from "ethers";
import { getRpcProvider } from "./wallet";

// Contract addresses - load from deployments or env
const getContractAddresses = () => {
  // Try to load from deployments/addresses.json (will be populated after deployment)
  const addresses = {
    land: import.meta.env.VITE_CONTRACT_ADDRESS || "",
    digitalID: import.meta.env.VITE_DIGITAL_ID_ADDRESS || "",
    treasury: import.meta.env.VITE_TREASURY_ADDRESS || "",
    dummyToken: import.meta.env.VITE_DUMMY_TOKEN_ADDRESS || "",
    csnToken: import.meta.env.VITE_CSN_TOKEN_ADDRESS || "0x868306CeD3bb5Aa8fBc4BD8fA2727484cDfE1D89", // CSN Token (Wrapped Native)
    plotRegistry: import.meta.env.VITE_PLOT_REGISTRY_ADDRESS || "",
    accountRegistry: import.meta.env.VITE_ACCOUNT_REGISTRY_ADDRESS || "",
  };

  // Try to fetch from localStorage first (fastest, already loaded)
  try {
    const stored = localStorage.getItem("contract_addresses");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Accept if it has any contract address (land, accountRegistry, etc.)
      if (parsed.land || parsed.accountRegistry || parsed.digitalID || parsed.treasury) {
        Object.assign(addresses, parsed);
      }
    }
  } catch (e) {
    // Silently fail, will try other sources
  }

  // Fallback: Use known deployed AccountRegistry address if not loaded
  if (!addresses.accountRegistry || addresses.accountRegistry.trim() === "") {
    addresses.accountRegistry = "0x3E95B28Fa95426F2bA996528bDa7457871e03C70";
  }

  return addresses;
};

export const CONTRACT_ADDRESSES = getContractAddresses();

// Track loading state
let addressesLoaded = false;
// Initialize loadingPromise as null to avoid "can't access before initialization" error
let loadingPromise: Promise<boolean> | null = null;

// Contract ABIs - simplified interfaces for the contracts we need
export const LAND_CONTRACT_ABI = [
  "function buyPlot(uint256 plotId) payable",
  "function buyPlotsBatch(uint256[] calldata plotIds) payable",
  // Phase 1 additions
  "function buyPlotWithAVAX(uint256 plotId) payable",
  "function buyPlotWithUSDC(uint256 plotId, uint256 amount)",
  "function setPhase1Prices(uint256 avaxWei, uint256 usdcAmount)",
  "function setTreasuryRouting(address reserveAddr, address operationalAddr)",
  "function setUSDC(address token)",
  "function setRequireDigitalID(bool requireID)",
  "function pendingBuyer(uint256 plotId) view returns (address)",
  "function phase1PriceAVAX() view returns (uint256)",
  "function phase1PriceUSDC() view returns (uint256)",
  "function reserveTreasury() view returns (address)",
  "function operationalTreasury() view returns (address)",
  "function plotsSold() view returns (uint256)",
  "function TOTAL_PLOTS() view returns (uint256)",
  "function priceInAVAX() view returns (uint256)",
  "function salesActive() view returns (bool)",
  "function plotMinted(uint256) view returns (bool)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) view returns (uint256[])",
  "event LandMinted(uint256 indexed plotId, address indexed owner, uint256 pricePaid, bool coldWallet, uint256 timestamp)",
];

export const PLOT_REGISTRY_ABI = [
  // core reads
  "function ownerOfPlot(uint256 plotId) view returns (address)",
  "function activated(uint256 plotId) view returns (bool)",
  "function pendingTransfer(uint256 plotId) view returns (address)",
  "function uri(uint256 id) view returns (string)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  // owner action
  "function requestTransfer(uint256 plotId, address newOwner)",
  // admin actions (not used on FE, but kept for completeness)
  "function adminApproveTransfer(uint256 plotId)",
  "function activate(uint256 plotId, address to, string metadataURI)",
];

export const DIGITAL_ID_ABI = [
  "function registerID(string firstName, string lastName, string email, string avatarURI)",
  "function ids(address user) view returns (string firstName, string lastName, string email, string avatarURI, uint256 registeredAt, bool active)",
  "function deactivateID()",
  "function getID(address user) view returns ((string firstName, string lastName, string email, string avatarURI, uint256 registeredAt, bool active))",
  "event IDRegistered(address indexed user, string firstName, string lastName, uint256 timestamp)",
];

export const TREASURY_ABI = [
  "function balanceAVAX() view returns (uint256)",
  "function balanceERC20(address token) view returns (uint256)",
  "function supportedTokens(address) view returns (bool)",
  "event DepositAVAX(address indexed from, uint256 amount)",
  "event DepositERC20(address indexed from, address indexed token, uint256 amount)",
];

export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
];

export const STAR_SYSTEM_ABI = [
  "function systemData() view returns (string name, string subnetId, address owner, string rpcUrl, uint256 chainId, uint256 tributePercent, uint256 nativeBalance, bool active, uint256 createdAt)",
  "function addPlanet(address planetAddress)",
  "function removePlanet(address planetAddress)",
  "function setTributePercent(uint256 newTributePercent)",
  "function activate()",
  "function deactivate()",
  "function updateNativeBalance(uint256 balance)",
  "function getPlanets() view returns (address[])",
  "function planetCount() view returns (uint256)",
  "function withdrawNative(address payable to, uint256 amount)",
  "function isPlanet(address) view returns (bool)",
  "event PlanetAdded(address indexed planet, string name)",
  "event PlanetRemoved(address indexed planet)",
  "event NativeBalanceUpdated(uint256 balance)",
];

export const PLANET_ABI = [
  "function planetData() view returns (string name, address starSystem, address owner, uint8 planetType, uint8 nodeType, string nodeId, string ipAddress, uint256 nativeBalance, bool active, uint256 createdAt)",
  "function addCity(address cityAddress)",
  "function removeCity(address cityAddress)",
  "function setPlanetType(uint8 newType)",
  "function activate()",
  "function deactivate()",
  "function updateNativeBalance(uint256 balance)",
  "function getCities() view returns (address[])",
  "function cityCount() view returns (uint256)",
  "function withdrawNative(address payable to, uint256 amount)",
  "function isCity(address) view returns (bool)",
  "event CityAdded(address indexed city, string name)",
  "event CityRemoved(address indexed city)",
  "event NativeBalanceUpdated(uint256 balance)",
];

export const CITY_ABI = [
  "function cityData() view returns (string name, address planet, address owner, uint256 population, uint256 nativeBalance, string metadataURI, bool active, uint256 createdAt)",
  "function addPlot(uint256 plotId)",
  "function removePlot(uint256 plotId)",
  "function setPopulation(uint256 newPopulation)",
  "function setMetadataURI(string memory newURI)",
  "function activate()",
  "function deactivate()",
  "function updateNativeBalance(uint256 balance)",
  "function getPlots() view returns (uint256[])",
  "function plotCount() view returns (uint256)",
  "function withdrawNative(address payable to, uint256 amount)",
  "function isPlot(uint256) view returns (bool)",
  "event PlotAdded(uint256 indexed plotId)",
  "event PlotRemoved(uint256 indexed plotId)",
  "event PopulationUpdated(uint256 oldPopulation, uint256 newPopulation)",
  "event NativeBalanceUpdated(uint256 balance)",
];

export const ACCOUNT_REGISTRY_ABI = [
  "function createAccount(string name, address walletAddress, uint8 accountType, string description, uint256 parentAccountId) returns (uint256)",
  "function updateAccount(uint256 accountId, string name, string description)",
  "function deactivateAccount(uint256 accountId)",
  "function addJointMember(uint256 accountId, address member)",
  "function removeJointMember(uint256 accountId, address member)",
  "function linkSubAccount(uint256 parentAccountId, uint256 childAccountId)",
  "function unlinkSubAccount(uint256 parentAccountId, uint256 childAccountId)",
  "function getAccount(uint256 accountId) view returns ((uint256 id, string name, address walletAddress, uint8 accountType, address ownerWallet, string description, address parentAccount, bool isActive, uint256 createdAt, uint256 updatedAt))",
  "function getAccountsByWallet(address wallet) view returns (uint256[])",
  "function getPrimaryAccount(address wallet) view returns (uint256)",
  "function getAccountMembers(uint256 accountId) view returns (address[])",
  "function getSubAccounts(uint256 accountId) view returns (uint256[])",
  "function totalAccounts() view returns (uint256)",
  "function isAccountMember(uint256 accountId, address member) view returns (bool)",
  "function accounts(uint256) view returns (uint256 id, string name, address walletAddress, uint8 accountType, address ownerWallet, string description, address parentAccount, bool isActive, uint256 createdAt, uint256 updatedAt)",
  "event AccountCreated(uint256 indexed accountId, address indexed walletAddress, address indexed ownerWallet, uint8 accountType, string name)",
  "event AccountUpdated(uint256 indexed accountId, address indexed ownerWallet, string name)",
  "event AccountDeactivated(uint256 indexed accountId, address indexed ownerWallet)",
  "event MemberAdded(uint256 indexed accountId, address indexed member)",
  "event MemberRemoved(uint256 indexed accountId, address indexed member)",
  "event SubAccountLinked(uint256 indexed parentAccountId, uint256 indexed childAccountId)",
  "event SubAccountUnlinked(uint256 indexed parentAccountId, uint256 indexed childAccountId)",
];

// Contract instances
export function getLandContract(signer?: ethers.Signer) {
  const landAddress = CONTRACT_ADDRESSES.land;
  if (!landAddress || landAddress.trim() === "") {
    throw new Error("Land contract address not set");
  }
  return new ethers.Contract(
    landAddress,
    LAND_CONTRACT_ABI,
    signer || (getRpcProvider() as any)
  );
}

export function hasLandContract(): boolean {
  const landAddress = CONTRACT_ADDRESSES.land;
  return !!(landAddress && landAddress.trim() !== "");
}

export function getDigitalIDContract(signer?: ethers.Signer) {
  if (!CONTRACT_ADDRESSES.digitalID) {
    throw new Error("Digital ID contract address not set");
  }
  return new ethers.Contract(
    CONTRACT_ADDRESSES.digitalID,
    DIGITAL_ID_ABI,
    signer || (getRpcProvider() as any)
  );
}

export function hasDigitalIDContract(): boolean {
  const digitalIDAddress = CONTRACT_ADDRESSES.digitalID;
  return !!(digitalIDAddress && digitalIDAddress.trim() !== "");
}

export function getTreasuryContract(signer?: ethers.Signer) {
  const treasuryAddress = CONTRACT_ADDRESSES.treasury;
  if (!treasuryAddress || treasuryAddress.trim() === "") {
    throw new Error("Treasury contract address not set");
  }
  return new ethers.Contract(
    treasuryAddress,
    TREASURY_ABI,
    signer || (getRpcProvider() as any)
  );
}

export function hasTreasuryContract(): boolean {
  const treasuryAddress = CONTRACT_ADDRESSES.treasury;
  return !!(treasuryAddress && treasuryAddress.trim() !== "");
}

export function getERC20Contract(address: string, signer?: ethers.Signer) {
  return new ethers.Contract(address, ERC20_ABI, signer || (getRpcProvider() as any));
}

// Note: CSN is the native coin, not an ERC20 token
// The csnToken address in CONTRACT_ADDRESSES is for reference only
// Native CSN balance is accessed via provider.getBalance(address)
export function hasCSNTokenContract(): boolean {
  // CSN is native, so this always returns true if we have an RPC connection
  return true;
}

export function getPlotRegistryContract(signer?: ethers.Signer) {
  if (!CONTRACT_ADDRESSES.plotRegistry) {
    throw new Error("Plot registry address not set");
  }
  return new ethers.Contract(
    CONTRACT_ADDRESSES.plotRegistry,
    PLOT_REGISTRY_ABI,
    signer || (getRpcProvider() as any)
  );
}

export function getStarSystemContract(address: string, signer?: ethers.Signer) {
  if (!address || address.trim() === "") {
    throw new Error("StarSystem contract address not set");
  }
  return new ethers.Contract(
    address,
    STAR_SYSTEM_ABI,
    signer || (getRpcProvider() as any)
  );
}

export function getPlanetContract(address: string, signer?: ethers.Signer) {
  if (!address || address.trim() === "") {
    throw new Error("Planet contract address not set");
  }
  return new ethers.Contract(
    address,
    PLANET_ABI,
    signer || (getRpcProvider() as any)
  );
}

export function getCityContract(address: string, signer?: ethers.Signer) {
  if (!address || address.trim() === "") {
    throw new Error("City contract address not set");
  }
  return new ethers.Contract(
    address,
    CITY_ABI,
    signer || (getRpcProvider() as any)
  );
}

export function getAccountRegistryContract(signer?: ethers.Signer) {
  // Use known deployed address as fallback
  const registryAddress = CONTRACT_ADDRESSES.accountRegistry || "0x3E95B28Fa95426F2bA996528bDa7457871e03C70";
  if (!registryAddress || registryAddress.trim() === "") {
    throw new Error("Account Registry contract address not set");
  }
  return new ethers.Contract(
    registryAddress,
    ACCOUNT_REGISTRY_ABI,
    signer || (getRpcProvider() as any)
  );
}

export function hasAccountRegistryContract(): boolean {
  const registryAddress = CONTRACT_ADDRESSES.accountRegistry;
  return !!(registryAddress && registryAddress.trim() !== "");
}

// Helper to load contract addresses from multiple sources
export async function loadContractAddresses(): Promise<boolean> {
  // If already loaded, return cached promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // If addresses are already loaded, return immediately
  if (addressesLoaded && CONTRACT_ADDRESSES.land) {
    return true;
  }

  loadingPromise = (async () => {
    try {
      // Helper to create timeout abort controller
      const createTimeoutSignal = (ms: number) => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), ms);
        return controller.signal;
      };

      // Try 1: Backend API
      const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
      try {
        const response = await fetch(`${backendUrl}/contracts/addresses`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: createTimeoutSignal(5000),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.addresses) {
            Object.assign(CONTRACT_ADDRESSES, data.addresses);
            localStorage.setItem("contract_addresses", JSON.stringify(data.addresses));
            addressesLoaded = true;
            console.log("✓ Contract addresses loaded from backend:", data.addresses);
            return true;
          }
        }
      } catch (apiError: any) {
        // API failed, try next source (ignore abort errors)
        if (apiError.name !== "AbortError") {
          console.debug("Backend API not available, trying other sources...");
        }
      }

      // Try 2: Public JSON file (from public folder first, then deployments folder, then root)
      const filePaths = ["/addresses.json", "/deployments/addresses.json"];
      for (const filePath of filePaths) {
        try {
          const response = await fetch(filePath, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: createTimeoutSignal(3000),
          });
          
          if (response.ok) {
            const data = await response.json();
            // Accept if it has any contract address (land, accountRegistry, etc.)
            if (data.land || data.accountRegistry || data.addresses?.land || data.addresses?.accountRegistry) {
              const addresses = data.addresses || data;
              Object.assign(CONTRACT_ADDRESSES, addresses);
              localStorage.setItem("contract_addresses", JSON.stringify(addresses));
              addressesLoaded = true;
              console.log(`✓ Contract addresses loaded from ${filePath}:`, addresses);
              return true;
            }
          }
        } catch (fileError: any) {
          // Continue to next file path or source
          if (fileError.name === "AbortError") {
            break; // Timeout, stop trying
          }
        }
      }

      // Try 3: localStorage (already checked in getContractAddresses, but refresh if needed)
      try {
        const stored = localStorage.getItem("contract_addresses");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.land) {
            Object.assign(CONTRACT_ADDRESSES, parsed);
            addressesLoaded = true;
            console.log("✓ Contract addresses loaded from localStorage:", parsed);
            return true;
          }
        }
      } catch (e) {
        console.warn("Could not load from localStorage:", e);
      }

      // If we still don't have addresses, log debug message (not warning) but don't fail
      if (!CONTRACT_ADDRESSES.land) {
        // Only log if we're in development mode
        if (import.meta.env.DEV) {
          console.debug("Contract addresses not found. Some features may require backend or environment configuration.");
        }
      } else {
        addressesLoaded = true;
        return true;
      }

      return false;
    } catch (error) {
      console.warn("Error loading contract addresses:", error);
      return false;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

// Force refresh addresses
export async function refreshContractAddresses(): Promise<boolean> {
  addressesLoaded = false;
  loadingPromise = null;
  return loadContractAddresses();
}

// Initialize on module load - import the loader
import "./contractAddressLoader";


