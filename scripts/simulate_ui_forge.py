#!/usr/bin/env python3
"""
Simulate UI interactions for Celestial Forge
Tests the complete flow of creating star systems and planets through the API
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

API_BASE = "http://localhost:5001"


class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_header(text):
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*70}{Colors.RESET}")
    print(f"{Colors.CYAN}{Colors.BOLD}  {text}{Colors.RESET}")
    print(f"{Colors.CYAN}{Colors.BOLD}{'='*70}{Colors.RESET}\n")


def print_step(step_num, text):
    print(f"{Colors.BLUE}[Step {step_num}]{Colors.RESET} {text}")


def print_success(text):
    print(f"{Colors.GREEN}✓{Colors.RESET} {text}")


def print_error(text):
    print(f"{Colors.RED}✗{Colors.RESET} {text}")


def print_info(text):
    print(f"{Colors.YELLOW}ℹ{Colors.RESET} {text}")


def check_backend():
    """Check if backend is running"""
    try:
        response = requests.get(f"{API_BASE}/health", timeout=2)
        if response.status_code == 200:
            return True
    except:
        pass
    return False


def wait_for_backend(max_wait=30):
    """Wait for backend to be available"""
    print_info("Waiting for backend to be ready...")
    for i in range(max_wait):
        if check_backend():
            print_success("Backend is ready!")
            return True
        time.sleep(1)
        if i % 5 == 0:
            print(f"  Waiting... ({i}/{max_wait}s)")
    return False


def simulate_create_star_system(name, wallet, tribute=5.0):
    """Simulate creating a star system through the UI"""
    print_step(1, f"Creating Star System: '{name}'")
    print(f"  Wallet: {wallet}")
    print(f"  Tribute: {tribute}%")
    
    try:
        response = requests.post(
            f"{API_BASE}/celestial-forge/spawn-star-system",
            json={
                "name": name,
                "owner_wallet": wallet,
                "tribute_percent": tribute
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                star_system = data.get("star_system", {})
                print_success(f"Star system '{name}' created!")
                print(f"  Subnet ID: {star_system.get('subnet_id')}")
                print(f"  RPC URL: {star_system.get('rpc_url', 'Not configured')}")
                print(f"  Status: {star_system.get('status')}")
                
                if data.get("message"):
                    print_info(data.get("message"))
                
                return star_system
            else:
                print_error(f"Failed: {data.get('error', 'Unknown error')}")
                return None
        else:
            error_text = response.text[:300]
            print_error(f"API returned {response.status_code}")
            print(f"  {error_text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print_error("Backend is not running. Start it with:")
        print(f"  cd backend && uvicorn app:app --reload")
        return None
    except Exception as e:
        print_error(f"Error: {e}")
        return None


def simulate_create_planet(star_system_name, planet_name, star_system_id, wallet, planet_type="habitable"):
    """Simulate creating a planet through the UI"""
    print_step(2, f"Creating Planet: '{planet_name}' in '{star_system_name}'")
    print(f"  Planet Type: {planet_type}")
    print(f"  Wallet: {wallet}")
    
    try:
        response = requests.post(
            f"{API_BASE}/celestial-forge/spawn-planet",
            json={
                "name": planet_name,
                "star_system_id": star_system_id,
                "star_system_name": star_system_name,
                "owner_wallet": wallet,
                "planet_type": planet_type
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                planet = data.get("planet", {})
                print_success(f"Planet '{planet_name}' created!")
                print(f"  Star System: {planet.get('star_system_name')}")
                print(f"  Planet Type: {planet.get('planet_type')}")
                print(f"  Node Type: {planet.get('node_type')}")
                print(f"  Status: {planet.get('status')}")
                
                if data.get("message"):
                    print_info(data.get("message"))
                
                if data.get("next_steps"):
                    print(f"\n  Next Steps:")
                    for step in data.get("next_steps", [])[:3]:
                        print(f"    - {step}")
                
                return planet
            else:
                print_error(f"Failed: {data.get('error', 'Unknown error')}")
                return None
        else:
            error_text = response.text[:300]
            print_error(f"API returned {response.status_code}")
            print(f"  {error_text}")
            return None
            
    except Exception as e:
        print_error(f"Error: {e}")
        return None


def check_subnet_status(subnet_name):
    """Check the status of a subnet"""
    print_step(3, f"Checking Subnet Status: '{subnet_name}'")
    
    try:
        response = requests.get(
            f"{API_BASE}/celestial-forge/subnet/{subnet_name}/status",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            status = data.get("status", {})
            config = status.get("configuration", {})
            
            print_success("Subnet status retrieved")
            print(f"  RPC URL: {config.get('rpc_url', 'Not configured')}")
            print(f"  Has Private Key: {config.get('has_private_key', False)}")
            print(f"  Web3 Connected: {config.get('web3_connected', False)}")
            
            if config.get("account_address"):
                print(f"  Account: {config.get('account_address')}")
            
            return True
        else:
            print_error(f"API returned {response.status_code}")
            return False
            
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def main():
    """Run the UI simulation"""
    print_header("Celestial Forge UI Simulation")
    
    # Check backend
    if not check_backend():
        print_error("Backend is not running")
        print_info("Please start the backend first:")
        print("  cd backend && uvicorn app:app --reload")
        print("\nOr run: python scripts/test_ui_forge.sh")
        sys.exit(1)
    
    print_success("Backend is running")
    
    # Test data
    test_wallet = "0x1234567890123456789012345678901234567890"
    timestamp = int(time.time())
    
    star_system_name = f"TestSystem_{timestamp}"
    planet_name = f"TestPlanet_{timestamp}"
    
    # Simulate UI flow
    print_header("Simulating UI Flow: Create Star System and Planet")
    
    # Step 1: Create Star System
    star_system = simulate_create_star_system(
        name=star_system_name,
        wallet=test_wallet,
        tribute=5.0
    )
    
    if not star_system:
        print_error("Failed to create star system. Cannot continue.")
        sys.exit(1)
    
    # Wait a moment
    time.sleep(1)
    
    # Step 2: Check Subnet Status
    check_subnet_status(star_system_name)
    
    # Wait a moment
    time.sleep(1)
    
    # Step 3: Create Planet
    planet = simulate_create_planet(
        star_system_name=star_system_name,
        planet_name=planet_name,
        star_system_id=star_system.get("subnet_id", star_system_name),
        wallet=test_wallet,
        planet_type="habitable"
    )
    
    if planet:
        print_success("Planet created successfully!")
    
    # Summary
    print_header("Simulation Complete")
    
    print(f"{Colors.GREEN}Created:{Colors.RESET}")
    print(f"  Star System: {star_system_name}")
    if planet:
        print(f"  Planet: {planet_name}")
    
    print(f"\n{Colors.CYAN}Next Steps (in UI):{Colors.RESET}")
    print("  1. Open http://localhost:8080")
    print("  2. Navigate to 'Unified Universe'")
    print("  3. Click 'Celestial Forge' tab")
    print("  4. Your created star system should appear in the list")
    print("  5. You can deploy it: avalanche subnet deploy <name>")
    print("  6. You can run it: avalanche network run <name>")
    
    print(f"\n{Colors.YELLOW}Test Star System: {star_system_name}{Colors.RESET}")
    print(f"Test Planet: {planet_name if planet else 'N/A'}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Simulation interrupted by user{Colors.RESET}")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n{Colors.RED}Error: {e}{Colors.RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

