from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Literal, Optional

# Simple in-memory state for prototyping; replace with Supabase/DB later
_treasury_state = {
	"planet": {
		"reserves": {
			"BTC": 0.30,  # 30% allocation
			"STABLE": 0.20,  # stablecoins aggregate
			"AVAX": 0.125,
			"ETH": 0.125,
			"MATIC": 0.125,
			"XRP": 0.125,
		},
		"coverage_ratio": 1.0,  # placeholder
		"inflation_mode": "elastic",  # elastic vs fixed
	},
	"system": {
		"coverage_ratio": 1.0,
	},
	"currencies": {
		"xBGL": {"role": "official", "notes": "land/assets, official tx"},
		"CHAOS": {"role": "people", "notes": "salaries, short-term economy"},
		"SC": {"role": "shadow", "peg": "XMR", "notes": "anonymous swaps"},
	},
}

router = APIRouter(prefix="/economy", tags=["economy"])


class ReserveAllocation(BaseModel):
	BTC: float = Field(0.30, ge=0.0, le=1.0)
	STABLE: float = Field(0.20, ge=0.0, le=1.0)
	AVAX: float = Field(0.125, ge=0.0, le=1.0)
	ETH: float = Field(0.125, ge=0.0, le=1.0)
	MATIC: float = Field(0.125, ge=0.0, le=1.0)
	XRP: float = Field(0.125, ge=0.0, le=1.0)

	def total(self) -> float:
		return self.BTC + self.STABLE + self.AVAX + self.ETH + self.MATIC + self.XRP


class TreasuryConfig(BaseModel):
	reserves: ReserveAllocation
	coverage_ratio: float = Field(1.0, gt=0)
	inflation_mode: Literal["elastic", "fixed"] = "elastic"


class InflationAdjustmentRequest(BaseModel):
	target_growth_rate_annual: float = Field(..., description="e.g. 0.02 = 2%")
	current_utilization_ratio: float = Field(..., gt=0.0)


@router.get("/currencies")
def list_currencies():
	return _treasury_state["currencies"]


@router.get("/treasury")
def get_treasury():
	return _treasury_state


@router.post("/treasury/config")
def set_treasury_config(cfg: TreasuryConfig):
	if abs(cfg.reserves.total() - 1.0) > 1e-6:
		raise HTTPException(status_code=400, detail="Reserve allocation must sum to 1.0")
	_treasury_state["planet"]["reserves"] = cfg.reserves.model_dump()
	_treasury_state["planet"]["coverage_ratio"] = cfg.coverage_ratio
	_treasury_state["planet"]["inflation_mode"] = cfg.inflation_mode
	return {"success": True, "planet": _treasury_state["planet"]}


@router.post("/treasury/adjust-inflation")
def adjust_inflation(req: InflationAdjustmentRequest):
	"""
	Elastic inflation/deflation toy model:
	- If utilization > 1.0 -> positive inflation bias
	- If utilization < 1.0 -> deflationary bias
	"""
	mode = _treasury_state["planet"]["inflation_mode"]
	if mode != "elastic":
		raise HTTPException(status_code=400, detail="Inflation mode is not elastic")

	util = req.current_utilization_ratio
	g = req.target_growth_rate_annual
	# Simple controller
	bias = min(max((util - 1.0) * 0.5, -0.05), 0.05)  # clamp +/-5%
	new_growth = g + bias
	return {
		"requested_growth": g,
		"utilization": util,
		"bias": bias,
		"recommended_growth": new_growth,
	}


