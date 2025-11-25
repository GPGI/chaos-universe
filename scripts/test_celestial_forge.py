#!/usr/bin/env python3
"""
Test script for Celestial Forge - Avalanche CLI Integration
Tests the backend API endpoints for creating and managing star systems (subnets)
"""
import sys
import requests
import json
import time
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "backend"))

from backend.cli_detector import detect_tools, is_avalanche_cli_available, is_forge_available
from backend.subnet_interaction import create_subnet_interactor


# API Base URL
API_BASE = "http://localhost:5001"


def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def print_section(text):
    """Print a formatted section"""
    print("\n" + "-" * 70)
    print(f"  {text}")
    print("-" * 70)


def print_result(success, message):
    """Print a formatted result"""
    icon = "✓" if success else "✗"
    status = "SUCCESS" if success else "FAILED"
    print(f"{icon} {status}: {message}")


def test_cli_detection():
    """Test CLI detection"""
    print_header("Test 1: CLI Detection")
    
    tools = detect_tools()
    
    forge_installed = tools.get("forge", {}).get("installed", False)
    avalanche_installed = tools.get("avalanche_cli", {}).get("installed", False)
    
    print_result(forge_installed, f"Forge: {tools.get('forge', {}).get('version', 'N/A')}")
    print_result(avalanche_installed, f"Avalanche CLI: {tools.get('avalanche_cli', {}).get('version', 'N/A')}")
    
    if not avalanche_installed:
        print("\n⚠ WARNING: Avalanche CLI is not installed. Some tests will fail.")
        print("   Install with: curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh")
    
    return forge_installed, avalanche_installed


def test_api_tools_status():
    """Test API tools status endpoint"""
    print_header("Test 2: API Tools Status Endpoint")
    
    try:
        response = requests.get(f"{API_BASE}/celestial-forge/tools/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Tools status endpoint accessible")
            print(f"\n  Response:")
            print(f"    Can create star systems: {data.get('can_create_star_systems', False)}")
            print(f"    Can deploy contracts: {data.get('can_deploy_contracts', False)}")
            return True
        else:
            print_result(False, f"API returned status {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            return False
    except requests.exceptions.ConnectionError:
        print_result(False, "Backend API is not running. Start it with: cd backend && uvicorn app:app --reload")
        return False
    except Exception as e:
        print_result(False, f"Error: {e}")
        return False


def test_subnet_list():
    """Test listing available subnets"""
    print_header("Test 3: List Available Subnets")
    
    if not is_avalanche_cli_available():
        print_result(False, "Avalanche CLI not available - skipping")
        return False
    
    try:
        interactor = create_subnet_interactor()
        subnets = interactor.list_subnets()
        
        if subnets:
            print_result(True, f"Found {len(subnets)} subnet(s)")
            for subnet in subnets:
                print(f"  - {subnet.get('name', 'unknown')} ({subnet.get('status', 'unknown')})")
        else:
            print_result(True, "No subnets found (this is normal if none have been created)")
        
        return True
    except Exception as e:
        print_result(False, f"Error: {e}")
        return False


def test_star_system_creation():
    """Test creating a star system (subnet)"""
    print_header("Test 4: Create Star System (Subnet)")
    
    test_name = f"TestStarSystem_{int(time.time())}"
    test_wallet = "0x1234567890123456789012345678901234567890"
    
    print(f"  Test subnet name: {test_name}")
    print(f"  Test wallet: {test_wallet}")
    
    try:
        response = requests.post(
            f"{API_BASE}/celestial-forge/spawn-star-system",
            json={
                "name": test_name,
                "owner_wallet": test_wallet,
                "tribute_percent": 5.0
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_result(True, f"Star system '{test_name}' creation initiated")
                print(f"\n  Subnet Info:")
                star_system = data.get("star_system", {})
                print(f"    Subnet ID: {star_system.get('subnet_id')}")
                print(f"    RPC URL: {star_system.get('rpc_url')}")
                print(f"    Status: {star_system.get('status')}")
                
                if data.get("next_steps"):
                    print(f"\n  Next Steps:")
                    for step in data.get("next_steps", [])[:3]:
                        print(f"    - {step}")
                
                return test_name, True
            else:
                print_result(False, data.get("error", "Unknown error"))
                return None, False
        elif response.status_code == 503:
            print_result(False, "Avalanche CLI not installed (503)")
            return None, False
        else:
            error_text = response.text[:500]
            print_result(False, f"API returned status {response.status_code}")
            print(f"  Response: {error_text}")
            return None, False
            
    except requests.exceptions.ConnectionError:
        print_result(False, "Backend API is not running")
        return None, False
    except Exception as e:
        print_result(False, f"Error: {e}")
        return None, False


def test_subnet_status(subnet_name):
    """Test getting subnet status"""
    print_header(f"Test 5: Get Subnet Status - {subnet_name}")
    
    if not subnet_name:
        print_result(False, "No subnet name provided - skipping")
        return False
    
    try:
        response = requests.get(
            f"{API_BASE}/celestial-forge/subnet/{subnet_name}/status",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, f"Subnet status retrieved for '{subnet_name}'")
            
            status = data.get("status", {})
            config = status.get("configuration", {})
            print(f"\n  Configuration:")
            print(f"    RPC URL: {config.get('rpc_url', 'Not configured')}")
            print(f"    Has Private Key: {config.get('has_private_key', False)}")
            print(f"    Web3 Connected: {config.get('web3_connected', False)}")
            
            return True
        else:
            print_result(False, f"API returned status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print_result(False, "Backend API is not running")
        return False
    except Exception as e:
        print_result(False, f"Error: {e}")
        return False


def test_blockchain_describe(subnet_name):
    """Test blockchain describe command"""
    print_header(f"Test 6: Blockchain Describe - {subnet_name}")
    
    if not subnet_name:
        print_result(False, "No subnet name provided - skipping")
        return False
    
    if not is_avalanche_cli_available():
        print_result(False, "Avalanche CLI not available - skipping")
        return False
    
    try:
        interactor = create_subnet_interactor(subnet_name)
        result = interactor.blockchain_describe(subnet_name)
        
        if result.get("success"):
            print_result(True, f"Blockchain '{subnet_name}' described successfully")
            output = result.get("output", "")
            if output:
                print(f"\n  Output preview (first 300 chars):")
                print(f"    {output[:300]}...")
            return True
        else:
            print_result(False, result.get("error", "Unknown error"))
            return False
            
    except Exception as e:
        print_result(False, f"Error: {e}")
        return False


def test_network_status():
    """Test network status command"""
    print_header("Test 7: Network Status")
    
    if not is_avalanche_cli_available():
        print_result(False, "Avalanche CLI not available - skipping")
        return False
    
    try:
        interactor = create_subnet_interactor()
        result = interactor.network_status()
        
        if result.get("success"):
            print_result(True, "Network status retrieved")
            output = result.get("output", "")
            if output:
                print(f"\n  Output preview (first 300 chars):")
                print(f"    {output[:300]}...")
            return True
        else:
            error = result.get("error", "Unknown error")
            print_result(False, error)
            # This is expected if no network is running
            if "accepts 0 arg" in error or "not running" in error.lower():
                print("  (This is expected if no network is currently running)")
            return False
            
    except Exception as e:
        print_result(False, f"Error: {e}")
        return False


def test_key_list():
    """Test key list command"""
    print_header("Test 8: Key List")
    
    if not is_avalanche_cli_available():
        print_result(False, "Avalanche CLI not available - skipping")
        return False
    
    try:
        interactor = create_subnet_interactor()
        result = interactor.key_list()
        
        if result.get("success"):
            print_result(True, "Key list retrieved")
            output = result.get("output", "")
            if output:
                print(f"\n  Output preview (first 300 chars):")
                print(f"    {output[:300]}...")
            return True
        else:
            error = result.get("error", "Unknown error")
            print_result(False, error)
            if "interactive" in error.lower():
                print("  (This command may require interactive input)")
            return False
            
    except Exception as e:
        print_result(False, f"Error: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 70)
    print("  Celestial Forge - Avalanche CLI Integration Test Suite")
    print("=" * 70)
    
    results = []
    
    # Test 1: CLI Detection
    forge_ok, avalanche_ok = test_cli_detection()
    results.append(("CLI Detection", forge_ok or avalanche_ok))
    
    # Test 2: API Tools Status
    api_ok = test_api_tools_status()
    results.append(("API Tools Status", api_ok))
    
    if not api_ok:
        print("\n⚠ Backend API is not running. Please start it with:")
        print("   cd backend && uvicorn app:app --reload")
        print("\n  Continuing with local tests only...")
    
    # Test 3: List Subnets
    results.append(("List Subnets", test_subnet_list()))
    
    # Test 4: Create Star System (only if API is available)
    subnet_name = None
    if api_ok and avalanche_ok:
        subnet_name, create_ok = test_star_system_creation()
        results.append(("Create Star System", create_ok))
        
        # Test 5: Subnet Status (only if subnet was created)
        if subnet_name:
            results.append(("Subnet Status", test_subnet_status(subnet_name)))
            results.append(("Blockchain Describe", test_blockchain_describe(subnet_name)))
    else:
        print_header("Test 4: Create Star System - SKIPPED")
        print("  Skipping because API is not available or Avalanche CLI is not installed")
        results.append(("Create Star System", None))
    
    # Test 7: Network Status
    results.append(("Network Status", test_network_status()))
    
    # Test 8: Key List
    results.append(("Key List", test_key_list()))
    
    # Summary
    print_header("Test Summary")
    
    passed = sum(1 for _, result in results if result is True)
    failed = sum(1 for _, result in results if result is False)
    skipped = sum(1 for _, result in results if result is None)
    
    for test_name, result in results:
        if result is True:
            print(f"  ✓ {test_name}")
        elif result is False:
            print(f"  ✗ {test_name}")
        else:
            print(f"  ⊘ {test_name} (skipped)")
    
    print(f"\n  Passed: {passed}")
    print(f"  Failed: {failed}")
    print(f"  Skipped: {skipped}")
    print(f"  Total: {len(results)}")
    
    if failed == 0:
        print("\n✓ All available tests passed!")
    else:
        print(f"\n⚠ {failed} test(s) failed. Check the output above for details.")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nError during test: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

