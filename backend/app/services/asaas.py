import json
import logging
from datetime import datetime, timedelta, timezone

import requests

from app.config import ASAAS_API_KEY, ASAAS_BASE_URL, PLANS

logger = logging.getLogger(__name__)


def get_asaas_headers():
    return {"access_token": ASAAS_API_KEY, "Content-Type": "application/json", "User-Agent": "AutoGestao/1.0"}


def asaas_create_checkout_session(
    plan: str, success_url: str, cancel_url: str, customer_id: str = None
) -> dict | None:
    """Create native Asaas checkout session for recurring subscription."""
    if not ASAAS_API_KEY:
        return None
    plan_info = PLANS.get(plan, PLANS["basic"])
    next_due = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    payload = {
        "callback": {
            "successUrl": success_url,
            "cancelUrl": cancel_url,
            "expiredUrl": cancel_url,
            "autoRedirect": True,
        },
        "items": [
            {
                "name": f"AutoGestão - Plano {plan_info['name']}",
                "description": f"Assinatura mensal - {plan_info['description']}",
                "quantity": 1,
                "value": plan_info["price"],
            }
        ],
        "billingTypes": ["CREDIT_CARD"],
        "chargeTypes": ["RECURRENT"],
        "subscription": {"cycle": "MONTHLY", "nextDueDate": next_due},
        "minutesToExpire": 1440,
    }
    logger.info("Asaas checkout payload: %s", json.dumps(payload, indent=2))
    if "localhost" in success_url or "127.0.0.1" in success_url:
        logger.warning("Using localhost in Asaas checkout callback - this often causes 400 errors in Sandbox.")
    if customer_id:
        payload["customer"] = customer_id
    try:
        resp = requests.post(
            f"{ASAAS_BASE_URL}/v3/checkouts",
            headers=get_asaas_headers(),
            json=payload,
            timeout=30,
        )
        logger.info("Asaas checkout status: %s | body: %s", resp.status_code, resp.text[:500])
        resp.raise_for_status()
        return resp.json()
    except requests.HTTPError as e:
        logger.error(
            "Asaas checkout HTTP error: %s | response: %s",
            e.response.status_code,
            e.response.text,
        )
        return None
    except Exception as e:
        logger.error("Asaas checkout error: %s", e)
        return None
