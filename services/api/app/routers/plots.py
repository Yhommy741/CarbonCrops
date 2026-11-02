from datetime import date, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from ..access import WRITE_ROLES, plot_access_sql, require_plot
from ..auth import current_user
from ..db import execute, fetch_all, fetch_one, get_db
from ..services.activities import record_activity

# How many crop cycles a plot has finished ("ทำนาไปแล้วกี่รอบ")
COMPLETED_CYCLES_SQL = """(SELECT COUNT(*) FROM crop_cycles cc
    WHERE cc.plot_id = p.plot_id AND cc.status IN ('harvested', 'closed'))"""

router = APIRouter(prefix="/plots", tags=["plots"])


class PlotIn(BaseModel):
    plot_name: str = Field(min_length=1, max_length=100)
    area_rai: float = Field(gt=0)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    province: str | None = None
    district: str | None = None
    subdistrict: str | None = None
    land_doc_no: str | None = None


@router.get("")
def list_plots(user=Depends(current_user), conn=Depends(get_db)):
    where, params = plot_access_sql(user)
    return fetch_all(
        conn,
        f"""SELECT p.plot_id, p.plot_name, p.area_rai, p.province, p.district,
                   u.display_name AS owner_name, {COMPLETED_CYCLES_SQL} AS completed_cycles
            FROM plots p JOIN users u ON u.user_id = p.owner_user_id
            WHERE {where} ORDER BY p.plot_name""",
        **params,
    )


@router.post("", status_code=201)
def create_plot(body: PlotIn, user=Depends(current_user), conn=Depends(get_db)):
    plot_id = str(uuid4())
    execute(
        conn,
        """INSERT INTO plots (plot_id, owner_user_id, plot_name, latitude, longitude, area_rai,
                              province, district, subdistrict, land_doc_no)
           VALUES (:id, :owner, :plot_name, :latitude, :longitude, :area_rai,
                   :province, :district, :subdistrict, :land_doc_no)""",
        id=plot_id,
        owner=user["user_id"],
        **body.model_dump(),
    )
    execute(
        conn,
        "INSERT INTO plot_members (plot_id, user_id, member_role) VALUES (:pid, :uid, 'owner')",
        pid=plot_id,
        uid=user["user_id"],
    )
    return {"plot_id": plot_id}


@router.get("/{plot_id}")
def get_plot(plot_id: str, user=Depends(current_user), conn=Depends(get_db)):
    plot = require_plot(conn, user, plot_id)
    plot["owner_name"] = fetch_one(
        conn, "SELECT display_name FROM users WHERE user_id = :id", id=plot["owner_user_id"]
    )["display_name"]
    plot["can_edit"] = plot["my_role"] in WRITE_ROLES
    plot["cycles"] = fetch_all(
        conn,
        """SELECT c.cycle_id, c.cycle_name, c.rice_variety, c.start_date, c.end_date, c.status,
                  (SELECT e.reduction_tco2e FROM ghg_estimates e WHERE e.cycle_id = c.cycle_id
                   ORDER BY e.calculated_at DESC LIMIT 1) AS reduction_tco2e
           FROM crop_cycles c WHERE c.plot_id = :id ORDER BY c.start_date DESC""",
        id=plot_id,
    )
    plot["completed_cycles"] = sum(c["status"] in ("harvested", "closed") for c in plot["cycles"])
    plot["devices"] = fetch_all(
        conn,
        """SELECT d.device_id, d.serial_no, d.device_type, d.status, di.installed_at,
                  sr.recorded_at AS last_reading_at, sr.water_level_cm AS last_level_cm,
                  sr.battery_pct AS last_battery_pct
           FROM device_installations di
           JOIN devices d ON d.device_id = di.device_id
           LEFT JOIN sensor_readings sr ON sr.reading_id = (
               SELECT s2.reading_id FROM sensor_readings s2
               WHERE s2.device_id = d.device_id ORDER BY s2.recorded_at DESC LIMIT 1)
           WHERE di.plot_id = :id AND di.removed_at IS NULL""",
        id=plot_id,
    )
    plot["satellite_images"] = fetch_all(
        conn,
        """SELECT image_id, captured_at, source, cloud_cover_pct FROM satellite_images
           WHERE plot_id = :id ORDER BY captured_at DESC""",
        id=plot_id,
    )
    return plot


@router.post("/{plot_id}/cycles", status_code=201)
def create_cycle(
    plot_id: str,
    cycle_name: str = Form(..., min_length=1, max_length=100),
    rice_variety: str | None = Form(None, max_length=60),
    start_date: date = Form(...),
    photo: UploadFile = File(...),
    latitude: float | None = Form(None, ge=-90, le=90),
    longitude: float | None = Form(None, ge=-180, le=180),
    captured_at: datetime | None = Form(None),
    user=Depends(current_user),
    conn=Depends(get_db),
):
    """Start a crop cycle: the planting-day photo is the farmer's proof it began."""
    require_plot(conn, user, plot_id, write=True)
    active = fetch_one(
        conn,
        "SELECT cycle_name FROM crop_cycles WHERE plot_id = :id AND status = 'active'",
        id=plot_id,
    )
    if active:
        raise HTTPException(409, f'แปลงนี้ยังมีรอบ "{active["cycle_name"]}" ที่ยังไม่เก็บเกี่ยว')
    cycle_id = str(uuid4())
    execute(
        conn,
        """INSERT INTO crop_cycles (cycle_id, plot_id, cycle_name, rice_variety, start_date, status)
           VALUES (:id, :plot_id, :cycle_name, :rice_variety, :start_date, 'active')""",
        id=cycle_id,
        plot_id=plot_id,
        cycle_name=cycle_name,
        rice_variety=rice_variety or None,
        start_date=start_date,
    )
    record_activity(
        conn,
        cycle_id,
        user["user_id"],
        "planting",
        start_date,
        photo=photo,
        latitude=latitude,
        longitude=longitude,
        captured_at=captured_at,
    )
    return {"cycle_id": cycle_id}
