from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import db
from app.dependencies import get_admin_user
from app.schemas import WorkspaceUpdate
from app.services.auth_utils import doc_to_dict

router = APIRouter(tags=["settings"])


@router.get("/settings")
async def get_settings_route(current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not w:
        raise HTTPException(404, "Workspace não encontrado")
    return doc_to_dict(w)


@router.put("/settings")
async def update_settings(data: WorkspaceUpdate, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.commission_type is not None:
        update_data["commission_type"] = data.commission_type
    if data.commission_percentage is not None:
        update_data["commission_percentage"] = data.commission_percentage
    if update_data:
        await db.workspaces.update_one({"_id": ObjectId(workspace_id)}, {"$set": update_data})
    return {"message": "Configurações atualizadas com sucesso"}
