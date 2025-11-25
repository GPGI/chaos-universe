from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import math
import json

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

# Prototype portfolios by wallet and type (wallet -> type -> portfolio)
_portfolios: Dict[str, Dict[str, Dict]] = {}

# Try to import Supabase service
try:
    from services.supabase_service import supabase
    HAS_SUPABASE = supabase is not None
except:
    HAS_SUPABASE = False


class Holding(BaseModel):
	asset_type: str  # "plot", "building", "token"
	identifier: str
	cost_basis: float = 0.0
	yield_annual: float = 0.0
	metadata: Optional[Dict] = None  # Store plot info, deed, purchase details, etc.


class PortfolioUpsert(BaseModel):
	wallet: str
	holdings: List[Holding] = []
	recurring_investment_monthly: float = 0.0
	manager_id: Optional[str] = None
	portfolio_type: Optional[str] = None  # "primary" | "secondary"


class ProjectionRequest(BaseModel):
	wallet: str
	years: int = Field(5, ge=1, le=50)
	expected_annual_return: float = Field(0.07, ge=-1.0, le=5.0)


@router.post("/upsert")
def upsert_portfolio(p: PortfolioUpsert):
	portfolio_type = p.portfolio_type or "primary"
	if p.wallet not in _portfolios:
		_portfolios[p.wallet] = {}
	_portfolios[p.wallet][portfolio_type] = p.model_dump()
	
	# Save to Supabase for persistence
	if HAS_SUPABASE:
		try:
			portfolio_data = p.model_dump()
			# Convert holdings to JSON string for storage
			portfolio_data["holdings"] = json.dumps(portfolio_data.get("holdings", []))
			portfolio_data["metadata"] = json.dumps(portfolio_data.get("metadata", {}))
			
			supabase.table("portfolios").upsert({
				"wallet": p.wallet,
				"portfolio_type": portfolio_type,
				"holdings": portfolio_data["holdings"],
				"recurring_investment_monthly": portfolio_data.get("recurring_investment_monthly", 0.0),
				"manager_id": portfolio_data.get("manager_id"),
				"metadata": portfolio_data["metadata"],
			}, on_conflict="wallet,portfolio_type").execute()
		except Exception as e:
			# Don't fail if Supabase save fails - data is still in memory
			print(f"Warning: Failed to save portfolio to Supabase: {e}")
	
	return {"portfolio": _portfolios[p.wallet][portfolio_type]}


@router.get("/{wallet}")
def get_portfolio(wallet: str, portfolio_type: Optional[str] = None):
	"""Get portfolio(s) for a wallet. If portfolio_type is specified, returns that portfolio. Otherwise returns all portfolios."""
	# Try to load from Supabase first if available
	if HAS_SUPABASE:
		try:
			if portfolio_type:
				# Load specific portfolio type
				result = supabase.table("portfolios").select("*").eq("wallet", wallet).eq("portfolio_type", portfolio_type).execute()
				if result.data and len(result.data) > 0:
					portfolio_data = result.data[0]
					# Parse JSON fields
					portfolio_data["holdings"] = json.loads(portfolio_data.get("holdings", "[]"))
					portfolio_data["metadata"] = json.loads(portfolio_data.get("metadata", "{}"))
					# Update in-memory cache
					if wallet not in _portfolios:
						_portfolios[wallet] = {}
					_portfolios[wallet][portfolio_type] = portfolio_data
			else:
				# Load all portfolios for this wallet
				result = supabase.table("portfolios").select("*").eq("wallet", wallet).execute()
				if result.data:
					wallet_portfolios = {}
					for row in result.data:
						pt = row.get("portfolio_type", "primary")
						row["holdings"] = json.loads(row.get("holdings", "[]"))
						row["metadata"] = json.loads(row.get("metadata", "{}"))
						wallet_portfolios[pt] = row
					_portfolios[wallet] = wallet_portfolios
		except Exception as e:
			# Fall back to in-memory if Supabase fails
			print(f"Warning: Failed to load portfolio from Supabase: {e}")
	
	if portfolio_type:
		# Return specific portfolio type
		wallet_portfolios = _portfolios.get(wallet, {})
		portfolio = wallet_portfolios.get(portfolio_type, {"wallet": wallet, "portfolio_type": portfolio_type, "holdings": [], "recurring_investment_monthly": 0.0})
		return {"portfolio": portfolio}
	else:
		# Return all portfolios for this wallet
		wallet_portfolios = _portfolios.get(wallet, {})
		# Ensure both primary and speculative exist
		if "primary" not in wallet_portfolios:
			wallet_portfolios["primary"] = {"wallet": wallet, "portfolio_type": "primary", "holdings": [], "recurring_investment_monthly": 0.0}
		if "secondary" not in wallet_portfolios:
			wallet_portfolios["secondary"] = {"wallet": wallet, "portfolio_type": "secondary", "holdings": [], "recurring_investment_monthly": 0.0}
		return {"portfolios": wallet_portfolios, "primary": wallet_portfolios.get("primary", {}), "speculative": wallet_portfolios.get("secondary", {})}


@router.get("/{wallet}/loans")
def get_loan_eligibility(wallet: str):
	"""Check loan eligibility based on all portfolios for a wallet"""
	wallet_portfolios = _portfolios.get(wallet, {})
	# Count plots from all portfolio types
	total_plots = 0
	for portfolio_type, portfolio in wallet_portfolios.items():
		total_plots += sum(1 for h in (portfolio.get("holdings", []) if portfolio else []) if h.get("asset_type") == "plot")
	eligible = total_plots >= 5
	return {"eligible": eligible, "interest_rate": 0.025 if eligible else None, "criteria": "5 owned plots"}


@router.post("/project")
def project_portfolio(req: ProjectionRequest):
	"""Project portfolio value across all portfolio types"""
	wallet_portfolios = _portfolios.get(req.wallet, {})
	# Aggregate across all portfolio types
	monthly = 0.0
	holdings_value = 0.0
	for portfolio_type, portfolio in wallet_portfolios.items():
		monthly += portfolio.get("recurring_investment_monthly", 0.0)
		holdings_value += sum(h.get("cost_basis", 0.0) for h in portfolio.get("holdings", []))

	# Compound monthly contributions at expected annual return
	r = req.expected_annual_return
	rm = (1 + r) ** (1 / 12) - 1
	months = req.years * 12
	fv_contrib = monthly * (((1 + rm) ** months - 1) / rm) if rm != 0 else monthly * months
	fv_holdings = holdings_value * ((1 + r) ** req.years)

	return {
		"wallet": req.wallet,
		"years": req.years,
		"expected_annual_return": r,
		"future_value_contributions": round(fv_contrib, 2),
		"future_value_holdings": round(fv_holdings, 2),
		"future_value_total": round(fv_contrib + fv_holdings, 2),
	}


