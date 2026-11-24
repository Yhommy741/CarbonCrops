"""Store water level readings from sensor nodes (HTTP ingest and the MQTT bridge share this)."""

from datetime import datetime

from ..db import execute, fetch_one

LEVEL_MIN_CM, LEVEL_MAX_CM = -100, 100


def save_readings(conn, readings):
    """Insert readings; each is a dict with device_id, recorded_at, water_level_cm, battery_pct (optional).

    Returns {"saved": n, "unknown_devices": [...]}. Readings for devices that aren't
    registered (no row in `devices`) are skipped, since a device must belong to a paddy.
    """
    saved, unknown, known = 0, set(), set()
    for r in sorted(readings, key=lambda r: r.get("recorded_at") or datetime.now()):
        device_id = r["device_id"]
        if device_id not in known:
            if device_id in unknown or not fetch_one(
                conn, "SELECT 1 AS ok FROM devices WHERE device_id = :d", d=device_id
            ):
                unknown.add(device_id)
                continue
            known.add(device_id)
        # INSERT IGNORE: the gateway may resend the same reading (uq_device_time)
        result = execute(
            conn,
            """INSERT IGNORE INTO sensor_readings (device_id, recorded_at, water_level_cm)
               VALUES (:device_id, :recorded_at, :level)""",
            device_id=device_id,
            recorded_at=r.get("recorded_at") or datetime.now(),
            level=r.get("water_level_cm"),
        )
        saved += result.rowcount
        if r.get("battery_pct") is not None:  # the device row keeps only the latest battery level
            execute(conn, "UPDATE devices SET battery_pct = :b WHERE device_id = :d", b=r["battery_pct"], d=device_id)
    return {"saved": saved, "unknown_devices": sorted(unknown)}
