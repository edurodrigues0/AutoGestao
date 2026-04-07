import io
from datetime import datetime
from typing import Optional

import pandas as pd
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.database import db
from app.dependencies import get_admin_user
from app.services.auth_utils import doc_to_dict
from app.services.mechanics_helpers import get_workspace_commission

router = APIRouter(tags=["reports"])


@router.get("/reports/export")
async def export_report(
    format: str = Query("excel"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    mechanic_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_admin_user),
):
    workspace_id = current_user.get("workspace_id")
    query = {"workspace_id": workspace_id}
    if mechanic_id:
        query["mechanic_id"] = mechanic_id
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date + "T23:59:59"
        query["created_at"] = date_query

    services = []
    async for s in db.services.find(query).sort("created_at", -1):
        services.append(doc_to_dict(s))

    mechanics_map = {}
    async for m in db.users.find({"workspace_id": workspace_id, "role": "mechanic"}):
        mechanics_map[str(m["_id"])] = m.get("name", "N/A")

    w = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    workspace_name = w.get("name", "AutoGestão") if w else "AutoGestão"

    _, default_commission = await get_workspace_commission(workspace_id)

    if format == "pdf":
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=landscape(A4),
                rightMargin=20,
                leftMargin=20,
                topMargin=20,
                bottomMargin=20,
            )
            story = []
            styles = getSampleStyleSheet()

            story.append(Paragraph(f"Relatório de Serviços - {workspace_name}", styles["Title"]))
            period_str = ""
            if start_date:
                period_str += f"De: {start_date} "
            if end_date:
                period_str += f"Até: {end_date}"
            if period_str:
                story.append(Paragraph(period_str, styles["Normal"]))
            story.append(Spacer(1, 10))

            header = ["Data", "Mecânico", "Cliente", "Descrição", "Valor (R$)", "Comissão (R$)"]
            rows = [header]
            total = 0
            total_commission = 0
            for s in services:
                val = s.get("value", 0)
                total += val
                mname = mechanics_map.get(s.get("mechanic_id", ""), "N/A")
                commission_pct = default_commission
                commission_val = val * commission_pct / 100
                total_commission += commission_val
                rows.append(
                    [
                        s.get("created_at", "")[:10],
                        mname,
                        s.get("client_name", ""),
                        (s.get("description") or "")[:40],
                        f"R$ {val:.2f}",
                        f"R$ {commission_val:.2f}",
                    ]
                )
            rows.append(["", "", "", "TOTAL", f"R$ {total:.2f}", f"R$ {total_commission:.2f}"])

            t = Table(rows, colWidths=[70, 100, 100, 150, 80, 80])
            t.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#DBEAFE")),
                        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                        ("ROWBACKGROUNDS", (0, 1), (-2, -2), [colors.white, colors.HexColor("#F8FAFC")]),
                    ]
                )
            )
            story.append(t)
            doc.build(story)
            buffer.seek(0)
            fname = f"relatorio_{datetime.now().strftime('%Y%m%d')}.pdf"
            return StreamingResponse(
                io.BytesIO(buffer.read()),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={fname}"},
            )
        except ImportError:
            raise HTTPException(500, "Biblioteca reportlab não encontrada")
    else:
        rows = []
        for s in services:
            val = s.get("value", 0)
            mname = mechanics_map.get(s.get("mechanic_id", ""), "N/A")
            commission_val = val * default_commission / 100
            rows.append(
                {
                    "Data": s.get("created_at", "")[:10],
                    "Mecânico": mname,
                    "Cliente": s.get("client_name", ""),
                    "Descrição": s.get("description") or "",
                    "Valor (R$)": val,
                    "Comissão (R$)": commission_val,
                }
            )
        df = pd.DataFrame(rows)
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False, engine="openpyxl")
        buffer.seek(0)
        fname = f"relatorio_{datetime.now().strftime('%Y%m%d')}.xlsx"
        return StreamingResponse(
            io.BytesIO(buffer.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={fname}"},
        )
