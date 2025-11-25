from web3 import Web3
from eth_account import Account
import json
import requests
from pathlib import Path
from typing import Optional
from .config import (
    AVALANCHE_RPC, LAND_CONTRACT, PRIVATE_KEY, CONTRACT_ABI_PATH,
    CHAIN_ID, GAS_LIMIT, PLOT_PRICE
)

class BlockchainService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(AVALANCHE_RPC))
        if not self.w3.is_connected():
            raise Exception("Not connected to subnet")

        # Load ABI with fallback
        self.abi = self._load_abi(CONTRACT_ABI_PATH)
        if not self.abi:
            raise Exception(f"Could not load ABI from {CONTRACT_ABI_PATH}")

        if not LAND_CONTRACT:
            raise Exception("LAND_CONTRACT address not set. Deploy contracts first.")

        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(LAND_CONTRACT),
            abi=self.abi
        )
        self.deployer = Account.from_key(PRIVATE_KEY)
    
    def _load_abi(self, abi_path: str) -> Optional[list]:
        """Load ABI from file with fallback paths"""
        project_root = Path(__file__).parent.parent
        paths_to_try = [
            project_root / abi_path,
            project_root / "backend" / "abi" / "SaraktLandV2ABI.json",
            project_root / "backend" / "abi" / "YourContractABI.json",
        ]
        
        for path in paths_to_try:
            if path.exists():
                try:
                    with open(path, 'r') as f:
                        data = json.load(f)
                        return data.get('abi', data) if isinstance(data, dict) else data
                except Exception as e:
                    continue
        return None

    # --- Buy a plot ---
    def buy_plot_tx(self, plot_id: int, value_eth: float):
        tx = self.contract.functions.buyPlot(plot_id).build_transaction({
            "from": self.deployer.address,
            "value": self.w3.to_wei(value_eth, "ether"),
            "nonce": self.w3.eth.get_transaction_count(self.deployer.address),
            "gas": GAS_LIMIT,
            "chainId": CHAIN_ID
        })
        signed = self.deployer.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt.transactionHash.hex()

    # --- Fetch all plots with IPFS metadata ---
    def get_all_plots(self):
        plots = []
        for plot_id in range(1, 10001):
            try:
                p = self.contract.functions.plots(plot_id).call()
                owner, is_owned, metadata_cid = p
                metadata = {}
                if metadata_cid:
                    try:
                        res = requests.get(f"https://gateway.pinata.cloud/ipfs/{metadata_cid}")
                        if res.status_code == 200:
                            metadata = res.json()
                    except:
                        metadata = {}
                plots.append({
                    "id": f"SP-{str(plot_id).zfill(4)}",
                    "location": f"Sarakt Prime - District {plot_id % 10 + 1}",
                    "value": PLOT_PRICE if is_owned else 0,
                    "owner": owner if is_owned else None,
                    "metadata": metadata
                })
            except Exception:
                continue
        return plots

    # --- Mint Digital ID (store metadata on-chain) ---
    def mint_digital_id(self, user_address: str, metadata_cid: str):
        tx = self.contract.functions.setMetadataForUser(user_address, metadata_cid).build_transaction({
            "from": self.deployer.address,
            "gas": GAS_LIMIT,
            "chainId": CHAIN_ID,
            "nonce": self.w3.eth.get_transaction_count(self.deployer.address)
        })
        signed_tx = self.deployer.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt.transactionHash.hex()
