"""Verifier side of carboncredit_info: not_checked -> passed (with THB amount) or failed."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..auth import require_role
from ..config import settings
from ..db import execute, fetch_all, fetch_one, get_db
from ..errors import api_error
from ..notify import notify
from ..services.calendar import describe, season_label

router = APIRouter(prefix="/credits", tags=["credits"])

verifier = require_role("verifier", "admin")


class Decision(BaseModel):
    status: str = Field(pattern="^(passed|failed)$")
    comment: str | None = None


@router.get("")
def list_credits(status: str | None = None, user=Depends(verifier), conn=Depends(get_db)):
    rows = fetch_all(
        conn,
        """SELECT cc.credit_id, cc.credit_tco2e, cc.credit_status, cc.amount_thb, cc.submitted_at,
                  cc.verified_at, cc.verify_comment,
                  fc.calendar_id, fc.paddy_id, fc.rice_variety, fc.planting_date, fc.harvest_date,
                  p.paddy_name, p.area_rai, p.province, p.district,
                  owner.display_name AS farmer_name, rev.display_name AS verifier_name
           FROM carboncredit_info cc
           JOIN farming_calendars fc ON fc.calendar_id = cc.calendar_id
           JOIN paddy p ON p.paddy_id = cc.paddy_id
           JOIN users owner ON owner.user_id = p.owner_user_id
           LEFT JOIN users rev ON rev.user_id = cc.verified_by
           WHERE (:status IS NULL OR cc.credit_status = :status)
           ORDER BY FIELD(cc.credit_status, 'not_checked', 'failed', 'passed'), cc.submitted_at DESC""",
        status=status,
    )
    return [describe(r) for r in rows]


@router.post("/{credit_id}/decide")
def decide(credit_id: str, body: Decision, user=Depends(verifier), conn=Depends(get_db)):
    credit = fetch_one(
        conn,
        """SELECT cc.credit_status, cc.credit_tco2e, fc.planting_date, p.paddy_name, p.owner_user_id
           FROM carboncredit_info cc
           JOIN farming_calendars fc ON fc.calendar_id = cc.calendar_id
           JOIN paddy p ON p.paddy_id = cc.paddy_id
           WHERE cc.credit_id = :id""",
        id=credit_id,
    )
    if not credit:
        raise api_error(404, "credit_not_found", "Verification request not found")
    if credit["credit_status"] != "not_checked":
        raise api_error(409, "already_decided", "This request has already been decided")
    if body.status == "failed" and not (body.comment or "").strip():
        raise api_error(400, "reason_required", "Give a reason when failing a request")

    # amount_thb may only be set on passed credits (chk_credit_amount)
    amount = round(float(credit["credit_tco2e"]) * settings.carbon_price_thb, 2) if body.status == "passed" else None
    execute(
        conn,
        """UPDATE carboncredit_info
           SET credit_status = :status, amount_thb = :amount, verified_by = :uid,
               verified_at = NOW(), verify_comment = :comment
           WHERE credit_id = :id""",
        id=credit_id,
        status=body.status,
        amount=amount,
        uid=user["user_id"],
        comment=(body.comment or "").strip() or None,
    )

    label = f'{season_label(credit["planting_date"])}, paddy "{credit["paddy_name"]}"'
    if body.status == "passed":
        notify(conn, credit["owner_user_id"], "verification_result",
               f"{label}: verified, {credit['credit_tco2e']} tCO₂e. Your certificate is ready.")
    else:
        notify(conn, credit["owner_user_id"], "verification_result",
               f"{label}: not verified. Reason: {body.comment.strip()}")
    return {"ok": True, "amount_thb": amount}
