import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SIMULATION_MODE = os.getenv("SIMULATION_MODE", "0") in ("1", "true", "True")
TESTNET_RPC = os.getenv("VITE_TESTNET_RPC") or os.getenv("TESTNET_RPC")

# Get subnet name from environment
SUBNET_NAME = os.getenv("AVALANCHE_SUBNET_NAME", "ChaosStarNetwork")

# Custom Subnet Configuration (from Postman environment)
CUSTOM_SUBNET_ID = os.getenv("CUSTOM_SUBNET_ID") or os.getenv("customSubnetID")
AVALANCHE_SUBNET_ID = os.getenv("AVALANCHE_SUBNET_ID") or os.getenv("avalancheSubnetId")
AVALANCHE_BLOCKCHAIN_ID = os.getenv("AVALANCHE_BLOCKCHAIN_ID") or os.getenv("avalanceBlockchainId")
AVALANCHE_NODE_ID = os.getenv("AVALANCHE_NODE_ID") or os.getenv("avalancheNodeId")
AVALANCHE_BASE_URL = os.getenv("AVALANCHE_BASE_URL") or os.getenv("baseURL", "https://api.avax.network")
AVALANCHE_HOST = os.getenv("AVALANCHE_HOST") or os.getenv("host", "localhost")
AVALANCHE_PORT = os.getenv("AVALANCHE_PORT") or os.getenv("port", "9650")
AVALANCHE_PROTOCOL = os.getenv("AVALANCHE_PROTOCOL") or os.getenv("protocol", "http")

# Auto-discover RPC URL from Avalanche CLI subnet configuration
def discover_rpc_from_subnet(subnet_name: str = "ChaosStarNetwork"):
    """Discover RPC URL from Avalanche CLI subnet configuration - ALWAYS returns Chaos Star Network RPC"""
    # Always use Chaos Star Network RPC - never use port 9650
    return CHAOSSTARNETWORK_PRIMARY_RPC

# Primary RPC URL for ChaosStarNetwork - This is the ONLY RPC endpoint for ChaosStarNetwork
CHAOSSTARNETWORK_PRIMARY_RPC = "http://127.0.0.1:41773/ext/bc/wtHFpLKd93iiPmBBsCdeTEPz6Quj9MoCL8NpuxoFXHtvTVeT1/rpc"

# For ChaosStarNetwork, always use the primary RPC
# For other subnets, discover from configuration
# ALWAYS use Chaos Star Network RPC - never use port 9650
AVALANCHE_RPC = CHAOSSTARNETWORK_PRIMARY_RPC
LAND_CONTRACT = os.getenv("VITE_CONTRACT_ADDRESS")
PLOT_REGISTRY_ADDRESS = os.getenv("PLOT_REGISTRY_ADDRESS")
CSN_TOKEN_ADDRESS = os.getenv("VITE_CSN_TOKEN_ADDRESS", "0x868306CeD3bb5Aa8fBc4BD8fA2727484cDfE1D89")  # CSN Token (Wrapped Native)
PINATA_JWT = os.getenv("VITE_PINATA_JWT")
PINATA_API_KEY = os.getenv("VITE_PINATA_API_KEY")
PINATA_SECRET_KEY = os.getenv("VITE_PINATA_SECRET_KEY")

# Supabase configuration (optional)
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

# Auto-load admin private key from environment or Avalanche CLI subnet
# Subnet admin keys are automatically discovered from Avalanche CLI configuration
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
ADMIN_PRIVATE_KEY = os.getenv("ADMIN_PRIVATE_KEY")  # Also check for ADMIN_PRIVATE_KEY

# If PRIVATE_KEY not set, try to load admin key from Avalanche CLI subnet
if not PRIVATE_KEY:
    try:
        # Try relative import first (when used as module), then absolute
        try:
            from .avalanche_key_loader import auto_load_funded_account_key
        except ImportError:
            from backend.avalanche_key_loader import auto_load_funded_account_key
        
        # Use subnet name from environment or default
        subnet_name = SUBNET_NAME
        PRIVATE_KEY = auto_load_funded_account_key(
            subnet_name=subnet_name,
            rpc_url=AVALANCHE_RPC,
            silent=False
        )
        if PRIVATE_KEY:
            # Get account address for display
            from eth_account import Account
            account = Account.from_key(PRIVATE_KEY)
            print(f"✓ Automatically loaded admin private key from Avalanche CLI subnet '{subnet_name}'")
            print(f"  Admin Account: {account.address}")
            print(f"  RPC URL: {AVALANCHE_RPC}")
            
            # Also set ADMIN_PRIVATE_KEY if not set (for wallet.py compatibility)
            if not ADMIN_PRIVATE_KEY:
                ADMIN_PRIVATE_KEY = PRIVATE_KEY
                os.environ["ADMIN_PRIVATE_KEY"] = PRIVATE_KEY
    except Exception as e:
        # Only show warning if in verbose mode or if it's not an import error
        import sys
        if "--verbose" in sys.argv or "-v" in sys.argv or not isinstance(e, ImportError):
            print(f"⚠ Could not auto-load admin key from Avalanche CLI: {e}")
        PRIVATE_KEY = None

# If ADMIN_PRIVATE_KEY not set but PRIVATE_KEY is, use PRIVATE_KEY
if not ADMIN_PRIVATE_KEY and PRIVATE_KEY:
    ADMIN_PRIVATE_KEY = PRIVATE_KEY
    os.environ["ADMIN_PRIVATE_KEY"] = PRIVATE_KEY

# Export ADMIN_PRIVATE_KEY and CSN_TOKEN_ADDRESS for other modules
__all__ = [
    "PRIVATE_KEY", "ADMIN_PRIVATE_KEY", "AVALANCHE_RPC", "SUBNET_NAME", "CSN_TOKEN_ADDRESS",
    "CUSTOM_SUBNET_ID", "AVALANCHE_SUBNET_ID", "AVALANCHE_BLOCKCHAIN_ID", "AVALANCHE_NODE_ID",
    "AVALANCHE_BASE_URL", "AVALANCHE_HOST", "AVALANCHE_PORT", "AVALANCHE_PROTOCOL"
]

CHAIN_ID = int(os.getenv("TESTNET_CHAIN_ID", "9999") if SIMULATION_MODE else os.getenv("CHAIN_ID", "8987"))
GAS_LIMIT = 300000
PLOT_PRICE = 0.1

# Try to load contract addresses from deployments
def load_contract_addresses():
    """Load contract addresses from deployments/addresses.json"""
    project_root = Path(__file__).parent.parent
    addresses_file = project_root / "deployments" / ("addresses.testnet.json" if SIMULATION_MODE else "addresses.json")
    
    if addresses_file.exists():
        with open(addresses_file, 'r') as f:
            addresses = json.load(f)
            # Populate globals if present
            land_addr = addresses.get("land") or LAND_CONTRACT
            global PLOT_REGISTRY_ADDRESS
            if not PLOT_REGISTRY_ADDRESS:
                PLOT_REGISTRY_ADDRESS = addresses.get("plotRegistry") or PLOT_REGISTRY_ADDRESS
            return land_addr, addresses
    return LAND_CONTRACT, {}

# Load addresses
LAND_CONTRACT, _ = load_contract_addresses()

# ABI paths
CONTRACT_ABI_PATH = "backend/abi/SaraktLandV2ABI.json"
DIGITAL_ID_ABI_PATH = "backend/abi/SaraktDigitalIDABI.json"
TREASURY_ABI_PATH = "backend/abi/SaraktTreasuryABI.json"