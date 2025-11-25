"""
API endpoints for contract management
"""
from fastapi import APIRouter, HTTPException
import traceback
from typing import List, Dict, Any, Optional

# Import contract manager (works when run from backend directory)
try:
    from .contract_manager import ContractManager
except ImportError:
    from contract_manager import ContractManager

router = APIRouter(prefix="/contracts", tags=["contracts"])

# Global contract manager instance
contract_manager = None

def get_contract_manager():
    """Get or create contract manager instance"""
    global contract_manager
    if contract_manager is None:
        try:
            contract_manager = ContractManager()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to initialize contract manager: {str(e)}")
    return contract_manager

@router.get("/status")
async def get_deployment_status():
    """Get deployment status of all contracts"""
    try:
        manager = get_contract_manager()
        status = manager.get_deployment_status()
        return {
            "success": True,
            "status": status,
            "addresses": manager.addresses
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/addresses")
async def get_contract_addresses():
    """Get all deployed contract addresses"""
    try:
        manager = get_contract_manager()
        # Try to load from deployments file if manager doesn't have them
        if not manager.addresses:
            manager.load_addresses()
        addresses = dict(manager.addresses)
        # Also expose PlotRegistry and CSN Token (from env) if present
        import os
        from .config import CSN_TOKEN_ADDRESS
        plot_registry = os.getenv("PLOT_REGISTRY_ADDRESS")
        if plot_registry:
            addresses["plotRegistry"] = plot_registry
        # Add CSN token address
        addresses["csnToken"] = CSN_TOKEN_ADDRESS
        # Expose admin address (derived from PRIVATE_KEY or Avalanche CLI)
        try:
            addresses["adminAddress"] = manager.deployer.address
        except Exception:
            pass
        return {
            "success": True,
            "addresses": addresses
        }
    except Exception as e:
        # If contract manager fails, try to read from file directly
        import json
        from pathlib import Path
        project_root = Path(__file__).parent.parent
        addresses_file = project_root / "deployments" / "addresses.json"
        
        if addresses_file.exists():
            try:
                with open(addresses_file, 'r') as f:
                    addresses = json.load(f)
                # Merge plot registry and CSN token from env if present
                import os
                from .config import CSN_TOKEN_ADDRESS
                plot_registry = os.getenv("PLOT_REGISTRY_ADDRESS")
                if plot_registry:
                    addresses["plotRegistry"] = plot_registry
                # Add CSN token address
                addresses["csnToken"] = CSN_TOKEN_ADDRESS
                return {
                    "success": True,
                    "addresses": addresses
                }
            except:
                pass
        
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/deploy")
async def deploy_contracts():
    """Deploy all contracts if not already deployed"""
    try:
        manager = get_contract_manager()
        result = manager.setup_and_deploy()
        return {
            "success": result.get("status") != "error",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deployment failed: {str(e)}\n{traceback.format_exc()}")

@router.post("/compile")
async def compile_contracts():
    """Compile all contracts"""
    try:
        manager = get_contract_manager()
        success = manager.compile_contracts()
        return {
            "success": success,
            "message": "Contracts compiled successfully" if success else "Compilation failed"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify")
async def verify_contracts():
    """Verify all deployed contracts"""
    try:
        manager = get_contract_manager()
        verification = manager.verify_contracts()
        return {
            "success": True,
            "verification": verification
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check/{contract_name}")
async def check_contract(contract_name: str):
    """Check if a specific contract is deployed"""
    try:
        manager = get_contract_manager()
        status = manager.get_deployment_status()
        
        if contract_name not in status:
            raise HTTPException(status_code=404, detail=f"Contract {contract_name} not found")
        
        contract_info = status[contract_name]
        return {
            "success": True,
            "contract": contract_name,
            "deployed": contract_info["deployed"],
            "address": contract_info["address"],
            "status": contract_info["status"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pending")
async def list_pending_purchases(from_block: Optional[int] = None, to_block: Optional[int] = None):
    """
    List pending plot purchases by scanning PlotPurchasePending events
    and validating current pendingBuyer/plotMinted state.
    """
    try:
        manager = get_contract_manager()
        from web3 import Web3
        w3 = manager.w3
        # Determine land contract address
        land_addr = manager.addresses.get("land")
        if not land_addr:
            raise HTTPException(status_code=400, detail="Land contract address not set")

        # Load ABI: try saved ABI, else minimal ABI
        import json
        from pathlib import Path
        abi = None
        abi_path = Path(manager.abi_dir) / "SaraktLandV2ABI.json"
        if abi_path.exists():
            with open(abi_path, "r") as f:
                data = json.load(f)
                abi = data.get("abi") or data
        if not abi:
            abi = [
                {"anonymous": False,"inputs":[{"indexed": True,"internalType": "uint256","name":"plotId","type":"uint256"},{"indexed": True,"internalType":"address","name":"buyer","type":"address"},{"indexed": False,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed": False,"internalType":"address","name":"paymentToken","type":"address"},{"indexed": False,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"PlotPurchasePending","type":"event"},
                {"inputs":[{"internalType":"uint256","name":"plotId","type":"uint256"}],"name":"plotMinted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
                {"inputs":[{"internalType":"uint256","name":"plotId","type":"uint256"}],"name":"pendingBuyer","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
            ]

        contract = w3.eth.contract(address=Web3.to_checksum_address(land_addr), abi=abi)
        latest = w3.eth.block_number
        start_block = from_block if from_block is not None else max(latest - 50_000, 0)  # scan recent history
        end_block = to_block if to_block is not None else latest

        event = contract.events.PlotPurchasePending()
        logs = event.get_logs(fromBlock=start_block, toBlock=end_block)

        pending: List[Dict[str, Any]] = []
        for ev in logs:
            plot_id = int(ev.args.plotId)
            buyer = ev.args.buyer
            amount = int(ev.args.amount)
            token = ev.args.paymentToken
            ts = int(ev.args.timestamp)
            # Validate still pending and not minted
            minted = contract.functions.plotMinted(plot_id).call()
            buyer_now = contract.functions.pendingBuyer(plot_id).call()
            if not minted and buyer_now != "0x0000000000000000000000000000000000000000":
                pending.append({
                    "plotId": plot_id,
                    "buyer": buyer,
                    "amount": amount,
                    "paymentToken": token,
                    "timestamp": ts
                })

        return {"success": True, "pending": pending, "fromBlock": start_block, "toBlock": end_block}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list pending: {str(e)}")

@router.post("/activate")
async def activate_plot(plotId: int, recipient: Optional[str] = None, owner_email: Optional[str] = None):
    """
    Admin activation: mints plot to pending buyer or specified recipient.
    Uses server-side PRIVATE_KEY from config via ContractManager's web3.
    """
    try:
        manager = get_contract_manager()
        from web3 import Web3
        w3 = manager.w3
        land_addr = manager.addresses.get("land")
        if not land_addr:
            raise HTTPException(status_code=400, detail="Land contract address not set")

        # Load ABI for activatePlot
        import json
        from pathlib import Path
        abi = None
        abi_path = Path(manager.abi_dir) / "SaraktLandV2ABI.json"
        if abi_path.exists():
            with open(abi_path, "r") as f:
                data = json.load(f)
                abi = data.get("abi") or data
        if not abi:
            abi = [
                {"inputs":[{"internalType":"uint256","name":"plotId","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"activatePlot","outputs":[],"stateMutability":"nonpayable","type":"function"},
                {"inputs":[{"internalType":"uint256","name":"plotId","type":"uint256"}],"name":"pendingBuyer","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
                {"inputs":[{"internalType":"uint256","name":"plotId","type":"uint256"}],"name":"plotMinted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
            ]

        contract = w3.eth.contract(address=Web3.to_checksum_address(land_addr), abi=abi)
        is_minted = contract.functions.plotMinted(plotId).call()
        if is_minted:
            return {"success": True, "message": "Already minted"}

        buyer_now = contract.functions.pendingBuyer(plotId).call()
        if buyer_now == "0x0000000000000000000000000000000000000000" and (recipient is None or recipient == "0x0000000000000000000000000000000000000000"):
            raise HTTPException(status_code=400, detail="No pending buyer and no recipient specified")

        # Prepare tx
        acct = manager.deployer
        to_recipient = recipient if recipient else buyer_now
        tx = contract.functions.activatePlot(plotId, Web3.to_checksum_address(to_recipient)).build_transaction({
            "from": acct.address,
            "nonce": w3.eth.get_transaction_count(acct.address),
            "gas": 300000,
            "maxFeePerGas": w3.to_wei("3", "gwei"),
            "maxPriorityFeePerGas": w3.to_wei("1", "gwei"),
            "chainId": manager.w3.eth.chain_id
        })
        signed = w3.eth.account.sign_transaction(tx, private_key=manager.deployer.key)
        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        # Optional: generate deed and email it
        if owner_email:
            try:
                from .deed import DeedGenerator
            except ImportError:
                from deed import DeedGenerator
            try:
                from .email_service import send_email_with_attachment
            except ImportError:
                from email_service import send_email_with_attachment
            try:
                final_owner = Web3.to_checksum_address(recipient) if recipient else buyer_now
                # Get contract address for deed
                contract_address = land_addr
                # Generate deed with template from documents folder
                pdf_buf = DeedGenerator.generate_deed(
                    plot_id=plotId,
                    owner=final_owner,
                    tx_hash=tx_hash.hex(),
                    owner_email=owner_email,
                    token_id=plotId,  # NFT token ID is same as plot ID
                    contract_address=contract_address
                )
                send_email_with_attachment(
                    to_address=owner_email,
                    subject=f"Sarakt Land Ownership Title Certificate - Plot #{plotId}",
                    body_text=f"Congratulations! Your plot #{plotId} has been activated.\n\nOwner: {final_owner}\nTransaction: {tx_hash.hex()}\n\nPlease find your Land Ownership Title Certificate attached.",
                    attachment_bytes=pdf_buf.getvalue(),
                    attachment_filename=f"LandOwnershipTitleCertificate_Plot_{plotId}.pdf"
                )
            except Exception as e:
                # Don't fail activation if email fails
                print(f"Email sending failed for plot {plotId}: {e}")

        return {"success": True, "txHash": tx_hash.hex(), "status": receipt.status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Activation failed: {str(e)}")
