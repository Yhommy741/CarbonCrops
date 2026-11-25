from collections import defaultdict
from datetime import date, datetime

from fastapi import APIRouter, Depends, File, Form, UploadFile

from ..access import require_calendar
from ..auth import current_user
from ..db import execute, fetch_all, fetch_one, get_db
from ..errors import api_error
from ..services import ghg
from ..services.activities import record_activity
from ..services.calendar import describe, rice_stages, stage_on, yield_per_rai
from ..services.credits import create_pending_credit
from ..services.water import water_series

router = APIRouter(prefix="/calendars", tags=["calendars"])

# What farmers record themselves; everything about water comes from the IoT sensor
# Planting is recorded with its photo when the crop is added
# (POST /paddies/{id}/calendars), so only later records are added here.
ACTIVITY_TYPES = "^(fertilizing|harvest)$"
PHOTO_REQUIRED = ("harvest",)

CREDIT_SQL = """
SELECT cc.credit_id, cc.credit_tco2e, cc.credit_status, cc.submitted_at,
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
        k: paddy[k]
        for k in ("paddy_id", "paddy_name", "owner_user_id", "area_rai", "latitude", "longitude", "province", "district")
    }
    calendar["yield_kg_per_rai"] = yield_per_rai(calendar["harvest_kg"], paddy["area_rai"])
    calendar["paddy"]["owner_name"] = fetch_one(
        conn, "SELECT display_name FROM users WHERE user_id = :id", id=paddy["owner_user_id"]
    )["display_name"]

    stages = rice_stages(conn)
    if calendar["status"] == "active":
        calendar["current_stage"] = stage_on(stages, calendar["planting_date"], date.today())
    calendar["activities"] = _activities(conn, calendar_id)
    calendar["fertilizer"] = _fertilizer_summary(calendar["activities"], paddy["area_rai"])
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
    # Harvest: total rice harvested from the paddy (kg); the yield per rai is worked out from it
    harvest_kg: float | None = Form(None, gt=0, le=1_000_000),
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
        if harvest_kg is None:
            raise api_error(400, "harvest_kg_required", "Enter how much rice was harvested (kg)")
        if calendar["harvest_date"] is not None:
            raise api_error(409, "already_harvested", "This crop has already been harvested")
        if activity_date < calendar["planting_date"]:
            raise api_error(400, "harvest_before_planting", "Harvest date can't be before the planting date")
        execute(
            conn,
            "UPDATE farming_calendars SET harvest_date = :d, harvest_kg = :kg WHERE calendar_id = :id",
            d=activity_date,
            kg=round(harvest_kg, 1),
            id=calendar_id,
        )
        calendar["harvest_date"] = activity_date

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
    if activity_type == "harvest":  # the crop is finished: its credit goes to the verifier
        create_pending_credit(conn, calendar, calendar["paddy"]["area_rai"])
    return {"activity_id": activity_id}
