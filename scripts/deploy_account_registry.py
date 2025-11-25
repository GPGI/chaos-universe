#!/usr/bin/env python3
"""
Deploy AccountRegistry contract to Chaos Star Network
Auto-discovers RPC and private key from Avalanche CLI if not set in environment
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "backend"))

load_dotenv()

# Try to import discovery functions
try:
    from scripts.avalanche_cli_utils import discover_from_cli
except ImportError:
    try:
        from avalanche_cli.cli_utils import discover_from_cli
    except ImportError:
        discover_from_cli = None

def get_rpc_and_key():
    """Get RPC URL and private key from env or auto-discover"""
    subnet_name = os.getenv("AVALANCHE_SUBNET_NAME", "ChaosStarNetwork")
    
    # Try environment first
    rpc = os.getenv("VITE_AVALANCHE_RPC") or os.getenv("AVALANCHE_RPC")
    pk = os.getenv("PRIVATE_KEY")
    
    # Auto-discover from Avalanche CLI if not set
    if (not rpc or not pk) and discover_from_cli:
        disc_rpc, disc_pk = discover_from_cli(subnet_name)
        if not rpc and disc_rpc:
            rpc = disc_rpc
        if not pk and disc_pk:
            pk = disc_pk
    
    # Fallback to config.py values
    if not rpc:
        try:
            from backend.config import CHAOSSTARNETWORK_PRIMARY_RPC
            rpc = CHAOSSTARNETWORK_PRIMARY_RPC
        except ImportError:
            pass
    
    if not rpc:
        raise RuntimeError("RPC not set and could not discover from Avalanche CLI")
    if not pk:
        raise RuntimeError("PRIVATE_KEY not set and could not discover from Avalanche CLI")
    
    return rpc, pk

def write_address(address: str):
    """Write accountRegistry address to deployments/addresses.json"""
    deploy_dir = project_root / "deployments"
    deploy_dir.mkdir(exist_ok=True)
    
    addresses_file = deploy_dir / "addresses.json"
    
    # Read existing addresses if file exists
    addresses = {}
    if addresses_file.exists():
        try:
            addresses = json.loads(addresses_file.read_text())
        except:
            pass
    
    # Update with accountRegistry address
    addresses["accountRegistry"] = address
    
    # Write back
    addresses_file.write_text(json.dumps(addresses, indent=2))
    print(f"✓ Address saved to {addresses_file}")

def main():
    print("Deploying AccountRegistry contract...")
    print("=" * 60)
    
    # Get RPC and private key
    try:
        rpc, pk = get_rpc_and_key()
        print(f"RPC: {rpc}")
        print(f"Deployer: {pk[:10]}...{pk[-8:] if len(pk) > 18 else pk}")
    except RuntimeError as e:
        print(f"✗ Error: {e}")
        sys.exit(1)
    
    # Check if forge is available
    import subprocess
    result = subprocess.run(["which", "forge"], capture_output=True, text=True)
    if result.returncode != 0:
        print("✗ Error: forge not found. Please install Foundry: https://book.getfoundry.sh/getting-started/installation")
        sys.exit(1)
    
    # Build forge command
    script_path = project_root / "scripts" / "deploy_account_registry.s.sol"
    if not script_path.exists():
        print(f"✗ Error: Deployment script not found: {script_path}")
        sys.exit(1)
    
    print(f"\nRunning: forge script {script_path.name} --rpc-url <RPC> --private-key <KEY> --broadcast")
    print("-" * 60)
    
    # Run forge script
    cmd = [
        "forge", "script",
        str(script_path),
        "--rpc-url", rpc,
        "--private-key", pk,
        "--broadcast",
        "-vv"
    ]
    
    try:
        result = subprocess.run(cmd, cwd=project_root, timeout=300, capture_output=True, text=True)
        
        if result.returncode != 0:
            print("✗ Deployment failed!")
            print("\nSTDOUT:")
            print(result.stdout)
            print("\nSTDERR:")
            print(result.stderr)
            sys.exit(1)
        
        # Parse output to find deployed address
        output = result.stdout
        address = None
        
        # Look for "AccountRegistry deployed at: 0x..."
        for line in output.split('\n'):
            if "AccountRegistry deployed at:" in line:
                # Extract address
                parts = line.split("AccountRegistry deployed at:")
                if len(parts) > 1:
                    address = parts[1].strip()
                    break
        
        if not address:
            # Try to read from addresses.json file (script should have written it)
            addresses_file = project_root / "deployments" / "addresses.json"
            if addresses_file.exists():
                try:
                    addresses = json.loads(addresses_file.read_text())
                    address = addresses.get("accountRegistry")
                except:
                    pass
        
        if address:
            print(f"\n✓ AccountRegistry deployed successfully!")
            print(f"  Address: {address}")
            write_address(address)
            print("\n" + "=" * 60)
            print("Deployment complete! The contract address has been saved.")
            print("The frontend will automatically load it from deployments/addresses.json")
            print("=" * 60)
        else:
            print("\n⚠ Deployment may have succeeded, but could not find address in output.")
            print("Please check deployments/addresses.json manually.")
            print("\nFull output:")
            print(output)
            
    except subprocess.TimeoutExpired:
        print("✗ Deployment timed out after 5 minutes")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error running deployment: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

