import json
from datetime import date

from app.services import satellite

TODAY = date(2026, 11, 2)


def cycle(start, end=None):
    return {"start_date": start, "end_date": end}


def test_windows_cover_cycles_with_margin():
    windows = satellite.scan_windows([cycle(date(2026, 1, 11), date(2026, 4, 29))], today=TODAY)
    assert windows == [(date(2026, 1, 4), date(2026, 5, 6))]


def test_windows_merge_overlaps_and_stop_today():
    windows = satellite.scan_windows(
        [cycle(date(2026, 6, 4), None), cycle(date(2026, 1, 11), date(2026, 5, 30))], today=TODAY
    )
    assert windows == [(date(2026, 1, 4), TODAY)]


def test_windows_without_cycles():
    assert satellite.scan_windows([], today=TODAY) == [(date(2026, 8, 4), TODAY)]


def run_scan(tmp_path, monkeypatch, image_days, windows):
    monkeypatch.setattr(satellite, "CACHE_DIR", str(tmp_path))
    monkeypatch.setattr(
        satellite, "fetch_image", lambda layer, lat, lon, day: b"x" * 5000 if (day, layer) in image_days else None
    )
    folder = satellite.plot_dir("p1", 14.5, 100.4)
    todo = [(d, layer) for d in satellite._days(windows) for layer in satellite.LAYERS]
    satellite._scans[folder] = {"done": 0, "total": len(todo)}
    satellite._scan(folder, 14.5, 100.4, todo, TODAY)
    return folder


def test_scan_lists_only_days_with_images(tmp_path, monkeypatch):
    windows = [(date(2026, 3, 1), date(2026, 3, 10))]
    run_scan(tmp_path, monkeypatch, {(date(2026, 3, 4), "S30"), (date(2026, 3, 9), "L30")}, windows)
    events = satellite.found_images("p1", 14.5, 100.4, windows)
    assert [(e["date"], e["layer"]) for e in events] == [("2026-03-04", "S30"), ("2026-03-09", "L30")]
    assert satellite.ensure_scan("p1", 14.5, 100.4, windows, today=TODAY) is None  # all days known


def test_recent_empty_days_are_checked_again(tmp_path, monkeypatch):
    windows = [(date(2026, 10, 30), TODAY)]
    folder = run_scan(tmp_path, monkeypatch, set(), windows)
    assert json.loads(open(f"{folder}/days.json").read()) == {}
    # ...but not on every request: no new scan right after one finished
    assert satellite.ensure_scan("p1", 14.5, 100.4, windows, today=TODAY) is None
