#!/usr/bin/env python3
import os
import json
import random
import httpx

API = os.getenv("VITE_API_URL") or os.getenv("API_BASE") or "http://localhost:5001"
API = API.rstrip("/")

def main():
	print(f"Seeding demo data against {API}")
	with httpx.Client(timeout=20) as c:
		# Spawn NPCs
		try:
			r = c.post(f"{API}/npcs/spawn", json={"count": 10, "cohort": "child"})
			r.raise_for_status()
			print("Spawned NPCs:", r.json().get("created", [])[:2], "...")
		except Exception as e:
			print("NPC spawn failed:", e)

		# Create a few plots
		zones = [("residential", "hut", 8.5), ("residential", "wooden", 12.0), ("industrial", "workshop", 20.0), ("business", "market", 15.0)]
		created = 0
		for zone, subtype, rent in zones:
			try:
				r = c.post(f"{API}/city/plots", json={"zone": zone, "subtype": subtype, "base_rent": rent, "occupied": False})
				if r.status_code < 400:
					created += 1
			except Exception:
				pass
		print(f"Created {created} plots")

		# Create factions
		for name in ["Octavia Guild", "Zythera Research Collective"]:
			try:
				r = c.post(f"{API}/governance/factions", json={"name": name, "description": ""})
				if r.status_code < 400:
					print("Created faction:", name)
			except Exception:
				pass

		# Add black market liquidity
		try:
			r = c.post(f"{API}/governance/black-market/liquidity", json={"asset": "XMR", "amount": 100})
			if r.status_code < 400:
				print("Updated black market liquidity: XMR +100")
		except Exception:
			pass

		# Upsert demo portfolio
		wallet = os.getenv("DEMO_WALLET") or "0x000000000000000000000000000000000000dEaD"
		try:
			r = c.post(f"{API}/portfolio/upsert", json={
				"wallet": wallet,
				"holdings": [{"asset_type": "plot", "identifier": "1", "cost_basis": 1000.0, "yield_annual": 0.05}],
				"recurring_investment_monthly": 50.0,
				"manager_id": None,
				"portfolio_type": "primary",
			})
			if r.status_code < 400:
				print("Upserted demo portfolio for", wallet)
		except Exception:
			pass

	print("Done.")

if __name__ == "__main__":
	main()


