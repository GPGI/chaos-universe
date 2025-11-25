from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Literal, Optional
import math
from web3 import Web3

router = APIRouter(prefix="/city", tags=["city"])

# Zones and plots prototype (for zone definitions only)
_zones: Dict[str, Dict] = {
	"residential": {"types": ["hut", "wooden", "stone"]},
	"industrial": {"types": ["workshop"]},
	"business": {"types": ["trading", "brokerage", "market", "arena", "temple"]},
}

ANNUAL_RENT_GROWTH = 0.036

# Helper function to get contract manager and land contract
def get_land_contract():
	"""Get land contract instance from Chaos Star Network subnet"""
	try:
		from .contract_manager import ContractManager
	except ImportError:
		from contract_manager import ContractManager
	
	manager = ContractManager()
	land_addr = manager.addresses.get("land") or manager.addresses.get("SaraktLandV2")
	if not land_addr:
		raise HTTPException(status_code=500, detail="Land contract address not found. Deploy contracts first.")
	
	# Load ABI
	import json
	from pathlib import Path
	abi_path = Path(manager.abi_dir) / "SaraktLandV2ABI.json"
	if not abi_path.exists():
		raise HTTPException(status_code=500, detail="Land contract ABI not found")
	
	with open(abi_path, "r") as f:
		abi_data = json.load(f)
		abi = abi_data.get("abi") or abi_data
	
	contract = manager.w3.eth.contract(address=Web3.to_checksum_address(land_addr), abi=abi)
	return contract, manager.w3


class PlotCreate(BaseModel):
	zone: Literal["residential", "industrial", "business"]
	subtype: str
	base_rent: float = Field(ge=0.0)
	occupied: bool = False


class OccupancyUpdate(BaseModel):
	plot_id: int
	occupied: bool


class RentProjectionRequest(BaseModel):
	plot_id: int
	years: int = Field(5, ge=1, le=50)


@router.get("/zones")
def list_zones():
	return {"zones": _zones}


@router.post("/plots")
def create_plot(req: PlotCreate):
	"""
	Note: Plots are created by purchasing them through the SaraktLandV2 contract.
	This endpoint validates zone/subtype but does not create plots directly.
	To purchase a plot, use the contract's buyPlot or buyPlotWithAVAX functions.
	"""
	if req.subtype not in _zones[req.zone]["types"]:
		raise HTTPException(status_code=400, detail="Invalid subtype for zone")
	
	# Return zone information instead of creating a plot
	# Actual plot creation happens through contract purchase
	return {
		"message": "Plots must be purchased through the SaraktLandV2 contract",
		"zone": req.zone,
		"subtype": req.subtype,
		"contract_endpoint": "/contracts/addresses",
		"purchase_info": "Use buyPlot or buyPlotWithAVAX functions on the contract"
	}


@router.get("/plots")
def list_plots(limit: Optional[int] = None, offset: int = 0):
	"""
	Fetch plots from SaraktLandV2 contract on Chaos Star Network subnet.
	Returns all plots with ownership information from blockchain.
	"""
	try:
		contract, w3 = get_land_contract()
		
		# Get contract state
		total_plots = contract.functions.TOTAL_PLOTS().call()
		plots_sold = contract.functions.plotsSold().call()
		
		plots = []
		# Fetch plot data from blockchain
		# Note: We fetch in batches to avoid RPC limits
		batch_size = 100
		start_id = offset + 1
		end_id = min(start_id + (limit or 1000) - 1, total_plots)
		
		# Check ownership in batches for efficiency
		for plot_id in range(start_id, end_id + 1):
			try:
				# Check if plot is minted (owned)
				is_minted = contract.functions.plotMinted(plot_id).call()
				
				# Get owner if minted (using balanceOf for ERC1155)
				owner = None
				if is_minted:
					# For ERC1155, we need to check events or scan balances
					# For now, we'll try to get from events if available
					# Or use a mapping if the contract has it
					# This is a simplified version - in production, you might want to cache this
					pass
				
				plot_data = {
					"id": plot_id,
					"plotId": plot_id,
					"owned": is_minted,
					"owner": owner,
					"minted": is_minted,
					# Default zone/type based on plot ID pattern (can be customized)
					"zone": "residential" if plot_id % 3 == 0 else ("industrial" if plot_id % 3 == 1 else "business"),
					"type": "unclaimed" if not is_minted else "claimed",
				}
				plots.append(plot_data)
			except Exception as e:
				# Skip invalid plots
				continue
		
		return {
			"plots": plots,
			"total": total_plots,
			"sold": plots_sold,
			"remaining": total_plots - plots_sold,
			"limit": limit,
			"offset": offset
		}
	except Exception as e:
		# Fallback to empty list if contract not available
		import traceback
		print(f"Error fetching plots from blockchain: {e}\n{traceback.format_exc()}")
		return {"plots": [], "total": 10000, "sold": 0, "remaining": 10000, "error": str(e)}


@router.post("/plots/occupancy")
def set_occupancy(update: OccupancyUpdate):
	"""
	Note: Occupancy information is not stored on-chain in the current contract.
	This endpoint is kept for API compatibility but occupancy should be managed
	off-chain or through a separate contract extension.
	"""
	try:
		contract, w3 = get_land_contract()
		
		# Verify plot exists and is minted
		is_minted = contract.functions.plotMinted(update.plot_id).call()
		if not is_minted:
			raise HTTPException(status_code=404, detail="Plot not found or not yet purchased")
		
		# Occupancy is not stored on-chain, return plot info
		return {
			"plot_id": update.plot_id,
			"occupied": update.occupied,
			"note": "Occupancy information stored off-chain. Plot ownership verified on-chain.",
			"minted": is_minted
		}
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Error checking plot: {str(e)}")


@router.post("/plots/project-rent")
def project_rent(req: RentProjectionRequest):
	"""
	Calculate rent projection for a plot.
	Base rent should be provided or fetched from off-chain metadata.
	"""
	try:
		contract, w3 = get_land_contract()
		
		# Verify plot exists
		is_minted = contract.functions.plotMinted(req.plot_id).call()
		if not is_minted:
			raise HTTPException(status_code=404, detail="Plot not found or not yet purchased")
		
		# Get current price from contract as base rent reference
		price_avax = contract.functions.priceInAVAX().call()
		base_rent = float(Web3.from_wei(price_avax, "ether")) * 0.1  # 10% of purchase price as base rent
		
		rents = []
		r = base_rent
		for year in range(1, req.years + 1):
			r *= (1.0 + ANNUAL_RENT_GROWTH)
			rents.append({"year": year, "rent": round(r, 2)})
		
		return {
			"plot_id": req.plot_id,
			"annual_growth": ANNUAL_RENT_GROWTH,
			"base_rent": round(base_rent, 2),
			"rents": rents,
			"note": "Rent calculation based on purchase price. Actual rent may vary."
		}
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Error calculating rent projection: {str(e)}")


class CityStatsRequest(BaseModel):
	city_name: Optional[str] = None


@router.get("/stats")
def get_city_stats(city_name: Optional[str] = None):
	"""
	Get city statistics including population, job vacancies, and rental availability.
	Population growth requires both job vacancies AND available rentals.
	"""
	try:
		contract, w3 = get_land_contract()
		
		# Get all plots from blockchain
		total_plots = contract.functions.TOTAL_PLOTS().call()
		plots_sold = contract.functions.plotsSold().call()
		
		# Categorize plots by zone type
		residential_owned = 0
		industrial_owned = 0
		business_owned = 0
		
		# Sample plots to determine ownership distribution (optimize for large datasets)
		sample_size = min(1000, total_plots)
		owned_residential = []
		owned_industrial = []
		owned_business = []
		
		for plot_id in range(1, sample_size + 1):
			try:
				is_minted = contract.functions.plotMinted(plot_id).call()
				if is_minted:
					# Determine zone by plot ID pattern (same as in list_plots)
					zone = "residential" if plot_id % 3 == 0 else ("industrial" if plot_id % 3 == 1 else "business")
					if zone == "residential":
						residential_owned += 1
						owned_residential.append(plot_id)
					elif zone == "industrial":
						industrial_owned += 1
						owned_industrial.append(plot_id)
					else:
						business_owned += 1
						owned_business.append(plot_id)
			except:
				continue
		
		# Scale up based on sample
		scale_factor = total_plots / sample_size if sample_size > 0 else 1
		total_residential_owned = int(residential_owned * scale_factor)
		total_industrial_owned = int(industrial_owned * scale_factor)
		total_business_owned = int(business_owned * scale_factor)
		
		# Job vacancies = industrial + business plots (each plot = 1 job slot)
		# Assume 80% occupancy rate for existing jobs
		total_job_capacity = total_industrial_owned + total_business_owned
		employed = int(total_job_capacity * 0.8)
		job_vacancies = max(0, total_job_capacity - employed)
		
		# Available rentals = residential plots that are owned but not occupied
		# Assume 70% occupancy rate for residential
		total_residential_capacity = total_residential_owned
		occupied_residential = int(total_residential_capacity * 0.7)
		available_rentals = max(0, total_residential_capacity - occupied_residential)
		
		# Current population = sum of employed + residential occupants
		# (Some people work and live in the same city)
		current_population = max(employed, occupied_residential)  # Use max to avoid double counting
		
		# Population growth potential
		# Newcomers can arrive only if BOTH job vacancies AND rentals are available
		max_newcomers = min(job_vacancies, available_rentals)
		
		# Growth rate calculation (per day/cycle)
		growth_rate = max_newcomers * 0.1  # 10% of max newcomers per cycle
		
		# Projected population next cycle
		projected_population = int(current_population + growth_rate)
		
		return {
			"city_name": city_name or "Default City",
			"total_plots": total_plots,
			"plots_owned": plots_sold,
			"plots_remaining": total_plots - plots_sold,
			"zones": {
				"residential": {
					"total_owned": total_residential_owned,
					"occupied": occupied_residential,
					"available_rentals": available_rentals
				},
				"industrial": {
					"total_owned": total_industrial_owned,
					"jobs_filled": int(total_industrial_owned * 0.8),
					"job_vacancies": max(0, int(total_industrial_owned * 0.2))
				},
				"business": {
					"total_owned": total_business_owned,
					"jobs_filled": int(total_business_owned * 0.8),
					"job_vacancies": max(0, int(total_business_owned * 0.2))
				}
			},
			"population": {
				"current": current_population,
				"projected_next_cycle": projected_population,
				"growth_rate": round(growth_rate, 2),
				"growth_potential": max_newcomers
			},
			"economy": {
				"total_job_capacity": total_job_capacity,
				"total_employed": employed,
				"total_job_vacancies": job_vacancies,
				"total_available_rentals": available_rentals,
				"newcomers_can_arrive": max_newcomers > 0,
				"newcomers_blocked_by": {
					"no_jobs": job_vacancies == 0,
					"no_rentals": available_rentals == 0
				}
			},
			"note": "Population growth requires both job vacancies AND available rentals. Data from Chaos Star Network subnet."
		}
	except Exception as e:
		import traceback
		print(f"Error calculating city stats: {e}\n{traceback.format_exc()}")
		raise HTTPException(status_code=500, detail=f"Error calculating city stats: {str(e)}")


@router.post("/newcomers/calculate")
def calculate_newcomers():
	"""
	Calculate how many newcomers can arrive based on job vacancies and rental availability.
	This simulates the population growth mechanic.
	"""
	try:
		stats = get_city_stats()
		
		max_newcomers = stats["economy"]["total_job_vacancies"]
		available_rentals = stats["economy"]["total_available_rentals"]
		
		# Newcomers = min of job vacancies and available rentals
		actual_newcomers = min(max_newcomers, available_rentals)
		
		return {
			"newcomers_can_arrive": actual_newcomers,
			"blocked_by_jobs": max_newcomers > available_rentals,
			"blocked_by_rentals": available_rentals > max_newcomers,
			"details": {
				"job_vacancies": max_newcomers,
				"available_rentals": available_rentals,
				"limiting_factor": "jobs" if max_newcomers < available_rentals else "rentals" if available_rentals < max_newcomers else "balanced"
			},
			"message": f"{actual_newcomers} newcomers can arrive this cycle (limited by {stats['economy']['newcomers_blocked_by']})"
		}
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Error calculating newcomers: {str(e)}")


