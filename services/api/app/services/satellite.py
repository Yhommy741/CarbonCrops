"""Days a satellite actually photographed a plot, using NASA GIBS (free, no API key).

GIBS has no "which days have an image here" search, so we request the HLS
(Harmonized Landsat Sentinel-2, 30 m) true-colour image for every day of the
plot's growing seasons. On a day the satellite did not pass, GIBS returns an
all-black JPEG. Every answer is cached on disk, so only the first scan of a plot
is slow; it runs in a background thread and the timeline shows its progress.

NASA CMR could list the passes directly, but our network intercepts its TLS
certificate. TODO: switch to Google Earth Engine (cloud masking, NDWI water index).
"""

import json
import os
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from urllib.parse import urlencode
from urllib.request import urlopen

from ..config import settings

GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
# layer key -> (GIBS layer, label shown to users)
LAYERS = {
    "S30": ("HLS_S30_Nadir_BRDF_Adjusted_Reflectance", "Sentinel-2"),
    "L30": ("HLS_L30_Nadir_BRDF_Adjusted_Reflectance", "Landsat 8/9"),
}
HALF_SIZE_DEG = 0.006  # ~1.3 km square centred on the plot
SIZE_PX = 256
# On a day with no pass GIBS returns an all-black JPEG (~700 bytes at 256 px)
BLANK_MAX_BYTES = 2000
# GIBS may still be processing the last few days: don't remember "no image" for them
RECENT_DAYS = 7
# Look this many days before planting / after harvest too
MARGIN_DAYS = 7
NO_CYCLE_DAYS = 90
WORKERS = 8
CACHE_DIR = os.path.join(settings.upload_dir, "satellite_cache")

RECENT_RECHECK = timedelta(hours=6)

_lock = threading.Lock()
_scans = {}  # cache dir -> {"done": n, "total": n}
_recent_checked = {}  # cache dir -> when the not-yet-final recent days were last checked


def plot_dir(plot_id, lat, lon):
    # Coordinates are part of the name, so moving a plot starts a fresh cache
    return os.path.join(CACHE_DIR, f"{plot_id}_{lat:.5f}_{lon:.5f}")


def image_path(folder, day, layer):
    return os.path.join(folder, f"{day.isoformat()}_{layer}.jpg")


def scan_windows(cycles, today=None):
    """Date ranges worth searching: each crop cycle plus a margin, merged, never past today."""
    today = today or date.today()
    ranges = sorted(
        (c["start_date"] - timedelta(days=MARGIN_DAYS), min(today, (c["end_date"] or today) + timedelta(days=MARGIN_DAYS)))
        for c in cycles
        if c["start_date"] <= today
    )
    if not ranges:
        return [(today - timedelta(days=NO_CYCLE_DAYS), today)]
    merged = [list(ranges[0])]
    for start, end in ranges[1:]:
        if start <= merged[-1][1] + timedelta(days=1):
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [tuple(r) for r in merged]


def _days(windows):
    for start, end in windows:
        for n in range((end - start).days + 1):
            yield start + timedelta(days=n)


def fetch_image(layer, lat, lon, day):
    """JPEG bytes, or None when the satellite has no image of the spot that day."""
    h = HALF_SIZE_DEG
    params = {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": "1.3.0",
        "LAYERS": LAYERS[layer][0],
        "CRS": "EPSG:4326",
        # WMS 1.3.0 with EPSG:4326 uses lat,lon axis order
        "BBOX": f"{lat - h},{lon - h},{lat + h},{lon + h}",
        "WIDTH": SIZE_PX,
        "HEIGHT": SIZE_PX,
        "FORMAT": "image/jpeg",
        "TIME": day.isoformat(),
    }
    with urlopen(f"{GIBS_WMS}?{urlencode(params)}", timeout=20) as res:
        if res.headers.get_content_type() != "image/jpeg":
            return None  # GIBS reports errors as XML
        data = res.read()
    return data if len(data) > BLANK_MAX_BYTES else None


def _load(folder):
    try:
        with open(os.path.join(folder, "days.json"), encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def _save(folder, known):
    path = os.path.join(folder, "days.json")
    with open(path + ".tmp", "w", encoding="utf-8") as f:
        json.dump(known, f)
    os.replace(path + ".tmp", path)


def found_images(plot_id, lat, lon, windows):
    """Satellite timeline events for days already known to have an image."""
    known = _load(plot_dir(plot_id, lat, lon))
    events = []
    for day in _days(windows):
        for layer, has_image in known.get(day.isoformat(), {}).items():
            if has_image:
                events.append({"kind": "satellite", "date": day.isoformat(), "layer": layer, "source": LAYERS[layer][1]})
    return events


def ensure_scan(plot_id, lat, lon, windows, today=None):
    """Start a background scan of the days not checked yet. Returns its progress, or None if nothing to do."""
    folder = plot_dir(plot_id, lat, lon)
    today = today or date.today()
    with _lock:
        if folder in _scans:
            return {"running": True, **_scans[folder]}
        known = _load(folder)
        checked = _recent_checked.get(folder)
        skip_recent = checked is not None and datetime.now() - checked < RECENT_RECHECK
        todo = [
            (day, layer)
            for day in _days(windows)
            for layer in LAYERS
            if layer not in known.get(day.isoformat(), {})
            and not (skip_recent and day > today - timedelta(days=RECENT_DAYS))
        ]
        if not todo:
            return None
        _scans[folder] = {"done": 0, "total": len(todo)}
    threading.Thread(target=_scan, args=(folder, lat, lon, todo, today), daemon=True).start()
    return {"running": True, **_scans[folder]}


def _scan(folder, lat, lon, todo, today):
    os.makedirs(folder, exist_ok=True)
    known = _load(folder)

    def check(task):
        day, layer = task
        try:
            data = fetch_image(layer, lat, lon, day)
        except OSError:  # network error: leave unknown so the next scan retries
            return task, None
        if data:
            with open(image_path(folder, day, layer), "wb") as f:
                f.write(data)
        return task, bool(data)

    try:
        with ThreadPoolExecutor(WORKERS) as pool:
            for i, ((day, layer), has_image) in enumerate(pool.map(check, todo), 1):
                recent = day > today - timedelta(days=RECENT_DAYS)
                if has_image or (has_image is False and not recent):
                    known.setdefault(day.isoformat(), {})[layer] = has_image
                with _lock:
                    _scans[folder]["done"] = i
                if i % 50 == 0:
                    _save(folder, known)
        _save(folder, known)
        with _lock:
            _recent_checked[folder] = datetime.now()
    finally:
        with _lock:
            _scans.pop(folder, None)
