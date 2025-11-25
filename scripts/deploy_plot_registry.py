#!/usr/bin/env python3
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from scripts.avalanche_cli_utils import discover_from_cli

ROOT = Path(__file__).parent.parent
OUT_JSON = ROOT / "out" / "PlotRegistry1155.sol" / "PlotRegistry1155.json"
DEPLOY_DIR = ROOT / "deployments"

def load_artifact():
    if not OUT_JSON.exists():
        raise RuntimeError(f"Artifact not found: {OUT_JSON}. Run `forge build` first.")
    data = json.loads(OUT_JSON.read_text())
    abi = data.get("abi") or data.get("output", {}).get("abi")
    bytecode = (data.get("bytecode") or data.get("deployedBytecode") or data.get("evm", {}).get("bytecode", {}).get("object"))
    if not abi or not bytecode:
        raise RuntimeError("ABI or bytecode missing in artifact")
    if bytecode.startswith("0x") is False:
        bytecode = "0x" + bytecode
    return abi, bytecode

def get_w3_and_admin():
    load_dotenv()
    subnet_name = os.getenv("AVALANCHE_SUBNET_NAME", "ChaosStarNetwork")
    sim_mode = os.getenv("SIMULATION_MODE", "0") in ("1","true","True")
    rpc = os.getenv("TESTNET_RPC") if sim_mode else os.getenv("VITE_AVALANCHE_RPC")
    pk = os.getenv("PRIVATE_KEY")
    if not rpc or not pk:
        disc_rpc, disc_pk = discover_from_cli(subnet_name)
        if not rpc and disc_rpc:
            rpc = disc_rpc
        if not pk and disc_pk:
            pk = disc_pk
    if not rpc:
        raise RuntimeError("RPC not set and could not discover from Avalanche CLI")
    if not pk:
        raise RuntimeError("PRIVATE_KEY not set and could not discover from Avalanche CLI")
    w3 = Web3(Web3.HTTPProvider(rpc))
    acct = w3.eth.account.from_key(pk)
    return w3, acct, sim_mode

def write_addresses(address: str, sim_mode: bool):
    DEPLOY_DIR.mkdir(exist_ok=True)
    target = DEPLOY_DIR / ("addresses.testnet.json" if sim_mode else "addresses.json")
    data = {}
    if target.exists():
        try:
            data = json.loads(target.read_text())
        except Exception:
            data = {}
    data["plotRegistry"] = address
    target.write_text(json.dumps(data, indent=2))
    print(f"Wrote {target}")

def main():
    abi, bytecode = load_artifact()
    w3, acct, sim_mode = get_w3_and_admin()
    print(f"Deploying PlotRegistry1155 from {acct.address} on chainId={w3.eth.chain_id} ...")
    PlotRegistry = w3.eth.contract(abi=abi, bytecode=bytecode)
    tx = PlotRegistry.constructor().build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "gas": 4_500_000,
        "maxFeePerGas": w3.to_wei("3","gwei"),
        "maxPriorityFeePerGas": w3.to_wei("1","gwei"),
        "chainId": w3.eth.chain_id
    })
    signed = w3.eth.account.sign_transaction(tx, private_key=acct.key)
    txh = w3.eth.send_raw_transaction(signed.rawTransaction)
    receipt = w3.eth.wait_for_transaction_receipt(txh)
    if receipt.status != 1:
        raise RuntimeError(f"Deployment failed, tx={txh.hex()}")
    addr = receipt.contractAddress
    print(f"Deployed PlotRegistry1155 at {addr} (tx={txh.hex()})")
    write_addresses(addr, sim_mode)

if __name__ == "__main__":
    main()


