#!/usr/bin/env python3
import argparse
import csv
import os
import sqlite3
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from web3 import Web3
import json
import httpx
from .avalanche_cli_utils import discover_from_cli

ROOT = Path(__file__).parent.parent
ABI_PATHS = [
    ROOT / "out" / "PlotRegistry1155.sol" / "PlotRegistry1155.json",
    ROOT / "backend" / "abi" / "PlotRegistry1155.json",
]
DB_PATH = ROOT / "scripts" / "admin_logs.sqlite"

def get_api_base() -> str:
	load_dotenv()
	base = os.getenv("VITE_API_URL") or os.getenv("API_BASE")
	if base:
		return base.rstrip("/")
	return "http://localhost:5001"

def load_abi():
    for p in ABI_PATHS:
        if p.exists():
            with open(p, "r") as f:
                data = json.load(f)
                return data.get("abi", data.get("output", {}).get("abi"))
    raise RuntimeError("ABI not found. Build contracts or provide backend/abi/PlotRegistry1155.json")

def get_web3():
    load_dotenv()
    subnet_name = os.getenv("AVALANCHE_SUBNET_NAME", "ChaosStarNetwork")
    rpc = os.getenv("TESTNET_RPC") or os.getenv("VITE_TESTNET_RPC") or os.getenv("VITE_AVALANCHE_RPC")
    if not rpc:
        # Try auto-discovery from Avalanche CLI
        rpc, _ = discover_from_cli(subnet_name)
    if not rpc:
        raise RuntimeError("RPC not set. Provide VITE_TESTNET_RPC or VITE_AVALANCHE_RPC in .env")
    return Web3(Web3.HTTPProvider(rpc))

def get_admin_account(w3: Web3):
    # Try to get from config (which auto-loads from subnet)
    pk = os.getenv("PRIVATE_KEY") or os.getenv("ADMIN_PRIVATE_KEY")
    
    if not pk:
        # Try loading from backend config which auto-discovers from subnet
        try:
            import sys
            from pathlib import Path
            sys.path.insert(0, str(Path(__file__).parent.parent))
            from backend.config import PRIVATE_KEY as CONFIG_PK, ADMIN_PRIVATE_KEY
            pk = ADMIN_PRIVATE_KEY or CONFIG_PK
        except Exception:
            pass
    
    if not pk:
        # Try Avalanche CLI key directly
        try:
            subnet_name = os.getenv("AVALANCHE_SUBNET_NAME", "ChaosStarNetwork")
            from backend.subnet_interaction import create_subnet_interactor
            interactor = create_subnet_interactor(subnet_name)
            pk = interactor.get_private_key()
        except Exception:
            # Fallback to old method
            try:
                subnet_name = os.getenv("AVALANCHE_SUBNET_NAME", "ChaosStarNetwork")
                _, pk = discover_from_cli(subnet_name)
            except Exception:
                pass
    
    if not pk:
        raise RuntimeError(
            "PRIVATE_KEY not found. "
            "The system will automatically discover admin keys from Avalanche CLI subnet configuration. "
            "Please ensure:\n"
            "  1. Avalanche CLI is configured with a subnet, or\n"
            "  2. Set PRIVATE_KEY in .env file"
        )
    
    acct = w3.eth.account.from_key(pk)
    return acct

def get_contract(w3: Web3, address: str):
    abi = load_abi()
    return w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi)

def init_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute(
        """CREATE TABLE IF NOT EXISTS actions(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT,
            action TEXT,
            plot_id INTEGER,
            wallet TEXT,
            tx_hash TEXT,
            note TEXT
        )"""
    )
    con.commit()
    return con

def log(con, action, plot_id, wallet, tx_hash, note=""):
    cur = con.cursor()
    cur.execute(
        "INSERT INTO actions(ts, action, plot_id, wallet, tx_hash, note) VALUES(?,?,?,?,?,?)",
        (datetime.utcnow().isoformat(), action, plot_id, wallet, tx_hash, note),
    )
    con.commit()

def activate(args):
    w3 = get_web3()
    acct = get_admin_account(w3)
    con = init_db()
    addr = os.getenv("PLOT_REGISTRY_ADDRESS")
    if not addr:
        raise RuntimeError("PLOT_REGISTRY_ADDRESS not set in .env")
    c = get_contract(w3, addr)
    tx = c.functions.activate(args.plot, args.wallet, args.uri).build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "gas": 400000,
        "maxFeePerGas": w3.to_wei("3", "gwei"),
        "maxPriorityFeePerGas": w3.to_wei("1", "gwei"),
        "chainId": w3.eth.chain_id,
    })
    signed = w3.eth.account.sign_transaction(tx, private_key=acct.key)
    txh = w3.eth.send_raw_transaction(signed.rawTransaction)
    rec = w3.eth.wait_for_transaction_receipt(txh)
    log(con, "activate", args.plot, args.wallet, txh.hex(), args.uri)
    print(f"Activated plot {args.plot} -> {args.wallet}, tx={txh.hex()}, status={rec.status}")

def activate_batch(args):
    w3 = get_web3()
    acct = get_admin_account(w3)
    con = init_db()
    addr = os.getenv("PLOT_REGISTRY_ADDRESS")
    if not addr:
        raise RuntimeError("PLOT_REGISTRY_ADDRESS not set in .env")
    c = get_contract(w3, addr)
    with open(args.csv, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            plot = int(row["plot"])
            wallet = row["wallet"]
            uri = row.get("uri") or ""
            tx = c.functions.activate(plot, wallet, uri).build_transaction({
                "from": acct.address,
                "nonce": w3.eth.get_transaction_count(acct.address),
                "gas": 400000,
                "maxFeePerGas": w3.to_wei("3", "gwei"),
                "maxPriorityFeePerGas": w3.to_wei("1", "gwei"),
                "chainId": w3.eth.chain_id,
            })
            signed = w3.eth.account.sign_transaction(tx, private_key=acct.key)
            txh = w3.eth.send_raw_transaction(signed.rawTransaction)
            rec = w3.eth.wait_for_transaction_receipt(txh)
            log(con, "activate-batch", plot, wallet, txh.hex(), uri)
            print(f"Activated plot {plot} -> {wallet}, tx={txh.hex()}, status={rec.status}")

def request_transfer(args):
    w3 = get_web3()
    owner_pk = os.getenv("OWNER_PRIVATE_KEY")
    if not owner_pk:
        raise RuntimeError("OWNER_PRIVATE_KEY not set for request-transfer")
    owner = w3.eth.account.from_key(owner_pk)
    addr = os.getenv("PLOT_REGISTRY_ADDRESS")
    c = get_contract(w3, addr)
    tx = c.functions.requestTransfer(args.plot, args.buyer).build_transaction({
        "from": owner.address,
        "nonce": w3.eth.get_transaction_count(owner.address),
        "gas": 250000,
        "maxFeePerGas": w3.to_wei("3", "gwei"),
        "maxPriorityFeePerGas": w3.to_wei("1", "gwei"),
        "chainId": w3.eth.chain_id,
    })
    signed = w3.eth.account.sign_transaction(tx, private_key=owner.key)
    txh = w3.eth.send_raw_transaction(signed.rawTransaction)
    rec = w3.eth.wait_for_transaction_receipt(txh)
    print(f"Requested transfer plot {args.plot} -> {args.buyer}, tx={txh.hex()}, status={rec.status}")

def approve_transfer(args):
    w3 = get_web3()
    acct = get_admin_account(w3)
    con = init_db()
    addr = os.getenv("PLOT_REGISTRY_ADDRESS")
    c = get_contract(w3, addr)
    tx = c.functions.adminApproveTransfer(args.plot).build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "gas": 300000,
        "maxFeePerGas": w3.to_wei("3", "gwei"),
        "maxPriorityFeePerGas": w3.to_wei("1", "gwei"),
        "chainId": w3.eth.chain_id,
    })
    signed = w3.eth.account.sign_transaction(tx, private_key=acct.key)
    txh = w3.eth.send_raw_transaction(signed.rawTransaction)
    rec = w3.eth.wait_for_transaction_receipt(txh)
    log(con, "approve-transfer", args.plot, "", txh.hex(), "")
    print(f"Approved transfer plot {args.plot}, tx={txh.hex()}, status={rec.status}")

#
# Economy (treasury) via backend API
#
def treasury_show(args):
	base = get_api_base()
	with httpx.Client(timeout=20) as c:
		res = c.get(f"{base}/economy/treasury")
		res.raise_for_status()
		print(json.dumps(res.json(), indent=2))

def treasury_config(args):
	base = get_api_base()
	payload = {
		"reserves": {
			"BTC": args.btc,
			"STABLE": args.stable,
			"AVAX": args.avax,
			"ETH": args.eth,
			"MATIC": args.matic,
			"XRP": args.xrp,
		},
		"coverage_ratio": args.coverage,
		"inflation_mode": args.mode,
	}
	with httpx.Client(timeout=20) as c:
		res = c.post(f"{base}/economy/treasury/config", json=payload)
		if res.status_code >= 400:
			raise RuntimeError(res.text)
		print(json.dumps(res.json(), indent=2))

def treasury_adjust_inflation(args):
	base = get_api_base()
	payload = {
		"target_growth_rate_annual": args.growth,
		"current_utilization_ratio": args.utilization,
	}
	with httpx.Client(timeout=20) as c:
		res = c.post(f"{base}/economy/treasury/adjust-inflation", json=payload)
		if res.status_code >= 400:
			raise RuntimeError(res.text)
		print(json.dumps(res.json(), indent=2))

#
# NPCs via backend API
#
def npcs_list(args):
	base = get_api_base()
	with httpx.Client(timeout=20) as c:
		res = c.get(f"{base}/npcs/")
		res.raise_for_status()
		print(json.dumps(res.json(), indent=2))

def npcs_spawn(args):
	base = get_api_base()
	payload = {"count": args.count, "cohort": args.cohort}
	with httpx.Client(timeout=20) as c:
		res = c.post(f"{base}/npcs/spawn", json=payload)
		if res.status_code >= 400:
			raise RuntimeError(res.text)
		print(json.dumps(res.json(), indent=2))

#
# City/Plots via backend API
#
def city_zones(args):
	base = get_api_base()
	with httpx.Client(timeout=20) as c:
		res = c.get(f"{base}/city/zones")
		res.raise_for_status()
		print(json.dumps(res.json(), indent=2))

def city_plots(args):
	base = get_api_base()
	with httpx.Client(timeout=20) as c:
		res = c.get(f"{base}/city/plots")
		res.raise_for_status()
		print(json.dumps(res.json(), indent=2))

def city_create_plot(args):
	base = get_api_base()
	payload = {"zone": args.zone, "subtype": args.subtype, "base_rent": args.base_rent, "occupied": args.occupied}
	with httpx.Client(timeout=20) as c:
		res = c.post(f"{base}/city/plots", json=payload)
		if res.status_code >= 400:
			raise RuntimeError(res.text)
		print(json.dumps(res.json(), indent=2))

#
# Governance via backend API
#
def gov_factions(args):
	base = get_api_base()
	with httpx.Client(timeout=20) as c:
		res = c.get(f"{base}/governance/factions")
		res.raise_for_status()
		print(json.dumps(res.json(), indent=2))

def gov_create_faction(args):
	base = get_api_base()
	payload = {"name": args.name, "description": args.description}
	with httpx.Client(timeout=20) as c:
		res = c.post(f"{base}/governance/factions", json=payload)
		if res.status_code >= 400:
			raise RuntimeError(res.text)
		print(json.dumps(res.json(), indent=2))

def gov_black_market(args):
	base = get_api_base()
	with httpx.Client(timeout=20) as c:
		res = c.get(f"{base}/governance/black-market")
		res.raise_for_status()
		print(json.dumps(res.json(), indent=2))

def gov_liquidity(args):
	base = get_api_base()
	payload = {"asset": args.asset, "amount": args.amount}
	with httpx.Client(timeout=20) as c:
	res = c.post(f"{base}/governance/black-market/liquidity", json=payload)
		if res.status_code >= 400:
			raise RuntimeError(res.text)
		print(json.dumps(res.json(), indent=2))

#
# Portfolio via backend API
#
def portfolio_upsert(args):
	base = get_api_base()
	holdings = []
	if args.holding:
		for h in args.holding:
			# format: type,identifier,cost,yield
			parts = h.split(",")
			if len(parts) < 4:
				raise RuntimeError("holding must be 'type,identifier,cost,yield'")
			holdings.append({
				"asset_type": parts[0],
				"identifier": parts[1],
				"cost_basis": float(parts[2]),
				"yield_annual": float(parts[3]),
			})
	payload = {"wallet": args.wallet, "holdings": holdings, "recurring_investment_monthly": args.monthly}
	with httpx.Client(timeout=30) as c:
		res = c.post(f"{base}/portfolio/upsert", json=payload)
		if res.status_code >= 400:
			raise RuntimeError(res.text)
		print(json.dumps(res.json(), indent=2))

def portfolio_show(args):
	base = get_api_base()
	with httpx.Client(timeout=20) as c:
		res = c.get(f"{base}/portfolio/{args.wallet}")
		res.raise_for_status()
		print(json.dumps(res.json(), indent=2))

def portfolio_loans(args):
	base = get_api_base()
	with httpx.Client(timeout=20) as c:
		res = c.get(f"{base}/portfolio/{args.wallet}/loans")
		res.raise_for_status()
		print(json.dumps(res.json(), indent=2))

def portfolio_project(args):
	base = get_api_base()
	payload = {"wallet": args.wallet, "years": args.years, "expected_annual_return": args.return_rate}
	with httpx.Client(timeout=20) as c:
		res = c.post(f"{base}/portfolio/project", json=payload)
		if res.status_code >= 400:
			raise RuntimeError(res.text)
		print(json.dumps(res.json(), indent=2))

def main():
    parser = argparse.ArgumentParser(description="Sarakt Admin CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p1 = sub.add_parser("activate")
    p1.add_argument("--plot", type=int, required=True)
    p1.add_argument("--wallet", type=str, required=True)
    p1.add_argument("--uri", type=str, default="")
    p1.set_defaults(fn=activate)

    p2 = sub.add_parser("activate-batch")
    p2.add_argument("--csv", type=str, required=True, help="CSV with headers: plot,wallet,uri")
    p2.set_defaults(fn=activate_batch)

    p3 = sub.add_parser("request-transfer")
    p3.add_argument("--plot", type=int, required=True)
    p3.add_argument("--buyer", type=str, required=True)
    p3.set_defaults(fn=request_transfer)

    p4 = sub.add_parser("approve-transfer")
    p4.add_argument("--plot", type=int, required=True)
    p4.set_defaults(fn=approve_transfer)

    # Managers
    pm1 = sub.add_parser("managers-list")
    pm1.add_argument("--status", type=str, default="approved")
    def managers_list(args):
        base = get_api_base()
        with httpx.Client(timeout=20) as c:
            res = c.get(f"{base}/managers", params={"status": args.status})
            res.raise_for_status()
            print(json.dumps(res.json(), indent=2))
    pm1.set_defaults(fn=managers_list)

    pm2 = sub.add_parser("managers-approve")
    pm2.add_argument("--wallet", type=str, required=True)
    pm2.add_argument("--verified", action="store_true")
    def managers_approve(args):
        base = get_api_base()
        with httpx.Client(timeout=20) as c:
            res = c.post(f"{base}/managers/approve", params={"wallet_address": args.wallet, "verified": args.verified})
            if res.status_code >= 400:
                raise RuntimeError(res.text)
            print(json.dumps(res.json(), indent=2))
    pm2.set_defaults(fn=managers_approve)

    pm3 = sub.add_parser("managers-seed")
    def managers_seed(args):
        base = get_api_base()
        with httpx.Client(timeout=20) as c:
            res = c.post(f"{base}/managers/seed")
            if res.status_code >= 400:
                raise RuntimeError(res.text)
            print(json.dumps(res.json(), indent=2))
    pm3.set_defaults(fn=managers_seed)

	# Economy / Treasury
	pe = sub.add_parser("treasury-show")
	pe.set_defaults(fn=treasury_show)

	pec = sub.add_parser("treasury-config")
	pec.add_argument("--btc", type=float, default=0.30)
	pec.add_argument("--stable", type=float, default=0.20)
	pec.add_argument("--avax", type=float, default=0.125)
	pec.add_argument("--eth", type=float, default=0.125)
	pec.add_argument("--matic", type=float, default=0.125)
	pec.add_argument("--xrp", type=float, default=0.125)
	pec.add_argument("--coverage", type=float, default=1.0)
	pec.add_argument("--mode", type=str, choices=["elastic", "fixed"], default="elastic")
	pec.set_defaults(fn=treasury_config)

	pea = sub.add_parser("treasury-adjust")
	pea.add_argument("--growth", type=float, required=True, help="target annual growth, e.g., 0.02")
	pea.add_argument("--utilization", type=float, required=True, help="utilization ratio, e.g., 0.9 .. 1.1")
	pea.set_defaults(fn=treasury_adjust_inflation)

	# NPCs
	pn = sub.add_parser("npcs-list")
	pn.set_defaults(fn=npcs_list)
	pns = sub.add_parser("npcs-spawn")
	pns.add_argument("--count", type=int, default=5)
	pns.add_argument("--cohort", type=str, default="child")
	pns.set_defaults(fn=npcs_spawn)

	# City
	pc1 = sub.add_parser("city-zones")
	pc1.set_defaults(fn=city_zones)
	pc2 = sub.add_parser("city-plots")
	pc2.set_defaults(fn=city_plots)
	pc3 = sub.add_parser("city-create-plot")
	pc3.add_argument("--zone", type=str, required=True, choices=["residential", "industrial", "business"])
	pc3.add_argument("--subtype", type=str, required=True)
	pc3.add_argument("--base-rent", type=float, required=True, dest="base_rent")
	pc3.add_argument("--occupied", action="store_true")
	pc3.set_defaults(fn=city_create_plot)

	# Governance
	pg1 = sub.add_parser("gov-factions")
	pg1.set_defaults(fn=gov_factions)
	pg2 = sub.add_parser("gov-create-faction")
	pg2.add_argument("--name", type=str, required=True)
	pg2.add_argument("--description", type=str, default="")
	pg2.set_defaults(fn=gov_create_faction)
	pg3 = sub.add_parser("gov-black-market")
	pg3.set_defaults(fn=gov_black_market)
	pg4 = sub.add_parser("gov-liquidity")
	pg4.add_argument("--asset", type=str, required=True)
	pg4.add_argument("--amount", type=float, required=True)
	pg4.set_defaults(fn=gov_liquidity)

	# Portfolio
	pp1 = sub.add_parser("portfolio-upsert")
	pp1.add_argument("--wallet", type=str, required=True)
	pp1.add_argument("--holding", action="append", help="type,identifier,cost,yield (repeatable)")
	pp1.add_argument("--monthly", type=float, default=0.0)
	pp1.set_defaults(fn=portfolio_upsert)

	pp2 = sub.add_parser("portfolio-show")
	pp2.add_argument("--wallet", type=str, required=True)
	pp2.set_defaults(fn=portfolio_show)

	pp3 = sub.add_parser("portfolio-loans")
	pp3.add_argument("--wallet", type=str, required=True)
	pp3.set_defaults(fn=portfolio_loans)

	pp4 = sub.add_parser("portfolio-project")
	pp4.add_argument("--wallet", type=str, required=True)
	pp4.add_argument("--years", type=int, default=5)
	pp4.add_argument("--return-rate", type=float, default=0.07, dest="return_rate")
	pp4.set_defaults(fn=portfolio_project)

    args = parser.parse_args()
    args.fn(args)

if __name__ == "__main__":
    main()


