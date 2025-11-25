#!/usr/bin/env python3
"""
Simple Celestial Forge Test
Quick test to verify Celestial Forge integration
"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "backend"))

from backend.cli_detector import detect_tools, is_avalanche_cli_available
from backend.subnet_interaction import create_subnet_interactor
from backend.celestial_forge_api import router

print("=" * 70)
print("  Celestial Forge - Quick Test")
print("=" * 70)

# 1. Check CLI Detection
print("\n[1] Checking CLI tools...")
tools = detect_tools()

forge_ok = tools.get("forge", {}).get("installed", False)
avalanche_ok = tools.get("avalanche_cli", {}).get("installed", False)

print(f"  Forge: {'✓' if forge_ok else '✗'} {tools.get('forge', {}).get('version', 'Not installed')}")
print(f"  Avalanche CLI: {'✓' if avalanche_ok else '✗'} {tools.get('avalanche_cli', {}).get('version', 'Not installed')}")

# 2. Test Subnet Interactor
print("\n[2] Testing Subnet Interactor...")
try:
    interactor = create_subnet_interactor("ChaosStarNetwork")
    status = interactor.get_status()
    
    print(f"  Subnet: {status['subnet_name']}")
    print(f"  RPC URL: {status['configuration'].get('rpc_url', 'Not configured')}")
    print(f"  Has Private Key: {status['configuration'].get('has_private_key', False)}")
    print(f"  Web3 Connected: {status['configuration'].get('web3_connected', False)}")
    print("  ✓ Subnet interactor working")
except Exception as e:
    print(f"  ✗ Error: {e}")

# 3. Test API Module Import
print("\n[3] Testing Celestial Forge API module...")
try:
    from backend.celestial_forge_api import router as forge_router
    print(f"  ✓ API module loaded successfully")
    print(f"  Routes: {len(forge_router.routes)} endpoints")
except Exception as e:
    print(f"  ✗ Error importing API: {e}")

# 4. Test Subnet Listing
if avalanche_ok:
    print("\n[4] Testing subnet listing...")
    try:
        interactor = create_subnet_interactor()
        subnets = interactor.list_subnets()
        print(f"  Found {len(subnets)} subnet(s)")
        for subnet in subnets[:5]:  # Show first 5
            print(f"    - {subnet.get('name', 'unknown')}")
        print("  ✓ Subnet listing working")
    except Exception as e:
        print(f"  ✗ Error: {e}")
else:
    print("\n[4] Skipping subnet listing (Avalanche CLI not installed)")

print("\n" + "=" * 70)
print("Test Complete")
print("=" * 70)

if forge_ok and avalanche_ok:
    print("\n✓ All tools available. Celestial Forge is ready to use!")
elif avalanche_ok:
    print("\n⚠ Forge not installed, but Avalanche CLI is available.")
    print("  Install Forge: curl -L https://foundry.paradigm.xyz | bash")
elif forge_ok:
    print("\n⚠ Avalanche CLI not installed, but Forge is available.")
    print("  Install Avalanche CLI: curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh")
else:
    print("\n⚠ Neither Forge nor Avalanche CLI are installed.")
    print("  Install both tools to use Celestial Forge.")

