from datetime import datetime, timedelta

from fastapi import APIRouter, Depends

from ..access import plot_access_sql
from ..auth import current_user
from ..db import fetch_all, fetch_one, get_db
from ..services import ghg
from ..services.water import water_series

router = APIRouter(tags=["dashboard"])

REFILL_LEVEL_CM = -15.0  # AWD "safe" threshold: refill once water drops this low
LOW_BATTERY_PCT = 20
STALE_AFTER = timedelta(hours=6)
SPARKLINE_POINTS = 48


def _alerts(cycle, phase, latest, sensor, now):
    alerts = []
    if latest and latest["level"] <= REFILL_LEVEL_CM:
        alerts.append({"level": "warn", "code": "refill",
                       "message": f"ระดับน้ำต่ำกว่า {REFILL_LEVEL_CM:g} ซม. ควรเติมน้ำเข้าแปลง"})
    if sensor and sensor["battery_pct"] is not None and sensor["battery_pct"] < LOW_BATTERY_PCT:
        alerts.append({"level": "warn", "code": "low_battery",
                       "message": f"แบตเตอรี่เซ็นเซอร์ {sensor['serial_no']} เหลือ {sensor['battery_pct']}%"})
    if sensor and now - sensor["recorded_at"] > STALE_AFTER:
        alerts.append({"level": "info", "code": "sensor_stale",
                       "message": f"เซ็นเซอร์ {sensor['serial_no']} ไม่ส่งข้อมูลเกิน 6 ชั่วโมง"})
    return alerts


@router.get("/dashboard")
def dashboard(user=Depends(current_user), conn=Depends(get_db)):
    now = datetime.now()
    where, params = plot_access_sql(user)
    plots = fetch_all(
        conn,
        f"""SELECT p.plot_id, p.plot_name, p.area_rai, p.province, p.district,
                   (SELECT COUNT(*) FROM crop_cycles cc WHERE cc.plot_id = p.plot_id
                    AND cc.status IN ('harvested', 'closed')) AS completed_cycles
            FROM plots p WHERE {where} ORDER BY p.plot_name""",
        **params,
    )
    for p in plots:
        cycle = fetch_one(
            conn,
            """SELECT * FROM crop_cycles WHERE plot_id = :id AND status = 'active'
               ORDER BY start_date DESC LIMIT 1""",
            id=p["plot_id"],
        )
        sensor = fetch_one(
            conn,
            """SELECT d.serial_no, sr.recorded_at, sr.water_level_cm, sr.battery_pct
               FROM device_installations di
               JOIN devices d ON d.device_id = di.device_id
               JOIN sensor_readings sr ON sr.device_id = di.device_id
               WHERE di.plot_id = :id AND di.removed_at IS NULL
               ORDER BY sr.recorded_at DESC LIMIT 1""",
            id=p["plot_id"],
        )
        series = water_series(conn, cycle) if cycle else []
        phases = ghg.detect_phases(series, cycle["start_date"]) if cycle else []
        # Current AWD phase; skip a trailing "no data" stretch, the stale-sensor alert covers it
        phase = next((ph for ph in reversed(phases) if ph["phase_type"] != "no_data"), None)
        series = series[-SPARKLINE_POINTS:]
        latest = series[-1] if series else None

        p["cycle"] = cycle and {k: cycle[k] for k in ("cycle_id", "cycle_name", "rice_variety", "start_date")}
        p["phase"] = phase and {k: phase[k] for k in ("phase_type", "start_date", "days", "min_level_cm")}
        p["latest"] = latest
        p["battery_pct"] = sensor["battery_pct"] if sensor else None
        p["sparkline"] = series
        p["alerts"] = _alerts(cycle, phase, latest, sensor, now)
    return {"plots": plots}
