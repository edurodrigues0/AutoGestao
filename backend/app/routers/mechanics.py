import random
import string
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import db
from app.dependencies import get_admin_user
from app.schemas import MechanicCreate, MechanicUpdate
from app.services.auth_utils import doc_to_dict, hash_password
from app.services.mechanics_helpers import check_mechanic_limit, get_workspace_commission

router = APIRouter(tags=["mechanics"])


@router.get("/mechanics")
async def list_mechanics(current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()

    commission_type, default_commission = await get_workspace_commission(workspace_id)

    mechanics = []
    async for m in db.users.find({"workspace_id": workspace_id, "role": "mechanic"}):
        mdict = doc_to_dict(m, exclude=["password_hash"])
        user_id = mdict.get("id")

        services = await db.services.find(
            {
                "mechanic_id": user_id,
                "workspace_id": workspace_id,
                "created_at": {"$gte": month_start},
            },
        ).to_list(10000)

        total_month = sum(s.get("value", 0) for s in services)
        commission_pct = (
            mdict.get("commission_percentage")
            if commission_type == "individual" and mdict.get("commission_percentage") is not None
            else default_commission
        )

        mdict["total_month"] = total_month
        mdict["commission"] = total_month * commission_pct / 100
        mdict["commission_percentage"] = commission_pct
        mdict["services_count_month"] = len(services)
        mechanics.append(mdict)

    return {"mechanics": mechanics}


@router.post("/mechanics")
async def create_mechanic(data: MechanicCreate, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    await check_mechanic_limit(workspace_id)

    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(400, "Email já cadastrado")

    m_id = ObjectId()
    doc = {
        "_id": m_id,
        "id": str(m_id),
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": "mechanic",
        "workspace_id": workspace_id,
        "commission_percentage": data.commission_percentage,
        "permissions": data.permissions or [],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    return doc_to_dict(doc, exclude=["password_hash"])


@router.put("/mechanics/{mechanic_id}")
async def update_mechanic(
    mechanic_id: str, data: MechanicUpdate, current_user: dict = Depends(get_admin_user)
):
    workspace_id = current_user.get("workspace_id")
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.commission_percentage is not None:
        update_data["commission_percentage"] = data.commission_percentage
    if data.permissions is not None:
        update_data["permissions"] = data.permissions
    if data.is_active is not None:
        if data.is_active:
            m = await db.users.find_one(
                {"_id": ObjectId(mechanic_id), "workspace_id": workspace_id}
            )
            if m and not m.get("is_active", True):
                await check_mechanic_limit(workspace_id)
        update_data["is_active"] = data.is_active
    if not update_data:
        raise HTTPException(400, "Nenhum dado para atualizar")
    result = await db.users.update_one(
        {"_id": ObjectId(mechanic_id), "workspace_id": workspace_id, "role": "mechanic"},
        {"$set": update_data},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Mecânico não encontrado")
    return {"message": "Mecânico atualizado com sucesso"}


@router.delete("/mechanics/{mechanic_id}")
async def deactivate_mechanic(mechanic_id: str, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    result = await db.users.update_one(
        {"_id": ObjectId(mechanic_id), "workspace_id": workspace_id, "role": "mechanic"},
        {"$set": {"is_active": False}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Mecânico não encontrado")
    return {"message": "Mecânico desativado com sucesso"}


@router.put("/mechanics/{mechanic_id}/reset-password")
async def reset_mechanic_password(mechanic_id: str, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")

    chars = string.ascii_letters + string.digits
    new_password = "".join(random.choice(chars) for _ in range(6))

    result = await db.users.update_one(
        {"_id": ObjectId(mechanic_id), "workspace_id": workspace_id, "role": "mechanic"},
        {"$set": {"password_hash": hash_password(new_password)}},
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Mecânico não encontrado")

    return {"new_password": new_password}
