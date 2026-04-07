import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from app.database import db, mongo_client
from app.services.auth_utils import hash_password, verify_password
from app.services.storage import ensure_minio_bucket

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app):
    await db.users.create_index("email", unique=True)
    await db.workspaces.create_index("email")
    await db.services.create_index([("workspace_id", 1), ("mechanic_id", 1)])
    await db.login_attempts.create_index("identifier")
    await db.login_attempts.create_index("last_attempt")

    try:
        ensure_minio_bucket()
        logger.info("Storage (MinIO) initialized successfully")
    except Exception as e:
        logger.error("Storage init failed: %s", e)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@autogestao.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

    from bson import ObjectId
    from datetime import datetime, timezone

    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        ws_id = ObjectId()
        await db.workspaces.insert_one(
            {
                "_id": ws_id,
                "id": str(ws_id),
                "name": "AutoGestão Principal",
                "email": admin_email,
                "plan": "premium",
                "status": "active",
                "commission_type": "fixed",
                "commission_percentage": 10.0,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        u_id = ObjectId()
        await db.users.insert_one(
            {
                "_id": u_id,
                "id": str(u_id),
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "name": "Administrador",
                "role": "admin",
                "workspace_id": str(ws_id),
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        logger.info("Admin criado: %s", admin_email)
    elif existing and not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}}
        )

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

    yield

    mongo_client.close()
