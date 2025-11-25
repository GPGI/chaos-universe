import json
import os
from pathlib import Path
from typing import Optional, Tuple

AVAX_HOME = Path.home() / ".avalanche-cli"

def read_network_config(subnet_name: str) -> Optional[dict]:
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
    Best-effort: return RPC URL for a local subnet.
    Looks into ~/.avalanche-cli/subnets/<name>/network.json for rpc values.
    """
    cfg = read_network_config(subnet_name)
    if not cfg:
        return None
    # try common fields
    for key in ["rpc", "rpcUrl", "rpcURL", "rpcEndpoint"]:
        if key in cfg and isinstance(cfg[key], str) and cfg[key].startswith("http"):
            return cfg[key]
    # try nested objects
    for k, v in cfg.items():
        if isinstance(v, dict):
            for key in ["rpc", "rpcUrl", "rpcURL", "rpcEndpoint"]:
                val = v.get(key)
                if isinstance(val, str) and val.startswith("http"):
                    return val
    # Build default path if blockchainID present (C-chain URL pattern differs; this is Subnet-EVM)
    blockchain_id = cfg.get("blockchainID") or cfg.get("blockchainId")
    if blockchain_id:
        return f"http://127.0.0.1:9650/ext/bc/{blockchain_id}/rpc"
    return None

def find_funded_key(subnet_name: str) -> Optional[str]:
    """
    Try to find a funded account private key managed by Avalanche CLI.
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
    return None

def discover_from_cli(subnet_name: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Returns (rpc_url, private_key) discovered from Avalanche CLI files.
    """
    return get_rpc_from_cli(subnet_name), find_funded_key(subnet_name)


