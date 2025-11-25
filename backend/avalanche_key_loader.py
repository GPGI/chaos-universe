"""
Automatically load private key from Avalanche CLI funded account
"""
import os
import subprocess
import json
from pathlib import Path
from typing import Optional
from eth_account import Account
from web3 import Web3


def get_avalanche_cli_home() -> Path:
    """Get Avalanche CLI home directory"""
    return Path.home() / ".avalanche-cli"


def find_funded_account_key(subnet_name: str = "ChaosStarNetwork") -> Optional[str]:
    """
    Find the funded account private key from Avalanche CLI subnet configuration
    """
    avalanche_home = get_avalanche_cli_home()
    
    # Method 1: Try to get key from subnet describe command
    try:
        result = subprocess.run(
            ["avalanche", "subnet", "describe", subnet_name, "--local"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            # Parse the output to find the key
            output = result.stdout
            # Look for the funded account key in the output
            # Format: "key | 0x... | ..."
            lines = output.split('\n')
            for i, line in enumerate(lines):
                if 'key' in line.lower() and '0x' in line:
                    # Extract hex key (64 characters after 0x)
                    parts = line.split()
                    for part in parts:
                        if part.startswith('0x') and len(part) == 66:  # 0x + 64 hex chars
                            return part
            
            # Alternative: Look for private key in description table
            for line in lines:
                # Look for pattern like: "key | <hex_key>"
                if '|' in line:
                    parts = [p.strip() for p in line.split('|')]
                    if len(parts) >= 2:
                        # Check if second part is a hex key
                        key_candidate = parts[1].strip()
                        if key_candidate.startswith('0x') and len(key_candidate) == 66:
                            return key_candidate
                        elif len(key_candidate) == 64:  # Without 0x prefix
                            return f"0x{key_candidate}"
    except Exception as e:
        pass
    
    # Method 2: Look for key files in ~/.avalanche-cli/key/
    key_dir = avalanche_home / "key"
    if key_dir.exists():
        # Try common key file names
        key_files = [
            key_dir / "key.pk",
            key_dir / f"{subnet_name}.pk",
            key_dir / "Hades.pk",  # Common default
        ]
        
        # Also check all .pk files
        pk_files = list(key_dir.glob("*.pk"))
        if not key_files and pk_files:
            # Use the most recent key file
            key_files = [max(pk_files, key=lambda p: p.stat().st_mtime)]
        
        for key_file in key_files:
            if key_file.exists():
                try:
                    with open(key_file, 'r') as f:
                        key_content = f.read().strip()
                        # Remove 0x prefix if present
                        if key_content.startswith('0x'):
                            return key_content
                        elif len(key_content) == 64:
                            return f"0x{key_content}"
                except Exception:
                    continue
    
    # Method 3: Check subnet configuration files
    subnet_dir = avalanche_home / "subnets" / subnet_name
    if subnet_dir.exists():
        # Look for network.json or similar config files
        config_files = [
            subnet_dir / "network.json",
            subnet_dir / "config.json",
            subnet_dir / "subnet.json"
        ]
        
        for config_file in config_files:
            if config_file.exists():
                try:
                    with open(config_file, 'r') as f:
                        config = json.load(f)
                        # Look for key fields
                        if "key" in config:
                            key = config["key"]
                            if isinstance(key, str):
                                if key.startswith("0x"):
                                    return key
                                elif len(key) == 64:
                                    return f"0x{key}"
                        # Check for funded accounts
                        if "fundedAccounts" in config:
                            accounts = config["fundedAccounts"]
                            if accounts and len(accounts) > 0:
                                # Return first account's key if available
                                first_account = accounts[0]
                                if isinstance(first_account, dict) and "key" in first_account:
                                    key = first_account["key"]
                                    if key.startswith("0x"):
                                        return key
                                    elif len(key) == 64:
                                        return f"0x{key}"
                except Exception:
                    continue
    
    return None


def get_funded_account_address(key: str) -> str:
    """Get the Ethereum address from a private key"""
    try:
        account = Account.from_key(key)
        return account.address
    except Exception as e:
        raise ValueError(f"Invalid private key: {e}")


def get_funded_account_balance(key: str, rpc_url: str) -> Optional[int]:
    """Get the balance of the funded account"""
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        account = Account.from_key(key)
        balance = w3.eth.get_balance(account.address)
        return balance
    except Exception:
        return None


def auto_load_funded_account_key(subnet_name: str = "ChaosStarNetwork", rpc_url: str = None, silent: bool = False) -> Optional[str]:
    """
    Automatically load the funded account private key from Avalanche CLI
    
    Args:
        subnet_name: Name of the subnet (default: ChaosStarNetwork)
        rpc_url: Optional RPC URL to verify the account has balance
        silent: If True, don't print messages
    
    Returns:
        Private key as hex string (0x...) or None if not found
    """
    key = find_funded_account_key(subnet_name)
    
    if key:
        # Verify it's a valid key
        try:
            account = Account.from_key(key)
            
            # Optionally verify balance if RPC is provided
            if rpc_url:
                balance = get_funded_account_balance(key, rpc_url)
                if balance is not None and balance > 0:
                    if not silent:
                        print(f"✓ Found funded account: {account.address} (balance: {balance} wei)")
                elif balance == 0:
                    if not silent:
                        print(f"⚠ Found account: {account.address} but balance is 0")
                else:
                    if not silent:
                        print(f"⚠ Found account: {account.address} but could not verify balance")
            else:
                if not silent:
                    print(f"✓ Found funded account: {account.address}")
            
            return key
        except Exception as e:
            if not silent:
                print(f"⚠ Found key but validation failed: {e}")
            return None
    
    return None


if __name__ == "__main__":
    # Test the key loader
    print("Testing Avalanche CLI key loader...")
    key = auto_load_funded_account_key(
        subnet_name="ChaosStarNetwork",
        rpc_url="http://127.0.0.1:41773/ext/bc/wtHFpLKd93iiPmBBsCdeTEPz6Quj9MoCL8NpuxoFXHtvTVeT1/rpc"  # Chaos Star Network RPC
    )
    
    if key:
        account = Account.from_key(key)
        print(f"\n✓ Private key loaded successfully")
        print(f"  Address: {account.address}")
        print(f"  Key: {key[:10]}...{key[-6:]}")
    else:
        print("\n✗ Could not automatically load private key")
        print("  Please set PRIVATE_KEY in .env file manually")

