from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends

from ..access import paddy_access_sql
from ..auth import current_user
from ..db import fetch_all, fetch_one, get_db
from ..services import ghg
from ..services.calendar import describe, rice_stages, stage_on
from ..services.water import water_series

router = APIRouter(tags=["dashboard"])

REFILL_LEVEL_CM = -15.0  # AWD "safe" threshold: refill once water drops this low
LOW_BATTERY_PCT = 20
STALE_AFTER = timedelta(hours=6)
SPARKLINE_POINTS = 48


def _alerts(latest, devices, now):
    """Alerts as code + params; the web app words them (locales: alerts.<code>)."""
    alerts = []
    if latest and latest["level"] <= REFILL_LEVEL_CM:
        alerts.append({"level": "warn", "code": "refill", "params": {"level": REFILL_LEVEL_CM}})
    for d in devices:
        if d["battery_pct"] is not None and d["battery_pct"] < LOW_BATTERY_PCT:
            alerts.append({"level": "warn", "code": "low_battery",
                           "params": {"device": d["device_id"], "pct": d["battery_pct"]}})
        if d["last_reading_at"] is None or now - d["last_reading_at"] > STALE_AFTER:
            alerts.append({"level": "info", "code": "sensor_stale",
                           "params": {"device": d["device_id"], "hours": int(STALE_AFTER.total_seconds() // 3600)}})
    return alerts


@router.get("/dashboard")
def dashboard(user=Depends(current_user), conn=Depends(get_db)):
    now = datetime.now()
    stages = rice_stages(conn)
    where, params = paddy_access_sql(user)
    paddies = fetch_all(
        conn,
        f"""SELECT p.paddy_id, p.paddy_name, p.area_rai, p.province, p.district,
                   (SELECT COUNT(*) FROM farming_calendars fc WHERE fc.paddy_id = p.paddy_id
                    AND fc.harvest_date IS NOT NULL) AS completed_calendars
            FROM paddy p WHERE {where} ORDER BY p.paddy_name""",
        **params,
    )
    for p in paddies:
        calendar = fetch_one(
            conn,
            """SELECT calendar_id, paddy_id, rice_variety, planting_date, harvest_date
               FROM farming_calendars
               WHERE paddy_id = :id AND harvest_date IS NULL AND planting_date <= CURDATE()
               ORDER BY planting_date DESC LIMIT 1""",
            id=p["paddy_id"],
        )
        devices = fetch_all(
            conn,
            """SELECT d.device_id, d.battery_pct,
                      (SELECT MAX(sr.recorded_at) FROM sensor_readings sr
                       WHERE sr.device_id = d.device_id) AS last_reading_at
               FROM devices d WHERE d.paddy_id = :id""",
            id=p["paddy_id"],
        )
        series = water_series(conn, calendar) if calendar else []
        phases = ghg.detect_phases(series, calendar["planting_date"]) if calendar else []
        # Current AWD phase; skip a trailing "no data" stretch, the stale-sensor alert covers it
        phase = next((ph for ph in reversed(phases) if ph["phase_type"] != "no_data"), None)
        series = series[-SPARKLINE_POINTS:]
        latest = series[-1] if series else None

        if calendar:
            describe(calendar)
            calendar["stage"] = stage_on(stages, calendar["planting_date"], date.today())
        p["calendar"] = calendar
        p["phase"] = phase and {k: phase[k] for k in ("phase_type", "start_date", "days", "min_level_cm")}
        p["latest"] = latest
        p["battery_pct"] = min((d["battery_pct"] for d in devices if d["battery_pct"] is not None), default=None)
        p["sparkline"] = series
        p["alerts"] = _alerts(latest, devices, now) if calendar else []
    return {"paddies": paddies}
