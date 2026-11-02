from datetime import date, datetime, timedelta

from app.services import ghg

START = date(2025, 6, 1)
CYCLE = {"start_date": START, "end_date": date(2025, 11, 15)}  # 167 days
AREA_RAI = 12.5  # 2 ha


def sensor(levels_by_day, start=START):
    """One reading at 06:00 and 18:00 per day; None = sensor offline that day."""
    out = []
    for i, level in enumerate(levels_by_day):
        if level is None:
            continue
        day = datetime.combine(start + timedelta(days=i), datetime.min.time())
        out += [{"t": day.replace(hour=6), "level": level}, {"t": day.replace(hour=18), "level": level}]
    return out


def season(*segments):
    """season((20, 5), (8, -10)) -> 20 days at 5 cm then 8 days at -10 cm."""
    return [level for days, level in segments for _ in range(days)]


def types(phases):
    return [p["phase_type"] for p in phases]


def test_baseline_matches_ipcc_formula():
    result = ghg.estimate(CYCLE, AREA_RAI, [])
    expected = 1.22 * 1.0 * 1.0 * 167 * 2.0 / 1000 * 28
    assert result["baseline_tco2e"] == round(expected, 4)
    assert result["water_regime"] == "continuous"
    assert result["reduction_tco2e"] == 0
    assert result["sensor_coverage_pct"] == 0


def test_detects_awd_phases_from_sensor_data():
    levels = season((25, 5), (10, -12), (25, 4), (10, -8), (85, 5), (13, -20))  # 168 days
    phases = ghg.detect_phases(sensor(levels), START, CYCLE["end_date"])
    assert types(phases) == ["flooded", "drying", "reflood", "drying", "reflood", "final_drain"]
    assert phases[1]["start_date"] == date(2025, 6, 26)
    assert phases[1]["min_level_cm"] == -12.0

    result = ghg.estimate(CYCLE, AREA_RAI, sensor(levels))
    assert result["confirmed_drainages"] == 2
    assert result["water_regime"] == "multiple"
    assert result["project_tco2e"] < result["baseline_tco2e"]


def test_shallow_drying_does_not_count():
    levels = season((25, 5), (10, -2), (133, 5))  # never reaches -5 cm
    result = ghg.estimate(CYCLE, AREA_RAI, sensor(levels))
    assert [p["confirmed"] for p in result["drying_phases"]] == [False]
    assert result["water_regime"] == "continuous"


def test_final_drain_alone_is_continuous_flooding():
    levels = season((155, 5), (13, -20))
    result = ghg.estimate(CYCLE, AREA_RAI, sensor(levels))
    assert types(result["phases"]) == ["flooded", "final_drain"]
    assert result["water_regime"] == "continuous"


def test_long_sensor_gap_is_shown_and_short_one_is_bridged():
    # 10-day outage: whatever happened then can't be proven
    levels = season((25, 5), (10, -12), (25, 4)) + [None] * 10 + season((98, 5))
    phases = ghg.detect_phases(sensor(levels), START, CYCLE["end_date"])
    assert "no_data" in types(phases)
    assert ghg.estimate(CYCLE, AREA_RAI, sensor(levels))["water_regime"] == "single"

    # 1-day outage in the middle of a drying period doesn't split it into two drainages
    levels = season((25, 5), (4, -10)) + [None] + season((5, -12), (133, 5))
    phases = ghg.detect_phases(sensor(levels), START, CYCLE["end_date"])
    assert types(phases) == ["flooded", "drying", "reflood"]


def test_one_day_rain_blip_is_ignored():
    levels = season((25, 5), (4, -10), (1, 2), (5, -12), (133, 5))
    assert types(ghg.detect_phases(sensor(levels), START, CYCLE["end_date"])) == ["flooded", "drying", "reflood"]


def test_open_cycle_runs_until_today_and_last_phase_is_ongoing():
    cycle = {"start_date": START, "end_date": None}
    levels = season((5, 5), (6, -7))
    result = ghg.estimate(cycle, AREA_RAI, sensor(levels), today=date(2025, 6, 11))
    assert result["days"] == 10
    assert result["phases"][-1]["phase_type"] == "drying"
    assert result["phases"][-1]["end_date"] is None
