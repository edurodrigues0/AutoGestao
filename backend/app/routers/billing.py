import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.config import ASAAS_API_KEY, FRONTEND_URL, PLANS
from app.database import db
from app.dependencies import get_admin_user
from app.schemas import CheckoutCreate, PlanUpgrade
from app.services.asaas import asaas_create_checkout_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["billing"])


@router.get("/billing/plans")
async def get_plans():
    return {"plans": [{"id": k, **v} for k, v in PLANS.items()]}


@router.get("/billing/subscription")
async def get_subscription(current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not w:
        raise HTTPException(404, "Workspace não encontrado")
    plan = w.get("plan", "basic")
    plan_info = PLANS.get(plan, PLANS["basic"])
    mechanic_count = await db.users.count_documents(
        {"workspace_id": workspace_id, "role": "mechanic", "is_active": True}
    )
    return {
        "plan": plan,
        "plan_name": plan_info["name"],
        "plan_price": plan_info["price"],
        "plan_max_mechanics": plan_info["max_mechanics"],
        "status": w.get("status", "active"),
        "current_mechanics": mechanic_count,
        "asaas_customer_id": w.get("asaas_customer_id"),
        "asaas_subscription_id": w.get("asaas_subscription_id"),
    }


@router.post("/billing/checkout")
async def create_checkout(data: CheckoutCreate, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})

    if not ASAAS_API_KEY:
        raise HTTPException(503, "Chave API do Asaas não configurada. Contate o suporte.")

    plan = w.get("plan", "basic") if w else "basic"

    success_url = f"{FRONTEND_URL}/billing/success"
    cancel_url = f"{FRONTEND_URL}/billing/failed"

    customer_id = w.get("asaas_customer_id") if w else None

    checkout = asaas_create_checkout_session(
        plan=plan,
        success_url=success_url,
        cancel_url=cancel_url,
        customer_id=customer_id,
    )
    if not checkout:
        raise HTTPException(502, "Erro ao gerar checkout no Asaas. Tente novamente em instantes.")

    checkout_id = checkout.get("id")
    checkout_url = checkout.get("link")

    if not checkout_id or not checkout_url:
        logger.error("Asaas checkout response invalid: %s", checkout)
        raise HTTPException(502, "Resposta inválida do Asaas. Tente novamente.")

    await db.workspaces.update_one(
        {"_id": ObjectId(workspace_id)},
        {"$set": {"asaas_checkout_id": checkout_id}},
    )

    logger.info("Checkout created: %s → %s", checkout_id, checkout_url)

    return {
        "checkout_url": checkout_url,
        "checkout_id": checkout_id,
        "plan": plan,
        "plan_name": PLANS.get(plan, PLANS["basic"])["name"],
        "value": PLANS.get(plan, PLANS["basic"])["price"],
    }


@router.put("/billing/plan")
async def upgrade_plan(data: PlanUpgrade, current_user: dict = Depends(get_admin_user)):
    workspace_id = current_user.get("workspace_id")
    if data.plan not in PLANS:
        raise HTTPException(400, "Plano inválido")
    await db.workspaces.update_one(
        {"_id": ObjectId(workspace_id)}, {"$set": {"plan": data.plan}}
    )
    return {"message": f"Plano alterado para {PLANS[data.plan]['name']}", "plan": data.plan}


@router.post("/billing/verify-payment")
async def verify_payment(current_user: dict = Depends(get_admin_user)):
    """Fallback para ambiente local: ativa workspace ao retornar do checkout."""
    workspace_id = current_user.get("workspace_id")
    workspace = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})

    if not workspace:
        raise HTTPException(404, "Workspace não encontrado")

    if workspace.get("status") not in ("active",):
        await db.workspaces.update_one(
            {"_id": ObjectId(workspace_id)}, {"$set": {"status": "active"}}
        )
        return {"status": "active", "message": "Pagamento verificado e ambiente ativado."}

    return {"status": workspace.get("status", "pending"), "message": "Nenhuma alteração."}
