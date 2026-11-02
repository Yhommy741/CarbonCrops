from ..db import fetch_all

# Readings from every sensor that was installed on the plot at the time of the reading
SENSOR_SQL = """
SELECT sr.recorded_at AS t, sr.water_level_cm AS level
FROM sensor_readings sr
JOIN device_installations di ON di.device_id = sr.device_id
WHERE di.plot_id = :plot_id
  AND sr.water_level_cm IS NOT NULL
  AND sr.recorded_at >= di.installed_at
  AND (di.removed_at IS NULL OR sr.recorded_at <= di.removed_at)
  AND sr.recorded_at >= :start
  AND (:end IS NULL OR sr.recorded_at < DATE_ADD(:end, INTERVAL 1 DAY))
ORDER BY sr.recorded_at
"""


def water_series(conn, cycle):
    """IoT water-level readings for a crop cycle, oldest first."""
    points = fetch_all(
        conn,
        SENSOR_SQL,
        plot_id=cycle["plot_id"],
        start=cycle["start_date"],
        end=cycle["end_date"],
    )
    for p in points:
        p["level"] = float(p["level"])
    return points
