from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends

from app.database import db
from app.dependencies import get_current_user
from app.services.auth_utils import doc_to_dict
from app.services.mechanics_helpers import get_workspace_commission

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/mechanic")
async def mechanic_dashboard(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    workspace_id = current_user.get("workspace_id")
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()

    all_services = []
    async for s in db.services.find({"mechanic_id": user_id, "workspace_id": workspace_id}).sort(
        "created_at", -1
    ):
        all_services.append(doc_to_dict(s))

    month_services = [s for s in all_services if s.get("created_at", "") >= month_start]
    total_month = sum(s.get("value", 0) for s in month_services)
    total_all = sum(s.get("value", 0) for s in all_services)

    commission_type, default_commission = await get_workspace_commission(workspace_id)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    commission_pct = (
        user.get("commission_percentage")
        if commission_type == "individual" and user and user.get("commission_percentage") is not None
        else default_commission
    )

    return {
        "total_month": total_month,
        "total_all": total_all,
        "commission_month": total_month * commission_pct / 100,
        "commission_percentage": commission_pct,
        "services_count": len(all_services),
        "services_count_month": len(month_services),
        "recent_services": all_services[:10],
    }


@router.get("/dashboard/admin")
async def admin_dashboard(current_user: dict = Depends(get_current_user)):
    workspace_id = current_user.get("workspace_id")
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()

    all_month_services = []
    async for s in db.services.find(
        {"workspace_id": workspace_id, "created_at": {"$gte": month_start}}
    ):
        all_month_services.append(doc_to_dict(s))

    total_month = sum(s.get("value", 0) for s in all_month_services)
    total_services = await db.services.count_documents({"workspace_id": workspace_id})

    commission_type, default_commission = await get_workspace_commission(workspace_id)

    all_users = []
    async for u in db.users.find({"workspace_id": workspace_id}):
        all_users.append(doc_to_dict(u, exclude=["password_hash"]))

    mechanics = [u for u in all_users if u.get("role") == "mechanic"]

    mechanic_stats = []
    for u in all_users:
        uid = u.get("id")
        u_services = [s for s in all_month_services if s.get("mechanic_id") == uid]
        if not u_services and u.get("role") != "mechanic":
            continue

        u_total = sum(s.get("value", 0) for s in u_services)
        commission_pct = (
            u.get("commission_percentage")
            if commission_type == "individual" and u.get("commission_percentage") is not None
            else default_commission
        )
        mechanic_stats.append(
            {
                "id": uid,
                "name": u.get("name"),
                "email": u.get("email"),
                "role": u.get("role"),
                "total_month": u_total,
                "commission": u_total * commission_pct / 100,
                "commission_percentage": commission_pct,
                "services_count": len(u_services),
                "is_active": u.get("is_active", True),
            }
        )
    mechanic_stats.sort(key=lambda x: x["total_month"], reverse=True)

    mechanic_names = {u["id"]: u["name"] for u in all_users if u.get("id")}
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
            {"value": 1},
        ).to_list(10000)
        monthly_chart.append(
            {
                "month": month_names[target.month - 1],
                "total": sum(s.get("value", 0) for s in month_svcs),
                "count": len(month_svcs),
            }
        )

    return {
        "total_month": total_month,
        "total_services": total_services,
        "mechanics_count": len(mechanics),
        "services_month_count": len(all_month_services),
        "mechanic_ranking": mechanic_stats,
        "recent_services": recent_services,
        "monthly_chart": monthly_chart,
    }
