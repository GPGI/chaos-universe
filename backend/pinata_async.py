import httpx
from typing import Dict
from .config import PINATA_JWT

PINATA_BASE = "https://api.pinata.cloud"

class PinataService:
    def __init__(self):
        self.jwt = PINATA_JWT
        self.gateway = "https://gateway.pinata.cloud/ipfs"

    async def pin_json(self, data: Dict, name: str) -> str:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{PINATA_BASE}/pinning/pinJSONToIPFS",
                headers={"Authorization": f"Bearer {self.jwt}", "Content-Type": "application/json"},
                json={"pinataContent": data, "pinataMetadata": {"name": name}},
                timeout=30
            )
            r.raise_for_status()
            return r.json()['IpfsHash']

    def get_url(self, cid: str) -> str:
        return f"{self.gateway}/{cid}"