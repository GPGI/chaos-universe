from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import uuid
from datetime import datetime, timedelta

router = APIRouter(prefix="/nanofiber", tags=["nanofiber"])

# In-memory storage (replace with database in production)
_licenses: Dict[str, Dict] = {}
_circles: Dict[str, Dict] = {}

# Initialize with some default circles
def _init_circles():
    if not _circles:
        for i in range(20):
            circle_id = f"circle-{i + 1}"
            sector = chr(65 + (i % 5))
            zone = (i // 5) + 1
            _circles[circle_id] = {
                "id": circle_id,
                "location": f"Sector {sector}-{zone}",
                "coverage": 70.0 + (i * 1.2),
                "density": 75.0 + (i * 1.0),
                "licensed": False,
                "license_holder": None,
                "harvest_yield": 10.0 + (i * 2.0),
                "research_level": i % 5,
                "last_harvest": None,
            }

_init_circles()


class LicenseRequest(BaseModel):
    wallet: str
    circleId: str
    licenseType: str = Field("harvest", description="research or harvest")


class HarvestRequest(BaseModel):
    wallet: str
    circleId: str


@router.get("/circles")
def list_circles():
    """List all nanofiber web circles"""
    return {"circles": list(_circles.values())}


@router.get("/circles/{circle_id}")
def get_circle(circle_id: str):
    """Get details of a specific circle"""
    if circle_id not in _circles:
        raise HTTPException(status_code=404, detail="Circle not found")
    return {"circle": _circles[circle_id]}


@router.get("/licenses/{wallet}")
def get_user_licenses(wallet: str):
    """Get all licenses for a wallet"""
    user_licenses = [l for l in _licenses.values() if l.get("wallet") == wallet]
    return {"licenses": user_licenses}


@router.post("/licenses/request")
def request_license(req: LicenseRequest):
    """Request a license for a nanofiber circle"""
    if req.circleId not in _circles:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    circle = _circles[req.circleId]
    
    # Check if already licensed
    if circle["licensed"] and circle["license_holder"] != req.wallet:
        raise HTTPException(status_code=400, detail="Circle is already licensed by another user")
    
    # Check if user already has a license for this circle
    existing_license = next(
        (l for l in _licenses.values() 
         if l.get("wallet") == req.wallet and l.get("circle_id") == req.circleId and l.get("status") == "active"),
        None
    )
    if existing_license:
        raise HTTPException(status_code=400, detail="You already have an active license for this circle")
    
    # Create license
    license_id = str(uuid.uuid4())
    now = datetime.utcnow()
    expires_at = now + timedelta(days=30)  # 30 day license
    
    license_data = {
        "id": license_id,
        "wallet": req.wallet,
        "circle_id": req.circleId,
        "location": circle["location"],
        "license_type": req.licenseType,
        "issued_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "status": "active",
        "research_level": circle["research_level"],
        "total_harvested": 0.0,
    }
    
    _licenses[license_id] = license_data
    
    # Update circle
    circle["licensed"] = True
    circle["license_holder"] = req.wallet
    
    return {"license": license_data, "message": "License issued successfully"}


@router.post("/harvest")
def harvest_nanofiber(req: HarvestRequest):
    """Harvest nanofiber from a licensed circle"""
    if req.circleId not in _circles:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    circle = _circles[req.circleId]
    
    # Check if user has active license
    user_license = next(
        (l for l in _licenses.values() 
         if l.get("wallet") == req.wallet 
         and l.get("circle_id") == req.circleId 
         and l.get("status") == "active"),
        None
    )
    
    if not user_license:
        raise HTTPException(status_code=403, detail="You need an active license to harvest this circle")
    
    # Check if license is expired
    expires_at = datetime.fromisoformat(user_license["expires_at"])
    if datetime.utcnow() > expires_at:
        user_license["status"] = "expired"
        raise HTTPException(status_code=403, detail="Your license has expired")
    
    # Calculate yield (can be modified by research level, etc.)
    base_yield = circle["harvest_yield"]
    research_bonus = 1.0 + (user_license["research_level"] * 0.1)  # 10% per research level
    actual_yield = base_yield * research_bonus
    
    # Update license
    user_license["total_harvested"] += actual_yield
    user_license["research_level"] = min(5, user_license["research_level"] + 0.1)  # Increase research level
    
    # Update circle
    circle["last_harvest"] = datetime.utcnow().isoformat()
    
    return {
        "yield": actual_yield,
        "total_harvested": user_license["total_harvested"],
        "research_level": user_license["research_level"],
        "message": "Harvest successful"
    }


@router.get("/stats")
def get_nanofiber_stats():
    """Get overall nanofiber statistics"""
    total_circles = len(_circles)
    licensed_circles = sum(1 for c in _circles.values() if c["licensed"])
    active_licenses = sum(1 for l in _licenses.values() if l.get("status") == "active")
    total_harvested = sum(l.get("total_harvested", 0) for l in _licenses.values())
    
    return {
        "total_circles": total_circles,
        "licensed_circles": licensed_circles,
        "available_circles": total_circles - licensed_circles,
        "active_licenses": active_licenses,
        "total_harvested": total_harvested,
    }

