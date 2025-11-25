#!/usr/bin/env python3
"""
Avalanche CLI Transfer Command Line Interface
Provides command-line access to transfer functionality
"""
import argparse
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from avalanche_cli.transfer import transfer_avax, transfer_token, get_balance, get_token_balance
from avalanche_cli.cli_utils import get_network_info, get_subnet_list, discover_from_cli

def cmd_transfer_avax(args):
    """Transfer AVAX command"""
    try:
        amount = Decimal(args.amount)
        if amount <= 0:
            print("Error: Amount must be positive")
            return 1
        
        print(f"Transferring {amount} AVAX to {args.to}...")
        result = transfer_avax(
            to_address=args.to,
            amount_avax=amount,
            from_key=args.key,
            subnet_name=args.subnet,
            rpc_url=args.rpc
        )
        
        if result.success:
            print(f"✓ Transfer successful!")
            print(f"  Transaction Hash: {result.tx_hash}")
            print(f"  Block Number: {result.block_number}")
            print(f"  Gas Used: {result.gas_used}")
            return 0
        else:
            print(f"✗ Transfer failed: {result.error}")
            return 1
    except InvalidOperation:
        print(f"Error: Invalid amount '{args.amount}'")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1

def cmd_transfer_token(args):
    """Transfer token command"""
    try:
        amount = Decimal(args.amount)
        if amount <= 0:
            print("Error: Amount must be positive")
            return 1
        
        print(f"Transferring {amount} tokens to {args.to}...")
        result = transfer_token(
            to_address=args.to,
            token_address=args.token,
            amount=amount,
            from_key=args.key,
            subnet_name=args.subnet,
            rpc_url=args.rpc
        )
        
        if result.success:
            print(f"✓ Transfer successful!")
            print(f"  Transaction Hash: {result.tx_hash}")
            print(f"  Block Number: {result.block_number}")
            print(f"  Gas Used: {result.gas_used}")
            return 0
        else:
            print(f"✗ Transfer failed: {result.error}")
            return 1
    except InvalidOperation:
        print(f"Error: Invalid amount '{args.amount}'")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1

def cmd_balance(args):
    """Get balance command"""
    try:
        balance = get_balance(
            address=args.address,
            subnet_name=args.subnet,
            rpc_url=args.rpc
        )
        
        if balance is not None:
            print(f"Balance: {balance} AVAX")
            return 0
        else:
            print("Error: Failed to get balance")
            return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1

def cmd_token_balance(args):
    """Get token balance command"""
    try:
        balance = get_token_balance(
            address=args.address,
            token_address=args.token,
            subnet_name=args.subnet,
            rpc_url=args.rpc
        )
        
        if balance is not None:
            print(f"Token Balance: {balance}")
            return 0
        else:
            print("Error: Failed to get token balance")
            return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1

def cmd_network_info(args):
    """Get network info command"""
    try:
        info = get_network_info(args.subnet)
        print(f"Network: {args.subnet}")
        print(f"RPC URL: {info.get('rpc_url', 'Not found')}")
        print(f"Has Private Key: {info.get('has_private_key', False)}")
        if 'blockchain_id' in info:
            print(f"Blockchain ID: {info['blockchain_id']}")
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 1

def cmd_list_subnets(args):
    """List subnets command"""
    try:
        subnets = get_subnet_list()
        if subnets:
            print("Available Subnets:")
            for subnet in subnets:
                print(f"  - {subnet}")
        else:
            print("No subnets found")
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 1

def cmd_discover(args):
    """Discover RPC and key command"""
    try:
        rpc_url, private_key = discover_from_cli(args.subnet)
        print(f"Subnet: {args.subnet}")
        print(f"RPC URL: {rpc_url or 'Not found'}")
        print(f"Private Key: {'Found' if private_key else 'Not found'}")
        if private_key:
            # Show first and last 4 chars for security
            key_preview = f"{private_key[:6]}...{private_key[-4:]}"
            print(f"  Preview: {key_preview}")
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 1

def main():
    parser = argparse.ArgumentParser(
        description="Avalanche CLI Transfer Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Common arguments
    def add_common_args(p):
        p.add_argument("--subnet", "-s", default="ChaosStarNetwork", help="Subnet name")
        p.add_argument("--rpc", help="RPC URL (overrides subnet discovery)")
        p.add_argument("--key", help="Private key (overrides CLI discovery)")
    
    # Transfer AVAX
    transfer_avax_parser = subparsers.add_parser("transfer-avax", help="Transfer AVAX")
    transfer_avax_parser.add_argument("to", help="Recipient address")
    transfer_avax_parser.add_argument("amount", help="Amount in AVAX")
    add_common_args(transfer_avax_parser)
    transfer_avax_parser.set_defaults(func=cmd_transfer_avax)
    
    # Transfer Token
    transfer_token_parser = subparsers.add_parser("transfer-token", help="Transfer ERC20 token")
    transfer_token_parser.add_argument("to", help="Recipient address")
    transfer_token_parser.add_argument("token", help="Token contract address")
    transfer_token_parser.add_argument("amount", help="Amount to transfer")
    add_common_args(transfer_token_parser)
    transfer_token_parser.set_defaults(func=cmd_transfer_token)
    
    # Get Balance
    balance_parser = subparsers.add_parser("balance", help="Get AVAX balance")
    balance_parser.add_argument("address", help="Wallet address")
    add_common_args(balance_parser)
    balance_parser.set_defaults(func=cmd_balance)
    
    # Get Token Balance
    token_balance_parser = subparsers.add_parser("token-balance", help="Get token balance")
    token_balance_parser.add_argument("address", help="Wallet address")
    token_balance_parser.add_argument("token", help="Token contract address")
    add_common_args(token_balance_parser)
    token_balance_parser.set_defaults(func=cmd_token_balance)
    
    # Network Info
    network_parser = subparsers.add_parser("network", help="Get network information")
    network_parser.add_argument("subnet", nargs="?", default="ChaosStarNetwork", help="Subnet name")
    network_parser.set_defaults(func=cmd_network_info)
    
    # List Subnets
    list_parser = subparsers.add_parser("list-subnets", help="List available subnets")
    list_parser.set_defaults(func=cmd_list_subnets)
    
    # Discover
    discover_parser = subparsers.add_parser("discover", help="Discover RPC and key from CLI")
    discover_parser.add_argument("subnet", nargs="?", default="ChaosStarNetwork", help="Subnet name")
    discover_parser.set_defaults(func=cmd_discover)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    return args.func(args)

if __name__ == "__main__":
    sys.exit(main())

