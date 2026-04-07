from bson import ObjectId
from fastapi import HTTPException

from app.config import PLANS
from app.database import db


async def get_workspace_commission(workspace_id: str):
    try:
        w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
        if w:
            return w.get("commission_type", "fixed"), w.get("commission_percentage", 10.0)
    except Exception:
        pass
    return "fixed", 10.0


async def check_mechanic_limit(workspace_id: str):
    w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    plan = w.get("plan", "basic") if w else "basic"
    plan_info = PLANS.get(plan, PLANS["basic"])
    max_mechanics = plan_info.get("max_mechanics", 2)
    current_count = await db.users.count_documents(
        {"workspace_id": workspace_id, "role": "mechanic", "is_active": {"$ne": False}}
    )
    if max_mechanics > 0 and current_count >= max_mechanics:
        raise HTTPException(
            403,
            f"Limite do plano {plan_info['name']} atingido ({max_mechanics} mecânicos ativos). Inative um mecânico para ativar este.",
        )
