from collections import defaultdict
from datetime import date, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from ..access import WRITE_ROLES, require_cycle
from ..auth import current_user
from ..db import execute, fetch_all, fetch_one, get_db
from ..services import ghg
from ..services.activities import record_activity
from ..services.water import water_series

router = APIRouter(prefix="/cycles", tags=["cycles"])

# What farmers record themselves; everything about water comes from the IoT sensor
ACTIVITY_TYPES = "^(planting|fertilizing|harvest)$"
PHOTO_REQUIRED = ("planting", "harvest")


class CyclePatch(BaseModel):
    status: str | None = Field(None, pattern="^(planned|active|harvested|closed)$")
    end_date: date | None = None


def _latest_estimate(conn, cycle_id):
    return fetch_one(
        conn,
        """SELECT estimate_id, method_version, baseline_tco2e, project_tco2e, reduction_tco2e,
                  calculated_at
           FROM ghg_estimates WHERE cycle_id = :id ORDER BY calculated_at DESC LIMIT 1""",
        id=cycle_id,
    )


def _area_rai(conn, plot_id):
    return fetch_one(conn, "SELECT area_rai FROM plots WHERE plot_id = :id", id=plot_id)["area_rai"]


def _activities(conn, cycle_id):
    activities = fetch_all(
        conn,
        """SELECT a.activity_id, a.activity_type, a.activity_date, a.note,
                  a.fertilizer_formula, a.fertilizer_kg_per_rai,
                  u.display_name AS recorded_by_name
           FROM activities a JOIN users u ON u.user_id = a.recorded_by
           WHERE a.cycle_id = :id ORDER BY a.activity_date DESC, a.created_at DESC""",
        id=cycle_id,
    )
    evidence = defaultdict(list)
    for e in fetch_all(
        conn,
        """SELECT e.evidence_id, e.activity_id, e.file_path, e.captured_at, e.latitude, e.longitude
           FROM activity_evidence e JOIN activities a ON a.activity_id = e.activity_id
           WHERE a.cycle_id = :id""",
        id=cycle_id,
    ):
        evidence[e["activity_id"]].append(e)
    for a in activities:
        a["evidence"] = evidence[a["activity_id"]]
    return activities


def _fertilizer_summary(activities, area_rai):
    """Total fertilizer per formula for the cycle."""
    per_rai = defaultdict(float)
    for a in activities:
        if a["activity_type"] == "fertilizing" and a["fertilizer_kg_per_rai"] is not None:
            per_rai[a["fertilizer_formula"] or "-"] += float(a["fertilizer_kg_per_rai"])
    return [
        {"formula": f, "kg_per_rai": round(kg, 2), "total_kg": round(kg * float(area_rai), 1)}
        for f, kg in per_rai.items()
    ]


@router.get("/{cycle_id}")
def get_cycle(cycle_id: str, user=Depends(current_user), conn=Depends(get_db)):
    cycle = require_cycle(conn, user, cycle_id)
    cycle["can_edit"] = cycle["my_role"] in WRITE_ROLES
    cycle["plot"] = fetch_one(
        conn,
        """SELECT p.plot_id, p.plot_name, p.area_rai, p.latitude, p.longitude, p.province,
                  p.district, u.display_name AS owner_name
           FROM plots p JOIN users u ON u.user_id = p.owner_user_id WHERE p.plot_id = :id""",
        id=cycle["plot_id"],
    )
    cycle["activities"] = _activities(conn, cycle_id)
    cycle["fertilizer"] = _fertilizer_summary(cycle["activities"], cycle["plot"]["area_rai"])
    cycle["has_planting_photo"] = any(
        a["activity_type"] == "planting" and a["evidence"] for a in cycle["activities"]
    )
    series = water_series(conn, cycle)
    cycle["water_series"] = series
    cycle["mrv_preview"] = ghg.estimate(cycle, cycle["plot"]["area_rai"], series)
    cycle["phases"] = cycle["mrv_preview"]["phases"]
    cycle["latest_estimate"] = _latest_estimate(conn, cycle_id)
    cycle["verifications"] = fetch_all(
        conn,
        """SELECT v.verification_id, v.status, v.submitted_at, v.decided_at, v.comment,
                  v.estimate_id, u.display_name AS verifier_name
           FROM verifications v LEFT JOIN users u ON u.user_id = v.verifier_user_id
           WHERE v.cycle_id = :id ORDER BY v.submitted_at DESC""",
        id=cycle_id,
    )
    cycle["reports"] = fetch_all(
        conn,
        """SELECT report_id, report_no, reduction_tco2e, generated_at
           FROM ghg_reports WHERE cycle_id = :id ORDER BY generated_at DESC""",
        id=cycle_id,
    )
    return cycle


@router.patch("/{cycle_id}")
def update_cycle(cycle_id: str, body: CyclePatch, user=Depends(current_user), conn=Depends(get_db)):
    require_cycle(conn, user, cycle_id, write=True)
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        return {"ok": True}
    sets = ", ".join(f"{k} = :{k}" for k in changes)
    execute(conn, f"UPDATE crop_cycles SET {sets} WHERE cycle_id = :id", id=cycle_id, **changes)
    return {"ok": True}


@router.post("/{cycle_id}/activities", status_code=201)
def add_activity(
    cycle_id: str,
    activity_type: str = Form(..., pattern=ACTIVITY_TYPES),
    activity_date: date = Form(...),
    note: str | None = Form(None),
    fertilizer_formula: str | None = Form(None, max_length=20),
    fertilizer_kg_per_rai: float | None = Form(None, gt=0, le=500),
    photo: UploadFile | None = File(None),
    latitude: float | None = Form(None, ge=-90, le=90),
    longitude: float | None = Form(None, ge=-180, le=180),
    captured_at: datetime | None = Form(None),
    user=Depends(current_user),
    conn=Depends(get_db),
):
    cycle = require_cycle(conn, user, cycle_id, write=True)
    has_photo = photo is not None and bool(photo.filename)
    if activity_type in PHOTO_REQUIRED and not has_photo:
        raise HTTPException(400, "กรุณาถ่ายรูปแปลงนาเป็นหลักฐาน")
    if activity_type == "fertilizing" and not (fertilizer_formula and fertilizer_kg_per_rai):
        raise HTTPException(400, "กรุณาระบุสูตรปุ๋ยและจำนวน (กก./ไร่)")
    if activity_date < cycle["start_date"]:
        raise HTTPException(400, "วันที่ต้องไม่ก่อนวันเริ่มปลูก")
    if activity_type == "harvest":
        if cycle["status"] != "active":
            raise HTTPException(409, "รอบนี้ไม่ได้อยู่ระหว่างปลูก")
        execute(
            conn,
            "UPDATE crop_cycles SET end_date = :d, status = 'harvested' WHERE cycle_id = :id",
            d=activity_date,
            id=cycle_id,
        )

    activity_id = record_activity(
        conn,
        cycle_id,
        user["user_id"],
        activity_type,
        activity_date,
        note=note,
        photo=photo if has_photo else None,
        latitude=latitude,
        longitude=longitude,
        captured_at=captured_at,
        fertilizer_formula=fertilizer_formula if activity_type == "fertilizing" else None,
        fertilizer_kg_per_rai=fertilizer_kg_per_rai if activity_type == "fertilizing" else None,
    )
    return {"activity_id": activity_id}


@router.post("/{cycle_id}/estimate", status_code=201)
def save_estimate(cycle_id: str, user=Depends(current_user), conn=Depends(get_db)):
    """Run the GHG model on the current sensor data and store the result."""
    cycle = require_cycle(conn, user, cycle_id, write=True)
    result = ghg.estimate(cycle, _area_rai(conn, cycle["plot_id"]), water_series(conn, cycle))
    estimate_id = str(uuid4())
    execute(
        conn,
        """INSERT INTO ghg_estimates (estimate_id, cycle_id, method_version, baseline_tco2e,
                                      project_tco2e, reduction_tco2e, calculated_by)
           VALUES (:id, :cid, :method, :baseline, :project, :reduction, :uid)""",
        id=estimate_id,
        cid=cycle_id,
        method=result["method_version"],
        baseline=result["baseline_tco2e"],
        project=result["project_tco2e"],
        reduction=result["reduction_tco2e"],
        uid=user["user_id"],
    )
    return {"estimate_id": estimate_id, **result}


@router.post("/{cycle_id}/submit", status_code=201)
def submit_for_verification(cycle_id: str, user=Depends(current_user), conn=Depends(get_db)):
    cycle = require_cycle(conn, user, cycle_id, write=True)
    if cycle["status"] not in ("harvested", "closed"):
        raise HTTPException(400, "ส่งตรวจสอบได้หลังบันทึกการเก็บเกี่ยวแล้ว")
    estimate = _latest_estimate(conn, cycle_id)
    if not estimate:
        raise HTTPException(400, "กรุณาคำนวณคาร์บอนก่อนส่งตรวจสอบ")
    open_request = fetch_one(
        conn,
        """SELECT verification_id FROM verifications
           WHERE cycle_id = :id AND status IN ('pending', 'in_review')""",
        id=cycle_id,
    )
    if open_request:
        raise HTTPException(409, "รอบนี้อยู่ระหว่างรอการตรวจสอบแล้ว")
    verification_id = str(uuid4())
    execute(
        conn,
        """INSERT INTO verifications (verification_id, cycle_id, estimate_id, status)
           VALUES (:id, :cid, :eid, 'pending')""",
        id=verification_id,
        cid=cycle_id,
        eid=estimate["estimate_id"],
    )
    return {"verification_id": verification_id}
