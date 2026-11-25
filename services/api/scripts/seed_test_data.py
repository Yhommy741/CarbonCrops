"""Print SQL that adds test data for the two seed accounts (FarmerA, VBB) to the current database.

    python services/api/scripts/seed_test_data.py | docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops

Unlike mock/ (which needs a database reset), this keeps everything already in the
database. Every row it adds has an id starting with c1000000- (devices NODE-01xx), and
it deletes those rows first, so you can run it again; readings then run up to the new now.

FarmerA gets 4 paddies, each with a sensor node, covering the screens to test:
  1  นาหลังบ้าน    Paddies: growing 45 days, AWD drying now below -15 cm (red level)
  2  นาริมคลอง     Paddies: growing 12 days, flooded; History: previous crop, credit passed by VBB
  3  นาโคกใหญ่     History only (harvested 5 days ago), credit waiting in VBB's queue;
                  its sensor NODE-0103 is free to use in a new paddy
  4  นาแปลงใหม่    Paddies: planted 2 days ago, sensor hasn't reported yet (no GPS, no map)
"""

import random
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # Thai names; Windows would default to cp1252
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services import ghg  # noqa: E402

FARMER = "a0000000-0000-4000-8000-000000000001"  # FarmerA (seed/01_two_accounts.sql)
VERIFIER = "b0000000-0000-4000-8000-000000000001"  # VBB
PREFIX = "c1000000"
READING_EVERY = timedelta(hours=2)
STAGES = [(1, -14, -1), (2, 0, 20), (3, 21, 45), (4, 46, 70), (5, 71, 95), (6, 96, 120)]

rng = random.Random(42)
NOW = datetime.now().replace(minute=0, second=0, microsecond=0)
TODAY = NOW.date()
_ids = 0


def new_id():
    global _ids
    _ids += 1
    return f"{PREFIX}-0000-4000-8000-{_ids:012d}"


def stage_no(planting, day):
    age = (day - planting).days
    return next((n for n, lo, hi in STAGES if lo <= age <= hi), 1 if age < 0 else 6)


def level_on(day_no, dry_windows, final_drain_day):
    """Water level (cm, + above soil) on a crop day: flooded, AWD drying, final drain."""
    if final_drain_day is not None and day_no >= final_drain_day:
        return max(5 - 2.0 * (day_no - final_drain_day), -25)
    for start, length in dry_windows:
        if start <= day_no < start + length:
            return 5 - 21 * (day_no - start) / max(length - 1, 1)  # +5 cm down to -16 cm
    return 5.0


def readings(device, paddy, planting, end, dry_windows, final_drain_day=None):
    rows, t = [], datetime.combine(planting, time())
    while t <= end:
        day_no = (t - datetime.combine(planting, time())).total_seconds() / 86400
        level = level_on(day_no, dry_windows, final_drain_day) + rng.uniform(-0.6, 0.6)
        rows.append((device, paddy, t, round(level, 1)))
        t += READING_EVERY
    return rows


paddies, devices, calendars, activities, evidence, sensor, credits = [], [], [], [], [], [], []


def add_paddy(name, rai, device, lat, lon, battery, installed):
    pid = new_id()
    paddies.append((pid, FARMER, name, lat, lon, rai, "สุพรรณบุรี", "เมืองสุพรรณบุรี"))
    devices.append((device, pid, battery, installed))
    return pid


def add_activity(cal, kind, day, note=None, formula=None, kg=None, photo=None):
    aid = new_id()
    activities.append((aid, cal["id"], stage_no(cal["planting"], day), kind, day, note, formula, kg))
    if photo:
        evidence.append((new_id(), aid, photo, "image/svg+xml", datetime.combine(day, time(7, 30))))


def add_calendar(pid, rai, planting, harvest=None):
    """A crop as the app records it: a 'planting' activity with its photo, fertilizer, and on
    harvest the total kg harvested (the API works out kg/rai) with the harvest photo."""
    cal = {"id": new_id(), "paddy": pid, "planting": planting, "harvest": harvest}
    harvest_kg = rng.randrange(650, 900, 10) * rai if harvest else None
    calendars.append((cal["id"], pid, planting, harvest, harvest_kg))
    add_activity(cal, "planting", planting, photo="mock/planting.svg")
    last = harvest or TODAY
    for day, formula, kg in [(20, "16-20-0", 25), (50, "46-0-0", 15)]:
        if planting + timedelta(days=day) <= last:
            add_activity(cal, "fertilizing", planting + timedelta(days=day), formula=formula, kg=kg)
    if harvest:
        add_activity(cal, "harvest", harvest, photo="mock/harvest.svg")
    return cal


def add_credit(cal, rai, series, status, verified_days_ago=None):
    est = ghg.estimate(cal["planting"], cal["harvest"], rai, [{"t": t, "level": lv} for _, _, t, lv in series])
    tco2e = est["reduction_tco2e"]
    submitted = datetime.combine(cal["harvest"] + timedelta(days=1), time(9))
    verified = submitted + timedelta(days=verified_days_ago) if verified_days_ago else None
    credits.append((new_id(), cal["id"], cal["paddy"], tco2e, status,
                    None,  # amount_thb: no carbon market in this prototype
                    submitted, VERIFIER if verified else None, verified,
                    "หลักฐานครบ ระดับน้ำสอดคล้องกับ AWD" if verified else None))
    return tco2e


# 1: growing 45 days; 2 dry-downs done, a 3rd under way (-16 cm now -> low water alert)
p1 = add_paddy("นาหลังบ้าน", 12, "NODE-0101", 14.474512, 100.117203, 82, TODAY - timedelta(days=50))
planting = TODAY - timedelta(days=45)
add_calendar(p1, 12, planting)
sensor += readings("NODE-0101", p1, planting, NOW, [(14, 8), (27, 7), (38, 8)])

# 2: previous crop (harvested ~4 months ago, credit passed) + a new crop flooded for 12 days
p2 = add_paddy("นาริมคลอง", 8.5, "NODE-0102", 14.489031, 100.098115, 64, TODAY - timedelta(days=260))
old_plant, old_harvest = TODAY - timedelta(days=245), TODAY - timedelta(days=130)
old = add_calendar(p2, 8.5, old_plant, old_harvest)
old_series = readings("NODE-0102", p2, old_plant, datetime.combine(old_harvest, time(23)),
                      [(15, 8), (30, 7), (45, 8), (62, 7)], final_drain_day=104)
sensor += old_series
add_credit(old, 8.5, old_series, "passed", verified_days_ago=3)
planting = TODAY - timedelta(days=12)
add_calendar(p2, 8.5, planting)
sensor += readings("NODE-0102", p2, planting, NOW, [])

# 3: harvested 5 days ago, credit submitted and waiting for VBB; low battery
p3 = add_paddy("นาโคกใหญ่", 20, "NODE-0103", 14.451207, 100.140518, 18, TODAY - timedelta(days=125))
plant3, harvest3 = TODAY - timedelta(days=118), TODAY - timedelta(days=5)
cal3 = add_calendar(p3, 20, plant3, harvest3)
series3 = readings("NODE-0103", p3, plant3, datetime.combine(harvest3, time(23)),
                   [(14, 8), (28, 8), (42, 7), (58, 8), (74, 6)], final_drain_day=100)
sensor += series3
add_credit(cal3, 20, series3, "not_checked")

# 4: planted 2 days ago, sensor installed but hasn't sent anything (no GPS position yet)
p4 = add_paddy("นาแปลงใหม่", 5, "NODE-0104", None, None, None, TODAY - timedelta(days=2))
add_calendar(p4, 5, TODAY - timedelta(days=2))


def sql(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, datetime):
        return f"'{v:%Y-%m-%d %H:%M:%S}'"
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"


def insert(table, columns, rows, chunk=500):
    for i in range(0, len(rows), chunk):
        values = ",\n".join("(" + ",".join(sql(v) for v in r) + ")" for r in rows[i:i + chunk])
        print(f"INSERT INTO `{table}` ({','.join(f'`{c}`' for c in columns)}) VALUES\n{values};")


like = f"'{PREFIX}-%'"
print(f"""-- CarbonCrops test data, generated {NOW:%Y-%m-%d %H:%M} by services/api/scripts/seed_test_data.py
SET NAMES utf8mb4;
START TRANSACTION;
-- also credits the app created on these paddies (e.g. a harvest recorded while testing)
DELETE FROM carboncredit_info WHERE credit_id LIKE {like} OR paddy_id LIKE {like};
DELETE FROM activity_evidence WHERE evidence_id LIKE {like};
DELETE FROM activities WHERE activity_id LIKE {like};
DELETE FROM farming_calendars WHERE calendar_id LIKE {like};
DELETE FROM sensor_readings WHERE device_id LIKE 'NODE-01__';
DELETE FROM devices WHERE device_id LIKE 'NODE-01__';
DELETE FROM paddy WHERE paddy_id LIKE {like};""")
insert("paddy", ["paddy_id", "owner_user_id", "paddy_name", "latitude", "longitude", "area_rai", "province", "district"], paddies)
insert("devices", ["device_id", "paddy_id", "battery_pct", "installed_at"], devices)
insert("farming_calendars", ["calendar_id", "paddy_id", "planting_date", "harvest_date", "harvest_kg"], calendars)
insert("activities", ["activity_id", "calendar_id", "stage_no", "activity_type", "activity_date", "note",
                      "fertilizer_formula", "fertilizer_kg_per_rai"], activities)
insert("activity_evidence", ["evidence_id", "activity_id", "file_path", "file_type", "captured_at"], evidence)
insert("sensor_readings", ["device_id", "paddy_id", "recorded_at", "water_level_cm"], sensor)
insert("carboncredit_info", ["credit_id", "calendar_id", "paddy_id", "credit_tco2e", "credit_status", "amount_thb",
                             "submitted_at", "verified_by", "verified_at", "verify_comment"], credits)
print("COMMIT;")
print(f"paddies {len(paddies)}, crops {len(calendars)}, activities {len(activities)}, "
      f"readings {len(sensor)}, credits {', '.join(f'{c[4]} {c[3]} tCO2e' for c in credits)}", file=sys.stderr)
