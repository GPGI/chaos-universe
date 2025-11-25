"""
Avalanche CLI Transfer Module
Handles AVAX and token transfers using Avalanche CLI discovered configuration
"""
import os
from typing import Optional, NamedTuple
from decimal import Decimal
from eth_account import Account
from web3 import Web3
from web3.exceptions import TransactionNotFound

from .cli_utils import discover_from_cli, get_rpc_from_cli, find_funded_key

class TransferResult(NamedTuple):
    """Result of a transfer operation"""
    success: bool
    tx_hash: Optional[str] = None
    error: Optional[str] = None
    gas_used: Optional[int] = None
    block_number: Optional[int] = None

def get_web3_instance(subnet_name: Optional[str] = None, rpc_url: Optional[str] = None) -> Optional[Web3]:
    """
    Get Web3 instance connected to Avalanche network.
    
    Args:
        subnet_name: Name of the subnet (used to discover RPC if rpc_url not provided)
        rpc_url: Direct RPC URL (takes precedence over subnet_name)
        
    Returns:
        Web3 instance or None if connection fails
    """
    if not rpc_url:
        if subnet_name:
            rpc_url = get_rpc_from_cli(subnet_name)
        else:
            # Try environment variable
            rpc_url = os.getenv("VITE_AVALANCHE_RPC") or os.getenv("AVALANCHE_RPC")
    
    if not rpc_url:
        return None
    
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if w3.is_connected():
            return w3
    except Exception as e:
        print(f"Failed to connect to RPC: {e}")
    
    return None

def get_account_from_key(private_key: Optional[str] = None, subnet_name: Optional[str] = None) -> Optional[Account]:
    """
    Get account from private key.
    
    Args:
        private_key: Private key string (with or without 0x prefix)
        subnet_name: Subnet name to discover key from CLI if private_key not provided
        
    Returns:
        Account object or None if key not found
    """
    if not private_key:
        if subnet_name:
            private_key = find_funded_key(subnet_name)
        else:
            private_key = os.getenv("PRIVATE_KEY")
    
    if not private_key:
        return None
    
    # Ensure 0x prefix
    if not private_key.startswith("0x"):
        private_key = f"0x{private_key}"
    
    try:
        return Account.from_key(private_key)
    except Exception as e:
        print(f"Invalid private key: {e}")
        return None

def get_balance(address: str, subnet_name: Optional[str] = None, rpc_url: Optional[str] = None) -> Optional[Decimal]:
    """
    Get AVAX balance for an address.
    
    Args:
        address: Wallet address
        subnet_name: Subnet name for RPC discovery
        rpc_url: Direct RPC URL
        
    Returns:
        Balance in AVAX (as Decimal) or None if error
    """
    w3 = get_web3_instance(subnet_name, rpc_url)
    if not w3:
        return None
    
    try:
        balance_wei = w3.eth.get_balance(address)
        balance_avax = Decimal(balance_wei) / Decimal(10**18)
        return balance_avax
    except Exception as e:
        print(f"Error getting balance: {e}")
        return None

def get_token_balance(
    address: str,
    token_address: str,
    subnet_name: Optional[str] = None,
    rpc_url: Optional[str] = None
) -> Optional[Decimal]:
    """
    Get ERC20 token balance for an address.
    
    Args:
        address: Wallet address
        token_address: ERC20 token contract address
        subnet_name: Subnet name for RPC discovery
        rpc_url: Direct RPC URL
        
    Returns:
        Token balance (as Decimal) or None if error
    """
    w3 = get_web3_instance(subnet_name, rpc_url)
    if not w3:
        return None
    
    # ERC20 ABI for balanceOf
    erc20_abi = [
        {
            "constant": True,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [],
            "name": "decimals",
            "outputs": [{"name": "", "type": "uint8"}],
            "type": "function"
        }
    ]
    
    try:
        token_contract = w3.eth.contract(address=Web3.to_checksum_address(token_address), abi=erc20_abi)
        balance = token_contract.functions.balanceOf(address).call()
        decimals = token_contract.functions.decimals().call()
        balance_decimal = Decimal(balance) / Decimal(10**decimals)
        return balance_decimal
    except Exception as e:
        print(f"Error getting token balance: {e}")
        return None

def transfer_avax(
    to_address: str,
    amount_avax: Decimal,
    from_key: Optional[str] = None,
    subnet_name: Optional[str] = None,
    rpc_url: Optional[str] = None,
    gas_price: Optional[int] = None,
    gas_limit: Optional[int] = None
) -> TransferResult:
    """
    Transfer AVAX from one address to another.
    
    Args:
        to_address: Recipient address
        amount_avax: Amount to transfer in AVAX
        from_key: Private key of sender (discovered from CLI if not provided)
        subnet_name: Subnet name for RPC/key discovery
        rpc_url: Direct RPC URL
        gas_price: Gas price in wei (auto if None)
        gas_limit: Gas limit (auto if None)
        
    Returns:
        TransferResult with transaction details
    """
    # Get Web3 instance
    w3 = get_web3_instance(subnet_name, rpc_url)
    if not w3:
        return TransferResult(success=False, error="Failed to connect to RPC")
    
    # Get account
    account = get_account_from_key(from_key, subnet_name)
    if not account:
        return TransferResult(success=False, error="Private key not found")
    
    from_address = account.address
    
    try:
        # Convert AVAX to wei
        amount_wei = int(amount_avax * Decimal(10**18))
        
        # Get nonce
        nonce = w3.eth.get_transaction_count(from_address)
        
        # Get gas price if not provided
        if gas_price is None:
            gas_price = w3.eth.gas_price
        
        # Estimate gas if limit not provided
        if gas_limit is None:
            try:
                gas_limit = w3.eth.estimate_gas({
                    'to': Web3.to_checksum_address(to_address),
                    'from': from_address,
                    'value': amount_wei
                })
            except Exception:
                gas_limit = 21000  # Standard transfer
        
        # Build transaction
        tx = {
            'nonce': nonce,
            'to': Web3.to_checksum_address(to_address),
            'value': amount_wei,
            'gas': gas_limit,
            'gasPrice': gas_price,
            'chainId': w3.eth.chain_id
        }
        
        # Sign transaction
        signed_tx = account.sign_transaction(tx)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        tx_hash_hex = tx_hash.hex()
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        return TransferResult(
            success=receipt.status == 1,
            tx_hash=tx_hash_hex,
            gas_used=receipt.gasUsed,
            block_number=receipt.blockNumber,
            error=None if receipt.status == 1 else "Transaction failed"
        )
        
    except Exception as e:
        return TransferResult(success=False, error=str(e))

def transfer_token(
    to_address: str,
    token_address: str,
    amount: Decimal,
    from_key: Optional[str] = None,
    subnet_name: Optional[str] = None,
    rpc_url: Optional[str] = None,
    gas_price: Optional[int] = None,
    gas_limit: Optional[int] = None
) -> TransferResult:
    """
    Transfer ERC20 token from one address to another.
    
    Args:
        to_address: Recipient address
        token_address: ERC20 token contract address
        amount: Amount to transfer (will be converted using token decimals)
        from_key: Private key of sender (discovered from CLI if not provided)
        subnet_name: Subnet name for RPC/key discovery
        rpc_url: Direct RPC URL
        gas_price: Gas price in wei (auto if None)
        gas_limit: Gas limit (auto if None)
        
    Returns:
        TransferResult with transaction details
    """
    # Get Web3 instance
    w3 = get_web3_instance(subnet_name, rpc_url)
    if not w3:
        return TransferResult(success=False, error="Failed to connect to RPC")
    
    # Get account
    account = get_account_from_key(from_key, subnet_name)
    if not account:
        return TransferResult(success=False, error="Private key not found")
    
    from_address = account.address
    
    # ERC20 ABI for transfer
    erc20_abi = [
        {
            "constant": False,
            "inputs": [
                {"name": "_to", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [],
            "name": "decimals",
            "outputs": [{"name": "", "type": "uint8"}],
            "type": "function"
        }
    ]
    
    try:
        token_contract = w3.eth.contract(
            address=Web3.to_checksum_address(token_address),
            abi=erc20_abi
        )
        
        # Get token decimals
        decimals = token_contract.functions.decimals().call()
        amount_wei = int(amount * Decimal(10**decimals))
        
        # Get nonce
        nonce = w3.eth.get_transaction_count(from_address)
        
        # Get gas price if not provided
        if gas_price is None:
            gas_price = w3.eth.gas_price
        
        # Build transaction
        tx = token_contract.functions.transfer(
            Web3.to_checksum_address(to_address),
            amount_wei
        ).build_transaction({
            'from': from_address,
            'nonce': nonce,
            'gasPrice': gas_price,
            'chainId': w3.eth.chain_id
        })
        
        # Estimate gas if limit not provided
        if gas_limit is None:
            try:
                gas_limit = w3.eth.estimate_gas(tx)
            except Exception:
                gas_limit = 100000  # Default for token transfer
        tx['gas'] = gas_limit
        
        # Sign transaction
        signed_tx = account.sign_transaction(tx)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        tx_hash_hex = tx_hash.hex()
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        return TransferResult(
            success=receipt.status == 1,
            tx_hash=tx_hash_hex,
            gas_used=receipt.gasUsed,
            block_number=receipt.blockNumber,
            error=None if receipt.status == 1 else "Transaction failed"
        )
        
    except Exception as e:
        return TransferResult(success=False, error=str(e))

