from fastapi import APIRouter

from app.routers import auth, billing, dashboard, mechanics, reports, services_routes, settings, webhooks

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(services_routes.router)
api_router.include_router(mechanics.router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)
api_router.include_router(settings.router)
api_router.include_router(billing.router)
api_router.include_router(webhooks.router)
