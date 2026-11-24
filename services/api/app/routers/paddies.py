from datetime import date, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel, Field

from ..access import paddy_access_sql, require_paddy
from ..auth import current_user
from ..db import execute, fetch_all, fetch_one, get_db
from ..errors import api_error
from ..services.activities import record_activity
from ..services.calendar import describe

router = APIRouter(prefix="/paddies", tags=["paddies"])

# How many crop calendars a paddy has finished (harvested)
COMPLETED_SQL = """(SELECT COUNT(*) FROM farming_calendars fc
    WHERE fc.paddy_id = p.paddy_id AND fc.harvest_date IS NOT NULL)"""


class PaddyIn(BaseModel):
    paddy_name: str = Field(min_length=1, max_length=100)
    area_rai: float = Field(gt=0)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    province: str | None = None
    district: str | None = None
    subdistrict: str | None = None
    land_doc_no: str | None = None


@router.get("")
def list_paddies(user=Depends(current_user), conn=Depends(get_db)):
    where, params = paddy_access_sql(user)
    return fetch_all(
        conn,
        f"""SELECT p.paddy_id, p.paddy_name, p.area_rai, p.province, p.district,
                   u.display_name AS owner_name, {COMPLETED_SQL} AS completed_calendars
            FROM paddy p JOIN users u ON u.user_id = p.owner_user_id
            WHERE {where} ORDER BY p.paddy_name""",
        **params,
    )


@router.post("", status_code=201)
def create_paddy(body: PaddyIn, user=Depends(current_user), conn=Depends(get_db)):
    paddy_id = str(uuid4())
    execute(
        conn,
        """INSERT INTO paddy (paddy_id, owner_user_id, paddy_name, latitude, longitude, area_rai,
                              province, district, subdistrict, land_doc_no)
           VALUES (:id, :owner, :paddy_name, :latitude, :longitude, :area_rai,
                   :province, :district, :subdistrict, :land_doc_no)""",
        id=paddy_id,
        owner=user["user_id"],
        **body.model_dump(),
    )
    return {"paddy_id": paddy_id}


@router.get("/{paddy_id}")
def get_paddy(paddy_id: str, user=Depends(current_user), conn=Depends(get_db)):
    paddy = require_paddy(conn, user, paddy_id)
    paddy["owner_name"] = fetch_one(
        conn, "SELECT display_name FROM users WHERE user_id = :id", id=paddy["owner_user_id"]
    )["display_name"]
    paddy["calendars"] = [
        describe(c)
        for c in fetch_all(
            conn,
            """SELECT fc.calendar_id, fc.paddy_id, fc.rice_variety, fc.planting_date, fc.harvest_date,
                      cc.credit_tco2e, cc.credit_status
               FROM farming_calendars fc
               LEFT JOIN carboncredit_info cc ON cc.calendar_id = fc.calendar_id
               WHERE fc.paddy_id = :id ORDER BY fc.planting_date DESC""",
            id=paddy_id,
        )
    ]
    paddy["completed_calendars"] = sum(c["status"] == "harvested" for c in paddy["calendars"])
    paddy["devices"] = fetch_all(
        conn,
        """SELECT d.device_id, d.battery_pct, d.installed_at,
                  sr.recorded_at AS last_reading_at, sr.water_level_cm AS last_level_cm
           FROM devices d
           LEFT JOIN sensor_readings sr ON sr.reading_id = (
               SELECT s2.reading_id FROM sensor_readings s2
               WHERE s2.device_id = d.device_id ORDER BY s2.recorded_at DESC LIMIT 1)
           WHERE d.paddy_id = :id ORDER BY d.device_id""",
        id=paddy_id,
    )
    paddy["satellite_images"] = fetch_all(
        conn,
        """SELECT image_id, captured_at, source, cloud_cover_pct, ndvi_value, ndwi_value
           FROM satellite_images WHERE paddy_id = :id ORDER BY captured_at DESC""",
        id=paddy_id,
    )
    return paddy


@router.post("/{paddy_id}/calendars", status_code=201)
def create_calendar(
    paddy_id: str,
    rice_variety: str | None = Form(None, max_length=60),
    planting_date: date = Form(...),
    planting_method: str = Form("sowing", pattern="^(sowing|transplanting)$"),
    photo: UploadFile = File(...),
    latitude: float | None = Form(None, ge=-90, le=90),
    longitude: float | None = Form(None, ge=-180, le=180),
    captured_at: datetime | None = Form(None),
    user=Depends(current_user),
    conn=Depends(get_db),
):
    """Start a crop calendar: the planting-day photo is the farmer's proof it began."""
    require_paddy(conn, user, paddy_id, write=True)
    if planting_date > date.today():
        raise api_error(400, "date_in_future", "The date can't be in the future")
    growing = fetch_one(
        conn,
        "SELECT planting_date FROM farming_calendars WHERE paddy_id = :id AND harvest_date IS NULL",
        id=paddy_id,
    )
    if growing:
        raise api_error(409, "calendar_growing", "This paddy still has a crop that hasn't been harvested")
    calendar = {"calendar_id": str(uuid4()), "paddy_id": paddy_id, "planting_date": planting_date}
    execute(
        conn,
        """INSERT INTO farming_calendars (calendar_id, paddy_id, rice_variety, planting_date)
           VALUES (:calendar_id, :paddy_id, :variety, :planting_date)""",
        variety=rice_variety or None,
        **calendar,
    )
    record_activity(
        conn,
        calendar,
        planting_method,
        planting_date,
        photo=photo,
        latitude=latitude,
        longitude=longitude,
        captured_at=captured_at,
    )
    return {"calendar_id": calendar["calendar_id"]}
