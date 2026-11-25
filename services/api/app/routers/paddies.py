from datetime import date, datetime
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile

from ..access import require_paddy
from ..auth import current_user
from ..db import execute, fetch_all, fetch_one, get_db
from ..errors import api_error
from ..services.activities import record_activity
from ..uploads import delete_photos

router = APIRouter(prefix="/paddies", tags=["paddies"])


def normalize_device_id(raw: str) -> str:
    """'1', '0001', 'node-1' or 'NODE-0001' -> 'NODE-0001' (the ID the MQTT bridge stores,
    see mqtt_bridge.device_id_for). Raises ValueError for anything else."""
    s = raw.strip().upper().removeprefix("NODE").lstrip("-_ ")
    if not s.isdigit() or not 0 <= int(s) <= 0xFFFF:
        raise ValueError("Device ID must look like NODE-0001")
    return f"NODE-{int(s):04d}"


def start_calendar(conn, paddy_id, planting_date, photo, captured_at):
    """Insert a crop calendar and its 'planting' activity with the planting-day photo (the
    farmer's proof the crop began); returns the calendar id. Rice variety and sowing vs
    transplanting aren't asked: the IPCC Tier 1 CH4 method (services/ghg.py) uses neither."""
    if planting_date > date.today():
        raise api_error(400, "date_in_future", "The date can't be in the future")
    calendar = {"calendar_id": str(uuid4()), "paddy_id": paddy_id, "planting_date": planting_date}
    execute(
        conn,
        """INSERT INTO farming_calendars (calendar_id, paddy_id, planting_date)
           VALUES (:calendar_id, :paddy_id, :planting_date)""",
        **calendar,
    )
    record_activity(conn, calendar, "planting", planting_date, photo=photo, captured_at=captured_at)
    return calendar["calendar_id"]


@router.post("", status_code=201)
def create_paddy(
    paddy_name: str = Form(..., min_length=1, max_length=100),
    area_rai: float = Form(..., gt=0),
    # The sensor node installed in this paddy: its readings (and GPS position) go to this paddy
    device_id: str = Form(..., min_length=1, max_length=20),
    planting_date: date = Form(...),
    photo: UploadFile = File(...),
    captured_at: datetime | None = Form(None),
    user=Depends(current_user),
    conn=Depends(get_db),
):
    """Add a paddy and start farming it: the paddy, its sensor and its first crop (with the
    planting-day photo) are saved together, or nothing is saved."""
    try:
        device_id = normalize_device_id(device_id)
    except ValueError:
        raise api_error(400, "device_id_invalid", "Device ID must look like NODE-0001")
    # A sensor is reused season after season: it can move here unless its paddy is still growing
    device = fetch_one(conn, "SELECT device_id, paddy_id FROM devices WHERE device_id = :d", d=device_id)
    if device and device["paddy_id"] and fetch_one(
        conn,
        "SELECT 1 AS ok FROM farming_calendars WHERE paddy_id = :p AND harvest_date IS NULL",
        p=device["paddy_id"],
    ):
        raise api_error(409, "device_taken", "This sensor is in a paddy that hasn't been harvested yet")
    paddy_id = str(uuid4())
    execute(
        conn,
        """INSERT INTO paddy (paddy_id, owner_user_id, paddy_name, area_rai)
           VALUES (:id, :owner, :name, :area)""",
        id=paddy_id,
        owner=user["user_id"],
        name=paddy_name.strip(),
        area=area_rai,
    )
    # Old readings keep their paddy (sensor_readings.paddy_id); new ones come here
    execute(
        conn,
        """INSERT INTO devices (device_id, paddy_id, installed_at) VALUES (:d, :p, CURDATE())
           ON DUPLICATE KEY UPDATE paddy_id = :p, installed_at = CURDATE(), battery_pct = NULL""",
        d=device_id,
        p=paddy_id,
    )
    calendar_id = start_calendar(conn, paddy_id, planting_date, photo, captured_at)
    return {"paddy_id": paddy_id, "device_id": device_id, "calendar_id": calendar_id}


@router.delete("/{paddy_id}", status_code=204)
def delete_paddy(paddy_id: str, background: BackgroundTasks, user=Depends(current_user), conn=Depends(get_db)):
    """Delete a paddy and everything about it: crops, records, photos, readings and carbon
    credits. Its sensor stays registered but unlinked, so it can go into a new paddy."""
    require_paddy(conn, user, paddy_id, write=True)
    photos = fetch_all(
        conn,
        """SELECT e.file_path FROM activity_evidence e
           JOIN activities a ON a.activity_id = e.activity_id
           JOIN farming_calendars fc ON fc.calendar_id = a.calendar_id
           WHERE fc.paddy_id = :id""",
        id=paddy_id,
    )
    # Credits reference the crops without ON DELETE CASCADE; everything else cascades
    # from the paddy (crops -> activities -> evidence, readings) or is unlinked (devices)
    execute(conn, "DELETE FROM carboncredit_info WHERE paddy_id = :id", id=paddy_id)
    execute(conn, "DELETE FROM paddy WHERE paddy_id = :id", id=paddy_id)
    # Photo files go after the response; if the commit failed (rare) the rows stay and
    # those photos show the "missing" placeholder
    background.add_task(delete_photos, [p["file_path"] for p in photos])
