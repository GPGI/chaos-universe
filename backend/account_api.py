"""
Account Management API
Supports: Personal accounts, Account clusters, Joint accounts, Business accounts, and Sub-accounts
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

# Import Supabase service
try:
    from services.supabase_service import supabase
    SUPABASE_AVAILABLE = True
except ImportError:
    try:
        from .services.supabase_service import supabase
        SUPABASE_AVAILABLE = True
    except ImportError:
        SUPABASE_AVAILABLE = False
        supabase = None

router = APIRouter(prefix="/accounts", tags=["accounts"])

def require_supabase():
    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY."
        )

def check_supabase_available():
    """Check if Supabase is available, return False if not (instead of raising)"""
    return supabase is not None

# Pydantic models
class AccountCreate(BaseModel):
    name: str
    wallet_address: str
    type: str = Field(default="personal", pattern="^(personal|cluster|joint|business|sub)$")
    parent_id: Optional[str] = None
    owner_wallet: str
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    wallet_key_name: Optional[str] = None  # Name of Avalanche CLI key to assign

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    wallet_key_name: Optional[str] = None  # Name of Avalanche CLI key to assign

class JointAccountMember(BaseModel):
    member_wallet: str
    permissions: List[str] = Field(default=["view"])

class BusinessAccountDetails(BaseModel):
    business_name: str
    registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    business_type: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[Dict[str, Any]] = None

class AccountClusterCreate(BaseModel):
    name: str
    owner_wallet: str
    description: Optional[str] = None
    account_ids: List[str] = []

class SubAccountLink(BaseModel):
    parent_account_id: str
    child_account_id: str
    relationship_type: str = "sub"

# Account CRUD
@router.post("")
async def create_account(account: AccountCreate):
    """Create a new account"""
    if not check_supabase_available():
        # Return a response indicating blockchain-only mode
        return {
            "account": {
                "id": "blockchain-only",
                "name": account.name,
                "wallet_address": account.wallet_address,
                "type": account.type,
                "owner_wallet": account.owner_wallet,
                "description": account.description,
                "message": "Account creation on blockchain only. Supabase not configured."
            }
        }
    
    try:
        # Validate wallet address format
        if not account.wallet_address.startswith("0x") or len(account.wallet_address) != 42:
            raise HTTPException(status_code=400, detail="Invalid wallet address format")
        
        # Check if wallet already exists
        existing = supabase.table("accounts").select("id").eq("wallet_address", account.wallet_address).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Account with this wallet address already exists")
        
        # Create account
        account_data = {
            "name": account.name,
            "wallet_address": account.wallet_address,
            "type": account.type,
            "owner_wallet": account.owner_wallet,
            "description": account.description,
            "metadata": account.metadata or {},
            "parent_id": account.parent_id,
            "wallet_key_name": account.wallet_key_name
        }
        
        result = supabase.table("accounts").insert(account_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create account")
        
        return {"account": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating account: {str(e)}")

@router.get("")
async def list_accounts(
    owner_wallet: Optional[str] = Query(None, description="Filter by owner wallet"),
    account_type: Optional[str] = Query(None, description="Filter by account type"),
    include_inactive: bool = Query(False, description="Include inactive accounts")
):
    """List all accounts with optional filters"""
    if not check_supabase_available():
        # Return empty list if Supabase not available
        return {"accounts": []}
    
    try:
        query = supabase.table("accounts").select("*")
        
        if owner_wallet:
            query = query.eq("owner_wallet", owner_wallet)
        
        if account_type:
            query = query.eq("type", account_type)
        
        if not include_inactive:
            query = query.eq("is_active", True)
        
        result = query.order("created_at", desc=True).execute()
        
        return {"accounts": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing accounts: {str(e)}")

@router.get("/{account_id}")
async def get_account(account_id: str):
    """Get account by ID"""
    if not check_supabase_available():
        raise HTTPException(status_code=404, detail="Account not found. Supabase not configured.")
    
    try:
        result = supabase.table("accounts").select("*").eq("id", account_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Account not found")
        
        account = result.data[0]
        
        # Load related data based on account type
        if account["type"] == "joint":
            members = supabase.table("joint_account_members").select("*").eq("account_id", account_id).execute()
            account["members"] = members.data or []
        
        if account["type"] == "business":
            business = supabase.table("business_accounts").select("*").eq("account_id", account_id).execute()
            if business.data:
                account["business_details"] = business.data[0]
        
        if account["type"] == "sub" or account.get("parent_id"):
            sub_accounts = supabase.table("sub_accounts").select("*").eq("parent_account_id", account_id).execute()
            account["sub_accounts"] = sub_accounts.data or []
        
        # Load balance
        balance = supabase.table("account_balances").select("*").eq("account_id", account_id).execute()
        if balance.data:
            account["balance"] = balance.data[0]
        
        return {"account": account}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting account: {str(e)}")

@router.put("/{account_id}")
async def update_account(account_id: str, account: AccountUpdate):
    """Update an account"""
    require_supabase()
    
    try:
        update_data = {}
        if account.name is not None:
            update_data["name"] = account.name
        if account.description is not None:
            update_data["description"] = account.description
        if account.metadata is not None:
            update_data["metadata"] = account.metadata
        if account.is_active is not None:
            update_data["is_active"] = account.is_active
        if account.wallet_key_name is not None:
            update_data["wallet_key_name"] = account.wallet_key_name
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = supabase.table("accounts").update(update_data).eq("id", account_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Account not found")
        
        return {"account": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating account: {str(e)}")

@router.delete("/{account_id}")
async def delete_account(account_id: str):
    """Delete an account"""
    require_supabase()
    
    try:
        result = supabase.table("accounts").delete().eq("id", account_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Account not found")
        
        return {"message": "Account deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting account: {str(e)}")

# Joint Account Members
@router.post("/{account_id}/members")
async def add_joint_member(account_id: str, member: JointAccountMember):
    """Add a member to a joint account"""
    require_supabase()
    
    try:
        member_data = {
            "account_id": account_id,
            "member_wallet": member.member_wallet,
            "permissions": member.permissions,
            "added_by": member.member_wallet  # Should be from auth context
        }
        
        result = supabase.table("joint_account_members").insert(member_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to add member")
        
        return {"member": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding member: {str(e)}")

@router.delete("/{account_id}/members/{member_wallet}")
async def remove_joint_member(account_id: str, member_wallet: str):
    """Remove a member from a joint account"""
    require_supabase()
    
    try:
        result = supabase.table("joint_account_members").delete().eq("account_id", account_id).eq("member_wallet", member_wallet).execute()
        
        return {"message": "Member removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing member: {str(e)}")

# Business Account Details
@router.post("/{account_id}/business")
async def set_business_details(account_id: str, details: BusinessAccountDetails):
    """Set business account details"""
    require_supabase()
    
    try:
        # Check if account exists and is business type
        account = supabase.table("accounts").select("*").eq("id", account_id).execute()
        if not account.data:
            raise HTTPException(status_code=404, detail="Account not found")
        
        if account.data[0]["type"] != "business":
            raise HTTPException(status_code=400, detail="Account is not a business account")
        
        business_data = {
            "account_id": account_id,
            "business_name": details.business_name,
            "registration_number": details.registration_number,
            "tax_id": details.tax_id,
            "business_type": details.business_type,
            "contact_email": details.contact_email,
            "contact_phone": details.contact_phone,
            "address": details.address or {}
        }
        
        # Upsert business details
        result = supabase.table("business_accounts").upsert(business_data, on_conflict="account_id").execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to set business details")
        
        return {"business_details": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting business details: {str(e)}")

# Account Clusters
@router.post("/clusters")
async def create_cluster(cluster: AccountClusterCreate):
    """Create an account cluster"""
    require_supabase()
    
    try:
        cluster_data = {
            "name": cluster.name,
            "owner_wallet": cluster.owner_wallet,
            "description": cluster.description,
            "account_ids": cluster.account_ids
        }
        
        result = supabase.table("account_clusters").insert(cluster_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create cluster")
        
        return {"cluster": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating cluster: {str(e)}")

@router.get("/clusters")
async def list_clusters(owner_wallet: Optional[str] = Query(None)):
    """List account clusters"""
    require_supabase()
    
    try:
        query = supabase.table("account_clusters").select("*")
        
        if owner_wallet:
            query = query.eq("owner_wallet", owner_wallet)
        
        result = query.order("created_at", desc=True).execute()
        
        return {"clusters": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing clusters: {str(e)}")

@router.delete("/clusters/{cluster_id}")
async def delete_cluster(cluster_id: str):
    """Delete an account cluster"""
    require_supabase()
    
    try:
        result = supabase.table("account_clusters").delete().eq("id", cluster_id).execute()
        
        return {"message": "Cluster deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting cluster: {str(e)}")

# Sub-Accounts
@router.post("/sub-accounts")
async def link_sub_account(link: SubAccountLink):
    """Link a sub-account to a parent account"""
    require_supabase()
    
    try:
        link_data = {
            "parent_account_id": link.parent_account_id,
            "child_account_id": link.child_account_id,
            "relationship_type": link.relationship_type
        }
        
        result = supabase.table("sub_accounts").insert(link_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to link sub-account")
        
        return {"link": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error linking sub-account: {str(e)}")

@router.get("/{account_id}/sub-accounts")
async def get_sub_accounts(account_id: str):
    """Get all sub-accounts for an account"""
    require_supabase()
    
    try:
        result = supabase.table("sub_accounts").select("*, child_account:accounts!sub_accounts_child_account_id_fkey(*)").eq("parent_account_id", account_id).execute()
        
        return {"sub_accounts": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting sub-accounts: {str(e)}")

@router.delete("/sub-accounts/{link_id}")
async def unlink_sub_account(link_id: str):
    """Unlink a sub-account"""
    require_supabase()
    
    try:
        result = supabase.table("sub_accounts").delete().eq("id", link_id).execute()
        
        return {"message": "Sub-account unlinked successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error unlinking sub-account: {str(e)}")

