from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import random
import uuid

router = APIRouter(prefix="/npcs", tags=["npcs"])

# In-memory NPC registry for prototype
_npcs: Dict[str, Dict] = {}


class NPCSpawnRequest(BaseModel):
	count: int = Field(1, ge=1, le=1000)
	cohort: Optional[str] = Field(None, description="e.g. 'child', 'adult', 'scientist'")


class NPCTraitUpdate(BaseModel):
	npc_id: str
	skill_delta: float = 0.0
	loyalty_delta: float = 0.0
	personality_hint: Optional[str] = None


def _random_personality() -> str:
	return random.choice(["curious", "stoic", "rebellious", "empathetic", "analytical"])


def _spawn_npc(cohort: Optional[str]) -> Dict:
	npc_id = str(uuid.uuid4())
	npc = {
		"id": npc_id,
		"cohort": cohort or "child",
		"skill": 0.0,
		"loyalty": 0.0,
		"personality": _random_personality(),
		"age": 0,
	}
	_npcs[npc_id] = npc
	return npc


@router.post("/spawn")
def spawn_npcs(req: NPCSpawnRequest):
	created = []
	for _ in range(req.count):
		created.append(_spawn_npc(req.cohort))
	return {"created": created, "total": len(_npcs)}


@router.get("/")
def list_npcs():
	return {"npcs": list(_npcs.values())}


@router.post("/evolve")
def evolve_npc(update: NPCTraitUpdate):
	npc = _npcs.get(update.npc_id)
	if not npc:
		raise HTTPException(status_code=404, detail="NPC not found")
	npc["skill"] = max(0.0, npc["skill"] + update.skill_delta)
	npc["loyalty"] = min(1.0, max(0.0, npc["loyalty"] + update.loyalty_delta))
	if update.personality_hint:
		npc["personality"] = update.personality_hint
	return {"npc": npc}


