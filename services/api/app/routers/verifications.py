from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..auth import require_role
from ..db import execute, fetch_all, fetch_one, get_db
from ..notify import notify

router = APIRouter(prefix="/verifications", tags=["verifications"])

verifier = require_role("verifier", "admin")


class Decision(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")
    comment: str | None = None


def _next_report_no(conn):
    """CC-<Buddhist year>-<running number>, e.g. CC-2569-000004."""
    prefix = f"CC-{date.today().year + 543}-"
    last = fetch_one(
        conn,
        "SELECT MAX(report_no) AS no FROM ghg_reports WHERE report_no LIKE :p",
        p=prefix + "%",
    )["no"]
    seq = int(last.rsplit("-", 1)[1]) + 1 if last else 1
    return f"{prefix}{seq:06d}"


def _get(conn, verification_id):
    v = fetch_one(
        conn,
        """SELECT v.*, c.cycle_name, p.plot_name, p.owner_user_id
           FROM verifications v
           JOIN crop_cycles c ON c.cycle_id = v.cycle_id
           JOIN plots p ON p.plot_id = c.plot_id
           WHERE v.verification_id = :id""",
        id=verification_id,
    )
    if not v:
        raise HTTPException(404, "ไม่พบคำขอตรวจสอบ")
    return v


@router.get("")
def list_verifications(status: str | None = None, user=Depends(verifier), conn=Depends(get_db)):
    return fetch_all(
        conn,
        """SELECT v.verification_id, v.status, v.submitted_at, v.decided_at, v.comment,
                  c.cycle_id, c.cycle_name, c.rice_variety, c.start_date, c.end_date,
                  p.plot_name, p.area_rai, p.province, p.district,
                  owner.display_name AS farmer_name,
                  rev.display_name AS verifier_name,
                  e.method_version, e.reduction_tco2e
           FROM verifications v
           JOIN crop_cycles c ON c.cycle_id = v.cycle_id
           JOIN plots p ON p.plot_id = c.plot_id
           JOIN users owner ON owner.user_id = p.owner_user_id
           LEFT JOIN users rev ON rev.user_id = v.verifier_user_id
           LEFT JOIN ghg_estimates e ON e.estimate_id = v.estimate_id
           WHERE (:status IS NULL OR v.status = :status)
           ORDER BY FIELD(v.status, 'in_review', 'pending', 'rejected', 'approved'),
                    v.submitted_at DESC""",
        status=status,
    )


@router.post("/{verification_id}/claim")
def claim(verification_id: str, user=Depends(verifier), conn=Depends(get_db)):
    v = _get(conn, verification_id)
    if v["status"] != "pending":
        raise HTTPException(409, "คำขอนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ")
    execute(
        conn,
        """UPDATE verifications SET status = 'in_review', verifier_user_id = :uid
           WHERE verification_id = :id""",
        id=verification_id,
        uid=user["user_id"],
    )
    notify(conn, v["owner_user_id"], "verification_result",
           f'ผู้ตรวจสอบรับเรื่องรอบ "{v["cycle_name"]}" แล้ว อยู่ระหว่างตรวจสอบ')
    return {"ok": True}


@router.post("/{verification_id}/decide")
def decide(verification_id: str, body: Decision, user=Depends(verifier), conn=Depends(get_db)):
    v = _get(conn, verification_id)
    if v["status"] not in ("pending", "in_review"):
        raise HTTPException(409, "คำขอนี้ตัดสินผลไปแล้ว")
    if body.status == "rejected" and not (body.comment or "").strip():
        raise HTTPException(400, "กรุณาระบุเหตุผลที่ไม่ผ่าน")
    execute(
        conn,
        """UPDATE verifications
           SET status = :status, comment = :comment, decided_at = NOW(), verifier_user_id = :uid
           WHERE verification_id = :id""",
        id=verification_id,
        uid=user["user_id"],
        status=body.status,
        comment=body.comment,
    )

    report_id = None
    if body.status == "approved":
        estimate = fetch_one(
            conn, "SELECT reduction_tco2e FROM ghg_estimates WHERE estimate_id = :id", id=v["estimate_id"]
        )
        if not estimate:
            raise HTTPException(400, "คำขอนี้ไม่มีผลการคำนวณแนบมา")
        report_id = str(uuid4())
        execute(
            conn,
            """INSERT INTO ghg_reports (report_id, cycle_id, estimate_id, verification_id, report_no,
                                        reduction_tco2e, generated_by)
               VALUES (:id, :cid, :eid, :vid, :no, :reduction, :uid)""",
            id=report_id,
            cid=v["cycle_id"],
            eid=v["estimate_id"],
            vid=verification_id,
            no=_next_report_no(conn),
            reduction=estimate["reduction_tco2e"],
            uid=user["user_id"],
        )
        notify(conn, v["owner_user_id"], "verification_result",
               f'ผลตรวจสอบรอบ "{v["cycle_name"]}" : ผ่านการรับรอง ดาวน์โหลดรายงานได้แล้ว')
    else:
        notify(conn, v["owner_user_id"], "verification_result",
               f'ผลตรวจสอบรอบ "{v["cycle_name"]}" : ไม่ผ่าน เหตุผล: {body.comment}')
    return {"ok": True, "report_id": report_id}
