#!/usr/bin/env python3
"""
Test script for the Sarakt Land Registry application
Tests compilation, contract management, and API endpoints
"""
import sys
import subprocess
import requests
import time
import json
from pathlib import Path

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(name):
    print(f"\n{BLUE}━━━ {name} ━━━{RESET}")

def print_success(msg):
    print(f"{GREEN}✓ {msg}{RESET}")

def print_error(msg):
    print(f"{RED}✗ {msg}{RESET}")

def print_warning(msg):
    print(f"{YELLOW}⚠ {msg}{RESET}")

def test_contract_compilation():
    """Test if contracts compile successfully"""
    print_test("Contract Compilation")
    
    try:
        result = subprocess.run(
            ["forge", "build"],
            cwd=Path(__file__).parent.parent,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0:
            print_success("Contracts compile successfully")
            
            # Check if output directory exists
            out_dir = Path(__file__).parent.parent / "out"
            if out_dir.exists():
                contracts = list(out_dir.glob("**/*.json"))
                print_success(f"Found {len(contracts)} compiled contract artifacts")
                return True
            else:
                print_warning("Compiled artifacts directory not found")
                return False
        else:
            print_error("Contract compilation failed")
            print(result.stderr)
            return False
    except FileNotFoundError:
        print_error("Foundry (forge) not found. Please install Foundry.")
        return False
    except Exception as e:
        print_error(f"Compilation test failed: {e}")
        return False

def test_directory_structure():
    """Test if required directories exist"""
    print_test("Directory Structure")
    
    project_root = Path(__file__).parent.parent
    required_dirs = [
        "src/contracts",
        "backend",
        "scripts",
        "deployments",
        "backend/abi",
        "lib/openzeppelin-contracts"
    ]
    
    all_exist = True
    for dir_path in required_dirs:
        full_path = project_root / dir_path
        if full_path.exists():
            print_success(f"{dir_path} exists")
        else:
            print_error(f"{dir_path} missing")
            all_exist = False
    
    return all_exist

def test_smart_contracts():
    """Test if smart contract files exist"""
    print_test("Smart Contract Files")
    
    project_root = Path(__file__).parent.parent
    contracts_dir = project_root / "src" / "contracts"
    
    required_contracts = [
        "SaraktLandV2.sol",
        "SaraktDigitalID.sol",
        "SaraktTreasury.sol",
        "FractionalAsset.sol",
        "DummyToken.sol"
    ]
    
    all_exist = True
    for contract in required_contracts:
        contract_path = contracts_dir / contract
        if contract_path.exists():
            print_success(f"{contract} exists")
        else:
            print_error(f"{contract} missing")
            all_exist = False
    
    return all_exist

def test_deployment_files():
    """Test deployment scripts"""
    print_test("Deployment Scripts")
    
    project_root = Path(__file__).parent.parent
    scripts_dir = project_root / "scripts"
    
    required_scripts = [
        "deploy_all.s.sol",
        "manage_contracts.py",
        "test_app.py"
    ]
    
    all_exist = True
    for script in required_scripts:
        script_path = scripts_dir / script
        if script_path.exists():
            print_success(f"{script} exists")
        else:
            print_error(f"{script} missing")
            all_exist = False
    
    return all_exist

def test_backend_structure():
    """Test backend files"""
    print_test("Backend Structure")
    
    project_root = Path(__file__).parent.parent
    backend_dir = project_root / "backend"
    
    required_files = [
        "app.py",
        "contract_manager.py",
        "contract_api.py",
        "blockchain.py",
        "config.py",
        "requirements.txt"
    ]
    
    all_exist = True
    for file in required_files:
        file_path = backend_dir / file
        if file_path.exists():
            print_success(f"{file} exists")
        else:
            print_error(f"{file} missing")
            all_exist = False
    
    return all_exist

def test_backend_api():
    """Test if backend API can start and respond"""
    print_test("Backend API")
    
    try:
        # Check if server is already running
        try:
            response = requests.get("http://localhost:5001/health", timeout=2)
            if response.status_code == 200:
                print_success("Backend API is already running")
                return True
        except:
            pass
        
        print_warning("Backend API not running. To test API:")
        print("  1. cd backend")
        print("  2. uvicorn app:app --reload")
        print("  3. Then test endpoints at http://localhost:5001")
        return None  # Not a failure, just not running
    except Exception as e:
        print_warning(f"Could not check API: {e}")
        return None

def test_contract_manager():
    """Test contract manager (requires PRIVATE_KEY)"""
    print_test("Contract Manager")
    
    try:
        sys.path.insert(0, str(Path(__file__).parent.parent))
        sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
        
        from backend.contract_manager import ContractManager
        
        try:
            manager = ContractManager()
            print_success("ContractManager initialized")
            
            # Test status check
            status = manager.get_deployment_status()
            print_success(f"Deployment status retrieved: {len(status)} contracts")
            
            # Check if any contracts are deployed
            deployed = [name for name, info in status.items() if info.get("deployed")]
            if deployed:
                print_success(f"Found {len(deployed)} deployed contracts: {', '.join(deployed)}")
            else:
                print_warning("No contracts are currently deployed")
            
            return True
        except Exception as e:
            if "PRIVATE_KEY" in str(e):
                print_warning("PRIVATE_KEY not set - skipping contract manager tests")
                print("  Set PRIVATE_KEY in .env file to test contract management")
                return None
            else:
                print_error(f"ContractManager test failed: {e}")
                return False
    except ImportError as e:
        print_error(f"Could not import ContractManager: {e}")
        return False

def test_configuration():
    """Test configuration files"""
    print_test("Configuration Files")
    
    project_root = Path(__file__).parent.parent
    
    config_files = [
        "foundry.toml",
        "package.json",
        "backend/requirements.txt"
    ]
    
    all_exist = True
    for config_file in config_files:
        file_path = project_root / config_file
        if file_path.exists():
            print_success(f"{config_file} exists")
        else:
            print_error(f"{config_file} missing")
            all_exist = False
    
    # Check .env
    env_file = project_root / ".env"
    if env_file.exists():
        print_success(".env file exists")
    else:
        print_warning(".env file not found (create from .env.example)")
    
    return all_exist

def main():
    print(f"\n{BLUE}{'='*60}")
    print("SARAKT LAND REGISTRY - APPLICATION TEST SUITE")
    print(f"{'='*60}{RESET}\n")
    
    tests = [
        ("Directory Structure", test_directory_structure),
        ("Smart Contract Files", test_smart_contracts),
        ("Configuration Files", test_configuration),
        ("Deployment Scripts", test_deployment_files),
        ("Backend Structure", test_backend_structure),
        ("Contract Compilation", test_contract_compilation),
        ("Contract Manager", test_contract_manager),
        ("Backend API", test_backend_api),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_error(f"{name} test crashed: {e}")
            results.append((name, False))
    
    # Summary
    print(f"\n{BLUE}{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}{RESET}\n")
    
    passed = sum(1 for _, result in results if result is True)
    failed = sum(1 for _, result in results if result is False)
    skipped = sum(1 for _, result in results if result is None)
    
    for name, result in results:
        if result is True:
            print_success(f"{name}")
        elif result is False:
            print_error(f"{name}")
        else:
            print_warning(f"{name} (skipped)")
    
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"Total: {len(results)} tests")
    print(f"{GREEN}Passed: {passed}{RESET}")
    print(f"{RED}Failed: {failed}{RESET}")
    if skipped > 0:
        print(f"{YELLOW}Skipped: {skipped}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    if failed > 0:
        sys.exit(1)
    else:
        print_success("All critical tests passed!")
        if skipped > 0:
            print_warning("Some optional tests were skipped (check warnings above)")

if __name__ == "__main__":
    main()

