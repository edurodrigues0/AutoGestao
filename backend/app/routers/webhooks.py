import logging

from fastapi import APIRouter, Request, Response

from app.database import db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["webhooks"])


@router.post("/webhooks/asaas")
async def asaas_webhook(request: Request):
    try:
        payload = await request.json()
        event_type = payload.get("event")
        logger.info("Asaas webhook: %s | keys: %s", event_type, list(payload.keys()))

        if event_type in ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]:
            payment_data = payload.get("payment", {})
            subscription_id = payment_data.get("subscription")
            customer_id = payment_data.get("customer")
            checkout_id = payment_data.get("checkoutSession")

            workspace = None
            if subscription_id:
                workspace = await db.workspaces.find_one({"asaas_subscription_id": subscription_id})
            if not workspace and checkout_id:
                workspace = await db.workspaces.find_one({"asaas_checkout_id": checkout_id})
            if not workspace and customer_id:
                workspace = await db.workspaces.find_one({"asaas_customer_id": customer_id})

            if workspace:
                update = {"status": "active"}
                if subscription_id and not workspace.get("asaas_subscription_id"):
                    update["asaas_subscription_id"] = subscription_id
                await db.workspaces.update_one({"_id": workspace["_id"]}, {"$set": update})
                logger.info("Workspace ativado: %s", str(workspace["_id"]))
            else:
                logger.warning(
                    "Webhook: workspace não encontrado sub=%s customer=%s",
                    subscription_id,
                    customer_id,
                )

        elif event_type == "PAYMENT_OVERDUE":
            payment_data = payload.get("payment", {})
            subscription_id = payment_data.get("subscription")
            customer_id = payment_data.get("customer")

            workspace = None
            if subscription_id:
                workspace = await db.workspaces.find_one({"asaas_subscription_id": subscription_id})
            if not workspace and customer_id:
                workspace = await db.workspaces.find_one({"asaas_customer_id": customer_id})

            if workspace:
                await db.workspaces.update_one(
                    {"_id": workspace["_id"]}, {"$set": {"status": "overdue"}}
                )
                logger.info("Workspace marcado como inadimplente: %s", str(workspace["_id"]))
            else:
                logger.warning(
                    "Webhook PAYMENT_OVERDUE: workspace não encontrado sub=%s customer=%s",
                    subscription_id,
                    customer_id,
                )

        elif event_type == "SUBSCRIPTION_INACTIVATED":
            sub_id = payload.get("subscription", {}).get("id")
            if sub_id:
                workspace = await db.workspaces.find_one({"asaas_subscription_id": sub_id})
                if workspace:
                    await db.workspaces.update_one(
                        {"_id": workspace["_id"]}, {"$set": {"status": "inactive"}}
                    )
                    logger.info("Workspace desativado: %s", str(workspace["_id"]))

        return Response(status_code=200)
    except Exception as e:
        logger.error("Webhook error: %s", e)
        return Response(status_code=200)
