import os
from typing import Optional
from fastapi import HTTPException

# Optional Supabase integration
supabase = None
try:
    from supabase import create_client
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if url and key:
        supabase = create_client(url, key)
except ImportError:
    # Supabase not installed
    pass
except Exception as e:
    print(f"Warning: Could not initialize Supabase: {e}")

def upsert_plot(wallet, token_id, metadata):
    """Upsert plot data to Supabase"""
    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Supabase service not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in environment."
        )
    
    try:
        # Extract plot data from metadata if available
        plot_id = metadata.get("plotId") or token_id
        owner_wallet = metadata.get("owner") or wallet
        zone_type = metadata.get("zoneType") or metadata.get("zone") or "residential"
        
        # Prepare plot data for Supabase schema
        plot_data = {
            "id": int(plot_id) if isinstance(plot_id, (int, str)) and str(plot_id).isdigit() else None,
            "owner_wallet": owner_wallet,
            "zone_type": zone_type,
            "coord_x": metadata.get("coord_x") or metadata.get("x") or 0,
            "coord_y": metadata.get("coord_y") or metadata.get("y") or 0,
            "building_stage": metadata.get("building_stage") or 0,
            "production_rate": metadata.get("production_rate") or 0,
            "metadata_cid": metadata.get("metadata_cid") or None,
            "workers": metadata.get("workers") or [],
        }
        
        # Remove None values to avoid schema issues
        plot_data = {k: v for k, v in plot_data.items() if v is not None}
        
        # Upsert to plots table
        supabase.table("plots").upsert(plot_data, on_conflict="id").execute()
        
        # Also save full metadata to a separate table or as JSON if needed
        # The metadata contains purchase info, deed, etc.
        return {"success": True, "plot_id": plot_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error upserting plot: {str(e)}")

def get_plots_for_wallet(wallet):
    """Get plots for a wallet from Supabase"""
    if not supabase:
        # Return empty list if Supabase not configured
        return []
    
    try:
        result = supabase.table("plots").select("*").eq("wallet", wallet).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching plots: {str(e)}")
