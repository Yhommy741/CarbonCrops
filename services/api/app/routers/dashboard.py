from datetime import datetime, timedelta

from fastapi import APIRouter, Depends

from ..access import can_edit, paddy_access_sql
from ..auth import current_user
from ..db import fetch_all, fetch_one, get_db

router = APIRouter(tags=["dashboard"])

# The card's water graph shows a week at a time and scrolls back through this history:
# the growing crop since planting, else the last NO_CROP_DAYS; never more than MAX_DAYS.
NO_CROP_DAYS = 30
MAX_DAYS = 180


@router.get("/dashboard")
def dashboard(user=Depends(current_user), conn=Depends(get_db)):
    """One card per paddy: latest water level, readings for the scrolling graph, its sensor(s) with
    battery, GPS position (from the sensor) and the growing crop, if any, for the
    fertilizer and harvest buttons."""
    now = datetime.now()
    where, params = paddy_access_sql(user)
    paddies = fetch_all(
        conn,
        f"""SELECT p.paddy_id, p.paddy_name, p.area_rai, p.latitude, p.longitude, p.owner_user_id
            FROM paddy p
            WHERE {where}
              -- only farms in progress: a harvested crop moves to History
              AND EXISTS (SELECT 1 FROM farming_calendars fc
                          WHERE fc.paddy_id = p.paddy_id AND fc.harvest_date IS NULL)
            ORDER BY p.paddy_name""",
        **params,
    )
    for p in paddies:
        p["can_edit"] = can_edit(user, p)
        p["calendar"] = fetch_one(
            conn,
            """SELECT calendar_id, rice_variety, planting_date
               FROM farming_calendars
               WHERE paddy_id = :id AND harvest_date IS NULL AND planting_date <= CURDATE()
               ORDER BY planting_date DESC LIMIT 1""",
            id=p["paddy_id"],
        )
        p["devices"] = fetch_all(
            conn,
            """SELECT d.device_id, d.battery_pct,
                      (SELECT MAX(sr.recorded_at) FROM sensor_readings sr
                       WHERE sr.device_id = d.device_id) AS last_reading_at
               FROM devices d WHERE d.paddy_id = :id ORDER BY d.device_id""",
            id=p["paddy_id"],
        )
        p["latest"] = fetch_one(
            conn,
            """SELECT sr.recorded_at AS t, sr.water_level_cm AS level, sr.device_id
               FROM sensor_readings sr
               WHERE sr.paddy_id = :id AND sr.water_level_cm IS NOT NULL
               ORDER BY sr.recorded_at DESC LIMIT 1""",
            id=p["paddy_id"],
        )
        start = (
            datetime.combine(p["calendar"]["planting_date"], datetime.min.time())
            if p["calendar"]
            else now - timedelta(days=NO_CROP_DAYS)
        )
        p["history"] = fetch_all(
            conn,
            """SELECT sr.recorded_at AS t, sr.water_level_cm AS level
               FROM sensor_readings sr
               WHERE sr.paddy_id = :id AND sr.water_level_cm IS NOT NULL AND sr.recorded_at >= :since
               ORDER BY sr.recorded_at""",
            id=p["paddy_id"],
            since=max(start, now - timedelta(days=MAX_DAYS)),
        )
        del p["owner_user_id"]
    return {"paddies": paddies}
