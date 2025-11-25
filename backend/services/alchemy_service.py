import os
from typing import Optional
from fastapi import HTTPException

# Optional Alchemy integration - only load if available and configured
alchemy = None
try:
    from alchemy_sdk import Alchemy, Network
    
    alchemy_key = os.getenv("ALCHEMY_KEY")
    if alchemy_key:
        alchemy = Alchemy(
            api_key=alchemy_key,
            network=Network.AVALANCHE_MAINNET
        )
except ImportError:
    # Alchemy SDK not installed - service will use fallback methods
    pass
except Exception as e:
    print(f"Warning: Could not initialize Alchemy: {e}")

async def get_wallet_nfts(address: str):
    """Get NFTs for a wallet address"""
    if not alchemy:
        raise HTTPException(
            status_code=503,
            detail="Alchemy service not configured. Set ALCHEMY_KEY in environment."
        )
    
    try:
        data = await alchemy.nft.get_nfts_for_owner(address)
        return data.get("ownedNfts", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching NFTs: {str(e)}")

async def get_wallet_balance(address: str):
    """Get balance for a wallet address"""
    if not alchemy:
        # Fallback to Web3 if Alchemy not available
        from web3 import Web3
        from ..config import AVALANCHE_RPC
        
        try:
            w3 = Web3(Web3.HTTPProvider(AVALANCHE_RPC))
            if w3.is_connected():
                balance = w3.eth.get_balance(address)
                return {"balance": str(balance), "balance_wei": balance}
            else:
                raise HTTPException(status_code=503, detail="Not connected to blockchain")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching balance: {str(e)}")
    
    try:
        bal = await alchemy.core.get_balance(address)
        return {"balance": str(bal), "balance_wei": bal}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching balance: {str(e)}")
