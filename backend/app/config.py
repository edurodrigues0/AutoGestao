import os

JWT_SECRET = os.environ.get("JWT_SECRET", "fallback-secret-key")
JWT_ALGORITHM = "HS256"
ASAAS_API_KEY = os.environ.get("ASAAS_API_KEY", "")
ASAAS_BASE_URL = os.environ.get("ASAAS_BASE_URL", "https://api-sandbox.asaas.com")
ASAAS_WALLET_ID = os.environ.get("ASAAS_WALLET_ID", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8001")
APP_NAME = "autogestao"

MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "autogestao")
MINIO_USE_SSL = os.environ.get("MINIO_USE_SSL", "false").lower() in ("1", "true", "yes")

COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() in ("1", "true", "yes")
_raw_samesite = os.environ.get("COOKIE_SAMESITE", "lax").strip().lower()
if _raw_samesite not in ("lax", "strict", "none"):
    _raw_samesite = "lax"
COOKIE_SAMESITE = _raw_samesite
# Navegadores exigem Secure quando SameSite=None
if COOKIE_SAMESITE == "none":
    COOKIE_SECURE = True


def get_cors_origins() -> list[str]:
    """Origens explícitas para credenciais (nunca '*')."""
    origins: set[str] = set()
    if FRONTEND_URL:
        origins.add(FRONTEND_URL.rstrip("/"))
    origins.add("http://localhost:3000")
    extra = os.environ.get("CORS_ORIGINS", "").strip()
    if extra and extra != "*":
        for part in extra.split(","):
            p = part.strip().rstrip("/")
            if p and p != "*":
                origins.add(p)
    return sorted(origins)


PLANS = {
    "basic": {"name": "Básico", "price": 69.90, "max_mechanics": 2, "description": "Até 2 mecânicos"},
    "pro": {"name": "Pro", "price": 149.90, "max_mechanics": 5, "description": "Até 5 mecânicos"},
    "premium": {"name": "Premium", "price": 249.90, "max_mechanics": -1, "description": "Mecânicos ilimitados"},
}
