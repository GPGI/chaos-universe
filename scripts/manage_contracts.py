#!/usr/bin/env python3
"""
Command-line interface for managing smart contracts
Usage:
    python scripts/manage_contracts.py status
    python scripts/manage_contracts.py deploy
    python scripts/manage_contracts.py compile
    python scripts/manage_contracts.py verify
    python scripts/manage_contracts.py pending [fromBlock] [toBlock]
    python scripts/manage_contracts.py activate <plotId> [recipient]
"""
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "backend"))

from backend.contract_manager import ContractManager
from web3 import Web3
import json


def print_status(manager: ContractManager):
    """Print deployment status"""
    status = manager.get_deployment_status()
    
    print("\n" + "="*60)
    print("CONTRACT DEPLOYMENT STATUS")
    print("="*60 + "\n")
    
    for name, info in status.items():
        icon = "✓" if info["deployed"] else "✗"
        status_text = "DEPLOYED" if info["deployed"] else "NOT DEPLOYED"
        
        print(f"{icon} {name:20s} {status_text}")
        if info["address"]:
            print(f"  Address: {info['address']}")
        print()
    
    print("="*60 + "\n")


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/manage_contracts.py <command>")
        print("Commands: status, deploy, compile, verify, pending, activate")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    try:
        manager = ContractManager()
        
        if command == "status":
            print_status(manager)
            addresses = manager.addresses
            if addresses:
                print("Deployed Addresses:")
                print(json.dumps(addresses, indent=2))
        
        elif command == "compile":
            print("Compiling contracts...")
            if manager.compile_contracts():
                print("✓ Compilation successful!")
                # Extract ABIs
                contracts = ["SaraktDigitalID", "SaraktTreasury", "SaraktLandV2", "DummyToken"]
                print("\nExtracting ABIs...")
                for contract_name in contracts:
                    abi = manager.extract_abi(contract_name)
                    if abi:
                        manager.save_abi(contract_name, abi)
                        print(f"  ✓ {contract_name}")
            else:
                print("✗ Compilation failed!")
                sys.exit(1)
        
        elif command == "deploy":
            print("Starting contract deployment...")
            result = manager.setup_and_deploy()
            
            if result["status"] == "error":
                print(f"✗ Deployment failed: {result.get('error', 'Unknown error')}")
                sys.exit(1)
            elif result["status"] == "deployed":
                print("\n✓ All contracts deployed successfully!")
                print("\nDeployed Addresses:")
                print(json.dumps(result["addresses"], indent=2))
            else:
                print(f"\n⚠ Deployment status: {result['status']}")
        
        elif command == "verify":
            print("Verifying contracts...")
            verification = manager.verify_contracts()
            
            print("\nVerification Results:")
            print("="*60)
            for name, verified in verification.items():
                icon = "✓" if verified else "✗"
                status = "VERIFIED" if verified else "FAILED"
                print(f"{icon} {name:20s} {status}")
        
        elif command == "pending":
            from_block = int(sys.argv[2]) if len(sys.argv) > 2 else None
            to_block = int(sys.argv[3]) if len(sys.argv) > 3 else None
            land_addr = manager.addresses.get("land")
            if not land_addr:
                print("Land contract address not set. Run deploy or set addresses.")
                sys.exit(1)
            # Load ABI
            import json
            abi = manager.extract_abi("SaraktLandV2")
            if not abi:
                # Fallback minimal
                abi = [
                    {"anonymous": False,"inputs":[{"indexed": True,"internalType": "uint256","name":"plotId","type":"uint256"},{"indexed": True,"internalType":"address","name":"buyer","type":"address"},{"indexed": False,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed": False,"internalType":"address","name":"paymentToken","type":"address"},{"indexed": False,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"PlotPurchasePending","type":"event"},
                    {"inputs":[{"internalType":"uint256","name":"plotId","type":"uint256"}],"name":"plotMinted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
                    {"inputs":[{"internalType":"uint256","name":"plotId","type":"uint256"}],"name":"pendingBuyer","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
                ]
            w3 = manager.w3
            latest = w3.eth.block_number
            start_block = from_block if from_block is not None else max(latest - 50_000, 0)
            end_block = to_block if to_block is not None else latest
            contract = w3.eth.contract(address=Web3.to_checksum_address(land_addr), abi=abi)
            event = contract.events.PlotPurchasePending()
            logs = event.get_logs(fromBlock=start_block, toBlock=end_block)
            print(f"Pending purchases (scanning {start_block}..{end_block}):")
            for ev in logs:
                plot_id = int(ev.args.plotId)
                minted = contract.functions.plotMinted(plot_id).call()
                buyer_now = contract.functions.pendingBuyer(plot_id).call()
                if not minted and buyer_now != "0x0000000000000000000000000000000000000000":
                    print(json.dumps({
                        "plotId": plot_id,
                        "buyer": ev.args.buyer,
                        "amount": int(ev.args.amount),
                        "paymentToken": ev.args.paymentToken,
                        "timestamp": int(ev.args.timestamp),
                    }, indent=2))
        elif command == "activate":
            if len(sys.argv) < 3:
                print("Usage: python scripts/manage_contracts.py activate <plotId> [recipient]")
                sys.exit(1)
            plot_id = int(sys.argv[2])
            recipient = sys.argv[3] if len(sys.argv) > 3 else None
            land_addr = manager.addresses.get("land")
            if not land_addr:
                print("Land contract address not set. Run deploy or set addresses.")
                sys.exit(1)
            abi = manager.extract_abi("SaraktLandV2")
            if not abi:
                abi = [
                    {"inputs":[{"internalType":"uint256","name":"plotId","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"activatePlot","outputs":[],"stateMutability":"nonpayable","type":"function"},
                ]
            contract = manager.w3.eth.contract(address=Web3.to_checksum_address(land_addr), abi=abi)
            acct = manager.deployer
            to_recipient = recipient if recipient else "0x0000000000000000000000000000000000000000"
            tx = contract.functions.activatePlot(plot_id, Web3.to_checksum_address(to_recipient)).build_transaction({
                "from": acct.address,
                "nonce": manager.w3.eth.get_transaction_count(acct.address),
                "gas": 300000,
                "maxFeePerGas": manager.w3.to_wei("3", "gwei"),
                "maxPriorityFeePerGas": manager.w3.to_wei("1", "gwei"),
                "chainId": manager.w3.eth.chain_id
            })
            signed = manager.w3.eth.account.sign_transaction(tx, private_key=manager.deployer.key)
            tx_hash = manager.w3.eth.send_raw_transaction(signed.rawTransaction)
            receipt = manager.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            print(f"Activation tx: {tx_hash.hex()}, status={receipt.status}")
        else:
            print(f"Unknown command: {command}")
            print("Available commands: status, deploy, compile, verify, pending, activate")
            sys.exit(1)
    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

