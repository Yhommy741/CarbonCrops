"""CH4 reduction from AWD, IPCC 2019 Refinement Vol. 4 Ch. 5 (Tier 1).

    CH4 (kg) = EF_c x SF_w x SF_p x days x area_ha
    tCO2e    = CH4 (kg) / 1000 x GWP_CH4

Baseline = continuous flooding (SF_w = 1.00). Project = the water regime the
IoT sensor data actually shows. The AWD phases are detected from the sensor
readings (nobody enters them by hand), and a drying period only counts as a
drainage if the water went down to DRY_LEVEL_CM or below. The final drain
before harvest is normal practice even in flooded fields, so it doesn't count.

This is an estimate for farmers and verifiers to look at, not a certified
T-VER calculation. Swap in the official methodology values before issuing credits.
"""

from collections import defaultdict
from datetime import date, timedelta

METHOD_VERSION = "IPCC-2019-Tier1 v0.2"

EF_C = 1.22  # kg CH4/ha/day, baseline emission factor for South-East Asia (Table 5.11)
SF_W = {  # water regime during cultivation (Table 5.12)
    "continuous": 1.00,
    "single": 0.71,
    "multiple": 0.55,
}
SF_P = 1.00  # pre-season water regime: non-flooded < 180 days (Table 5.13)
GWP_CH4 = 28  # IPCC AR5, the value T-VER uses
RAI_TO_HA = 0.16
DRY_LEVEL_CM = -5.0  # water must drop this far below the soil surface

MIN_PHASE_DAYS = 2  # a wet/dry run shorter than this is noise (rain, sensor blip)
MAX_BRIDGED_GAP_DAYS = 2  # a short sensor outage inside one phase doesn't split it
FINAL_DRAIN_DAYS = 3  # a drying run that ends this close to harvest is the final drain


def _runs(daily, start, last_day):
    """Consecutive days with the same state: 'wet' (mean >= 0), 'dry' (< 0) or 'gap' (no data)."""
    runs = []
    d = start
    while d <= last_day:
        levels = daily.get(d)
        state = "gap" if not levels else ("wet" if sum(levels) / len(levels) >= 0 else "dry")
        if runs and runs[-1]["state"] == state:
            runs[-1]["end"] = d
            runs[-1]["levels"] += levels or []
        else:
            runs.append({"state": state, "start": d, "end": d, "levels": list(levels or [])})
        d += timedelta(days=1)
    return runs


def _length(run):
    return (run["end"] - run["start"]).days + 1


def _merge(runs):
    """Fold short wet/dry blips and short gaps into the surrounding phase."""
    out = []
    for run in runs:
        if out and run["state"] != "gap" and _length(run) < MIN_PHASE_DAYS and out[-1]["state"] != "gap":
            out[-1]["end"] = run["end"]
            out[-1]["levels"] += run["levels"]
            continue
        if out and out[-1]["state"] == run["state"]:
            out[-1]["end"] = run["end"]
            out[-1]["levels"] += run["levels"]
            continue
        out.append(run)

    # wet, short gap, wet -> one wet phase (same for dry)
    i = 1
    while i < len(out) - 1:
        gap, before, after = out[i], out[i - 1], out[i + 1]
        if gap["state"] == "gap" and _length(gap) <= MAX_BRIDGED_GAP_DAYS and before["state"] == after["state"]:
            before["end"] = after["end"]
            before["levels"] += after["levels"]
            del out[i : i + 2]
        else:
            i += 1
    return out


def detect_phases(series, start_date, end_date=None, today=None):
    """AWD phases of a crop cycle, worked out from the sensor readings."""
    today = today or date.today()
    last_day = end_date or today
    daily = defaultdict(list)
    for p in series:
        d = p["t"].date()
        if start_date <= d <= last_day:
            daily[d].append(p["level"])

    phases, seen_dry = [], False
    for run in _merge(_runs(daily, start_date, last_day)):
        if run["state"] == "dry":
            near_harvest = end_date is not None and (end_date - run["end"]).days < FINAL_DRAIN_DAYS
            phase_type = "final_drain" if near_harvest else "drying"
            seen_dry = True
        elif run["state"] == "wet":
            phase_type = "reflood" if seen_dry else "flooded"
        else:
            phase_type = "no_data"
        levels = run["levels"]
        min_level = round(min(levels), 1) if levels else None
        phases.append(
            {
                "phase_type": phase_type,
                "start_date": run["start"],
                # still going: the cycle is open and this is the latest phase
                "end_date": None if end_date is None and run["end"] == today else run["end"],
                "days": _length(run),
                "readings": len(levels),
                "min_level_cm": min_level,
                "confirmed": phase_type == "drying" and min_level is not None and min_level <= DRY_LEVEL_CM,
            }
        )
    return phases


def water_regime(confirmed_drainages):
    if confirmed_drainages >= 2:
        return "multiple"
    if confirmed_drainages == 1:
        return "single"
    return "continuous"


def to_tco2e(sf_w, days, area_ha):
    return EF_C * sf_w * SF_P * days * area_ha / 1000 * GWP_CH4


def estimate(cycle, area_rai, series, today=None):
    today = today or date.today()
    end = cycle["end_date"] or today
    days = max((end - cycle["start_date"]).days, 0)
    area_ha = float(area_rai) * RAI_TO_HA

    phases = detect_phases(series, cycle["start_date"], cycle["end_date"], today)
    drying = [p for p in phases if p["phase_type"] == "drying"]
    confirmed = sum(1 for p in drying if p["confirmed"])
    regime = water_regime(confirmed)
    days_with_data = len({p["t"].date() for p in series if cycle["start_date"] <= p["t"].date() <= end})

    baseline = to_tco2e(SF_W["continuous"], days, area_ha)
    project = to_tco2e(SF_W[regime], days, area_ha)
    return {
        "method_version": METHOD_VERSION,
        "days": days,
        "area_ha": round(area_ha, 4),
        "ef_c": EF_C,
        "gwp_ch4": GWP_CH4,
        "dry_level_cm": DRY_LEVEL_CM,
        "water_regime": regime,
        "sf_w": SF_W[regime],
        "phases": phases,
        "drying_phases": drying,
        "confirmed_drainages": confirmed,
        "sensor_coverage_pct": round(100 * days_with_data / (days + 1)) if days >= 0 else 0,
        "baseline_tco2e": round(baseline, 4),
        "project_tco2e": round(project, 4),
        "reduction_tco2e": round(baseline - project, 4),
    }
