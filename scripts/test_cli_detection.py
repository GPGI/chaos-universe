#!/usr/bin/env python3
"""
Test script for CLI detection and subnet interaction
"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "backend"))

from backend.cli_detector import CLIDetector, detect_tools, is_forge_available, is_avalanche_cli_available
from backend.subnet_interaction import SubnetInteractor, create_subnet_interactor, auto_detect_and_interact


def main():
    print("=" * 70)
    print("CLI Detection and Subnet Interaction Test")
    print("=" * 70)
    print()
    
    # 1. Test CLI Detection
    print("[1/4] Testing CLI Detection")
    print("-" * 70)
    
    detector = CLIDetector()
    
    # Detect Forge
    forge_result = detector.detect_forge()
    print(f"Forge:")
    print(f"  Installed: {forge_result.installed}")
    if forge_result.installed:
        print(f"  Version: {forge_result.version}")
        print(f"  Path: {forge_result.path}")
    else:
        print(f"  Error: {forge_result.error}")
    
    print()
    
    # Detect Avalanche CLI
    avalanche_result = detector.detect_avalanche_cli()
    print(f"Avalanche CLI:")
    print(f"  Installed: {avalanche_result.installed}")
    if avalanche_result.installed:
        print(f"  Version: {avalanche_result.version}")
        print(f"  Path: {avalanche_result.path}")
        print(f"  Available Commands: {len(avalanche_result.available_commands or [])}")
        if avalanche_result.available_commands:
            print(f"    Sample: {', '.join(avalanche_result.available_commands[:10])}")
    else:
        print(f"  Error: {avalanche_result.error}")
    
    print()
    
    # 2. Test Subnet Interaction
    print("[2/4] Testing Subnet Interaction")
    print("-" * 70)
    
    subnet_name = "ChaosStarNetwork"
    interactor = create_subnet_interactor(subnet_name)
    
    # Check tools
    tools = interactor.check_tools()
    print(f"Tools Status:")
    for tool, available in tools.items():
        status = "✓" if available else "✗"
        print(f"  {status} {tool}: {'Available' if available else 'Not available'}")
    
    print()
    
    # Get status
    status = interactor.get_status()
    print(f"Subnet: {status['subnet_name']}")
    print(f"RPC URL: {status['configuration']['rpc_url'] or 'Not configured'}")
    print(f"Has Private Key: {status['configuration']['has_private_key']}")
    print(f"Web3 Connected: {status['configuration']['web3_connected']}")
    
    if status['configuration'].get('account_address'):
        print(f"Account: {status['configuration']['account_address']}")
        if status['configuration'].get('balance'):
            print(f"Balance: {status['configuration']['balance']} wei")
    
    print()
    
    # 3. Test Command Discovery
    print("[3/4] Testing Command Discovery")
    print("-" * 70)
    
    if is_avalanche_cli_available():
        commands = interactor.get_available_commands()
        if commands:
            print("Available Avalanche CLI Commands:")
            for category, cmd_list in commands.items():
                if cmd_list:
                    print(f"  {category}:")
                    for cmd in cmd_list[:10]:  # Show first 10
                        print(f"    - {cmd}")
        else:
            print("  No commands discovered")
    else:
        print("  Avalanche CLI not available")
    
    print()
    
    # 4. Test Subnet Listing
    print("[4/4] Testing Subnet Listing")
    print("-" * 70)
    
    if is_avalanche_cli_available():
        subnets = interactor.list_subnets()
        if subnets:
            print(f"Found {len(subnets)} subnet(s):")
            for subnet in subnets:
                print(f"  - {subnet.get('name', 'unknown')} ({subnet.get('status', 'unknown')})")
        else:
            print("  No subnets found")
    else:
        print("  Avalanche CLI not available")
    
    print()
    
    # Summary
    print("=" * 70)
    print("Summary")
    print("=" * 70)
    
    summary = detect_tools()
    print("\nDetection Summary:")
    print(f"  Forge: {'✓ Installed' if summary['forge']['installed'] else '✗ Not installed'}")
    print(f"  Avalanche CLI: {'✓ Installed' if summary['avalanche_cli']['installed'] else '✗ Not installed'}")
    
    if summary['avalanche_cli']['installed']:
        subnet_cmds = summary['avalanche_cli'].get('subnet_commands', [])
        print(f"  Subnet Commands Available: {len(subnet_cmds)}")
        if subnet_cmds:
            print(f"    {', '.join(subnet_cmds[:5])}")
    
    print()
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

