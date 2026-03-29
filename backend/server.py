from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')

import os
import uuid
import bcrypt
import jwt
import requests
import logging
import io
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Annotated
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator

# ============ CONFIG ============
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret-key')
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
ASAAS_API_KEY = os.environ.get('ASAAS_API_KEY', '')
ASAAS_BASE_URL = os.environ.get('ASAAS_BASE_URL', 'https://api-sandbox.asaas.com')
ASAAS_WALLET_ID = os.environ.get('ASAAS_WALLET_ID', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:8001')
APP_NAME = 'autogestao'

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
storage_key_cache = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MONGODB ============
mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ['DB_NAME']]

PyObjectId = Annotated[str, BeforeValidator(str)]

# ============ STORAGE ============
def init_storage():
    global storage_key_cache
    if storage_key_cache:
        return storage_key_cache
    if not EMERGENT_LLM_KEY:
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key_cache = resp.json()["storage_key"]
        return storage_key_cache
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str):
    key = init_storage()
    if not key:
        raise HTTPException(500, "Armazenamento não inicializado")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object_data(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(500, "Armazenamento não inicializado")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ============ AUTH HELPERS ============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, email: str, role: str, workspace_id: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role, "workspace_id": workspace_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8), "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def doc_to_dict(doc, exclude=None):
    if doc is None:
        return None
    result = {}
    for k, v in doc.items():
        if k == "_id":
            result["id"] = str(v)
        elif exclude and k in exclude:
            continue
        else:
            result[k] = v
    return result

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return doc_to_dict(user, exclude=["password_hash"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador")
    return current_user

# ============ PLANS CONFIG ============
PLANS = {
    "basic": {"name": "Básico", "price": 69.90, "max_mechanics": 2, "description": "Até 2 mecânicos"},
    "pro": {"name": "Pro", "price": 149.90, "max_mechanics": 5, "description": "Até 5 mecânicos"},
    "premium": {"name": "Premium", "price": 249.90, "max_mechanics": -1, "description": "Mecânicos ilimitados"},
}

# ============ ASAAS SERVICE ============
def asaas_create_customer(name: str, email: str, cpf_cnpj: str, phone: str = None):
    if not ASAAS_API_KEY:
        return None
    headers = {"access_token": ASAAS_API_KEY, "Content-Type": "application/json"}
    payload = {"name": name, "email": email, "cpfCnpj": cpf_cnpj.replace(".", "").replace("-", "").replace("/", "")}
    if phone:
        payload["mobilePhone"] = phone
    try:
        resp = requests.post(f"{ASAAS_BASE_URL}/v3/customers", headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.error(f"Asaas create customer error: {e}")
        return None

def asaas_create_subscription(customer_id: str, plan: str, billing_type: str):
    if not ASAAS_API_KEY:
        return None
    plan_info = PLANS.get(plan, PLANS["basic"])
    headers = {"access_token": ASAAS_API_KEY, "Content-Type": "application/json"}
    next_due = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    payload = {
        "customer": customer_id,
        "billingType": billing_type,
        "value": plan_info["price"],
        "nextDueDate": next_due,
        "cycle": "MONTHLY",
        "description": f"AutoGestão - Plano {plan_info['name']}"
    }
    try:
        resp = requests.post(f"{ASAAS_BASE_URL}/v3/subscriptions", headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.error(f"Asaas create subscription error: {e}")
        return None

# ============ PYDANTIC MODELS ============
class WorkspaceCreate(BaseModel):
    name: str
    owner_name: str
    email: str
    password: str
    phone: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    plan: str = "basic"

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    commission_type: Optional[str] = None
    commission_percentage: Optional[float] = None

class UserLogin(BaseModel):
    email: str
    password: str

class MechanicCreate(BaseModel):
    name: str
    email: str
    password: str
    commission_percentage: Optional[float] = None

class MechanicUpdate(BaseModel):
    name: Optional[str] = None
    commission_percentage: Optional[float] = None
    is_active: Optional[bool] = None

class ServiceCreate(BaseModel):
    client_name: str
    description: Optional[str] = None
    value: float
    photo_path: Optional[str] = None

class ServiceUpdate(BaseModel):
    client_name: Optional[str] = None
    description: Optional[str] = None
    value: Optional[float] = None

class CheckoutCreate(BaseModel):
    billing_type: str = "PIX"
    cpf_cnpj: str
    phone: Optional[str] = None

class PlanUpgrade(BaseModel):
    plan: str

# ============ APP SETUP ============
app = FastAPI(title="AutoGestão API")
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", os.environ.get('CORS_ORIGINS', '*')],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ STARTUP ============
@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.workspaces.create_index("email")
    await db.services.create_index([("workspace_id", 1), ("mechanic_id", 1)])
    await db.login_attempts.create_index("identifier")
    await db.login_attempts.create_index("last_attempt")

    try:
        init_storage()
        logger.info("Storage initialized successfully")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@autogestao.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        ws_id = ObjectId()
        await db.workspaces.insert_one({
            "_id": ws_id,
            "id": str(ws_id),
            "name": "AutoGestão Principal",
            "email": admin_email,
            "plan": "premium",
            "status": "active",
            "commission_type": "fixed",
            "commission_percentage": 10.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        u_id = ObjectId()
        await db.users.insert_one({
            "_id": u_id,
            "id": str(u_id),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Administrador",
            "role": "admin",
            "workspace_id": str(ws_id),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin criado: {admin_email}")
    elif existing and not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    creds_path = Path("/app/memory/test_credentials.md")
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    with open(creds_path, "w") as f:
        f.write("# AutoGestão - Credenciais de Teste\n\n")
        f.write("## Admin\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write("- Role: admin\n\n")
        f.write("## Endpoints\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/register-workspace\n")
        f.write("- GET /api/auth/me\n")
        f.write("- GET /api/dashboard/admin\n")
        f.write("- GET /api/services\n")
        f.write("- POST /api/services\n")
        f.write("- GET /api/mechanics\n")
        f.write("- GET /api/billing/plans\n")

# ============ AUTH ROUTES ============
@api_router.post("/auth/register-workspace")
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
        "status": "active",
        "commission_type": "fixed",
        "commission_percentage": 10.0,
        "asaas_customer_id": None,
        "asaas_subscription_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.workspaces.insert_one(workspace_doc)
    workspace_id = str(ws_id)

    u_id = ObjectId()
    await db.users.insert_one({
        "_id": u_id,
        "id": str(u_id),
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "name": data.owner_name,
        "role": "admin",
        "workspace_id": workspace_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    user_id = str(u_id)

    checkout_url = None
    if ASAAS_API_KEY and data.cpf_cnpj:
        customer = asaas_create_customer(data.owner_name, data.email, data.cpf_cnpj, data.phone)
        if customer:
            cid = customer.get("id")
            await db.workspaces.update_one({"_id": ws_id}, {"$set": {"asaas_customer_id": cid}})
            sub = asaas_create_subscription(cid, data.plan, "PIX")
            if sub:
                await db.workspaces.update_one({"_id": ws_id}, {"$set": {"asaas_subscription_id": sub.get("id")}})
                checkout_url = sub.get("invoiceUrl") or sub.get("bankSlipUrl")

    access_token = create_access_token(user_id, data.email.lower(), "admin", workspace_id)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=28800, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

    return {
        "user": {"id": user_id, "email": data.email.lower(), "name": data.owner_name, "role": "admin", "workspace_id": workspace_id},
        "workspace": {"id": workspace_id, "name": data.name, "plan": data.plan, "plan_name": plan_info["name"], "status": "active"},
        "checkout_url": checkout_url
    }

@api_router.post("/auth/login")
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
            {"$inc": {"count": 1}, "$set": {"last_attempt": datetime.now(timezone.utc).isoformat()}},
            upsert=True
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
                workspace = {"id": str(w["_id"]), "name": w.get("name"), "plan": w.get("plan"), "status": w.get("status")}
        except Exception:
            pass

    access_token = create_access_token(user_id, data.email.lower(), role, workspace_id)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=28800, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

    return {
        "id": user_id, "email": user.get("email"), "name": user.get("name"),
        "role": role, "workspace_id": workspace_id, "workspace": workspace
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logout realizado"}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    workspace_id = current_user.get("workspace_id", "")
    workspace = None
    if workspace_id:
        try:
            w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
            if w:
                workspace = {
                    "id": str(w["_id"]), "name": w.get("name"), "plan": w.get("plan"),
                    "status": w.get("status"), "commission_type": w.get("commission_type", "fixed"),
                    "commission_percentage": w.get("commission_percentage", 10.0)
                }
        except Exception:
            pass
    return {**current_user, "workspace": workspace}

@api_router.post("/auth/refresh")
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
        access_token = create_access_token(user_id, user["email"], user["role"], user.get("workspace_id", ""))
        response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=28800, path="/")
        return {"message": "Token renovado"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido")

# ============ SERVICES ROUTES ============
@api_router.post("/services/upload-photo")
async def upload_photo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"]
    content_type = file.content_type or "image/jpeg"
    if content_type not in allowed_types and not content_type.startswith("image/"):
        raise HTTPException(400, "Tipo de arquivo não permitido. Use imagens (JPG, PNG, WebP).")
    workspace_id = current_user.get("workspace_id", "default")
    user_id = current_user.get("id", "unknown")
    ext = (file.filename or "photo.jpg").split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp", "gif", "heic"]:
        ext = "jpg"
    path = f"{APP_NAME}/services/{workspace_id}/{user_id}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, content_type)
    return {"path": result["path"], "size": result.get("size", 0)}

@api_router.get("/services/photo/{path:path}")
async def get_photo(path: str, current_user: dict = Depends(get_current_user)):
    data, content_type = get_object_data(path)
    return Response(content=data, media_type=content_type)

@api_router.get("/services")
async def list_services(
    current_user: dict = Depends(get_current_user),
    mechanic_id: Optional[str] = Query(None),
    client_name: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50),
    skip: int = Query(0)
):
    workspace_id = current_user.get("workspace_id")
    role = current_user.get("role")
    user_id = current_user.get("id")

    query = {"workspace_id": workspace_id}
    if role == "mechanic":
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

@api_router.post("/services")
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.services.insert_one(service_doc)
    return doc_to_dict(service_doc)

@api_router.get("/services/{service_id}")
async def get_service(service_id: str, current_user: dict = Depends(get_current_user)):
    workspace_id = current_user.get("workspace_id")
    user_id = current_user.get("id")
    role = current_user.get("role")

    try:
        query = {"_id": ObjectId(service_id), "workspace_id": workspace_id}
    except Exception:
        query = {"id": service_id, "workspace_id": workspace_id}

    if role == "mechanic":
        query["mechanic_id"] = user_id

    service = await db.services.find_one(query)
    if not service:
        raise HTTPException(404, "Serviço não encontrado")
    return doc_to_dict(service)

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    try:
        result = await db.services.delete_one({"_id": ObjectId(service_id), "workspace_id": workspace_id})
    except Exception:
        result = await db.services.delete_one({"id": service_id, "workspace_id": workspace_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Serviço não encontrado")
    return {"message": "Serviço removido com sucesso"}

# ============ MECHANICS ROUTES ============
async def get_workspace_commission(workspace_id: str):
    try:
        w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
        if w:
            return w.get("commission_type", "fixed"), w.get("commission_percentage", 10.0)
    except Exception:
        pass
    return "fixed", 10.0

@api_router.get("/mechanics")
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
            {"mechanic_id": user_id, "workspace_id": workspace_id, "created_at": {"$gte": month_start}},
        ).to_list(10000)

        total_month = sum(s.get("value", 0) for s in services)
        commission_pct = (mdict.get("commission_percentage") if commission_type == "individual" and mdict.get("commission_percentage") is not None else default_commission)

        mdict["total_month"] = total_month
        mdict["commission"] = total_month * commission_pct / 100
        mdict["commission_percentage"] = commission_pct
        mdict["services_count_month"] = len(services)
        mechanics.append(mdict)

    return {"mechanics": mechanics}

@api_router.post("/mechanics")
async def create_mechanic(data: MechanicCreate, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")

    w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    plan = w.get("plan", "basic") if w else "basic"
    plan_info = PLANS.get(plan, PLANS["basic"])
    max_mechanics = plan_info.get("max_mechanics", 2)
    current_count = await db.users.count_documents({"workspace_id": workspace_id, "role": "mechanic", "is_active": True})

    if max_mechanics > 0 and current_count >= max_mechanics:
        raise HTTPException(403, f"Limite do plano {plan_info['name']} atingido ({max_mechanics} mecânicos). Faça upgrade.")

    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(400, "Email já cadastrado")

    m_id = ObjectId()
    doc = {
        "_id": m_id, "id": str(m_id),
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": "mechanic",
        "workspace_id": workspace_id,
        "commission_percentage": data.commission_percentage,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(doc)
    return doc_to_dict(doc, exclude=["password_hash"])

@api_router.put("/mechanics/{mechanic_id}")
async def update_mechanic(mechanic_id: str, data: MechanicUpdate, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    update_data = {}
    if data.name is not None: update_data["name"] = data.name
    if data.commission_percentage is not None: update_data["commission_percentage"] = data.commission_percentage
    if data.is_active is not None: update_data["is_active"] = data.is_active
    if not update_data:
        raise HTTPException(400, "Nenhum dado para atualizar")
    result = await db.users.update_one(
        {"_id": ObjectId(mechanic_id), "workspace_id": workspace_id, "role": "mechanic"},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Mecânico não encontrado")
    return {"message": "Mecânico atualizado com sucesso"}

@api_router.delete("/mechanics/{mechanic_id}")
async def deactivate_mechanic(mechanic_id: str, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    result = await db.users.update_one(
        {"_id": ObjectId(mechanic_id), "workspace_id": workspace_id, "role": "mechanic"},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Mecânico não encontrado")
    return {"message": "Mecânico desativado com sucesso"}

# ============ DASHBOARD ROUTES ============
@api_router.get("/dashboard/mechanic")
async def mechanic_dashboard(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    workspace_id = current_user.get("workspace_id")
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()

    all_services = []
    async for s in db.services.find({"mechanic_id": user_id, "workspace_id": workspace_id}).sort("created_at", -1):
        all_services.append(doc_to_dict(s))

    month_services = [s for s in all_services if s.get("created_at", "") >= month_start]
    total_month = sum(s.get("value", 0) for s in month_services)
    total_all = sum(s.get("value", 0) for s in all_services)

    commission_type, default_commission = await get_workspace_commission(workspace_id)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    commission_pct = (user.get("commission_percentage") if commission_type == "individual" and user and user.get("commission_percentage") is not None else default_commission)

    return {
        "total_month": total_month, "total_all": total_all,
        "commission_month": total_month * commission_pct / 100,
        "commission_percentage": commission_pct,
        "services_count": len(all_services), "services_count_month": len(month_services),
        "recent_services": all_services[:10]
    }

@api_router.get("/dashboard/admin")
async def admin_dashboard(current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()

    all_month_services = []
    async for s in db.services.find({"workspace_id": workspace_id, "created_at": {"$gte": month_start}}):
        all_month_services.append(doc_to_dict(s))

    total_month = sum(s.get("value", 0) for s in all_month_services)
    total_services = await db.services.count_documents({"workspace_id": workspace_id})

    commission_type, default_commission = await get_workspace_commission(workspace_id)

    mechanics = []
    async for m in db.users.find({"workspace_id": workspace_id, "role": "mechanic"}):
        mechanics.append(doc_to_dict(m, exclude=["password_hash"]))

    mechanic_stats = []
    for m in mechanics:
        mid = m.get("id")
        m_services = [s for s in all_month_services if s.get("mechanic_id") == mid]
        m_total = sum(s.get("value", 0) for s in m_services)
        commission_pct = (m.get("commission_percentage") if commission_type == "individual" and m.get("commission_percentage") is not None else default_commission)
        mechanic_stats.append({
            "id": mid, "name": m.get("name"), "email": m.get("email"),
            "total_month": m_total, "commission": m_total * commission_pct / 100,
            "commission_percentage": commission_pct, "services_count": len(m_services),
            "is_active": m.get("is_active", True)
        })
    mechanic_stats.sort(key=lambda x: x["total_month"], reverse=True)

    mechanic_names = {m["id"]: m["name"] for m in mechanic_stats if m.get("id")}
    recent_services = []
    async for s in db.services.find({"workspace_id": workspace_id}).sort("created_at", -1).limit(10):
        sd = doc_to_dict(s)
        sd["mechanic_name"] = mechanic_names.get(sd.get("mechanic_id", ""), "N/A")
        recent_services.append(sd)

    month_names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    monthly_chart = []
    for i in range(5, -1, -1):
        offset_days = i * 30
        target = now - timedelta(days=offset_days)
        m_start = datetime(target.year, target.month, 1, tzinfo=timezone.utc).isoformat()
        if target.month == 12:
            m_end = datetime(target.year + 1, 1, 1, tzinfo=timezone.utc).isoformat()
        else:
            m_end = datetime(target.year, target.month + 1, 1, tzinfo=timezone.utc).isoformat()
        month_svcs = await db.services.find(
            {"workspace_id": workspace_id, "created_at": {"$gte": m_start, "$lt": m_end}},
            {"value": 1}
        ).to_list(10000)
        monthly_chart.append({
            "month": month_names[target.month - 1],
            "total": sum(s.get("value", 0) for s in month_svcs),
            "count": len(month_svcs)
        })

    return {
        "total_month": total_month, "total_services": total_services,
        "mechanics_count": len(mechanics), "services_month_count": len(all_month_services),
        "mechanic_ranking": mechanic_stats, "recent_services": recent_services,
        "monthly_chart": monthly_chart
    }

# ============ REPORTS ROUTES ============
@api_router.get("/reports/export")
async def export_report(
    format: str = Query("excel"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    mechanic_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_admin_user)
):
    workspace_id = current_user.get("workspace_id")
    query = {"workspace_id": workspace_id}
    if mechanic_id:
        query["mechanic_id"] = mechanic_id
    if start_date or end_date:
        date_query = {}
        if start_date: date_query["$gte"] = start_date
        if end_date: date_query["$lte"] = end_date + "T23:59:59"
        query["created_at"] = date_query

    services = []
    async for s in db.services.find(query).sort("created_at", -1):
        services.append(doc_to_dict(s))

    mechanics_map = {}
    async for m in db.users.find({"workspace_id": workspace_id, "role": "mechanic"}):
        mechanics_map[str(m["_id"])] = m.get("name", "N/A")

    w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    workspace_name = w.get("name", "AutoGestão") if w else "AutoGestão"

    commission_type, default_commission = await get_workspace_commission(workspace_id)

    if format == "pdf":
        try:
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)
            story = []
            styles = getSampleStyleSheet()

            story.append(Paragraph(f"Relatório de Serviços - {workspace_name}", styles['Title']))
            period_str = ""
            if start_date: period_str += f"De: {start_date} "
            if end_date: period_str += f"Até: {end_date}"
            if period_str:
                story.append(Paragraph(period_str, styles['Normal']))
            story.append(Spacer(1, 10))

            header = ['Data', 'Mecânico', 'Cliente', 'Descrição', 'Valor (R$)', 'Comissão (R$)']
            rows = [header]
            total = 0
            total_commission = 0
            for s in services:
                val = s.get('value', 0)
                total += val
                mname = mechanics_map.get(s.get('mechanic_id', ''), 'N/A')
                commission_pct = default_commission
                commission_val = val * commission_pct / 100
                total_commission += commission_val
                rows.append([
                    s.get('created_at', '')[:10], mname,
                    s.get('client_name', ''), (s.get('description') or '')[:40],
                    f"R$ {val:.2f}", f"R$ {commission_val:.2f}"
                ])
            rows.append(['', '', '', 'TOTAL', f"R$ {total:.2f}", f"R$ {total_commission:.2f}"])

            t = Table(rows, colWidths=[70, 100, 100, 150, 80, 80])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#DBEAFE')),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('ROWBACKGROUNDS', (0, 1), (-2, -2), [colors.white, colors.HexColor('#F8FAFC')]),
            ]))
            story.append(t)
            doc.build(story)
            buffer.seek(0)
            fname = f"relatorio_{datetime.now().strftime('%Y%m%d')}.pdf"
            return StreamingResponse(io.BytesIO(buffer.read()), media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={fname}"})
        except ImportError:
            raise HTTPException(500, "Biblioteca reportlab não encontrada")
    else:
        rows = []
        for s in services:
            val = s.get('value', 0)
            mname = mechanics_map.get(s.get('mechanic_id', ''), 'N/A')
            commission_val = val * default_commission / 100
            rows.append({
                'Data': s.get('created_at', '')[:10], 'Mecânico': mname,
                'Cliente': s.get('client_name', ''), 'Descrição': s.get('description') or '',
                'Valor (R$)': val, 'Comissão (R$)': commission_val
            })
        df = pd.DataFrame(rows)
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False, engine='openpyxl')
        buffer.seek(0)
        fname = f"relatorio_{datetime.now().strftime('%Y%m%d')}.xlsx"
        return StreamingResponse(io.BytesIO(buffer.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={fname}"})

# ============ SETTINGS ROUTES ============
@api_router.get("/settings")
async def get_settings_route(current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not w:
        raise HTTPException(404, "Workspace não encontrado")
    return doc_to_dict(w)

@api_router.put("/settings")
async def update_settings(data: WorkspaceUpdate, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    update_data = {}
    if data.name is not None: update_data["name"] = data.name
    if data.phone is not None: update_data["phone"] = data.phone
    if data.commission_type is not None: update_data["commission_type"] = data.commission_type
    if data.commission_percentage is not None: update_data["commission_percentage"] = data.commission_percentage
    if update_data:
        await db.workspaces.update_one({"_id": ObjectId(workspace_id)}, {"$set": update_data})
    return {"message": "Configurações atualizadas com sucesso"}

# ============ BILLING ROUTES ============
@api_router.get("/billing/plans")
async def get_plans():
    return {"plans": [{"id": k, **v} for k, v in PLANS.items()]}

@api_router.get("/billing/subscription")
async def get_subscription(current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not w:
        raise HTTPException(404, "Workspace não encontrado")
    plan = w.get("plan", "basic")
    plan_info = PLANS.get(plan, PLANS["basic"])
    mechanic_count = await db.users.count_documents({"workspace_id": workspace_id, "role": "mechanic", "is_active": True})
    return {
        "plan": plan, "plan_name": plan_info["name"], "plan_price": plan_info["price"],
        "plan_max_mechanics": plan_info["max_mechanics"], "status": w.get("status", "active"),
        "current_mechanics": mechanic_count, "asaas_customer_id": w.get("asaas_customer_id"),
        "asaas_subscription_id": w.get("asaas_subscription_id")
    }

@api_router.post("/billing/checkout")
async def create_checkout(data: CheckoutCreate, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not ASAAS_API_KEY:
        raise HTTPException(503, "Integração de pagamento não configurada. Contate o suporte.")
    plan = w.get("plan", "basic") if w else "basic"
    customer_id = w.get("asaas_customer_id") if w else None
    if not customer_id:
        customer = asaas_create_customer(current_user.get("name", ""), current_user.get("email", ""), data.cpf_cnpj, data.phone)
        if not customer:
            raise HTTPException(500, "Erro ao criar cliente no gateway de pagamento")
        customer_id = customer.get("id")
        await db.workspaces.update_one({"_id": ObjectId(workspace_id)}, {"$set": {"asaas_customer_id": customer_id, "cpf_cnpj": data.cpf_cnpj}})
    sub = asaas_create_subscription(customer_id, plan, data.billing_type)
    if not sub:
        raise HTTPException(500, "Erro ao criar assinatura")
    await db.workspaces.update_one({"_id": ObjectId(workspace_id)}, {"$set": {"asaas_subscription_id": sub.get("id")}})
    return {
        "subscription_id": sub.get("id"),
        "checkout_url": sub.get("invoiceUrl") or sub.get("bankSlipUrl"),
        "billing_type": data.billing_type,
        "value": PLANS.get(plan, PLANS["basic"])["price"]
    }

@api_router.put("/billing/plan")
async def upgrade_plan(data: PlanUpgrade, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    if data.plan not in PLANS:
        raise HTTPException(400, "Plano inválido")
    await db.workspaces.update_one({"_id": ObjectId(workspace_id)}, {"$set": {"plan": data.plan}})
    return {"message": f"Plano alterado para {PLANS[data.plan]['name']}", "plan": data.plan}

# ============ WEBHOOK ============
@api_router.post("/webhooks/asaas")
async def asaas_webhook(request: Request):
    try:
        payload = await request.json()
        event_type = payload.get("event")
        logger.info(f"Asaas webhook: {event_type}")
        if event_type in ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]:
            payment_data = payload.get("payment", {})
            subscription_id = payment_data.get("subscription")
            if subscription_id:
                w = await db.workspaces.find_one({"asaas_subscription_id": subscription_id})
                if w:
                    await db.workspaces.update_one({"_id": w["_id"]}, {"$set": {"status": "active"}})
                    logger.info(f"Workspace ativado: {str(w['_id'])}")
        return Response(status_code=200)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return Response(status_code=200)

# ============ INCLUDE ROUTER ============
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown():
    mongo_client.close()
