#!/usr/bin/env python3
"""
Example usage of Avalanche CLI Transfer Module
"""
from decimal import Decimal
from avalanche_cli.transfer import transfer_avax, transfer_token, get_balance
from avalanche_cli.cli_utils import discover_from_cli, get_network_info

# Example 1: Discover network configuration
print("=== Discovering Network Configuration ===")
rpc_url, private_key = discover_from_cli("ChaosStarNetwork")
print(f"RPC URL: {rpc_url}")
print(f"Private Key Found: {private_key is not None}")

# Example 2: Get network info
print("\n=== Network Information ===")
info = get_network_info("ChaosStarNetwork")
print(f"Subnet: {info['subnet_name']}")
print(f"RPC: {info['rpc_url']}")
print(f"Has Key: {info['has_private_key']}")

# Example 3: Check balance
print("\n=== Checking Balance ===")
if private_key:
    from eth_account import Account
    account = Account.from_key(private_key)
    balance = get_balance(account.address, subnet_name="ChaosStarNetwork")
    print(f"Address: {account.address}")
    print(f"Balance: {balance} AVAX" if balance else "Failed to get balance")

# Example 4: Transfer AVAX (commented out for safety)
# print("\n=== Transferring AVAX ===")
# result = transfer_avax(
#     to_address="0x...",
#     amount_avax=Decimal("0.1"),
#     subnet_name="ChaosStarNetwork"
# )
# if result.success:
#     print(f"Transfer successful! TX: {result.tx_hash}")
# else:
#     print(f"Transfer failed: {result.error}")

# Example 5: Transfer Token (commented out for safety)
# print("\n=== Transferring Token ===")
# result = transfer_token(
#     to_address="0x...",
#     token_address="0x...",
#     amount=Decimal("100.0"),
#     subnet_name="ChaosStarNetwork"
# )
# if result.success:
#     print(f"Transfer successful! TX: {result.tx_hash}")
# else:
#     print(f"Transfer failed: {result.error}")

