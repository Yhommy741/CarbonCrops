from ..db import fetch_all

# Readings recorded in the paddy (by whichever sensor was in it then), within the crop calendar
SENSOR_SQL = """
SELECT sr.recorded_at AS t, sr.water_level_cm AS level
FROM sensor_readings sr
WHERE sr.paddy_id = :paddy_id
  AND sr.water_level_cm IS NOT NULL
  AND sr.recorded_at >= :start
  AND (:end IS NULL OR sr.recorded_at < DATE_ADD(:end, INTERVAL 1 DAY))
ORDER BY sr.recorded_at
"""


def water_series(conn, calendar):
    """IoT water-level readings for a crop calendar, oldest first."""
    points = fetch_all(
        conn,
        SENSOR_SQL,
        paddy_id=calendar["paddy_id"],
        start=calendar["planting_date"],
        end=calendar["harvest_date"],
    )
    for p in points:
        p["level"] = float(p["level"])
    return points
