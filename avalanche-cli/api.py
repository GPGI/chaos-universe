"""
Avalanche CLI Transfer API
FastAPI endpoints for transfer operations
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

from .transfer import transfer_avax, transfer_token, get_balance, get_token_balance, TransferResult
from .cli_utils import get_network_info, get_subnet_list

router = APIRouter(prefix="/avalanche-cli", tags=["avalanche-cli"])

class TransferAVAXRequest(BaseModel):
    to_address: str
    amount_avax: str  # Decimal as string
    subnet_name: Optional[str] = None
    rpc_url: Optional[str] = None
    from_key: Optional[str] = None

class TransferTokenRequest(BaseModel):
    to_address: str
    token_address: str
    amount: str  # Decimal as string
    subnet_name: Optional[str] = None
    rpc_url: Optional[str] = None
    from_key: Optional[str] = None

class BalanceRequest(BaseModel):
    address: str
    subnet_name: Optional[str] = None
    rpc_url: Optional[str] = None

class TokenBalanceRequest(BaseModel):
    address: str
    token_address: str
    subnet_name: Optional[str] = None
    rpc_url: Optional[str] = None

@router.post("/transfer/avax")
async def transfer_avax_endpoint(request: TransferAVAXRequest):
    """Transfer AVAX using Avalanche CLI discovered configuration"""
    try:
        amount = Decimal(request.amount_avax)
        result = transfer_avax(
            to_address=request.to_address,
            amount_avax=amount,
            from_key=request.from_key,
            subnet_name=request.subnet_name,
            rpc_url=request.rpc_url
        )
        
        if result.success:
            return {
                "success": True,
                "tx_hash": result.tx_hash,
                "gas_used": result.gas_used,
                "block_number": result.block_number
            }
        else:
            raise HTTPException(status_code=400, detail=result.error)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transfer/token")
async def transfer_token_endpoint(request: TransferTokenRequest):
    """Transfer ERC20 token using Avalanche CLI discovered configuration"""
    try:
        amount = Decimal(request.amount)
        result = transfer_token(
            to_address=request.to_address,
            token_address=request.token_address,
            amount=amount,
            from_key=request.from_key,
            subnet_name=request.subnet_name,
            rpc_url=request.rpc_url
        )
        
        if result.success:
            return {
                "success": True,
                "tx_hash": result.tx_hash,
                "gas_used": result.gas_used,
                "block_number": result.block_number
            }
        else:
            raise HTTPException(status_code=400, detail=result.error)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/balance")
async def get_balance_endpoint(request: BalanceRequest):
    """Get AVAX balance for an address"""
    try:
        balance = get_balance(
            address=request.address,
            subnet_name=request.subnet_name,
            rpc_url=request.rpc_url
        )
        
        if balance is not None:
            return {
                "success": True,
                "address": request.address,
                "balance_avax": str(balance),
                "balance_wei": str(int(balance * Decimal(10**18)))
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to get balance")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/balance/token")
async def get_token_balance_endpoint(request: TokenBalanceRequest):
    """Get ERC20 token balance for an address"""
    try:
        balance = get_token_balance(
            address=request.address,
            token_address=request.token_address,
            subnet_name=request.subnet_name,
            rpc_url=request.rpc_url
        )
        
        if balance is not None:
            return {
                "success": True,
                "address": request.address,
                "token_address": request.token_address,
                "balance": str(balance)
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to get token balance")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/network/{subnet_name}")
async def get_network_info_endpoint(subnet_name: str):
    """Get network information for a subnet"""
    try:
        info = get_network_info(subnet_name)
        return {
            "success": True,
            "network": info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subnets")
async def list_subnets():
    """List available subnets from Avalanche CLI"""
    try:
        subnets = get_subnet_list()
        return {
            "success": True,
            "subnets": subnets
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

