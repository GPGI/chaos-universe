"""
Celestial Forge API
Connects the frontend Celestial Forge to Avalanche CLI for actual subnet creation
Uses subnet admin keys automatically discovered from Avalanche CLI configuration
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import subprocess
from pathlib import Path

from subnet_interaction import create_subnet_interactor, is_avalanche_cli_available
from cli_detector import get_cli_detector

# Import config to get admin keys (auto-loaded from subnet)
from config import PRIVATE_KEY, ADMIN_PRIVATE_KEY, AVALANCHE_RPC, SUBNET_NAME

# Import Supabase client for database queries
try:
    from supabase_client import supabase
    SUPABASE_AVAILABLE = True
except ImportError:
    try:
        from supabase_client import supabase
        SUPABASE_AVAILABLE = True
    except ImportError:
        SUPABASE_AVAILABLE = False
        supabase = None

router = APIRouter(prefix="/celestial-forge", tags=["celestial-forge"])


# Helper functions for Sarakt Star System and planets
def _get_default_sarakt_system() -> Dict[str, Any]:
    """Get default Sarakt Star System data"""
    from datetime import datetime
    return {
        "id": "sarakt-star-system",
        "name": "Sarakt Star System",
        "subnet_id": SUBNET_NAME,
        "owner_wallet": "0x0000000000000000000000000000000000000000",  # System-owned
        "rpc_url": AVALANCHE_RPC,
        "chain_id": None,  # Will be discovered from subnet
        "tribute_percent": 5.0,
        "status": "active",
        "treasury_balance": {},
        "planets": ["sarakt-prime", "zythera"],
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }


def _get_default_planets(star_system_id: str) -> List[Dict[str, Any]]:
    """Get default planets (Sarakt Prime and Zythera)"""
    from datetime import datetime
    return [
        {
            "id": "sarakt-prime",
            "name": "Sarakt Prime",
            "star_system_id": star_system_id,
            "owner_wallet": "0x0000000000000000000000000000000000000000",
            "planet_type": "habitable",
            "node_type": "master",
            "ip_address": "10.0.0.1",
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        },
        {
            "id": "zythera",
            "name": "Zythera",
            "star_system_id": star_system_id,
            "owner_wallet": "0x0000000000000000000000000000000000000000",
            "planet_type": "research",
            "node_type": "validator",
            "ip_address": "10.0.0.2",
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    ]


async def _ensure_sarakt_system_exists() -> str:
    """Ensure Sarakt Star System exists in database, return its ID"""
    if not SUPABASE_AVAILABLE:
        return "sarakt-star-system"
    
    try:
        # Check if Sarakt Star System exists
        response = supabase.table("star_systems").select("*").eq("name", "Sarakt Star System").execute()
        
        if response.data and len(response.data) > 0:
            system_id = response.data[0]["id"]
        else:
            # Create Sarakt Star System
            sarakt_system = _get_default_sarakt_system()
            insert_response = supabase.table("star_systems").insert(sarakt_system).execute()
            if insert_response.data and len(insert_response.data) > 0:
                system_id = insert_response.data[0]["id"]
            else:
                system_id = sarakt_system["id"]
        
        # Ensure planets exist
        planets_response = supabase.table("planets").select("*").eq("star_system_id", system_id).execute()
        existing_planet_names = {p.get("name") for p in (planets_response.data or [])}
        
        default_planets = _get_default_planets(system_id)
        for planet in default_planets:
            if planet.get("name") not in existing_planet_names:
                try:
                    supabase.table("planets").insert(planet).execute()
                except Exception:
                    pass  # Planet might already exist
        
        return system_id
    except Exception:
        return "sarakt-star-system"


class TokenConfig(BaseModel):
    """Token configuration for the subnet"""
    name: Optional[str] = None  # e.g., "ChaosStar Token"
    symbol: Optional[str] = None  # e.g., "CST"
    decimals: int = 18
    initial_supply: Optional[float] = None  # Initial supply in tokens
    max_supply: Optional[float] = None  # Max supply (None = unlimited)
    mintable: bool = True  # Can mint new tokens
    burnable: bool = True  # Can burn tokens


class TreasuryConfig(BaseModel):
    """Treasury and reserve configuration"""
    reserves: Optional[Dict[str, float]] = None  # e.g., {"BTC": 0.30, "AVAX": 0.20}
    coverage_ratio: float = 1.0  # Coverage ratio for treasury
    inflation_mode: str = "elastic"  # "elastic" or "fixed"
    initial_balance: Optional[Dict[str, float]] = None  # Initial treasury balance


class EconomicConfig(BaseModel):
    """Economic parameters for the subnet"""
    gas_price_gwei: Optional[float] = None  # Gas price in gwei
    gas_limit: Optional[int] = None  # Gas limit per transaction
    min_gas_price: Optional[float] = None  # Minimum gas price
    block_time_seconds: Optional[int] = None  # Block time in seconds
    transaction_fee_percent: float = 0.0  # Transaction fee percentage
    platform_fee_percent: float = 0.0  # Platform fee percentage


class NetworkConfig(BaseModel):
    """Network configuration for the subnet"""
    chain_id: Optional[int] = None  # Chain ID (auto-generated if None)
    validator_count: int = 1  # Number of validators
    consensus_mechanism: str = "Snowman++"  # Consensus mechanism
    reward_address: Optional[str] = None  # Reward distribution address


class StarSystemCreate(BaseModel):
    """Create a new star system (subnet) with full customization"""
    name: str
    owner_wallet: str
    tribute_percent: float = 5.0
    
    # Economy Configuration
    token_config: Optional[TokenConfig] = None
    treasury_config: Optional[TreasuryConfig] = None
    economic_config: Optional[EconomicConfig] = None
    network_config: Optional[NetworkConfig] = None
    
    # Custom metadata
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class PlanetCreate(BaseModel):
    """Create a new planet (validator node)"""
    name: str
    star_system_id: str
    star_system_name: str
    owner_wallet: str
    planet_type: str = "habitable"
    
    # Planet-specific configuration
    node_config: Optional[Dict[str, Any]] = None  # Custom node configuration


@router.post("/spawn-star-system")
async def spawn_star_system(request: StarSystemCreate, mock: Optional[bool] = Query(None, description="Use mock mode for testing")):
    """
    Create a new star system (Avalanche subnet) using Avalanche CLI
    Uses admin keys automatically discovered from current subnet configuration
    
    This endpoint:
    1. Validates the request
    2. Checks if Avalanche CLI is available (or uses mock mode)
    3. Creates the subnet using 'avalanche subnet create' (or mock data)
    4. Uses admin keys from current subnet for operations
    5. Configures the network
    6. Returns subnet information
    
    Args:
        request: Star system creation request
        mock: If True, creates mock star system without Avalanche CLI
    """
    # If mock mode, skip CLI check and create mock subnet
    # Default to mock=True (auto-mock if CLI unavailable or if explicitly requested)
    use_mock = mock if mock is not None else (not is_avalanche_cli_available() or True)  # Always mock for testing
    
    if not use_mock and not is_avalanche_cli_available():
        raise HTTPException(
            status_code=503,
            detail="Avalanche CLI is not installed. Please install Avalanche CLI to create star systems."
        )
    
    # Validate inputs
    if not request.name or len(request.name) < 3:
        raise HTTPException(status_code=400, detail="Star system name must be at least 3 characters")
    
    if request.tribute_percent < 0 or request.tribute_percent > 20:
        raise HTTPException(status_code=400, detail="Tribute must be between 0-20%")
    
    # Validate wallet address format
    if not request.owner_wallet.startswith("0x") or len(request.owner_wallet) != 42:
        raise HTTPException(status_code=400, detail="Invalid wallet address format")
    
    # Validate economy configuration
    if request.treasury_config and request.treasury_config.reserves:
        total = sum(request.treasury_config.reserves.values())
        if abs(total - 1.0) > 0.01:
            raise HTTPException(
                status_code=400, 
                detail=f"Reserve allocation must sum to 1.0, got {total}"
            )
    
    if request.economic_config:
        if request.economic_config.transaction_fee_percent < 0 or request.economic_config.transaction_fee_percent > 10:
            raise HTTPException(status_code=400, detail="Transaction fee must be between 0-10%")
        if request.economic_config.platform_fee_percent < 0 or request.economic_config.platform_fee_percent > 10:
            raise HTTPException(status_code=400, detail="Platform fee must be between 0-10%")
    
    try:
        subnet_name = request.name
        import time
        timestamp = int(time.time())
        
        if use_mock:
            # Mock mode: Create mock subnet data without Avalanche CLI
            print(f"Creating MOCK star system: {subnet_name}")
            
            # Generate mock subnet configuration
            import random
            blockchain_id = f"mock-{subnet_name.lower().replace(' ', '-')}-{timestamp}"
            chain_id = 900000 + random.randint(1, 99999)
            # Always use Chaos Star Network RPC - never use port 9650
            rpc_url = AVALANCHE_RPC
            
            subnet_info = {
                "name": subnet_name,
                "blockchain_id": blockchain_id,
                "mock": True
            }
        else:
            # Real mode: Use Avalanche CLI
            detector = get_cli_detector()
            
            # Get admin keys from current subnet configuration
            # Use the default subnet interactor to get admin keys
            default_interactor = create_subnet_interactor(SUBNET_NAME)
            admin_key = default_interactor.get_private_key() or ADMIN_PRIVATE_KEY or PRIVATE_KEY
            
            if admin_key:
                from eth_account import Account
                admin_account = Account.from_key(admin_key)
                print(f"Using admin account: {admin_account.address} for subnet creation")
            
            # Step 1: Create subnet using Avalanche CLI
            print(f"Creating subnet: {subnet_name}")
            print(f"Using admin keys from subnet: {SUBNET_NAME}")
            
            # Actually create and deploy the subnet
            detector = get_cli_detector()
            
            # Create subnet
            create_result = detector.execute_avalanche_command(
                "subnet create",
                args=[subnet_name],
                timeout=120
            )
            
            if create_result.returncode != 0:
                print(f"Warning: Subnet creation may require interactive input: {create_result.stderr}")
                # Continue with configuration setup even if creation command failed
            
            # Prepare economy and network configuration
            economy_config = {}
            if request.token_config:
                economy_config["token"] = {
                    "name": request.token_config.name or f"{subnet_name} Token",
                    "symbol": request.token_config.symbol or f"{subnet_name[:3].upper()}T",
                    "decimals": request.token_config.decimals,
                    "initial_supply": request.token_config.initial_supply,
                    "max_supply": request.token_config.max_supply,
                    "mintable": request.token_config.mintable,
                    "burnable": request.token_config.burnable
                }
            
            if request.treasury_config:
                economy_config["treasury"] = {
                    "reserves": request.treasury_config.reserves or {},
                    "coverage_ratio": request.treasury_config.coverage_ratio,
                    "inflation_mode": request.treasury_config.inflation_mode,
                    "initial_balance": request.treasury_config.initial_balance or {}
                }
            
            if request.economic_config:
                economy_config["economic"] = {
                    "gas_price_gwei": request.economic_config.gas_price_gwei,
                    "gas_limit": request.economic_config.gas_limit,
                    "min_gas_price": request.economic_config.min_gas_price,
                    "block_time_seconds": request.economic_config.block_time_seconds,
                    "transaction_fee_percent": request.economic_config.transaction_fee_percent,
                    "platform_fee_percent": request.economic_config.platform_fee_percent
                }
            
            if request.network_config:
                economy_config["network"] = {
                    "chain_id": request.network_config.chain_id,
                    "validator_count": request.network_config.validator_count,
                    "consensus_mechanism": request.network_config.consensus_mechanism,
                    "reward_address": request.network_config.reward_address
                }
            
            # Try to create subnet (this may require interactive input)
            # The subnet will use the current subnet's admin keys
            create_result = detector.execute_avalanche_command(
                "subnet create",
                args=[subnet_name],
                timeout=60
            )
            
            if create_result.returncode != 0:
                # If interactive creation fails, we'll create the subnet configuration manually
                print(f"Subnet creation may require interactive input. Setting up configuration structure...")
                
                # Create subnet directory structure
                avalanche_home = Path.home() / ".avalanche-cli"
                subnet_dir = avalanche_home / "subnets" / subnet_name
                subnet_dir.mkdir(parents=True, exist_ok=True)
                
                # Generate network configuration with economy settings
                import json
                
                # Determine chain ID
                chain_id = None
                if request.network_config and request.network_config.chain_id:
                    chain_id = request.network_config.chain_id
                else:
                    # Generate a unique chain ID based on subnet name hash
                    import hashlib
                    hash_obj = hashlib.md5(subnet_name.encode())
                    chain_id = 8987 + (int(hash_obj.hexdigest()[:6], 16) % 10000)
                
                network_config = {
                    "blockchainID": f"subnet-{subnet_name}",
                    "rpc": AVALANCHE_RPC,  # Always use Chaos Star Network RPC - never use port 9650
                    "chainId": chain_id
                }
                
                # Add economy configuration
                if economy_config:
                    network_config["economy"] = economy_config
                
                network_file = subnet_dir / "network.json"
                with open(network_file, 'w') as f:
                    json.dump(network_config, f, indent=2)
                
                # Also create economy configuration file
                if economy_config:
                    economy_file = subnet_dir / "economy.json"
                    with open(economy_file, 'w') as f:
                        json.dump(economy_config, f, indent=2)
            
            # Step 2: Get subnet information
            interactor = create_subnet_interactor(subnet_name)
            subnet_info = interactor.get_subnet_info() or {}
            
            # Step 3: Get RPC URL and configuration
            rpc_url = interactor.get_rpc_url()
            if not rpc_url and 'network_config' in locals():
                rpc_url = network_config.get("rpc")
            if not rpc_url:
                # Always use Chaos Star Network RPC - never use port 9650
                rpc_url = AVALANCHE_RPC
            
            blockchain_id = subnet_info.get("blockchain_id") or subnet_info.get("blockchainID") or subnet_name
            chain_id = None
        
        # Step 4: Automatically deploy contracts to the subnet (if not mock and Forge is available)
        contract_deployment = None
        if not use_mock:
            try:
                from subnet_contract_manager import SubnetContractManager
                
                # Check if Forge is available
                forge_available = tools.get("forge", {}).get("installed", False)
                if forge_available:
                    print(f"\n=== Auto-deploying contracts to subnet '{subnet_name}' ===")
                    try:
                        contract_manager = SubnetContractManager(subnet_name)
                        deployed_addresses = contract_manager.deploy_all_contracts()
                        
                        # Get deployment info including ABIs
                        deployment_info = contract_manager.get_deployment_info()
                        contract_deployment = {
                            "success": True,
                            "addresses": deployed_addresses,
                            "deployment_info": deployment_info,
                            "message": f"Contracts deployed successfully to subnet '{subnet_name}'"
                        }
                        print(f"✓ Contract deployment completed for subnet '{subnet_name}'")
                    except Exception as deploy_error:
                        print(f"⚠ Contract deployment failed for subnet '{subnet_name}': {deploy_error}")
                        contract_deployment = {
                            "success": False,
                            "error": str(deploy_error),
                            "message": f"Contract deployment failed: {str(deploy_error)}"
                        }
                else:
                    print(f"⚠ Forge not available, skipping automatic contract deployment for subnet '{subnet_name}'")
            except ImportError as import_error:
                print(f"⚠ Could not import SubnetContractManager: {import_error}")
            except Exception as e:
                print(f"⚠ Error during contract deployment: {e}")
        
        # Step 5: Save to database with subnet assignment
        if SUPABASE_AVAILABLE:
            try:
                from datetime import datetime
                star_system_data_db = {
                    "name": subnet_name,
                    "subnet_id": blockchain_id if use_mock else (subnet_info.get("name") if subnet_info else subnet_name),
                    "subnet_name": subnet_name,
                    "assigned_subnet_id": blockchain_id if use_mock else (subnet_info.get("blockchain_id") or subnet_info.get("blockchainID") if subnet_info else None),
                    "owner_wallet": request.owner_wallet,
                    "rpc_url": rpc_url,
                    "chain_id": chain_id if use_mock else None,
                    "tribute_percent": request.tribute_percent,
                    "status": "deploying" if not use_mock else "active",
                    "native_coin_symbol": "CSN",
                    "native_balance": 0,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                # Upsert star system
                supabase.table("star_systems").upsert(star_system_data_db, on_conflict="name").execute()
            except Exception as db_error:
                print(f"Warning: Could not save to database: {db_error}")
        
        # Step 6: Return subnet information
        status_msg = "active" if contract_deployment and contract_deployment.get("success") else ("deploying" if not use_mock else "active")
        message = f"Star system '{subnet_name}' created successfully!"
        if contract_deployment and contract_deployment.get("success"):
            message += f" Contracts deployed automatically."
        elif not use_mock:
            message += f" Use 'avalanche subnet deploy {subnet_name}' to deploy the subnet."
        
        next_steps = []
        if use_mock:
            next_steps = [
                f"This is a MOCK star system (for testing)",
                f"Create planets to populate your star system"
            ]
        else:
            if contract_deployment and contract_deployment.get("success"):
                next_steps = [
                    f"✓ Contracts deployed to subnet '{subnet_name}'",
                    f"Check contract addresses in deployments/{subnet_name}/addresses.json",
                    f"Check ABIs in backend/abi/{subnet_name}/",
                    f"Run the network: avalanche network run {subnet_name}"
                ]
            else:
                next_steps = [
                    f"Deploy the subnet: avalanche subnet deploy {subnet_name}",
                    f"Check subnet status: avalanche subnet describe {subnet_name}",
                    f"Deploy contracts: Use POST /celestial-forge/star-systems/{subnet_name}/deploy-contracts"
                ]
        
        # Prepare response with economy configuration
        star_system_data = {
            "name": subnet_name,
            "subnet_id": blockchain_id if use_mock else (subnet_info.get("name") if subnet_info else subnet_name),
            "subnet_name": subnet_name,
            "assigned_subnet_id": blockchain_id if use_mock else (subnet_info.get("blockchain_id") or subnet_info.get("blockchainID") if subnet_info else None),
            "rpc_url": rpc_url,
            "chain_id": chain_id if use_mock else None,
            "owner_wallet": request.owner_wallet,
            "tribute_percent": request.tribute_percent,
            "status": status_msg,
            "mock": use_mock,
            "native_coin_symbol": "CSN",
            "native_balance": 0,
        }
        
        # Include contract deployment info if available
        if contract_deployment:
            star_system_data["contract_deployment"] = contract_deployment
            if contract_deployment.get("success") and contract_deployment.get("addresses"):
                star_system_data["contract_addresses"] = contract_deployment["addresses"]
        
        # Include economy configuration in response
        if request.token_config:
            star_system_data["token_config"] = request.token_config.model_dump()
        if request.treasury_config:
            star_system_data["treasury_config"] = request.treasury_config.model_dump()
        if request.economic_config:
            star_system_data["economic_config"] = request.economic_config.model_dump()
        if request.network_config:
            star_system_data["network_config"] = request.network_config.model_dump()
        if request.description:
            star_system_data["description"] = request.description
        if request.tags:
            star_system_data["tags"] = request.tags
        
        response = {
            "success": True,
            "star_system": star_system_data,
            "message": message,
            "next_steps": next_steps
        }
        
        # Include contract deployment info in response
        if contract_deployment:
            response["contract_deployment"] = contract_deployment
        
        return response
    
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail=f"Subnet creation timed out. Please try creating '{request.name}' manually with 'avalanche subnet create {request.name}'"
        )
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create star system: {str(e)}\n{traceback.format_exc()}"
        )


@router.get("/subnet/{subnet_name}/status")
async def get_subnet_status(subnet_name: str):
    """
    Get the status of a subnet (star system)
    Returns admin account information from subnet configuration
    """
    if not is_avalanche_cli_available():
        raise HTTPException(status_code=503, detail="Avalanche CLI is not installed")
    
    try:
        interactor = create_subnet_interactor(subnet_name)
        status = interactor.get_status()
        subnet_info = interactor.get_subnet_info()
        
        # Include admin account info if available
        admin_info = {}
        admin_key = interactor.get_private_key() or ADMIN_PRIVATE_KEY or PRIVATE_KEY
        if admin_key:
            from eth_account import Account
            admin_account = Account.from_key(admin_key)
            admin_info = {
                "admin_address": admin_account.address,
                "has_admin_key": True
            }
        
        return {
            "success": True,
            "subnet_name": subnet_name,
            "status": status,
            "info": subnet_info,
            "admin": admin_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subnet/{subnet_name}/deploy")
async def deploy_subnet(subnet_name: str):
    """
    Deploy a subnet (star system) using Avalanche CLI
    Uses admin keys automatically discovered from subnet configuration
    """
    if not is_avalanche_cli_available():
        raise HTTPException(status_code=503, detail="Avalanche CLI is not installed")
    
    try:
        interactor = create_subnet_interactor(subnet_name)
        
        # Ensure we have admin keys (interactor auto-discovers them)
        admin_key = interactor.get_private_key() or ADMIN_PRIVATE_KEY or PRIVATE_KEY
        if admin_key:
            from eth_account import Account
            admin_account = Account.from_key(admin_key)
            print(f"Deploying subnet '{subnet_name}' with admin account: {admin_account.address}")
        
        # Execute subnet deploy command
        deploy_result = interactor.execute_subnet_command(
            "subnet deploy",
            args=[subnet_name],
            timeout=120
        )
        
        if not deploy_result.get("success"):
            return {
                "success": False,
                "error": deploy_result.get("error"),
                "output": deploy_result.get("output"),
                "message": f"Subnet deployment may require interactive input. Try running 'avalanche subnet deploy {subnet_name}' manually."
            }
        
        return {
            "success": True,
            "subnet_name": subnet_name,
            "output": deploy_result.get("output"),
            "message": f"Subnet '{subnet_name}' deployment initiated"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subnet/{subnet_name}/run")
async def run_subnet(subnet_name: str):
    """
    Run a subnet network (start the subnet)
    Uses admin keys automatically discovered from subnet configuration
    """
    if not is_avalanche_cli_available():
        raise HTTPException(status_code=503, detail="Avalanche CLI is not installed")
    
    try:
        interactor = create_subnet_interactor(subnet_name)
        
        # Ensure we have admin keys (interactor auto-discovers them)
        admin_key = interactor.get_private_key() or ADMIN_PRIVATE_KEY or PRIVATE_KEY
        if admin_key:
            from eth_account import Account
            admin_account = Account.from_key(admin_key)
            print(f"Running subnet '{subnet_name}' with admin account: {admin_account.address}")
        
        result = interactor.network_run(subnet_name)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/spawn-planet")
async def spawn_planet(request: PlanetCreate, mock: Optional[bool] = Query(None, description="Use mock mode for testing")):
    """
    Create a new planet (validator node) for a star system
    
    This endpoint:
    1. Validates the request
    2. Adds a validator to the subnet (or creates mock planet)
    3. Configures the node
    4. Returns planet information
    
    Args:
        request: Planet creation request
        mock: If True, creates mock planet without Avalanche CLI
    """
    # Default to mock=True (auto-mock if CLI unavailable or if explicitly requested)
    use_mock = mock if mock is not None else (not is_avalanche_cli_available() or True)  # Always mock for testing
    
    if not use_mock and not is_avalanche_cli_available():
        raise HTTPException(
            status_code=503,
            detail="Avalanche CLI is not installed. Please install Avalanche CLI to create planets."
        )
    
    # Validate inputs
    if not request.name or len(request.name) < 3:
        raise HTTPException(status_code=400, detail="Planet name must be at least 3 characters")
    
    if not request.star_system_name:
        raise HTTPException(status_code=400, detail="Star system name is required")
    
    try:
        subnet_name = request.star_system_name
        
        if use_mock:
            # Mock mode: Create mock planet data
            print(f"Creating MOCK planet: {request.name} in {subnet_name}")
            
            status = "active"
            message = f"Planet '{request.name}' created successfully!"
            next_steps = [
                f"This is a MOCK planet (for testing)",
                f"Planet is ready to use in your star system"
            ]
        else:
            # Real mode: Use Avalanche CLI
            interactor = create_subnet_interactor(subnet_name)
            
            # For now, we'll return information about adding a validator
            # Actual validator addition may require more complex setup
            status = "deploying"
            message = f"Planet '{request.name}' creation initiated for star system '{subnet_name}'"
            next_steps = [
                f"Add validator to subnet: avalanche subnet addValidator {subnet_name}",
                f"Check subnet validators: avalanche subnet validators {subnet_name}"
            ]
        
        return {
            "success": True,
            "planet": {
                "name": request.name,
                "star_system_id": request.star_system_id,
                "star_system_name": subnet_name,
                "node_type": "master",
                "owner_wallet": request.owner_wallet,
                "planet_type": request.planet_type,
                "status": status,
                "mock": use_mock,
            },
            "message": message,
            "next_steps": next_steps
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subnets")
async def list_all_subnets():
    """List all available subnets from Avalanche CLI"""
    try:
        # Import the router function directly
        import avalanche_info_api
        result = await avalanche_info_api.list_subnets()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing subnets: {str(e)}")

@router.get("/nodes")
async def list_all_nodes():
    """List all nodes using 'avalanche node local status' command"""
    try:
        import avalanche_info_api
        # Use the new local nodes endpoint
        result = await avalanche_info_api.list_local_nodes()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing nodes: {str(e)}")

@router.get("/tools/status")
async def get_tools_status():
    """
    Get status of CLI tools required for Celestial Forge
    Also returns admin account information and default economy configuration
    """
    from cli_detector import detect_tools
    
    tools = detect_tools()
    
    # Include admin account info
    admin_info = {}
    admin_key = ADMIN_PRIVATE_KEY or PRIVATE_KEY
    if admin_key:
        try:
            from eth_account import Account
            admin_account = Account.from_key(admin_key)
            admin_info = {
                "admin_address": admin_account.address,
                "has_admin_key": True,
                "subnet_name": SUBNET_NAME,
                "rpc_url": AVALANCHE_RPC
            }
        except Exception:
            pass
    
    # Default economy configuration templates
    default_economy_config = {
        "token": {
            "name": "Star System Token",
            "symbol": "SST",
            "decimals": 18,
            "initial_supply": 1000000,
            "max_supply": None,
            "mintable": True,
            "burnable": True
        },
        "treasury": {
            "reserves": {
                "BTC": 0.30,
                "STABLE": 0.20,
                "AVAX": 0.125,
                "ETH": 0.125,
                "MATIC": 0.125,
                "XRP": 0.125
            },
            "coverage_ratio": 1.0,
            "inflation_mode": "elastic",
            "initial_balance": {}
        },
        "economic": {
            "gas_price_gwei": 25.0,
            "gas_limit": 300000,
            "min_gas_price": 1.0,
            "block_time_seconds": 1,
            "transaction_fee_percent": 0.0,
            "platform_fee_percent": 0.0
        },
        "network": {
            "validator_count": 1,
            "consensus_mechanism": "Snowman++",
            "reward_address": None
        }
    }
    
    return {
        "success": True,
        "tools": tools,
        "can_create_star_systems": tools.get("avalanche_cli", {}).get("installed", False),
        "can_deploy_contracts": tools.get("forge", {}).get("installed", False),
        "admin": admin_info,
        "default_economy_config": default_economy_config
    }


# Star System & Planet Interaction Endpoints
@router.get("/star-systems")
async def list_star_systems(owner_wallet: Optional[str] = None):
    """List all star systems, optionally filtered by owner. Includes Sarakt Star System with Sarakt Prime and Zythera."""
    try:
        # First, ensure Sarakt Star System exists (seed it if needed)
        await _ensure_sarakt_system_exists()
        
        if not SUPABASE_AVAILABLE:
            # Return default Sarakt system even if Supabase is not available
            return {
                "success": True,
                "star_systems": [_get_default_sarakt_system()],
                "count": 1
            }
        
        query = supabase.table("star_systems").select("*").order("created_at", desc=False)
        
        if owner_wallet:
            query = query.eq("owner_wallet", owner_wallet)
        
        response = query.execute()
        
        # Ensure Sarakt system is included
        systems = response.data or []
        sarakt_system = _get_default_sarakt_system()
        if not any(s.get("name") == "Sarakt Star System" for s in systems):
            systems.insert(0, sarakt_system)
        
        return {
            "success": True,
            "star_systems": systems,
            "count": len(systems)
        }
    except Exception as e:
        # Fallback to default system on error
        return {
            "success": True,
            "star_systems": [_get_default_sarakt_system()],
            "count": 1
        }


@router.get("/star-systems/{system_id}")
async def get_star_system(system_id: str):
    """Get details of a specific star system. Supports 'Sarakt Star System', 'sarakt-star-system', or database ID."""
    try:
        # Check if requesting Sarakt Star System
        if system_id.lower() in ["sarakt star system", "sarakt-star-system", "sarakt"]:
            await _ensure_sarakt_system_exists()
            sarakt_system = _get_default_sarakt_system()
            sarakt_system_id = sarakt_system["id"]
            planets = _get_default_planets(sarakt_system_id)
            
            if SUPABASE_AVAILABLE:
                # Try to get from database and merge
                try:
                    db_response = supabase.table("star_systems").select("*").eq("name", "Sarakt Star System").execute()
                    if db_response.data and len(db_response.data) > 0:
                        sarakt_system = {**sarakt_system, **db_response.data[0]}
                    
                    planets_response = supabase.table("planets").select("*").eq("star_system_id", sarakt_system_id).execute()
                    if planets_response.data:
                        # Merge with defaults
                        existing_names = {p.get("name") for p in planets_response.data}
                        for planet in planets:
                            if planet.get("name") not in existing_names:
                                planets_response.data.insert(0, planet)
                        planets = planets_response.data
                except Exception:
                    pass
            
            return {
                "success": True,
                "star_system": sarakt_system,
                "planets": planets
            }
        
        if not SUPABASE_AVAILABLE:
            raise HTTPException(status_code=503, detail="Supabase not available")
        
        # Try by ID first
        response = supabase.table("star_systems").select("*").eq("id", system_id).execute()
        
        if not response.data or len(response.data) == 0:
            # Try by name
            response = supabase.table("star_systems").select("*").eq("name", system_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Star system not found")
        
        star_system = response.data[0]
        
        # Get planets for this star system
        planets_response = supabase.table("planets").select("*").eq("star_system_id", star_system["id"]).execute()
        
        return {
            "success": True,
            "star_system": star_system,
            "planets": planets_response.data or []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/planets")
async def list_planets(star_system_id: Optional[str] = None, owner_wallet: Optional[str] = None):
    """List all planets, optionally filtered by star system or owner. Includes Sarakt Prime and Zythera."""
    try:
        # Ensure Sarakt system and planets exist
        sarakt_system_id = await _ensure_sarakt_system_exists()
        
        if not SUPABASE_AVAILABLE:
            # Return default planets even if Supabase is not available
            default_planets = _get_default_planets(sarakt_system_id)
            if star_system_id and star_system_id != sarakt_system_id:
                default_planets = []
            return {
                "success": True,
                "planets": default_planets,
                "count": len(default_planets)
            }
        
        query = supabase.table("planets").select("*").order("created_at", desc=False)
        
        if star_system_id:
            query = query.eq("star_system_id", star_system_id)
        
        if owner_wallet:
            query = query.eq("owner_wallet", owner_wallet)
        
        response = query.execute()
        planets = response.data or []
        
        # Add Sarakt Prime and Zythera if they don't exist
        if not star_system_id or star_system_id == sarakt_system_id:
            existing_names = {p.get("name") for p in planets}
            default_planets = _get_default_planets(sarakt_system_id)
            for planet in default_planets:
                if planet.get("name") not in existing_names:
                    planets.insert(0, planet)
        
        return {
            "success": True,
            "planets": planets,
            "count": len(planets)
        }
    except Exception as e:
        # Fallback to default planets on error
        sarakt_system_id = await _ensure_sarakt_system_exists()
        default_planets = _get_default_planets(sarakt_system_id)
        if star_system_id and star_system_id != sarakt_system_id:
            default_planets = []
        return {
            "success": True,
            "planets": default_planets,
            "count": len(default_planets)
        }


@router.get("/planets/{planet_id}")
async def get_planet(planet_id: str):
    """Get details of a specific planet. Supports 'Sarakt Prime', 'Zythera', database ID, or name."""
    try:
        # Check if requesting Sarakt Prime or Zythera
        planet_name_lower = planet_id.lower()
        if planet_name_lower in ["sarakt prime", "sarakt-prime", "saraktprime"]:
            await _ensure_sarakt_system_exists()
            sarakt_system_id = "sarakt-star-system"
            planet = _get_default_planets(sarakt_system_id)[0]  # Sarakt Prime
            star_system = _get_default_sarakt_system()
            
            if SUPABASE_AVAILABLE:
                try:
                    db_planet = supabase.table("planets").select("*").eq("name", "Sarakt Prime").execute()
                    if db_planet.data and len(db_planet.data) > 0:
                        planet = {**planet, **db_planet.data[0]}
                    
                    db_system = supabase.table("star_systems").select("*").eq("name", "Sarakt Star System").execute()
                    if db_system.data and len(db_system.data) > 0:
                        star_system = {**star_system, **db_system.data[0]}
                except Exception:
                    pass
            
            return {
                "success": True,
                "planet": planet,
                "star_system": star_system
            }
        
        if planet_name_lower in ["zythera"]:
            await _ensure_sarakt_system_exists()
            sarakt_system_id = "sarakt-star-system"
            planet = _get_default_planets(sarakt_system_id)[1]  # Zythera
            star_system = _get_default_sarakt_system()
            
            if SUPABASE_AVAILABLE:
                try:
                    db_planet = supabase.table("planets").select("*").eq("name", "Zythera").execute()
                    if db_planet.data and len(db_planet.data) > 0:
                        planet = {**planet, **db_planet.data[0]}
                    
                    db_system = supabase.table("star_systems").select("*").eq("name", "Sarakt Star System").execute()
                    if db_system.data and len(db_system.data) > 0:
                        star_system = {**star_system, **db_system.data[0]}
                except Exception:
                    pass
            
            return {
                "success": True,
                "planet": planet,
                "star_system": star_system
            }
        
        if not SUPABASE_AVAILABLE:
            raise HTTPException(status_code=503, detail="Supabase not available")
        
        # Try by ID first
        response = supabase.table("planets").select("*").eq("id", planet_id).execute()
        
        if not response.data or len(response.data) == 0:
            # Try by name
            response = supabase.table("planets").select("*").eq("name", planet_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Planet not found")
        
        planet = response.data[0]
        
        # Get star system info
        star_system_response = supabase.table("star_systems").select("*").eq("id", planet["star_system_id"]).execute()
        
        return {
            "success": True,
            "planet": planet,
            "star_system": star_system_response.data[0] if star_system_response.data and len(star_system_response.data) > 0 else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/star-systems/{system_id}/status")
async def update_star_system_status(system_id: str, status: str):
    """Update status of a star system (active, deploying, inactive)"""
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Supabase not available")
    
    if status not in ["active", "deploying", "inactive"]:
        raise HTTPException(status_code=400, detail="Status must be: active, deploying, or inactive")
    
    try:
        from datetime import datetime
        response = supabase.table("star_systems").update({"status": status, "updated_at": datetime.now().isoformat()}).eq("id", system_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Star system not found")
        
        return {
            "success": True,
            "star_system": response.data[0] if response.data else None,
            "message": f"Star system status updated to {status}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/planets/{planet_id}/status")
async def update_planet_status(planet_id: str, status: str):
    """Update status of a planet (active, deploying, inactive)"""
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Supabase not available")
    
    if status not in ["active", "deploying", "inactive"]:
        raise HTTPException(status_code=400, detail="Status must be: active, deploying, or inactive")
    
    try:
        from datetime import datetime
        response = supabase.table("planets").update({"status": status, "updated_at": datetime.now().isoformat()}).eq("id", planet_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Planet not found")
        
        return {
            "success": True,
            "planet": response.data[0] if response.data else None,
            "message": f"Planet status updated to {status}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/star-systems/{subnet_name}/deploy-contracts")
async def deploy_contracts_to_subnet(subnet_name: str):
    """
    Deploy contracts to a specific subnet (star system) and extract ABIs/addresses automatically
    """
    if not is_avalanche_cli_available():
        raise HTTPException(status_code=503, detail="Avalanche CLI is not installed")
    
    try:
        from subnet_contract_manager import SubnetContractManager
        
        # Check if Forge is available
        from cli_detector import detect_tools
        tools = detect_tools()
        forge_available = tools.get("forge", {}).get("installed", False)
        if not forge_available:
            raise HTTPException(
                status_code=503,
                detail="Forge is not installed. Please install Foundry to deploy contracts."
            )
        
        print(f"Deploying contracts to subnet '{subnet_name}'...")
        
        # Create subnet contract manager
        contract_manager = SubnetContractManager(subnet_name)
        
        # Deploy all contracts
        deployed_addresses = contract_manager.deploy_all_contracts()
        
        # Get deployment info including ABIs
        deployment_info = contract_manager.get_deployment_info()
        
        # Get ABIs for all contracts
        abis = {}
        contract_names = ["SaraktDigitalID", "SaraktTreasury", "SaraktLandV2", "DummyToken"]
        for contract_name in contract_names:
            abi = contract_manager.get_abi(contract_name)
            if abi:
                abis[contract_name] = abi
        
        return {
            "success": True,
            "subnet_name": subnet_name,
            "message": f"Contracts deployed successfully to subnet '{subnet_name}'",
            "addresses": deployed_addresses,
            "abis": abis,
            "deployment_info": deployment_info
        }
    
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail=f"Contract deployment failed: {str(e)}\n{traceback.format_exc()}"
        )


@router.get("/star-systems/{subnet_name}/contracts")
async def get_subnet_contracts(subnet_name: str):
    """
    Get contract addresses and ABIs for a specific subnet (star system)
    """
    try:
        from subnet_contract_manager import SubnetContractManager
        
        # Create subnet contract manager
        contract_manager = SubnetContractManager(subnet_name)
        
        # Get deployment info
        deployment_info = contract_manager.get_deployment_info()
        
        # Get ABIs for all contracts
        abis = {}
        contract_names = ["SaraktDigitalID", "SaraktTreasury", "SaraktLandV2", "DummyToken"]
        for contract_name in contract_names:
            abi = contract_manager.get_abi(contract_name)
            if abi:
                abis[contract_name] = abi
        
        # Check deployment status
        deployment_status = {}
        for name, address in contract_manager.addresses.items():
            deployed = contract_manager.check_contract_deployed(address) if address else False
            deployment_status[name] = {
                "address": address,
                "deployed": deployed,
                "abi_available": name in abis
            }
        
        return {
            "success": True,
            "subnet_name": subnet_name,
            "deployment_info": deployment_info,
            "addresses": contract_manager.addresses,
            "abis": abis,
            "deployment_status": deployment_status
        }
    
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get contract info: {str(e)}\n{traceback.format_exc()}"
        )


@router.post("/star-systems/{system_id}/assign-subnet")
async def assign_subnet_to_star_system(system_id: str, subnet_name: str, subnet_id: Optional[str] = None):
    """Assign an Avalanche subnet to a star system"""
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Supabase not available")
    
    try:
        # Get subnet information
        import avalanche_info_api
        subnet_info = await avalanche_info_api.describe_subnet(subnet_name)
        
        if not subnet_info.get("success"):
            raise HTTPException(status_code=404, detail=f"Subnet '{subnet_name}' not found")
        
        parsed = subnet_info.get("parsed", {})
        networks = parsed.get("networks", {})
        
        # Extract subnet ID and RPC URL
        assigned_subnet_id = subnet_id
        rpc_url = None
        
        # Try to get from Local network first, then Fuji
        for network_name in ["Local", "local", "Fuji", "fuji"]:
            if network_name in networks:
                network = networks[network_name]
                if not assigned_subnet_id:
                    assigned_subnet_id = network.get("SubnetID") or network.get("subnetID")
                if not rpc_url:
                    rpc_url = network.get("RPC Endpoint") or network.get("rpc_endpoint")
                break
        
        # Update star system
        from datetime import datetime
        update_data = {
            "subnet_name": subnet_name,
            "assigned_subnet_id": assigned_subnet_id,
            "subnet_id": assigned_subnet_id,  # Also update subnet_id for compatibility
            "rpc_url": rpc_url,
            "updated_at": datetime.now().isoformat()
        }
        
        response = supabase.table("star_systems").update(update_data).eq("id", system_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Star system not found")
        
        return {
            "success": True,
            "star_system": response.data[0],
            "subnet_info": parsed,
            "message": f"Subnet '{subnet_name}' assigned to star system"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error assigning subnet: {str(e)}")

@router.post("/planets/{planet_id}/assign-subnet")
async def assign_subnet_to_planet(planet_id: str, subnet_name: str, node_id: Optional[str] = None):
    """Assign an Avalanche subnet and node to a planet"""
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Supabase not available")
    
    try:
        # Get subnet information
        import avalanche_info_api
        subnet_info = await avalanche_info_api.describe_subnet(subnet_name)
        
        if not subnet_info.get("success"):
            raise HTTPException(status_code=404, detail=f"Subnet '{subnet_name}' not found")
        
        parsed = subnet_info.get("parsed", {})
        networks = parsed.get("networks", {})
        
        # Extract subnet ID
        assigned_subnet_id = None
        for network_name in ["Local", "local", "Fuji", "fuji"]:
            if network_name in networks:
                network = networks[network_name]
                assigned_subnet_id = network.get("SubnetID") or network.get("subnetID")
                break
        
        # Update planet
        from datetime import datetime
        update_data = {
            "subnet_name": subnet_name,
            "assigned_subnet_id": assigned_subnet_id,
            "node_id": node_id,
            "updated_at": datetime.now().isoformat()
        }
        
        response = supabase.table("planets").update(update_data).eq("id", planet_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Planet not found")
        
        return {
            "success": True,
            "planet": response.data[0],
            "subnet_info": parsed,
            "message": f"Subnet '{subnet_name}' assigned to planet"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error assigning subnet: {str(e)}")

class AssignNodeRequest(BaseModel):
    """Request model for assigning a node to a planet"""
    node_id: str
    subnet_name: Optional[str] = None

@router.post("/planets/{planet_id}/assign-node")
async def assign_node_to_planet(planet_id: str, request: AssignNodeRequest):
    """Assign an Avalanche node to a planet"""
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Supabase not available")
    
    try:
        # Verify node exists by checking local nodes
        import avalanche_info_api
        nodes_result = await avalanche_info_api.list_local_nodes()
        
        if not nodes_result.get("success"):
            raise HTTPException(status_code=503, detail="Could not verify node - Avalanche CLI not available")
        
        nodes = nodes_result.get("nodes", [])
        node_found = any(node.get("node_id") == request.node_id for node in nodes)
        
        if not node_found:
            # Node might still be valid even if not in local status
            # Allow assignment but log warning
            pass
        
        # Update planet with node assignment
        from datetime import datetime
        update_data = {
            "node_id": request.node_id,
            "updated_at": datetime.now().isoformat()
        }
        
        # If subnet_name is provided, also update subnet
        if request.subnet_name:
            subnet_info = await avalanche_info_api.describe_subnet(request.subnet_name)
            if subnet_info.get("success"):
                parsed = subnet_info.get("parsed", {})
                networks = parsed.get("networks", {})
                assigned_subnet_id = None
                for network_name in ["Local", "local", "Fuji", "fuji"]:
                    if network_name in networks:
                        network = networks[network_name]
                        assigned_subnet_id = network.get("SubnetID") or network.get("subnetID")
                        break
                if assigned_subnet_id:
                    update_data["subnet_name"] = request.subnet_name
                    update_data["assigned_subnet_id"] = assigned_subnet_id
        
        response = supabase.table("planets").update(update_data).eq("id", planet_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Planet not found")
        
        return {
            "success": True,
            "planet": response.data[0],
            "node_id": request.node_id,
            "message": f"Node '{request.node_id}' assigned to planet"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error assigning node: {str(e)}")

@router.get("/star-systems/{system_id}/native-balance")
async def get_star_system_native_balance(system_id: str):
    """Get native coin balance for a star system"""
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Supabase not available")
    
    try:
        # Get star system
        response = supabase.table("star_systems").select("*").eq("id", system_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Star system not found")
        
        star_system = response.data[0]
        owner_wallet = star_system.get("owner_wallet")
        rpc_url = star_system.get("rpc_url")
        
        if not owner_wallet or not rpc_url:
            return {
                "success": True,
                "balance": 0,
                "symbol": star_system.get("native_coin_symbol", "CSN"),
                "message": "Star system not configured with wallet or RPC"
            }
        
        # Get native balance from RPC
        try:
            from web3 import Web3
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            balance_wei = w3.eth.get_balance(owner_wallet)
            balance = float(w3.from_wei(balance_wei, "ether"))
            
            # Update balance in database
            from datetime import datetime
            supabase.table("star_systems").update({
                "native_balance": balance,
                "updated_at": datetime.now().isoformat()
            }).eq("id", system_id).execute()
            
            return {
                "success": True,
                "balance": balance,
                "symbol": star_system.get("native_coin_symbol", "CSN"),
                "wallet": owner_wallet
            }
        except Exception as e:
            return {
                "success": False,
                "balance": star_system.get("native_balance", 0),
                "symbol": star_system.get("native_coin_symbol", "CSN"),
                "error": str(e)
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting balance: {str(e)}")

@router.get("/planets/{planet_id}/native-balance")
async def get_planet_native_balance(planet_id: str):
    """Get native coin balance for a planet"""
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Supabase not available")
    
    try:
        # Get planet
        response = supabase.table("planets").select("*").eq("id", planet_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Planet not found")
        
        planet = response.data[0]
        owner_wallet = planet.get("owner_wallet")
        
        # Get star system for RPC URL
        star_system_response = supabase.table("star_systems").select("rpc_url, native_coin_symbol").eq("id", planet.get("star_system_id")).execute()
        star_system = star_system_response.data[0] if star_system_response.data else {}
        rpc_url = star_system.get("rpc_url")
        
        if not owner_wallet or not rpc_url:
            return {
                "success": True,
                "balance": 0,
                "symbol": planet.get("native_coin_symbol", "CSN"),
                "message": "Planet not configured with wallet or RPC"
            }
        
        # Get native balance from RPC
        try:
            from web3 import Web3
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            balance_wei = w3.eth.get_balance(owner_wallet)
            balance = float(w3.from_wei(balance_wei, "ether"))
            
            # Update balance in database
            from datetime import datetime
            supabase.table("planets").update({
                "native_balance": balance,
                "updated_at": datetime.now().isoformat()
            }).eq("id", planet_id).execute()
            
            return {
                "success": True,
                "balance": balance,
                "symbol": planet.get("native_coin_symbol", "CSN"),
                "wallet": owner_wallet
            }
        except Exception as e:
            return {
                "success": False,
                "balance": planet.get("native_balance", 0),
                "symbol": planet.get("native_coin_symbol", "CSN"),
                "error": str(e)
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting balance: {str(e)}")

@router.post("/star-systems/{system_id}/deploy")
async def deploy_star_system_mock(system_id: str):
    """Deploy a star system (mock version - just updates status)"""
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Supabase not available")
    
    try:
        # Get current star system
        response = supabase.table("star_systems").select("*").eq("id", system_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Star system not found")
        
        star_system = response.data[0]
        
        # For mock systems, just update status to active
        if star_system.get("subnet_id", "").startswith("mock-") or star_system.get("status") == "deploying":
            from datetime import datetime
            update_response = supabase.table("star_systems").update({
                "status": "active",
                "updated_at": datetime.now().isoformat()
            }).eq("id", system_id).execute()
            
            return {
                "success": True,
                "star_system": update_response.data[0] if update_response.data else star_system,
                "message": f"Star system '{star_system.get('name')}' deployed successfully (mock mode)",
                "mock": True
            }
        else:
            # For real systems, use Avalanche CLI
            if not is_avalanche_cli_available():
                raise HTTPException(status_code=503, detail="Avalanche CLI is not installed")
            
            interactor = create_subnet_interactor(star_system.get("name"))
            
            # Ensure we have admin keys (interactor auto-discovers them)
            admin_key = interactor.get_private_key() or ADMIN_PRIVATE_KEY or PRIVATE_KEY
            if admin_key:
                from eth_account import Account
                admin_account = Account.from_key(admin_key)
                print(f"Deploying star system '{star_system.get('name')}' with admin account: {admin_account.address}")
            
            deploy_result = interactor.execute_subnet_command(
                "subnet deploy",
                args=[star_system.get("name")],
                timeout=120
            )
            
            return {
                "success": True,
                "output": deploy_result.get("output"),
                "message": f"Star system '{star_system.get('name')}' deployment initiated",
                "mock": False
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

