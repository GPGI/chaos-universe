from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Import services (works when run from backend directory with uvicorn)
from services.alchemy_service import get_wallet_nfts, get_wallet_balance
from services.supabase_service import upsert_plot, get_plots_for_wallet

# Import contract API (works when run from backend directory)
from contract_api import router as contract_router
from economy_api import router as economy_router
from npc_api import router as npc_router
from city_api import router as city_router
from governance_api import router as governance_router
from portfolio_api import router as portfolio_router
from managers_api import router as managers_router
try:
    from nanofiber_api import router as nanofiber_router
    NANOFIBER_API_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Nanofiber API not available: {e}")
    NANOFIBER_API_AVAILABLE = False
    nanofiber_router = None
# Import account API
try:
    from account_api import router as account_router
    ACCOUNT_API_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Account API not available: {e}")
    ACCOUNT_API_AVAILABLE = False
    account_router = None

# Import Avalanche Info API
try:
    from avalanche_info_api import router as avalanche_info_router
    AVALANCHE_INFO_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Avalanche Info API not available: {e}")
    AVALANCHE_INFO_AVAILABLE = False
    avalanche_info_router = None
# Import document API - make it optional
try:
    from document_api import router as document_router
    DOCUMENT_API_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Document API not available: {e}")
    DOCUMENT_API_AVAILABLE = False
    document_router = None

# Import Celestial Forge API
try:
    from celestial_forge_api import router as celestial_forge_router
    CELESTIAL_FORGE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Celestial Forge API not available: {e}")
    CELESTIAL_FORGE_AVAILABLE = False
    celestial_forge_router = None

# Import Avalanche CLI transfer API
import sys
from pathlib import Path
# Add project root to path to import avalanche-cli module
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

try:
    from avalanche_cli.api import router as avalanche_cli_router
    AVALANCHE_CLI_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Avalanche CLI module not available: {e}")
    AVALANCHE_CLI_AVAILABLE = False
    avalanche_cli_router = None

# Import CLI detector and subnet interaction
try:
    from cli_detector import get_cli_detector, detect_tools
    from subnet_interaction import create_subnet_interactor, auto_detect_and_interact
    CLI_DETECTOR_AVAILABLE = True
except ImportError as e:
    print(f"Warning: CLI detector not available: {e}")
    CLI_DETECTOR_AVAILABLE = False

app = FastAPI(
    title="Sarakt Land Registry API",
    description="Backend API for Sarakt Land Registry and Contract Management",
    version="1.0.0"
)

# CORS middleware - allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(contract_router)
app.include_router(economy_router)
app.include_router(npc_router)
app.include_router(city_router)
app.include_router(governance_router)
app.include_router(portfolio_router)
app.include_router(managers_router)
# Include nanofiber router if available
if NANOFIBER_API_AVAILABLE and nanofiber_router:
    app.include_router(nanofiber_router)
# Include account router if available
if ACCOUNT_API_AVAILABLE and account_router:
    app.include_router(account_router)

# Include Avalanche Info router if available
if AVALANCHE_INFO_AVAILABLE and avalanche_info_router:
    app.include_router(avalanche_info_router)
# Include document router if available
if DOCUMENT_API_AVAILABLE and document_router:
    app.include_router(document_router)

# Include Celestial Forge router if available
if CELESTIAL_FORGE_AVAILABLE and celestial_forge_router:
    app.include_router(celestial_forge_router)

# Include Avalanche CLI router if available
if AVALANCHE_CLI_AVAILABLE and avalanche_cli_router:
    app.include_router(avalanche_cli_router)

@app.get("/")
async def root():
    endpoints = {
        "contracts": "/contracts",
        "economy": "/economy",
        "npcs": "/npcs",
        "city": "/city",
        "governance": "/governance",
        "portfolio": "/portfolio",
        "managers": "/managers",
        "accounts": "/accounts",
        "avalanche-info": "/avalanche-info",
        "wallet": "/wallet",
        "plots": "/plots",
        "nanofiber": "/nanofiber",
    }
    
    if AVALANCHE_CLI_AVAILABLE:
        endpoints["avalanche-cli"] = "/avalanche-cli"
    
    if CLI_DETECTOR_AVAILABLE:
        endpoints["cli-detection"] = "/cli/detection"
        endpoints["subnet-interaction"] = "/cli/subnet"
    
    if CELESTIAL_FORGE_AVAILABLE:
        endpoints["celestial-forge"] = "/celestial-forge"
    
    return {
        "message": "Sarakt Land Registry API",
        "version": "1.0.0",
        "endpoints": endpoints
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/wallet/{address}/balance")
async def wallet_balance(address: str):
    bal = await get_wallet_balance(address)
    return {"address": address, "balance": bal}

@app.post("/sync/{address}")
async def sync_nfts(address: str):
    """Sync NFTs from Alchemy (legacy endpoint)"""
    nfts = await get_wallet_nfts(address)
    for nft in nfts:
        token = nft.get("tokenId")
        meta = nft.get("rawMetadata", {})
        upsert_plot(address, token, meta)
    return {"synced": len(nfts)}

@app.post("/plots/save")
async def save_plot_data(request: dict):
    """Save plot purchase data to Supabase"""
    try:
        wallet = request.get("wallet") or request.get("address")
        token_id = request.get("token_id") or request.get("plotId")
        metadata = request.get("metadata") or {}
        
        if not wallet or not token_id:
            raise HTTPException(status_code=400, detail="wallet and token_id are required")
        
        # Save to Supabase
        upsert_plot(wallet, str(token_id), metadata)
        
        return {"success": True, "message": "Plot data saved"}
    except HTTPException:
        raise
    except Exception as e:
        # Don't fail if Supabase is not configured
        return {"success": False, "message": f"Plot data not saved (backend may not be configured): {str(e)}"}

@app.get("/plots/{address}")
def plots(address: str):
    return {"plots": get_plots_for_wallet(address)}


# CLI Detection and Subnet Interaction endpoints
if CLI_DETECTOR_AVAILABLE:
    from fastapi import APIRouter
    
    cli_router = APIRouter(prefix="/cli", tags=["cli"])
    
    @cli_router.get("/detection")
    async def detect_cli_tools():
        """Detect if Forge and Avalanche CLI are installed"""
        try:
            detection_result = detect_tools()
            return {
                "success": True,
                "tools": detection_result
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @cli_router.get("/subnet")
    async def get_subnet_status(subnet_name: str = None):
        """Get subnet interaction status"""
        try:
            status = auto_detect_and_interact(subnet_name)
            return {
                "success": True,
                "status": status
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @cli_router.get("/subnet/list")
    async def list_subnets():
        """List available subnets"""
        try:
            interactor = create_subnet_interactor()
            subnets = interactor.list_subnets()
            return {
                "success": True,
                "subnets": subnets
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @cli_router.get("/subnet/{subnet_name}/info")
    async def get_subnet_info(subnet_name: str):
        """Get detailed information about a subnet"""
        try:
            interactor = create_subnet_interactor(subnet_name)
            info = interactor.get_subnet_info()
            status = interactor.get_status()
            return {
                "success": True,
                "subnet_name": subnet_name,
                "info": info,
                "status": status
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @cli_router.get("/commands")
    async def get_available_commands():
        """Get available Avalanche CLI commands"""
        try:
            interactor = create_subnet_interactor()
            commands = interactor.get_available_commands()
            return {
                "success": True,
                "commands": commands
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @cli_router.post("/subnet/{subnet_name}/deploy")
    async def deploy_to_subnet(subnet_name: str):
        """Deploy contracts to a subnet using detected tools"""
        try:
            interactor = create_subnet_interactor(subnet_name)
            project_root = Path(__file__).parent.parent
            
            # Compile first
            compile_result = interactor.compile_contracts(project_root)
            if not compile_result.get("success"):
                return {
                    "success": False,
                    "error": "Compilation failed",
                    "details": compile_result
                }
            
            # Deploy
            deploy_result = interactor.deploy_contracts(project_root)
            return deploy_result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @cli_router.get("/blockchain/{blockchain_name}/describe")
    async def describe_blockchain(blockchain_name: str):
        """Describe a blockchain using 'avalanche blockchain describe'"""
        try:
            interactor = create_subnet_interactor()
            result = interactor.blockchain_describe(blockchain_name)
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @cli_router.post("/network/{network_name}/run")
    async def run_network(network_name: str):
        """Run a network using 'avalanche network run'"""
        try:
            interactor = create_subnet_interactor(network_name)
            result = interactor.network_run(network_name)
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @cli_router.get("/network/status")
    async def get_network_status(network_name: str = None):
        """Get network status using 'avalanche network status' (shows current running network)"""
        try:
            interactor = create_subnet_interactor(network_name)
            # network status doesn't accept arguments - shows current network
            result = interactor.network_status()
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @cli_router.get("/key/list")
    async def list_keys(network_name: str = None):
        """List keys using 'avalanche key list'"""
        try:
            interactor = create_subnet_interactor(network_name)
            result = interactor.key_list(network_name)
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @cli_router.get("/primary/describe")
    async def describe_primary(local: bool = True, cluster: str = None):
        """Describe primary network using 'avalanche primary describe'"""
        try:
            interactor = create_subnet_interactor()
            result = interactor.primary_describe(local=local, cluster=cluster)
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    app.include_router(cli_router)
