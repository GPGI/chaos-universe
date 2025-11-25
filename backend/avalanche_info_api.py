"""
Avalanche CLI Information API
Provides endpoints to get information about subnets, keys, and network status
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import subprocess
import json
import re
import os
from pathlib import Path

router = APIRouter(prefix="/avalanche-info", tags=["avalanche-info"])

def get_avalanche_cli_home() -> Path:
    """Get Avalanche CLI home directory"""
    return Path.home() / ".avalanche-cli"

def discover_rpc_from_blockchain_describe(subnet_name: str = "ChaosStarNetwork") -> Optional[str]:
    """Discover RPC URL from blockchain describe command output"""
    try:
        result = subprocess.run(
            ["avalanche", "blockchain", "describe", subnet_name],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        if result.returncode == 0:
            parsed = parse_blockchain_describe(result.stdout)
            # Get RPC URL from parsed output
            if parsed.get("rpc_urls") and "localhost" in parsed["rpc_urls"]:
                return parsed["rpc_urls"]["localhost"]
    except Exception:
        pass
    return None

def get_rpc_url_for_balance() -> str:
    """Get RPC URL for balance queries, trying multiple discovery methods"""
    # Primary RPC URL for ChaosStarNetwork
    CHAOSSTARNETWORK_RPC = "http://127.0.0.1:41773/ext/bc/wtHFpLKd93iiPmBBsCdeTEPz6Quj9MoCL8NpuxoFXHtvTVeT1/rpc"
    
    # Try environment variables first
    rpc_url = os.getenv("VITE_AVALANCHE_RPC") or os.getenv("AVALANCHE_RPC")
    if rpc_url:
        return rpc_url
    
    # Try to discover from blockchain describe
    subnet_name = os.getenv("AVALANCHE_SUBNET_NAME", "ChaosStarNetwork")
    discovered_rpc = discover_rpc_from_blockchain_describe(subnet_name)
    if discovered_rpc:
        return discovered_rpc
    
    # Try to discover from subnet configuration files
    try:
        from backend.config import discover_rpc_from_subnet
        discovered_rpc = discover_rpc_from_subnet(subnet_name)
        if discovered_rpc:
            return discovered_rpc
    except Exception:
        pass
    
    # Use primary ChaosStarNetwork RPC as default
    if subnet_name == "ChaosStarNetwork":
        return CHAOSSTARNETWORK_RPC
    
    # Fallback to Chaos Star Network RPC (never use port 9650)
    return CHAOSSTARNETWORK_RPC

def parse_blockchain_describe(output: str) -> Dict[str, Any]:
    """Parse blockchain describe output into structured data"""
    parsed = {
        "name": "",
        "vm_id": "",
        "vm_version": "",
        "validation": "",
        "networks": {},
        "icm": {},
        "token": {},
        "initial_allocation": [],
        "rpc_urls": {},
        "primary_nodes": [],
        "l1_nodes": [],
        "precompile_configs": {},
        "wallet_connection": {}
    }
    
    lines = output.split('\n')
    current_section = None
    in_rpc_section = False
    in_primary_nodes = False
    in_l1_nodes = False
    in_precompile = False
    in_wallet = False
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('+'):
            # Check for section headers
            if 'RPC URLS' in line.upper():
                in_rpc_section = True
                in_primary_nodes = False
                in_l1_nodes = False
                in_precompile = False
                in_wallet = False
            elif 'PRIMARY NODES' in line.upper():
                in_primary_nodes = True
                in_rpc_section = False
                in_l1_nodes = False
                in_precompile = False
                in_wallet = False
            elif 'L1 NODES' in line.upper():
                in_l1_nodes = True
                in_rpc_section = False
                in_primary_nodes = False
                in_precompile = False
                in_wallet = False
            elif 'PRECOMPILE' in line.upper() and 'CONFIGS' in line.upper():
                in_precompile = True
                in_rpc_section = False
                in_primary_nodes = False
                in_l1_nodes = False
                in_wallet = False
            elif 'WALLET CONNECTION' in line.upper():
                in_wallet = True
                in_rpc_section = False
                in_primary_nodes = False
                in_l1_nodes = False
                in_precompile = False
            continue
        
        # Parse RPC URLs
        if in_rpc_section and '|' in line:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 2:
                location = parts[0]
                rpc_url = parts[1] if len(parts) > 1 else ""
                if rpc_url and 'http' in rpc_url:
                    parsed["rpc_urls"][location.lower()] = rpc_url
        
        # Parse Primary Nodes
        if in_primary_nodes and '|' in line and 'NAME' not in line.upper() and 'NODE ID' not in line.upper():
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 3:
                node = {
                    "name": parts[0],
                    "node_id": parts[1],
                    "endpoint": parts[2] if len(parts) > 2 else ""
                }
                parsed["primary_nodes"].append(node)
        
        # Parse L1 Nodes
        if in_l1_nodes and '|' in line and 'NAME' not in line.upper() and 'NODE ID' not in line.upper():
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 3:
                node = {
                    "name": parts[0],
                    "node_id": parts[1],
                    "endpoint": parts[2] if len(parts) > 2 else ""
                }
                parsed["l1_nodes"].append(node)
        
        # Parse Precompile Configs
        if in_precompile and '|' in line and 'PRECOMPILE' not in line.upper() and 'ADMIN' not in line.upper():
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 4:
                precompile_name = parts[0]
                if precompile_name not in parsed["precompile_configs"]:
                    parsed["precompile_configs"][precompile_name] = {}
                parsed["precompile_configs"][precompile_name] = {
                    "admin_addresses": parts[1] if parts[1] != "n/a" else None,
                    "manager_addresses": parts[2] if parts[2] != "n/a" else None,
                    "enabled_addresses": parts[3] if parts[3] != "n/a" else None
                }
        
        # Parse Wallet Connection Info
        if in_wallet and '|' in line:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 2:
                key = parts[0].lower().replace(' ', '_')
                value = parts[1] if len(parts) > 1 else ""
                parsed["wallet_connection"][key] = value
        
        # Parse main blockchain info
        if '| Name' in line:
            parts = line.split('|')
            if len(parts) >= 3:
                parsed["name"] = parts[2].strip()
        elif '| VM ID' in line:
            parts = line.split('|')
            if len(parts) >= 3:
                parsed["vm_id"] = parts[2].strip()
        elif '| VM Version' in line:
            parts = line.split('|')
            if len(parts) >= 3:
                parsed["vm_version"] = parts[2].strip()
        elif '| Validation' in line:
            parts = line.split('|')
            if len(parts) >= 3:
                parsed["validation"] = parts[2].strip()
        
        # Parse network sections (Local Network, Fuji, etc.)
        if '| Local Network' in line or '| Fuji' in line or '| Mainnet' in line:
            network_name = line.split('|')[1].strip()
            if network_name not in parsed["networks"]:
                parsed["networks"][network_name] = {}
            current_section = ("network", network_name)
        elif current_section and current_section[0] == "network":
            if '|' in line:
                parts = [p.strip() for p in line.split('|') if p.strip()]
                if len(parts) >= 2:
                    key = parts[0]
                    value = parts[1] if len(parts) > 1 else ""
                    parsed["networks"][current_section[1]][key] = value
        
        # Parse ICM section
        if 'ICM' in line and ('Messenger' in line or 'Registry' in line):
            current_section = ("icm", None)
        elif current_section and current_section[0] == "icm":
            if '|' in line:
                parts = [p.strip() for p in line.split('|') if p.strip()]
                if len(parts) >= 2:
                    key = parts[0].replace('Address', '').replace('ICM ', '').strip().lower()
                    value = parts[1] if len(parts) > 1 else ""
                    if 'messenger' in key:
                        parsed["icm"]["messenger_address"] = value
                    elif 'registry' in key:
                        parsed["icm"]["registry_address"] = value
        
        # Parse Token section
        if '| TOKEN' in line or 'TOKEN' in line:
            current_section = ("token", None)
        elif current_section and current_section[0] == "token":
            if '|' in line:
                parts = [p.strip() for p in line.split('|') if p.strip()]
                if len(parts) >= 2:
                    key = parts[0].lower().replace(' ', '_')
                    value = parts[1] if len(parts) > 1 else ""
                    parsed["token"][key] = value
    
    return parsed

def parse_subnet_describe(output: str) -> Dict[str, Any]:
    """Parse subnet describe output into structured data"""
    result = {
        "name": None,
        "vm_id": None,
        "vm_version": None,
        "validation": None,
        "networks": {},
        "icm": {},
        "token": {},
        "initial_allocation": []
    }
    
    lines = output.split('\n')
    current_section = None
    current_network = None
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('+') or line.startswith('|') and '---' in line:
            continue
        
        # Extract name
        if '| Name' in line or 'CHAOSSTARNETWORK' in line.upper() or 'NETHER' in line.upper():
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 2:
                name = parts[-1].strip()
                if name and name not in ['Name', 'CHAOSSTARNETWORK', 'NETHER']:
                    result["name"] = name
        
        # Extract VM ID
        if 'VM ID' in line or 'VMID' in line:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 2:
                result["vm_id"] = parts[-1].strip()
        
        # Extract VM Version
        if 'VM Version' in line:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 2:
                result["vm_version"] = parts[-1].strip()
        
        # Extract Validation
        if 'Validation' in line:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 2:
                result["validation"] = parts[-1].strip()
        
        # Extract network info
        if 'Fuji' in line or 'Local Network' in line:
            network_name = "Fuji" if "Fuji" in line else "Local"
            current_network = network_name
            result["networks"][network_name] = {}
        
        if current_network and ('ChainID' in line or 'SubnetID' in line or 'BlockchainID' in line or 'RPC Endpoint' in line):
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 2:
                key = parts[0].strip()
                value = parts[-1].strip()
                if key and value:
                    result["networks"][current_network][key] = value
        
        # Extract ICM info
        if 'ICM Messenger Address' in line or 'ICM Registry Address' in line:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 2:
                key = parts[0].strip().replace(' Address', '')
                value = parts[-1].strip()
                if 'Messenger' in key:
                    result["icm"]["messenger_address"] = value
                elif 'Registry' in key:
                    result["icm"]["registry_address"] = value
        
        # Extract token info
        if 'Token Name' in line or 'Token Symbol' in line:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 2:
                key = parts[0].strip().replace('Token ', '').lower()
                value = parts[-1].strip()
                result["token"][key] = value
    
    return result

def parse_network_status(output: str) -> Dict[str, Any]:
    """Parse network status output into structured data"""
    result = {
        "is_up": False,
        "nodes": 0,
        "custom_vms": 0,
        "network_healthy": False,
        "custom_vms_healthy": False,
        "rpc_urls": {},
        "primary_nodes": [],
        "l1_nodes": []
    }
    
    lines = output.split('\n')
    
    for line in lines:
        line = line.strip()
        
        if 'Network is Up:' in line:
            result["is_up"] = True
        
        if 'Number of Nodes:' in line:
            match = re.search(r'(\d+)', line)
            if match:
                result["nodes"] = int(match.group(1))
        
        if 'Number of Custom VMs:' in line:
            match = re.search(r'(\d+)', line)
            if match:
                result["custom_vms"] = int(match.group(1))
        
        if 'Network Healthy:' in line:
            result["network_healthy"] = 'true' in line.lower()
        
        if 'Custom VMs Healthy:' in line:
            result["custom_vms_healthy"] = 'true' in line.lower()
        
        # Extract RPC URLs
        if 'Localhost' in line and 'http' in line:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 2:
                result["rpc_urls"]["localhost"] = parts[-1].strip()
        
        # Extract node info
        if 'NodeID-' in line:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 3:
                node_info = {
                    "name": parts[0] if len(parts) > 0 else "",
                    "node_id": parts[1] if len(parts) > 1 else "",
                    "endpoint": parts[2] if len(parts) > 2 else ""
                }
                if 'PRIMARY' in output.upper() or 'node1' in line.lower() or 'node2' in line.lower():
                    if 'PRIMARY' in output.upper():
                        result["primary_nodes"].append(node_info)
                    else:
                        result["l1_nodes"].append(node_info)
    
    return result

@router.get("/subnets")
async def list_subnets():
    """List all subnets using 'avalanche network status' command"""
    try:
        # Use 'avalanche network status' to see all subnets
        result = subprocess.run(
            ["avalanche", "network", "status"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        subnets = []
        
        if result.returncode == 0:
            # Parse network status output to extract subnet information
            lines = result.stdout.split('\n')
            current_subnet = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Look for subnet/blockchain information in the output
                # Network status typically shows running networks and their subnets
                if 'subnet' in line.lower() or 'blockchain' in line.lower():
                    # Try to extract subnet name
                    parts = line.split()
                    for i, part in enumerate(parts):
                        if 'subnet' in part.lower() or 'blockchain' in part.lower():
                            if i + 1 < len(parts):
                                subnet_name = parts[i + 1].strip(':,')
                                if subnet_name and subnet_name not in ['name', 'id']:
                                    current_subnet = subnet_name
                                    if not any(s["name"] == subnet_name for s in subnets):
                                        subnets.append({
                                            "name": subnet_name,
                                            "status": "running"
                                        })
            
            # Also try filesystem as fallback
            try:
                avalanche_home = get_avalanche_cli_home()
                subnets_dir = avalanche_home / "subnets"
                
                if subnets_dir.exists():
                    for subnet_dir in subnets_dir.iterdir():
                        if subnet_dir.is_dir():
                            subnet_name = subnet_dir.name
                            # Check if already in list
                            if not any(s["name"] == subnet_name for s in subnets):
                                # Check if it has configuration files
                                has_config = (
                                    (subnet_dir / "sidecar.json").exists() or
                                    (subnet_dir / "chain.json").exists() or
                                    (subnet_dir / "network.json").exists()
                                )
                                if has_config:
                                    subnets.append({
                                        "name": subnet_name,
                                        "status": "configured"
                                    })
            except Exception:
                pass
        
        return {"success": True, "subnets": subnets, "raw_output": result.stdout if result.returncode == 0 else None}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Command timed out")
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Avalanche CLI not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing subnets: {str(e)}")

@router.get("/subnet/{subnet_name}/describe")
async def describe_subnet(subnet_name: str):
    """Get detailed information about a subnet"""
    try:
        # Try blockchain describe first (more detailed)
        result = subprocess.run(
            ["avalanche", "blockchain", "describe", subnet_name],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        if result.returncode == 0:
            # Parse blockchain describe output
            parsed = parse_blockchain_describe(result.stdout)
            return {
                "success": True,
                "subnet_name": subnet_name,
                "raw_output": result.stdout,
                "parsed": parsed,
                "type": "blockchain"
            }
        
        # Fallback to subnet describe
        result = subprocess.run(
            ["avalanche", "subnet", "describe", subnet_name],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=404, detail=f"Subnet/Blockchain not found or error: {result.stderr}")
        
        parsed = parse_subnet_describe(result.stdout)
        return {
            "success": True,
            "subnet_name": subnet_name,
            "raw_output": result.stdout,
            "parsed": parsed,
            "type": "subnet"
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Command timed out")
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Avalanche CLI not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error describing subnet: {str(e)}")

@router.get("/network/status")
async def get_network_status():
    """Get network status using 'avalanche network status' command"""
    try:
        result = subprocess.run(
            ["avalanche", "network", "status"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            return {
                "success": False,
                "error": result.stderr,
                "is_up": False
            }
        
        parsed = parse_network_status(result.stdout)
        return {
            "success": True,
            "raw_output": result.stdout,
            "parsed": parsed
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Command timed out")
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Avalanche CLI not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting network status: {str(e)}")

@router.get("/nodes/local")
async def list_local_nodes():
    """List all local nodes using 'avalanche node local status' command"""
    try:
        result = subprocess.run(
            ["avalanche", "node", "local", "status"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        nodes = []
        
        if result.returncode == 0:
            # Parse node local status output
            lines = result.stdout.split('\n')
            current_node = {}
            
            for line in lines:
                line = line.strip()
                if not line:
                    if current_node:
                        nodes.append(current_node)
                        current_node = {}
                    continue
                
                # Parse node information
                # Format varies, but typically includes node ID, status, etc.
                if 'node' in line.lower() and 'id' in line.lower():
                    # Extract node ID
                    parts = line.split()
                    for i, part in enumerate(parts):
                        if 'id' in part.lower() and i + 1 < len(parts):
                            current_node["node_id"] = parts[i + 1].strip(':,')
                elif 'status' in line.lower():
                    parts = line.split()
                    for i, part in enumerate(parts):
                        if 'status' in part.lower() and i + 1 < len(parts):
                            current_node["status"] = parts[i + 1].strip(':,')
                elif 'port' in line.lower():
                    parts = line.split()
                    for i, part in enumerate(parts):
                        if 'port' in part.lower() and i + 1 < len(parts):
                            try:
                                current_node["port"] = int(parts[i + 1].strip(':,'))
                            except ValueError:
                                pass
                elif 'ip' in line.lower() or 'address' in line.lower():
                    parts = line.split()
                    for i, part in enumerate(parts):
                        if ('ip' in part.lower() or 'address' in part.lower()) and i + 1 < len(parts):
                            current_node["ip"] = parts[i + 1].strip(':,')
            
            # Add last node if exists
            if current_node:
                nodes.append(current_node)
        
        return {
            "success": result.returncode == 0,
            "nodes": nodes,
            "total_nodes": len(nodes),
            "raw_output": result.stdout if result.returncode == 0 else None,
            "error": result.stderr if result.returncode != 0 else None
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Command timed out")
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Avalanche CLI not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing local nodes: {str(e)}")

@router.get("/keys")
async def list_keys():
    """List available keys (reads from filesystem to avoid interactive prompts)"""
    try:
        avalanche_home = get_avalanche_cli_home()
        key_dir = avalanche_home / "key"
        
        keys = []
        if key_dir.exists():
            for key_file in key_dir.glob("*.pk"):
                try:
                    key_content = key_file.read_text().strip()
                    # Get account address from key
                    from eth_account import Account
                    from web3 import Web3
                    
                    # Normalize key format
                    if not key_content.startswith("0x"):
                        key_content = f"0x{key_content}"
                    
                    account = Account.from_key(key_content)
                    
                    # Get balance for this address using discovered RPC URL
                    rpc_url = get_rpc_url_for_balance()
                    try:
                        w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 3}))
                        if w3.is_connected():
                            balance_wei = w3.eth.get_balance(account.address)
                            balance_eth = Web3.from_wei(balance_wei, "ether")
                        else:
                            balance_eth = 0
                    except Exception:
                        balance_eth = 0
                    
                    keys.append({
                        "name": key_file.stem,
                        "address": account.address,
                        "file": str(key_file),
                        "balance": str(balance_eth),
                        "isMainFunded": account.address.lower() == "0x7852031cbD4b980457962D30D11e7CC684109fEa".lower()
                    })
                except Exception:
                    # Skip invalid keys
                    continue
        
        # Sort by balance (highest first), then by main funded status
        keys.sort(key=lambda k: (k.get("isMainFunded", False), float(k.get("balance", 0))), reverse=True)
        
        return {
            "success": True,
            "keys": keys,
            "count": len(keys)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing keys: {str(e)}")

@router.get("/keys/{key_name}/balance")
async def get_key_balance(key_name: str):
    """Get balance for a specific key"""
    try:
        avalanche_home = get_avalanche_cli_home()
        key_file = avalanche_home / "key" / f"{key_name}.pk"
        
        if not key_file.exists():
            return {
                "success": False,
                "error": "Key not found",
                "key_name": key_name,
            }
        
        key_content = key_file.read_text().strip()
        from eth_account import Account
        from web3 import Web3
        
        if not key_content.startswith("0x"):
            key_content = f"0x{key_content}"
        
        try:
            account = Account.from_key(key_content)
        except Exception as e:
            return {
                "success": False,
                "error": f"Invalid key format: {str(e)}",
                "key_name": key_name,
            }
        
        # Get balances with error handling - use discovered RPC URL
        rpc_url = get_rpc_url_for_balance()
        
        try:
            w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 5}))
            
            # Check if RPC is connected
            if not w3.is_connected():
                return {
                    "success": False,
                    "error": f"RPC not connected to {rpc_url}",
                    "key_name": key_name,
                    "address": account.address,
                    "rpc_url": rpc_url,
                }
            
            # Native balance with timeout
            try:
                balance_wei = w3.eth.get_balance(account.address)
                balance_eth = Web3.from_wei(balance_wei, "ether")
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to get native balance: {str(e)}",
                    "key_name": key_name,
                    "address": account.address,
                }
            
            # CSN Token balance (if contract exists)
            csn_balance = "0"
            csn_token_address = os.getenv("VITE_CSN_TOKEN_ADDRESS", "0x868306CeD3bb5Aa8fBc4BD8fA2727484cDfE1D89")
            try:
                erc20_abi = [
                    {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"},
                    {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "type": "function"},
                ]
                token_contract = w3.eth.contract(address=Web3.to_checksum_address(csn_token_address), abi=erc20_abi)
                csn_balance_raw = token_contract.functions.balanceOf(account.address).call()
                decimals = token_contract.functions.decimals().call()
                csn_balance = str(Web3.from_wei(csn_balance_raw, "ether") if decimals == 18 else csn_balance_raw / (10 ** decimals))
            except Exception:
                # CSN token balance is optional, continue without it
                pass
            
            return {
                "success": True,
                "key_name": key_name,
                "address": account.address,
                "balance": str(balance_eth),
                "csn_balance": csn_balance,
                "isMainFunded": account.address.lower() == "0x7852031cbD4b980457962D30D11e7CC684109fEa".lower()
            }
        except Exception as rpc_error:
            return {
                "success": False,
                "error": f"RPC error: {str(rpc_error)}",
                "key_name": key_name,
                "address": account.address,
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error getting key balance: {str(e)}",
            "key_name": key_name,
        }

@router.get("/keys/{key_name}/addresses")
async def get_key_addresses(key_name: str):
    """Get multi-chain addresses (EVM, X-Chain, P-Chain) for a specific key"""
    try:
        avalanche_home = get_avalanche_cli_home()
        key_file = avalanche_home / "key" / f"{key_name}.pk"
        
        if not key_file.exists():
            return {
                "success": False,
                "error": "Key not found",
                "key_name": key_name,
            }
        
        key_content = key_file.read_text().strip()
        from eth_account import Account
        
        if not key_content.startswith("0x"):
            key_content = f"0x{key_content}"
        
        try:
            account = Account.from_key(key_content)
            evm_address = account.address
        except Exception as e:
            return {
                "success": False,
                "error": f"Invalid key format: {str(e)}",
                "key_name": key_name,
            }
        
        # For X-Chain and P-Chain addresses, we'll return a placeholder
        # The frontend will derive these using the Avalanche SDK
        # This is safer than exposing private keys or implementing derivation in Python
        return {
            "success": True,
            "key_name": key_name,
            "evm_address": evm_address,
            "x_chain_address": None,  # Will be derived in frontend
            "p_chain_address": None,  # Will be derived in frontend
            "note": "X-Chain and P-Chain addresses will be derived in the frontend using the Avalanche SDK"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error getting key addresses: {str(e)}",
            "key_name": key_name,
        }

@router.get("/keys/{key_name}/private-key")
async def get_key_private_key(key_name: str):
    """
    Get private key for a CLI-managed key (for local development only)
    WARNING: This endpoint should only be used in local development environments
    """
    try:
        avalanche_home = get_avalanche_cli_home()
        key_file = avalanche_home / "key" / f"{key_name}.pk"
        
        if not key_file.exists():
            return {
                "success": False,
                "error": "Key not found",
                "key_name": key_name,
            }
        
        key_content = key_file.read_text().strip()
        
        # Ensure 0x prefix
        if not key_content.startswith("0x"):
            key_content = f"0x{key_content}"
        
        # Validate key format
        if len(key_content) != 66:  # 0x + 64 hex chars
            return {
                "success": False,
                "error": "Invalid key format",
                "key_name": key_name,
            }
        
        return {
            "success": True,
            "key_name": key_name,
            "private_key": key_content,
            "warning": "Private key exposed - use only in local development"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error getting private key: {str(e)}",
            "key_name": key_name,
        }

@router.get("/wallets/balances")
async def get_all_wallet_balances():
    """Get balances for all wallets (Avalanche CLI keys + database accounts) via JSON RPC"""
    try:
        from eth_account import Account
        from web3 import Web3
        import asyncio
        
        rpc_url = get_rpc_url_for_balance()
        w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 5}))
        
        if not w3.is_connected():
            return {
                "success": False,
                "error": f"RPC not connected to {rpc_url}",
                "rpc_url": rpc_url,
                "wallets": []
            }
        
        wallets = []
        addresses_seen = set()
        
        # 1. Get all Avalanche CLI keys
        try:
            avalanche_home = get_avalanche_cli_home()
            key_dir = avalanche_home / "key"
            
            if key_dir.exists():
                for key_file in key_dir.glob("*.pk"):
                    try:
                        key_content = key_file.read_text().strip()
                        if not key_content.startswith("0x"):
                            key_content = f"0x{key_content}"
                        
                        account = Account.from_key(key_content)
                        address = account.address
                        
                        if address not in addresses_seen:
                            addresses_seen.add(address)
                            try:
                                balance_wei = w3.eth.get_balance(address)
                                balance_eth = Web3.from_wei(balance_wei, "ether")
                                
                                # Get CSN token balance if available
                                csn_balance = "0"
                                csn_token_address = os.getenv("VITE_CSN_TOKEN_ADDRESS", "0x868306CeD3bb5Aa8fBc4BD8fA2727484cDfE1D89")
                                try:
                                    erc20_abi = [
                                        {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"},
                                        {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "type": "function"},
                                    ]
                                    token_contract = w3.eth.contract(address=Web3.to_checksum_address(csn_token_address), abi=erc20_abi)
                                    csn_balance_raw = token_contract.functions.balanceOf(address).call()
                                    decimals = token_contract.functions.decimals().call()
                                    csn_balance = str(Web3.from_wei(csn_balance_raw, "ether") if decimals == 18 else csn_balance_raw / (10 ** decimals))
                                except Exception:
                                    pass
                                
                                wallets.append({
                                    "address": address,
                                    "name": key_file.stem,
                                    "source": "avalanche_cli",
                                    "balance": str(balance_eth),
                                    "balance_wei": str(balance_wei),
                                    "csn_balance": csn_balance,
                                    "isMainFunded": address.lower() == "0x7852031cbD4b980457962D30D11e7CC684109fEa".lower()
                                })
                            except Exception as e:
                                wallets.append({
                                    "address": address,
                                    "name": key_file.stem,
                                    "source": "avalanche_cli",
                                    "balance": "0",
                                    "balance_wei": "0",
                                    "error": str(e),
                                    "isMainFunded": address.lower() == "0x7852031cbD4b980457962D30D11e7CC684109fEa".lower()
                                })
                    except Exception:
                        continue
        except Exception as e:
            print(f"Error loading Avalanche CLI keys: {e}")
        
        # 2. Get all accounts from database
        try:
            from services.supabase_service import supabase
            if supabase:
                accounts_result = supabase.table("accounts").select("id, name, wallet_address, type").execute()
                
                if accounts_result.data:
                    for account in accounts_result.data:
                        address = account.get("wallet_address")
                        if not address or address in addresses_seen:
                            continue
                        
                        addresses_seen.add(address)
                        try:
                            balance_wei = w3.eth.get_balance(address)
                            balance_eth = Web3.from_wei(balance_wei, "ether")
                            
                            # Get CSN token balance if available
                            csn_balance = "0"
                            csn_token_address = os.getenv("VITE_CSN_TOKEN_ADDRESS", "0x868306CeD3bb5Aa8fBc4BD8fA2727484cDfE1D89")
                            try:
                                erc20_abi = [
                                    {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"},
                                    {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "type": "function"},
                                ]
                                token_contract = w3.eth.contract(address=Web3.to_checksum_address(csn_token_address), abi=erc20_abi)
                                csn_balance_raw = token_contract.functions.balanceOf(address).call()
                                decimals = token_contract.functions.decimals().call()
                                csn_balance = str(Web3.from_wei(csn_balance_raw, "ether") if decimals == 18 else csn_balance_raw / (10 ** decimals))
                            except Exception:
                                pass
                            
                            wallets.append({
                                "address": address,
                                "name": account.get("name", "Unknown"),
                                "source": "database",
                                "account_id": account.get("id"),
                                "account_type": account.get("type"),
                                "balance": str(balance_eth),
                                "balance_wei": str(balance_wei),
                                "csn_balance": csn_balance,
                                "isMainFunded": address.lower() == "0x7852031cbD4b980457962D30D11e7CC684109fEa".lower()
                            })
                        except Exception as e:
                            wallets.append({
                                "address": address,
                                "name": account.get("name", "Unknown"),
                                "source": "database",
                                "account_id": account.get("id"),
                                "account_type": account.get("type"),
                                "balance": "0",
                                "balance_wei": "0",
                                "error": str(e),
                                "isMainFunded": address.lower() == "0x7852031cbD4b980457962D30D11e7CC684109fEa".lower()
                            })
        except Exception as e:
            print(f"Error loading database accounts: {e}")
        
        # Sort by balance (highest first), then by main funded status
        wallets.sort(key=lambda w: (w.get("isMainFunded", False), float(w.get("balance", 0))), reverse=True)
        
        # Calculate totals
        total_balance = sum(float(w.get("balance", 0)) for w in wallets)
        total_wallets = len(wallets)
        
        return {
            "success": True,
            "rpc_url": rpc_url,
            "total_wallets": total_wallets,
            "total_balance": str(total_balance),
            "wallets": wallets
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error getting wallet balances: {str(e)}",
            "wallets": []
        }

@router.get("/custom-subnet/info")
async def get_custom_subnet_info():
    """Get custom subnet configuration from environment variables and blockchain describe"""
    try:
        from backend.config import (
            CUSTOM_SUBNET_ID, AVALANCHE_SUBNET_ID, AVALANCHE_BLOCKCHAIN_ID,
            AVALANCHE_NODE_ID, AVALANCHE_BASE_URL, AVALANCHE_HOST,
            AVALANCHE_PORT, AVALANCHE_PROTOCOL, SUBNET_NAME, AVALANCHE_RPC
        )
        
        # Try to get enhanced info from blockchain describe
        enhanced_info = {}
        try:
            result = subprocess.run(
                ["avalanche", "blockchain", "describe", SUBNET_NAME],
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode == 0:
                parsed = parse_blockchain_describe(result.stdout)
                # Use RPC URL from blockchain describe if available
                if parsed.get("rpc_urls") and "localhost" in parsed["rpc_urls"]:
                    enhanced_info["discovered_rpc_url"] = parsed["rpc_urls"]["localhost"]
                enhanced_info["blockchain_info"] = parsed
        except Exception:
            pass  # Fallback to environment variables only
        
        return {
            "success": True,
            "custom_subnet_id": CUSTOM_SUBNET_ID,
            "avalanche_subnet_id": AVALANCHE_SUBNET_ID,
            "avalanche_blockchain_id": AVALANCHE_BLOCKCHAIN_ID,
            "avalanche_node_id": AVALANCHE_NODE_ID,
            "base_url": AVALANCHE_BASE_URL,
            "host": AVALANCHE_HOST,
            "port": AVALANCHE_PORT,
            "protocol": AVALANCHE_PROTOCOL,
            "subnet_name": SUBNET_NAME,
            "rpc_url": enhanced_info.get("discovered_rpc_url") or AVALANCHE_RPC,
            "enhanced_info": enhanced_info.get("blockchain_info"),
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error getting custom subnet info: {str(e)}",
        }

@router.get("/subnet/{subnet_name}/stats")
async def get_subnet_stats(subnet_name: str, network: str = Query("Local Network", description="Network name")):
    """Get subnet statistics"""
    try:
        # This command requires interactive network selection
        # We'll try to get stats from the subnet configuration files instead
        avalanche_home = get_avalanche_cli_home()
        subnet_dir = avalanche_home / "subnets" / subnet_name
        
        stats = {
            "subnet_name": subnet_name,
            "configured": False
        }
        
        if subnet_dir.exists():
            stats["configured"] = True
            
            # Try to read sidecar.json
            sidecar_file = subnet_dir / "sidecar.json"
            if sidecar_file.exists():
                try:
                    sidecar = json.loads(sidecar_file.read_text())
                    stats["sidecar"] = sidecar
                except Exception:
                    pass
        
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting subnet stats: {str(e)}")

