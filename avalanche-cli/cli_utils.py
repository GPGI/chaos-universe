"""
Avalanche CLI Utilities
Functions to interact with Avalanche CLI configuration and discover network settings
"""
import json
import os
import subprocess
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

AVAX_HOME = Path.home() / ".avalanche-cli"

def get_avalanche_cli_home() -> Path:
    """Get the Avalanche CLI home directory"""
    return AVAX_HOME

def read_network_config(subnet_name: str) -> Optional[dict]:
    """
    Read network configuration from Avalanche CLI subnet directory
    
    Args:
        subnet_name: Name of the subnet
        
    Returns:
        Network configuration dictionary or None if not found
    """
    subnet_dir = AVAX_HOME / "subnets" / subnet_name
    for fname in ["network.json", "config.json", "subnet.json"]:
        p = subnet_dir / fname
        if p.exists():
            try:
                return json.loads(p.read_text())
            except Exception:
                continue
    return None

def get_rpc_from_cli(subnet_name: str) -> Optional[str]:
    """
    Get RPC URL for a subnet from Avalanche CLI configuration.
    Looks into ~/.avalanche-cli/subnets/<name>/network.json for rpc values.
    
    Args:
        subnet_name: Name of the subnet
        
    Returns:
        RPC URL string or None if not found
    """
    cfg = read_network_config(subnet_name)
    if not cfg:
        return None
    
    # Try common fields
    for key in ["rpc", "rpcUrl", "rpcURL", "rpcEndpoint"]:
        if key in cfg and isinstance(cfg[key], str) and cfg[key].startswith("http"):
            return cfg[key]
    
    # Try nested objects
    for k, v in cfg.items():
        if isinstance(v, dict):
            for key in ["rpc", "rpcUrl", "rpcURL", "rpcEndpoint"]:
                val = v.get(key)
                if isinstance(val, str) and val.startswith("http"):
                    return val
    
    # Build default path if blockchainID present (C-chain URL pattern)
    blockchain_id = cfg.get("blockchainID") or cfg.get("blockchainId")
    if blockchain_id:
        return f"http://127.0.0.1:9650/ext/bc/{blockchain_id}/rpc"
    
    return None

def find_funded_key(subnet_name: str) -> Optional[str]:
    """
    Try to find a funded account private key managed by Avalanche CLI.
    
    Args:
        subnet_name: Name of the subnet
        
    Returns:
        Private key string (with 0x prefix) or None if not found
    """
    # Look into ~/.avalanche-cli/key/
    key_dir = AVAX_HOME / "key"
    candidates = []
    
    if key_dir.exists():
        for pk in key_dir.glob("*.pk"):
            candidates.append(pk)
        # Prefer subnet-named keys
        named = key_dir / f"{subnet_name}.pk"
        if named.exists():
            candidates.insert(0, named)
    
    for f in candidates:
        try:
            text = f.read_text().strip()
            if text.startswith("0x") and len(text) == 66:
                return text
            if len(text) == 64:
                return f"0x{text}"
        except Exception:
            continue
    
    # Try to get from subnet describe command
    try:
        result = subprocess.run(
            ["avalanche", "subnet", "describe", subnet_name, "--local"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            output = result.stdout
            lines = output.split('\n')
            for line in lines:
                if '|' in line:
                    parts = [p.strip() for p in line.split('|')]
                    if len(parts) >= 2:
                        key_candidate = parts[1].strip()
                        if key_candidate.startswith('0x') and len(key_candidate) == 66:
                            return key_candidate
                        elif len(key_candidate) == 64:
                            return f"0x{key_candidate}"
    except Exception:
        pass
    
    return None

def discover_from_cli(subnet_name: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Discover RPC URL and private key from Avalanche CLI configuration.
    
    Args:
        subnet_name: Name of the subnet
        
    Returns:
        Tuple of (rpc_url, private_key) - either may be None
    """
    return get_rpc_from_cli(subnet_name), find_funded_key(subnet_name)

def get_network_info(subnet_name: str) -> Dict[str, Any]:
    """
    Get comprehensive network information from Avalanche CLI.
    
    Args:
        subnet_name: Name of the subnet
        
    Returns:
        Dictionary with network information
    """
    rpc_url = get_rpc_from_cli(subnet_name)
    private_key = find_funded_key(subnet_name)
    config = read_network_config(subnet_name)
    
    info = {
        "subnet_name": subnet_name,
        "rpc_url": rpc_url,
        "has_private_key": private_key is not None,
        "config": config,
    }
    
    # Try to get blockchain ID
    if config:
        blockchain_id = config.get("blockchainID") or config.get("blockchainId")
        if blockchain_id:
            info["blockchain_id"] = blockchain_id
    
    return info

def get_subnet_list() -> list:
    """
    Get list of available subnets from Avalanche CLI.
    
    Returns:
        List of subnet names
    """
    try:
        result = subprocess.run(
            ["avalanche", "subnet", "list"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            lines = result.stdout.split('\n')
            subnets = []
            for line in lines:
                line = line.strip()
                if line and not line.startswith('NAME') and not line.startswith('---'):
                    # Extract subnet name (first column)
                    subnet_name = line.split()[0] if line.split() else None
                    if subnet_name:
                        subnets.append(subnet_name)
            return subnets
    except Exception as e:
        print(f"Error listing subnets: {e}")
    
    # Fallback: list from directory
    subnets_dir = AVAX_HOME / "subnets"
    if subnets_dir.exists():
        return [d.name for d in subnets_dir.iterdir() if d.is_dir()]
    
    return []

