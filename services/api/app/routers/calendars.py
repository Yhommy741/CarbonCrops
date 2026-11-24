from collections import defaultdict
from datetime import date, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, UploadFile

from ..access import require_calendar
from ..auth import current_user
from ..db import execute, fetch_all, fetch_one, get_db
from ..errors import api_error
from ..services import ghg
from ..services.activities import record_activity
from ..services.calendar import describe, rice_stages, stage_on
from ..services.water import water_series

router = APIRouter(prefix="/calendars", tags=["calendars"])

# What farmers record themselves; everything about water comes from the IoT sensor
ACTIVITY_TYPES = "^(sowing|transplanting|fertilizing|harvest)$"
PLANTING_TYPES = ("sowing", "transplanting")
PHOTO_REQUIRED = (*PLANTING_TYPES, "harvest")

CREDIT_SQL = """
SELECT cc.credit_id, cc.credit_tco2e, cc.credit_status, cc.amount_thb, cc.submitted_at,
       cc.verified_at, cc.verify_comment, u.display_name AS verifier_name
FROM carboncredit_info cc LEFT JOIN users u ON u.user_id = cc.verified_by
WHERE cc.calendar_id = :id
"""


def _activities(conn, calendar_id):
    activities = fetch_all(
        conn,
        """SELECT a.activity_id, a.activity_type, a.activity_date, a.note, a.stage_no, s.stage_name,
                  a.fertilizer_formula, a.fertilizer_kg_per_rai
           FROM activities a JOIN rice_stages s ON s.stage_no = a.stage_no
           WHERE a.calendar_id = :id ORDER BY a.activity_date DESC, a.created_at DESC""",
        id=calendar_id,
    )
    evidence = defaultdict(list)
    for e in fetch_all(
        conn,
        """SELECT e.evidence_id, e.activity_id, e.file_path, e.captured_at, e.latitude, e.longitude
           FROM activity_evidence e JOIN activities a ON a.activity_id = e.activity_id
           WHERE a.calendar_id = :id""",
        id=calendar_id,
    ):
        evidence[e["activity_id"]].append(e)
    for a in activities:
        a["evidence"] = evidence[a["activity_id"]]
    return activities


def _fertilizer_summary(activities, area_rai):
    """Total fertilizer per formula for the calendar."""
    per_rai = defaultdict(float)
    for a in activities:
        if a["activity_type"] == "fertilizing" and a["fertilizer_kg_per_rai"] is not None:
            per_rai[a["fertilizer_formula"] or "-"] += float(a["fertilizer_kg_per_rai"])
    return [
        {"formula": f, "kg_per_rai": round(kg, 2), "total_kg": round(kg * float(area_rai), 1)}
        for f, kg in per_rai.items()
    ]


def mrv(conn, calendar, area_rai):
    return ghg.estimate(
        calendar["planting_date"], calendar["harvest_date"], area_rai, water_series(conn, calendar)
    )


@router.get("/{calendar_id}")
def get_calendar(calendar_id: str, user=Depends(current_user), conn=Depends(get_db)):
    calendar = describe(require_calendar(conn, user, calendar_id))
    paddy = calendar.pop("paddy")
    calendar["paddy"] = {
        k: paddy[k] for k in ("paddy_id", "paddy_name", "area_rai", "latitude", "longitude", "province", "district")
    }
    calendar["paddy"]["owner_name"] = fetch_one(
        conn, "SELECT display_name FROM users WHERE user_id = :id", id=paddy["owner_user_id"]
    )["display_name"]

    stages = rice_stages(conn)
    if calendar["status"] == "active":
        calendar["current_stage"] = stage_on(stages, calendar["planting_date"], date.today())
    calendar["activities"] = _activities(conn, calendar_id)
    calendar["fertilizer"] = _fertilizer_summary(calendar["activities"], paddy["area_rai"])
    calendar["has_planting_photo"] = any(
        a["activity_type"] in PLANTING_TYPES and a["evidence"] for a in calendar["activities"]
    )
    series = water_series(conn, calendar)
    calendar["water_series"] = series
    calendar["mrv_preview"] = ghg.estimate(
        calendar["planting_date"], calendar["harvest_date"], paddy["area_rai"], series
    )
    calendar["phases"] = calendar["mrv_preview"]["phases"]
    calendar["credit"] = fetch_one(conn, CREDIT_SQL, id=calendar_id)
    return calendar


@router.post("/{calendar_id}/activities", status_code=201)
def add_activity(
    calendar_id: str,
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
    calendar = require_calendar(conn, user, calendar_id, write=True)
    has_photo = photo is not None and bool(photo.filename)
    if activity_type in PHOTO_REQUIRED and not has_photo:
        raise api_error(400, "photo_required", "A photo of the paddy is required as evidence")
    if activity_type == "fertilizing" and not (fertilizer_formula and fertilizer_kg_per_rai):
        raise api_error(400, "fertilizer_required", "Enter the fertilizer formula and amount (kg/rai)")
    if activity_date > date.today():
        raise api_error(400, "date_in_future", "The date can't be in the future")
    if activity_type == "harvest":
        if calendar["harvest_date"] is not None:
            raise api_error(409, "already_harvested", "This crop has already been harvested")
        if activity_date < calendar["planting_date"]:
            raise api_error(400, "harvest_before_planting", "Harvest date can't be before the planting date")
        execute(
            conn,
            "UPDATE farming_calendars SET harvest_date = :d WHERE calendar_id = :id",
            d=activity_date,
            id=calendar_id,
        )

    activity_id = record_activity(
        conn,
        calendar,
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


@router.post("/{calendar_id}/submit", status_code=201)
def submit_for_verification(calendar_id: str, user=Depends(current_user), conn=Depends(get_db)):
    """Send the calendar's carbon credit (computed from the sensor data now) to a verifier."""
    calendar = require_calendar(conn, user, calendar_id, write=True)
    if calendar["harvest_date"] is None:
        raise api_error(400, "harvest_first", "Record the harvest before submitting for verification")
    reduction = mrv(conn, calendar, calendar["paddy"]["area_rai"])["reduction_tco2e"]
    if reduction <= 0:
        raise api_error(400, "no_reduction", "The sensor data shows no qualifying drying period, so there is no reduction to claim")

    existing = fetch_one(
        conn, "SELECT credit_id, credit_status FROM carboncredit_info WHERE calendar_id = :id", id=calendar_id
    )
    if existing and existing["credit_status"] != "failed":
        raise api_error(409, "already_submitted", "This crop has already been submitted")
    if existing:  # one row per calendar: a failed request is sent again on the same row
        execute(
            conn,
            """UPDATE carboncredit_info
               SET credit_tco2e = :t, credit_status = 'not_checked', amount_thb = NULL,
                   submitted_at = NOW(), verified_by = NULL, verified_at = NULL, verify_comment = NULL
               WHERE credit_id = :id""",
            t=reduction,
            id=existing["credit_id"],
        )
        return {"credit_id": existing["credit_id"]}

    credit_id = str(uuid4())
    execute(
        conn,
        """INSERT INTO carboncredit_info (credit_id, calendar_id, paddy_id, credit_tco2e)
           VALUES (:id, :cal, :paddy, :t)""",
        id=credit_id,
        cal=calendar_id,
        paddy=calendar["paddy_id"],
        t=reduction,
    )
    return {"credit_id": credit_id}
