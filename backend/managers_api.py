from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

try:
	from services.supabase_service import supabase
except Exception:
	supabase = None

router = APIRouter(prefix="/managers", tags=["managers"])

def require_supabase():
	if not supabase:
		raise HTTPException(status_code=503, detail="Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")

@router.get("")
def list_managers(status: str = "approved"):
	require_supabase()
	try:
		q = supabase.table("portfolio_managers").select("*")
		if status:
			q = q.eq("approval_status", status)
		res = q.order("roi_annualized", desc=True).execute()
		return {"managers": res.data or []}
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))

@router.post("/approve")
def approve_manager(wallet_address: str, verified: bool = True):
	require_supabase()
	try:
		now = datetime.now(timezone.utc).isoformat()
		res = supabase.table("portfolio_managers").update({
			"approval_status": "approved",
			"verified": verified,
			"approved_at": now,
		}).eq("wallet_address", wallet_address).execute()
		return {"updated": len(res.data or []), "managers": res.data or []}
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))

@router.post("/seed")
def seed_managers():
	require_supabase()
	try:
		samples = [
			{
				"wallet_address": "0x1111111111111111111111111111111111111111",
				"display_name": "Octavia Capital",
				"bio": "Core city development strategies.",
				"approval_status": "approved",
				"verified": True,
				"roi_annualized": 0.28,
				"sharpe_ratio": 1.4,
				"management_fee_percent": 1.0,
			},
			{
				"wallet_address": "0x2222222222222222222222222222222222222222",
				"display_name": "Zythera Labs",
				"bio": "Speculative biotech and nanofiber ventures.",
				"approval_status": "approved",
				"verified": True,
				"roi_annualized": 0.35,
				"sharpe_ratio": 1.2,
				"management_fee_percent": 1.5,
			},
		]
		supabase.table("portfolio_managers").upsert(samples).execute()
		return {"seeded": len(samples)}
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))


