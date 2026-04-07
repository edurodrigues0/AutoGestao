import uuid
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile

from app.config import APP_NAME
from app.database import db
from app.dependencies import get_admin_user, get_current_user
from app.schemas import ServiceCreate, ServiceUpdate
from app.services.auth_utils import doc_to_dict
from app.services.storage import get_object_data, process_image_to_webp, put_object

router = APIRouter(tags=["services"])


@router.post("/services/upload-photo")
async def upload_photo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"]
    content_type_in = file.content_type or "image/jpeg"
    if content_type_in not in allowed_types and not content_type_in.startswith("image/"):
        raise HTTPException(400, "Tipo de arquivo não permitido. Use imagens (JPG, PNG, WebP).")
    workspace_id = current_user.get("workspace_id", "default")
    user_id = current_user.get("id", "unknown")
    raw = await file.read()
    data, content_type = process_image_to_webp(raw)
    path = f"{APP_NAME}/services/{workspace_id}/{user_id}/{uuid.uuid4()}.webp"
    result = put_object(path, data, content_type)
    return {"path": result["path"], "size": result.get("size", 0)}


@router.get("/services/photo/{path:path}")
async def get_photo(path: str, current_user: dict = Depends(get_current_user)):
    data, content_type = get_object_data(path)
    return Response(content=data, media_type=content_type)


@router.get("/services")
async def list_services(
    current_user: dict = Depends(get_current_user),
    mechanic_id: Optional[str] = Query(None),
    client_name: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50),
    skip: int = Query(0),
):
    workspace_id = current_user.get("workspace_id")
    role = current_user.get("role")
    user_id = current_user.get("id")

    query = {"workspace_id": workspace_id}
    permissions = current_user.get("permissions") or []

    if role == "mechanic" and "view_all_services" not in permissions:
        query["mechanic_id"] = user_id
    elif mechanic_id:
        query["mechanic_id"] = mechanic_id

    if client_name:
        query["client_name"] = {"$regex": client_name, "$options": "i"}

    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date + "T23:59:59"
        query["created_at"] = date_query

    if role == "mechanic" and "view_all_services" not in permissions:
        today_start = (
            datetime.now(timezone.utc)
            .replace(hour=0, minute=0, second=0, microsecond=0)
            .isoformat()
        )
        if "created_at" in query and isinstance(query["created_at"], dict):
            current_gte = query["created_at"].get("$gte", "")
            if not current_gte or current_gte < today_start:
                query["created_at"]["$gte"] = today_start
        else:
            query["created_at"] = {"$gte": today_start}

    total = await db.services.count_documents(query)
    services_cursor = db.services.find(query).sort("created_at", -1).skip(skip).limit(limit)
    services = []
    async for s in services_cursor:
        services.append(doc_to_dict(s))

    mechanic_ids = list(set(s.get("mechanic_id") for s in services if s.get("mechanic_id")))
    mechanics_map = {}
    for mid in mechanic_ids:
        try:
            m = await db.users.find_one({"_id": ObjectId(mid)})
            if m:
                mechanics_map[mid] = m.get("name", "N/A")
        except Exception:
            pass

    for s in services:
        s["mechanic_name"] = mechanics_map.get(s.get("mechanic_id", ""), "N/A")

    return {"services": services, "total": total}


@router.post("/services")
async def create_service(data: ServiceCreate, current_user: dict = Depends(get_current_user)):
    workspace_id = current_user.get("workspace_id")
    user_id = current_user.get("id")
    s_id = ObjectId()
    service_doc = {
        "_id": s_id,
        "id": str(s_id),
        "workspace_id": workspace_id,
        "mechanic_id": user_id,
        "client_name": data.client_name,
        "description": data.description,
        "value": data.value,
        "photo_path": data.photo_path,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.services.insert_one(service_doc)
    return doc_to_dict(service_doc)


@router.put("/services/{service_id}")
async def update_service(
    service_id: str, data: ServiceUpdate, current_user: dict = Depends(get_current_user)
):
    workspace_id = current_user.get("workspace_id")
    user_id = current_user.get("id")
    role = current_user.get("role")

    try:
        q = {"_id": ObjectId(service_id), "workspace_id": workspace_id}
    except Exception:
        q = {"id": service_id, "workspace_id": workspace_id}

    service = await db.services.find_one(q)
    if not service:
        raise HTTPException(404, "Serviço não encontrado")

    if role == "mechanic" and "view_all_services" not in current_user.get("permissions", []):
        if str(service.get("mechanic_id")) != user_id:
            raise HTTPException(403, "Sem permissão para editar serviço de outro mecânico")
        today_start = (
            datetime.now(timezone.utc)
            .replace(hour=0, minute=0, second=0, microsecond=0)
            .isoformat()
        )
        if service.get("created_at", "") < today_start:
            raise HTTPException(403, "Somente serviços de hoje podem ser editados")

    update_data = {}
    if data.client_name is not None:
        update_data["client_name"] = data.client_name
    if data.description is not None:
        update_data["description"] = data.description
    if data.value is not None:
        update_data["value"] = data.value
    if data.photo_path is not None:
        update_data["photo_path"] = data.photo_path

    if not update_data:
        raise HTTPException(400, "Nenhum dado fornecido para atualização")

    await db.services.update_one(q, {"$set": update_data})
    updated = await db.services.find_one(q)
    return doc_to_dict(updated)


@router.get("/services/{service_id}")
async def get_service(service_id: str, current_user: dict = Depends(get_current_user)):
    workspace_id = current_user.get("workspace_id")
    user_id = current_user.get("id")
    role = current_user.get("role")

    try:
        query = {"_id": ObjectId(service_id), "workspace_id": workspace_id}
    except Exception:
        query = {"id": service_id, "workspace_id": workspace_id}

    if role == "mechanic" and "view_all_services" not in current_user.get("permissions", []):
        query["mechanic_id"] = user_id
        today_start = (
            datetime.now(timezone.utc)
            .replace(hour=0, minute=0, second=0, microsecond=0)
            .isoformat()
        )
        query["created_at"] = {"$gte": today_start}

    service = await db.services.find_one(query)
    if not service:
        raise HTTPException(404, "Serviço não encontrado")
    return doc_to_dict(service)


@router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    try:
        result = await db.services.delete_one(
            {"_id": ObjectId(service_id), "workspace_id": workspace_id}
        )
    except Exception:
        result = await db.services.delete_one({"id": service_id, "workspace_id": workspace_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Serviço não encontrado")
    return {"message": "Serviço removido com sucesso"}
