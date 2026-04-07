import jwt
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.config import ASAAS_API_KEY, FRONTEND_URL, JWT_ALGORITHM, JWT_SECRET, PLANS
from app.database import db
from app.dependencies import get_current_user
from app.schemas import ChangePassword, UserLogin, WorkspaceCreate
from app.services.asaas import asaas_create_checkout_session
from app.services.auth_utils import (
    auth_cookie_kwargs,
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
router = APIRouter(tags=["auth"])


@router.post("/auth/register-workspace")
async def register_workspace(data: WorkspaceCreate, response: Response):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(400, "Email já cadastrado")

    plan_info = PLANS.get(data.plan, PLANS["basic"])
    ws_id = ObjectId()
    workspace_doc = {
        "_id": ws_id,
        "id": str(ws_id),
        "name": data.name,
        "email": data.email.lower(),
        "phone": data.phone,
        "cpf_cnpj": data.cpf_cnpj,
        "plan": data.plan,
        "status": "pending",
        "commission_type": "fixed",
        "commission_percentage": 10.0,
        "asaas_customer_id": None,
        "asaas_subscription_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.workspaces.insert_one(workspace_doc)
    workspace_id = str(ws_id)

    u_id = ObjectId()
    await db.users.insert_one(
        {
            "_id": u_id,
            "id": str(u_id),
            "email": data.email.lower(),
            "password_hash": hash_password(data.password),
            "name": data.owner_name,
            "role": "admin",
            "workspace_id": workspace_id,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    user_id = str(u_id)

    checkout_url = None
    if ASAAS_API_KEY:
        success_url = f"{FRONTEND_URL}/admin/dashboard"
        cancel_url = f"{FRONTEND_URL}/admin/billing"
        checkout = asaas_create_checkout_session(
            plan=data.plan, success_url=success_url, cancel_url=cancel_url
        )
        if checkout:
            checkout_url = checkout.get("link")
            await db.workspaces.update_one(
                {"_id": ws_id}, {"$set": {"asaas_checkout_id": checkout.get("id")}}
            )

    access_token = create_access_token(user_id, data.email.lower(), "admin", workspace_id)
    refresh_token = create_refresh_token(user_id)
    _ck = auth_cookie_kwargs()
    response.set_cookie("access_token", access_token, max_age=28800, **_ck)
    response.set_cookie("refresh_token", refresh_token, max_age=604800, **_ck)

    return {
        "user": {
            "id": user_id,
            "email": data.email.lower(),
            "name": data.owner_name,
            "role": "admin",
            "workspace_id": workspace_id,
        },
        "workspace": {
            "id": workspace_id,
            "name": data.name,
            "plan": data.plan,
            "plan_name": plan_info["name"],
            "status": "pending",
        },
        "checkout_url": checkout_url,
    }


@router.post("/auth/login")
async def login(data: UserLogin, response: Response, request: Request):
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{data.email.lower()}"

    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("count", 0) >= 5:
        last_str = attempts.get("last_attempt", "")
        if last_str:
            try:
                last_dt = datetime.fromisoformat(last_str)
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) < last_dt + timedelta(minutes=15):
                    raise HTTPException(429, "Muitas tentativas. Aguarde 15 minutos.")
            except HTTPException:
                raise
            except Exception:
                pass

    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"count": 1},
                "$set": {"last_attempt": datetime.now(timezone.utc).isoformat()},
            },
            upsert=True,
        )
        raise HTTPException(401, "Email ou senha incorretos")

    if not user.get("is_active", True):
        raise HTTPException(403, "Conta desativada. Contate o administrador.")

    await db.login_attempts.delete_one({"identifier": identifier})

    user_id = str(user["_id"])
    workspace_id = user.get("workspace_id", "")
    role = user.get("role", "mechanic")

    workspace = None
    if workspace_id:
        try:
            w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
            if w:
                workspace = {
                    "id": str(w["_id"]),
                    "name": w.get("name"),
                    "plan": w.get("plan"),
                    "status": w.get("status"),
                }
        except Exception:
            pass

    access_token = create_access_token(user_id, data.email.lower(), role, workspace_id)
    refresh_token = create_refresh_token(user_id)
    _ck = auth_cookie_kwargs()
    response.set_cookie("access_token", access_token, max_age=28800, **_ck)
    response.set_cookie("refresh_token", refresh_token, max_age=604800, **_ck)

    return {
        "id": user_id,
        "email": user.get("email"),
        "name": user.get("name"),
        "role": role,
        "workspace_id": workspace_id,
        "workspace": workspace,
    }


@router.post("/auth/logout")
async def logout(response: Response):
    _ck = auth_cookie_kwargs()
    response.delete_cookie(
        "access_token",
        path=_ck["path"],
        secure=_ck["secure"],
        httponly=_ck["httponly"],
        samesite=_ck["samesite"],
    )
    response.delete_cookie(
        "refresh_token",
        path=_ck["path"],
        secure=_ck["secure"],
        httponly=_ck["httponly"],
        samesite=_ck["samesite"],
    )
    return {"message": "Logout realizado"}


@router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    workspace_id = current_user.get("workspace_id", "")
    workspace = None
    if workspace_id:
        try:
            w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
            if w:
                workspace = {
                    "id": str(w["_id"]),
                    "name": w.get("name"),
                    "plan": w.get("plan"),
                    "status": w.get("status"),
                    "commission_type": w.get("commission_type", "fixed"),
                    "commission_percentage": w.get("commission_percentage", 10.0),
                }
        except Exception:
            pass
    return {**current_user, "workspace": workspace}


@router.post("/auth/refresh")
async def refresh_token_route(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "Refresh token não encontrado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Token inválido")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "Usuário não encontrado")
        user_id = str(user["_id"])
        access_token = create_access_token(
            user_id, user["email"], user["role"], user.get("workspace_id", "")
        )
        _ck = auth_cookie_kwargs()
        response.set_cookie("access_token", access_token, max_age=28800, **_ck)
        return {"message": "Token renovado"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido")


@router.put("/auth/change-password")
async def change_password(data: ChangePassword, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(404, "Usuário não encontrado")

    if not verify_password(data.current_password, user.get("password_hash", "")):
        raise HTTPException(400, "Senha atual incorreta")

    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"password_hash": hash_password(data.new_password)}},
    )
    return {"message": "Senha alterada com sucesso"}
