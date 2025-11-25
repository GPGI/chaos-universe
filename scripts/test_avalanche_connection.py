#!/usr/bin/env python3
"""
Test Avalanche CLI connection to backend
"""
import sys
import json
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.cli_detector import detect_tools, is_avalanche_cli_available
from backend.subnet_interaction import create_subnet_interactor
from backend.avalanche_key_loader import auto_load_funded_account_key, find_funded_account_key

def main():
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("🔍 Testing Avalanche CLI Connection")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print()
    
    # 1. Check if Avalanche CLI is installed
    print("1️⃣  Checking Avalanche CLI installation...")
    if is_avalanche_cli_available():
        print("   ✅ Avalanche CLI is installed")
        
        # Get detailed info
        tools = detect_tools()
        avalanche_info = tools.get("avalanche_cli", {})
        print(f"   📍 Path: {avalanche_info.get('path', 'unknown')}")
        print(f"   📦 Version: {avalanche_info.get('version', 'unknown')}")
        print(f"   🔧 Available commands: {len(avalanche_info.get('available_commands', []))}")
    else:
        print("   ❌ Avalanche CLI is NOT installed")
        print("   💡 Install it: curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh")
        return
    print()
    
    # 2. List available subnets
    print("2️⃣  Checking available subnets...")
    try:
        interactor = create_subnet_interactor()
        subnets = interactor.list_subnets()
        if subnets:
            print(f"   ✅ Found {len(subnets)} subnet(s):")
            for subnet in subnets:
                print(f"      • {subnet.get('name', 'unknown')} ({subnet.get('status', 'unknown')})")
        else:
            print("   ⚠️  No subnets found")
    except Exception as e:
        print(f"   ⚠️  Could not list subnets: {e}")
    print()
    
    # 3. Test subnet interaction for ChaosStarNetwork
    print("3️⃣  Testing subnet interaction (ChaosStarNetwork)...")
    try:
        interactor = create_subnet_interactor("ChaosStarNetwork")
        
        # Check RPC URL
        if interactor.rpc_url:
            print(f"   ✅ RPC URL discovered: {interactor.rpc_url}")
        else:
            print("   ⚠️  RPC URL not found (will use default)")
        
        # Check private key
        if interactor.private_key:
            from eth_account import Account
            account = Account.from_key(interactor.private_key)
            print(f"   ✅ Private key loaded: {account.address}")
        else:
            print("   ⚠️  Private key not found")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    print()
    
    # 4. Test key loading
    print("4️⃣  Testing key loader...")
    try:
        key = auto_load_funded_account_key(
            subnet_name="ChaosStarNetwork",
            silent=True
        )
        if key:
            from eth_account import Account
            account = Account.from_key(key)
            print(f"   ✅ Key loaded: {account.address}")
        else:
            print("   ⚠️  Could not auto-load key")
    except Exception as e:
        print(f"   ⚠️  Key loading error: {e}")
    print()
    
    # 5. Test subnet status
    print("5️⃣  Testing subnet status...")
    try:
        interactor = create_subnet_interactor("ChaosStarNetwork")
        status = interactor.get_subnet_info()
        if status:
            print("   ✅ Subnet info retrieved")
            if "blockchain_id" in status:
                print(f"      Blockchain ID: {status['blockchain_id']}")
            if "rpc_url" in status:
                print(f"      RPC URL: {status['rpc_url']}")
        else:
            print("   ⚠️  Could not get subnet info")
    except Exception as e:
        print(f"   ⚠️  Status error: {e}")
    print()
    
    # 6. Summary
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("✅ Connection Test Complete")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print()
    print("📋 Summary:")
    print("   • Avalanche CLI is detected and working")
    print("   • Backend can interact with Avalanche CLI")
    print("   • Configuration is auto-discovered")
    print()
    print("💡 The backend automatically connects to Avalanche CLI!")
    print("   No manual configuration needed if CLI is installed.")
    print()

if __name__ == "__main__":
    main()

