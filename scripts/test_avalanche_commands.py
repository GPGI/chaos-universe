#!/usr/bin/env python3
"""
Test script for specific Avalanche CLI commands
"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "backend"))

from backend.subnet_interaction import (
    create_subnet_interactor,
    blockchain_describe,
    network_status,
    network_run,
    key_list
)


def main():
    print("=" * 70)
    print("Avalanche CLI Commands Test")
    print("=" * 70)
    print()
    
    interactor = create_subnet_interactor()
    
    # Test key list
    print("[1/4] Testing 'avalanche key list'")
    print("-" * 70)
    try:
        result = interactor.key_list()
        if result.get("success"):
            print("✓ Command executed successfully")
            print("Output:")
            print(result.get("output", "")[:500])  # First 500 chars
        else:
            print(f"✗ Command failed: {result.get('error')}")
            if result.get("output"):
                print("Output:", result.get("output")[:200])
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print()
    
    # Test blockchain describe
    print("[2/4] Testing 'avalanche blockchain describe'")
    print("-" * 70)
    subnet_name = interactor.subnet_name
    try:
        result = interactor.blockchain_describe(subnet_name)
        if result.get("success"):
            print(f"✓ Blockchain '{subnet_name}' described successfully")
            print("Output:")
            print(result.get("output", "")[:500])  # First 500 chars
        else:
            print(f"✗ Command failed: {result.get('error')}")
            if result.get("output"):
                print("Output:", result.get("output")[:200])
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print()
    
    # Test network status
    print("[3/4] Testing 'avalanche network status'")
    print("-" * 70)
    try:
        result = interactor.network_status(subnet_name)
        if result.get("success"):
            print(f"✓ Network '{subnet_name}' status retrieved successfully")
            print("Output:")
            print(result.get("output", "")[:500])  # First 500 chars
        else:
            print(f"✗ Command failed: {result.get('error')}")
            if result.get("output"):
                print("Output:", result.get("output")[:200])
            print("\nNote: Network may not be running or may use a different name")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print()
    
    # Test network run (this might start a network, so we'll just show the command structure)
    print("[4/4] Testing 'avalanche network run' (dry run)")
    print("-" * 70)
    print("Note: This command typically starts a network, so we'll show the structure only")
    print(f"Command would be: avalanche network run {subnet_name}")
    print("\nTo actually run the network, use:")
    print(f"  python -c \"from backend.subnet_interaction import network_run; print(network_run('{subnet_name}'))\"")
    
    print()
    print("=" * 70)
    print("Test Complete")
    print("=" * 70)


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

