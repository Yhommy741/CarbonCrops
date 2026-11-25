"""Store water level readings from sensor nodes (HTTP ingest and the MQTT bridge share this)."""

from datetime import datetime

from ..db import execute, fetch_one

LEVEL_MIN_CM, LEVEL_MAX_CM = -100, 100


def save_readings(conn, readings):
    """Insert readings; each is a dict with device_id, recorded_at, water_level_cm, battery_pct (optional).

    Returns {"saved": n, "unknown_devices": [...]}. Each reading is stored with the paddy
    its device is linked to now, so it stays with that paddy if the sensor later moves to
    another one. Readings for devices that aren't registered, or not linked to a paddy,
    are skipped.
    """
    saved, unknown, paddy_of = 0, set(), {}
    for r in sorted(readings, key=lambda r: r.get("recorded_at") or datetime.now()):
        device_id = r["device_id"]
        if device_id in unknown:
            continue
        if device_id not in paddy_of:
            device = fetch_one(conn, "SELECT paddy_id FROM devices WHERE device_id = :d", d=device_id)
            if not device or not device["paddy_id"]:
                unknown.add(device_id)
                continue
            paddy_of[device_id] = device["paddy_id"]
        # INSERT IGNORE: the gateway may resend the same reading (uq_device_time)
        result = execute(
            conn,
            """INSERT IGNORE INTO sensor_readings (device_id, paddy_id, recorded_at, water_level_cm)
               VALUES (:device_id, :paddy_id, :recorded_at, :level)""",
            device_id=device_id,
            paddy_id=paddy_of[device_id],
            recorded_at=r.get("recorded_at") or datetime.now(),
            level=r.get("water_level_cm"),
        )
        saved += result.rowcount
        if r.get("battery_pct") is not None:  # the device row keeps only the latest battery level
            execute(conn, "UPDATE devices SET battery_pct = :b WHERE device_id = :d", b=r["battery_pct"], d=device_id)
    return {"saved": saved, "unknown_devices": sorted(unknown)}


def valid_position(lat, lon):
    """A usable GPS fix: inside the valid range and not the 0, 0 'no fix' value."""
    return (
        lat is not None and lon is not None
        and -90 <= lat <= 90 and -180 <= lon <= 180
        and not (lat == 0 and lon == 0)
    )


def update_paddy_position(conn, device_id, lat, lon):
    """Set the GPS position of the device's paddy from the sensor node.

    The farmer doesn't enter it: the node sends its position in every packet.
    Only writes when it changed (rounded to the column's 6 decimals), so
    updated_at isn't touched every packet. Returns True if a row changed.
    """
    if not valid_position(lat, lon):
        return False
    result = execute(
        conn,
        """UPDATE paddy p JOIN devices d ON d.paddy_id = p.paddy_id
           SET p.latitude = :lat, p.longitude = :lon
           WHERE d.device_id = :d
             AND (p.latitude IS NULL OR p.longitude IS NULL
                  OR p.latitude <> :lat OR p.longitude <> :lon)""",
        d=device_id, lat=round(lat, 6), lon=round(lon, 6),
    )
    return result.rowcount > 0
