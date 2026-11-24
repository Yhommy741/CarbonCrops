"""Generate extra demo data: services/database/mock/004_extra_mock_data.sql

Loads after the team's carboncrops_mock_data_v4.sql (and migrations/002) and adds to it:
  - IoT water-level readings every 4 hours for the 5 mock paddies' devices, from
    install to now: AWD (flood -> dry to -10..-18 cm -> refill), rain, final drain,
    fallow after harvest, one sensor outage (why paddy 2's credit failed)
  - a new growing crop calendar on paddies 1-3 (dry season 2027)
  - 3 more farmers with 2-3 paddies each, a device per paddy and 2-3 seasons of history
  - farmer records: sowing/transplanting photo, fertilizer (formula + kg/rai),
    harvest photo, with GPS; rice stage worked out from the date
  - satellite images (NDVI from crop age, NDWI from the water level that day)
  - carbon credits computed with the real model (passed / failed / not_checked)

Readings run up to the moment the script is run (or --now YYYY-MM-DD), so regenerate
before a demo, then reset the database (scripts/reset-demo-data.ps1 does both).
Same date -> same data (fixed random seed).
"""

import argparse
import random
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_DIR))
from app.services import ghg  # noqa: E402

OUT = API_DIR.parent / "database" / "mock" / "004_extra_mock_data.sql"
READING_EVERY_H = 4
SENSOR_FLOOR_CM = -30.0  # bottom of the sensor tube
CARBON_PRICE_THB = 300  # same default as the API

_args = argparse.ArgumentParser(description=__doc__.splitlines()[0])
_args.add_argument("--now", type=date.fromisoformat, help="end of the data (default: now)")
_args.add_argument("--all-users", action="store_true",
                   help="keep every mock user (default: only Farmer A and the verifier, see TEST_USERS)")
_parsed = _args.parse_args()
_now_arg = _parsed.now
_now = datetime.combine(_now_arg, datetime.min.time()) if _now_arg else datetime.now()

# Testing scope for now: only these v4 users are kept (the load deletes everyone else
# and their data); --all-users keeps them all and adds 3 more farmers.
FARMER_A = "631baedb-ad9b-531e-a4b4-b30ed561748d"  # เกษตรกรตัวอย่าง ก
TEST_USERS = None if _parsed.all_users else [FARMER_A, "37f50fa5-8e5d-5e89-8f89-9c9e80cc4537"]
NOW = _now.replace(hour=_now.hour - _now.hour % READING_EVERY_H, minute=0, second=0, microsecond=0)
TODAY = NOW.date()
rng = random.Random(2569)

# rice_stages rows from carboncrops_mock_data_v4.sql: (stage_no, start_day, end_day)
RICE_STAGES = [(1, -14, -1), (2, 0, 20), (3, 21, 45), (4, 46, 70), (5, 71, 95), (6, 96, 120)]
VERIFIER = "37f50fa5-8e5d-5e89-8f89-9c9e80cc4537"  # the v4 verifier user

_counters = defaultdict(lambda: 100)


def new_id(prefix):
    _counters[prefix] += 1
    return f"{prefix}0000000-0000-4000-8000-{_counters[prefix]:012d}"


def stage_no(planting, day):
    offset = (day - planting).days
    for no, lo, hi in RICE_STAGES:
        if lo <= offset <= hi:
            return no
    return 1 if offset < 0 else 6


# ---------------------------------------------------------------- the team's mock data (v4)

# key: (paddy_id, owner, name, lat, lng, area_rai)
PADDIES = {
    "m1": ("ceed0afb-bfe3-5ca5-921b-c28c9bb7db39", "631baedb-ad9b-531e-a4b4-b30ed561748d", "แปลงนาทดสอบ 1", 14.471, 100.111, 12),
    "m2": ("f1287ffd-592b-5db2-bfb4-2253f3bafacf", "2bdbeed9-281c-5414-a680-918006d0e1c2", "แปลงนาทดสอบ 2", 14.472, 100.112, 14),
    "m3": ("a5fdde22-0b23-520b-b5a3-12c98e1e40a6", "e6876a9f-40f4-555f-a830-45eea08e7dbf", "แปลงนาทดสอบ 3", 14.473, 100.113, 16),
    "m4": ("d4c21e1b-3a01-52d9-80ab-5638ec3ea3c6", "631baedb-ad9b-531e-a4b4-b30ed561748d", "แปลงนาทดสอบ 4", 14.474, 100.114, 18),
    "m5": ("d22ee80b-eb0c-5daa-a6bb-84416a5a5a67", "2bdbeed9-281c-5414-a680-918006d0e1c2", "แปลงนาทดสอบ 5", 14.475, 100.115, 20),
}
# key: (device_id, installed_at, existing); the v4 devices already have readings on this day
DEVICES = {
    "m1": ("MOCK-DEV-001", date(2026, 4, 16), True),
    "m2": ("MOCK-DEV-002", date(2026, 4, 17), True),
    "m3": ("MOCK-DEV-003", date(2026, 4, 18), True),
    "m4": ("MOCK-DEV-004", date(2026, 9, 25), True),
    "m5": ("MOCK-DEV-005", date(2026, 9, 26), True),
}
V4_READING_DAY = date(2026, 11, 4)

VARIETY_DAYS = {
    "กข43": 100, "ปทุมธานี 1": 120, "กข79": 115, "ขาวดอกมะลิ 105": 145,
    "กข41": 110, "พิษณุโลก 2": 115, "กข85": 105,
}
NAPI = ["กข43", "ปทุมธานี 1", "กข79", "ขาวดอกมะลิ 105"]
NAPRANG = ["กข41", "กข43", "พิษณุโลก 2", "กข85"]


def calendar(paddy, variety, planting, harvest=None, behavior="multiple", existing_id=None,
             planned_days=None, gap=None, credit=None):
    planned_days = planned_days or VARIETY_DAYS[variety] + rng.randint(-4, 4)
    if harvest is None and existing_id is None:
        due = planting + timedelta(days=planned_days)
        if due <= TODAY - timedelta(days=3):
            harvest = due
    return {"id": existing_id or new_id(4), "paddy": paddy, "variety": variety, "planting": planting,
            "harvest": harvest, "behavior": behavior, "planned_days": planned_days, "gap": gap,
            "existing": existing_id is not None, "credit": credit}


CALENDARS = [
    # v4 calendars: only sensor data is added (their activities and credits stay as they are)
    calendar("m1", "กข43", date(2026, 5, 1), date(2026, 8, 29), existing_id="f561660c-7be8-5522-9046-40549e9a67ab"),
    calendar("m2", "กข43", date(2026, 5, 2), date(2026, 8, 30), "single", existing_id="53d65577-6775-551b-98bf-172976d68256",
             gap=(date(2026, 6, 20), date(2026, 7, 1))),  # v4: this credit failed (incomplete evidence)
    calendar("m3", "กข43", date(2026, 5, 3), date(2026, 8, 31), existing_id="3f1aa6ea-c318-5415-992b-81335dfc95f5"),
    calendar("m4", "กข43", date(2026, 10, 10), existing_id="ff4f5935-c8e6-5773-81e2-b71e6ac25e67", planned_days=118),
    calendar("m5", "กข43", date(2026, 10, 11), behavior="single", existing_id="1c20f9ec-d32f-56b8-af2a-78f739b1dd51",
             planned_days=118),
    # second crop on paddies 1-3, still growing
    calendar("m1", "กข41", date(2026, 10, 18), planned_days=112),
    calendar("m2", "กข85", date(2026, 10, 22), behavior="single", planned_days=108),
    calendar("m3", "พิษณุโลก 2", date(2026, 10, 25), planned_days=117),
]

# ---------------------------------------------------------------- more farmers, several paddies each

NEW_FARMERS = [
    # name, phone, address, province, district, [(paddy name, lat, lng, rai, subdistrict, deed)]
    ("บุญมี ศรีสุข", "0812345681", "88 ม.4 ต.ป่าโมก", "อ่างทอง", "ป่าโมก", [
        ("นาทุ่งใหญ่", 14.482215, 100.440871, 18.0, "ป่าโมก", "โฉนด 22051"),
        ("นาข้างวัด", 14.478930, 100.452310, 9.5, "บางปลากด", "นส.4 3310"),
        ("นาโคกกลาง", 14.471106, 100.436742, 11.0, "โผงเผง", None),
    ]),
    ("มาลี แก้วประเสริฐ", "0812345682", "19 ม.2 ต.บางบาล", "พระนครศรีอยุธยา", "บางบาล", [
        ("นาริมเจ้าพระยา", 14.381655, 100.483120, 22.0, "บางบาล", "โฉนด 10877"),
        ("นาหนองน้ำ", 14.392870, 100.471905, 7.25, "วัดยม", "นส.3ก 4420"),
    ]),
    ("สุรชัย คำภา", "0812345683", "5 ม.7 ต.โพนางดำออก", "ชัยนาท", "สรรพยา", [
        ("นาเหนือ", 15.145320, 100.290115, 14.0, "โพนางดำออก", "นส.4 7781"),
        ("นาใต้", 15.131877, 100.296604, 16.5, "โพนางดำตก", "นส.4 7782"),
    ]),
]

if TEST_USERS:  # only generate data for the users being tested
    NEW_FARMERS = []
    kept = {k for k, p in PADDIES.items() if p[1] in TEST_USERS}
    PADDIES = {k: PADDIES[k] for k in kept}
    DEVICES = {k: DEVICES[k] for k in kept}
    CALENDARS = [c for c in CALENDARS if c["paddy"] in kept]

users_sql, paddies_sql, devices_sql = [], [], []
device_no = 100
for name, phone, address, province, district, paddies in NEW_FARMERS:
    uid = new_id(1)
    users_sql.append((uid, name, phone, "farmer", address, province, district))
    for pname, lat, lng, rai, sub, deed in paddies:
        key = f"n{len(paddies_sql) + 1}"
        pid = new_id(3)
        PADDIES[key] = (pid, uid, pname, lat, lng, rai)
        paddies_sql.append((pid, uid, pname, lat, lng, rai, province, district, sub, deed))
        device_no += 1
        DEVICES[key] = (f"CC-WL-{device_no:04d}", date(2025, 5, 20) + timedelta(days=rng.randint(0, 10)), False)
        devices_sql.append((DEVICES[key][0], pid, rng.randint(55, 100), DEVICES[key][1]))

        behavior = lambda: rng.choices(["multiple", "single", "continuous"], [6, 3, 1])[0]  # noqa: E731
        start = date(2025, 6, 5) + timedelta(days=rng.randint(0, 30))
        CALENDARS.append(calendar(key, rng.choice(NAPI), start, behavior=behavior(),
                                  credit=rng.choice(["passed", "passed", "failed"])))
        if rng.random() < 0.75:  # not everyone grows a dry-season crop
            start = date(2026, 1, 3) + timedelta(days=rng.randint(0, 25))
            CALENDARS.append(calendar(key, rng.choice(NAPRANG), start, behavior=behavior(),
                                      gap=rng.random() < 0.2,
                                      credit=rng.choice(["passed", "failed", "not_checked", None])))
        start = date(2026, 6, 1) + timedelta(days=rng.randint(0, 40))
        CALENDARS.append(calendar(key, rng.choice(NAPI), start, behavior=rng.choice(["multiple", "single"]),
                                  credit=rng.choice(["not_checked", None])))

# ---------------------------------------------------------------- water simulation


def is_rainy(d):
    return 6 <= d.month <= 10


def fallow_level(d):
    return -24 + rng.uniform(-2, 2) + (rng.uniform(4, 10) if is_rainy(d) and rng.random() < 0.15 else 0)


def drying_windows(c, days):
    """Days (from planting) when the farmer lets the field dry: (start_day, target_cm, cm per day)."""
    def window(lo, hi):
        return (rng.randint(lo, hi), rng.uniform(-18, -10), rng.uniform(1.3, 2.2))

    if c["behavior"] == "multiple":
        w = [window(20, 28), window(45, 55)]
        if days > 115:
            w.append(window(85, 95))  # after flowering
        return w
    if c["behavior"] == "single":
        return [window(25, 35)]
    return []


def simulate(c):
    """Daily mean water level (cm) from 7 days before planting to harvest (or today)."""
    days = c["planned_days"] if not c["harvest"] else (c["harvest"] - c["planting"]).days
    last = (c["harvest"] or TODAY) - c["planting"]
    final_drain_from = days - rng.randint(10, 14)
    windows = drying_windows(c, days)

    out = {c["planting"] + timedelta(days=i): rng.uniform(6, 10) for i in range(-7, 0)}  # land prep
    level, drying_until, target, rate = rng.uniform(4, 7), -1, None, None
    for d in range(0, last.days + 1):
        day = c["planting"] + timedelta(days=d)
        start_w = next((w for w in windows if w[0] == d), None)
        if start_w:
            _, target, rate = start_w
            drying_until = d + int((6 - target) / rate) + rng.randint(1, 3)
        if d >= final_drain_from:
            level = max(level - rng.uniform(1.5, 2.5), -27)
        elif d <= drying_until:
            level = max(level - rate * rng.uniform(0.8, 1.2), target)
            if d == drying_until:
                level = rng.uniform(4, 8)  # refill (pump or canal)
        else:
            level += (rng.uniform(4, 8) - level) * 0.5
        if is_rainy(day) and rng.random() < 0.07:  # heavy rain
            level += rng.uniform(1.5, 4)
        out[day] = max(min(level, 15), SENSOR_FLOOR_CM)
    return out


def gap_window(c):
    if isinstance(c["gap"], tuple):
        return c["gap"]
    if not c["gap"]:
        return None
    start = c["planting"] + timedelta(days=rng.randint(40, 70))
    return start, start + timedelta(days=rng.randint(6, 10))


readings = []  # (device_id, recorded_at, level)
series = defaultdict(list)  # paddy key -> [{"t", "level"}] for the carbon estimates
daily_level = {}  # (paddy key, date) -> level, for NDWI
for key, (device_id, installed, existing) in DEVICES.items():
    timeline, gaps = {}, []
    for c in [c for c in CALENDARS if c["paddy"] == key]:
        timeline.update(simulate(c))
        if (g := gap_window(c)):
            gaps.append(g)
    t = datetime.combine(installed, datetime.min.time())
    while t <= NOW:
        d = t.date()
        if d not in timeline:
            timeline[d] = fallow_level(d)
        daily_level[key, d] = timeline[d]
        skip = any(g0 <= d <= g1 for g0, g1 in gaps) or (existing and d == V4_READING_DAY)
        if not skip:
            nxt = timeline.get(d + timedelta(days=1), timeline[d])
            level = timeline[d] + (nxt - timeline[d]) * t.hour / 24 + rng.uniform(-0.3, 0.3)
            level = round(max(level, SENSOR_FLOOR_CM), 1)
            readings.append((device_id, t, level))
            series[key].append({"t": t, "level": level})
        t += timedelta(hours=READING_EVERY_H)

# ---------------------------------------------------------------- calendars, farmer records, satellite

calendars_sql, activities, evidence, satellite = [], [], [], []
FERTILIZER = [  # (day range, formula, kg/rai range, note)
    ((15, 22), "16-20-0", (20, 30), "Basal fertilizer"),
    ((40, 50), "46-0-0", (8, 15), "Top dressing"),
    ((60, 70), "15-15-15", (10, 20), "Booting-stage fertilizer"),
]


def add_activity(c, kind, day, note, formula=None, kg=None, photo=None):
    _pid, _owner, _name, lat, lng, _rai = PADDIES[c["paddy"]]
    aid = new_id(6)
    activities.append((aid, c["id"], stage_no(c["planting"], day), kind, day, note, formula, kg))
    if photo:
        taken = datetime.combine(day, datetime.min.time()).replace(hour=rng.randint(6, 10), minute=rng.randint(0, 59))
        evidence.append((new_id(7), aid, photo, "image/svg+xml", taken,
                         round(lat + rng.uniform(-0.0004, 0.0004), 6), round(lng + rng.uniform(-0.0004, 0.0004), 6)))


for c in CALENDARS:
    if c["existing"]:
        continue
    pid = PADDIES[c["paddy"]][0]
    calendars_sql.append((c["id"], pid, c["variety"], c["planting"], c["harvest"]))
    method = rng.choice(["sowing", "sowing", "transplanting"])
    note = f"Wet-seeded {c['variety']}, {rng.choice([12, 15, 18, 20])} kg/rai" if method == "sowing" else f"Transplanted {c['variety']}"
    add_activity(c, method, c["planting"], note, photo="mock/planting.svg")
    last_day = c["harvest"] or TODAY
    for (lo, hi), formula, (kg_lo, kg_hi), fnote in FERTILIZER:
        day = c["planting"] + timedelta(days=rng.randint(lo, hi))
        if day <= last_day and (formula != "15-15-15" or rng.random() < 0.6):
            add_activity(c, "fertilizing", day, fnote, formula, rng.randrange(kg_lo, kg_hi + 1, 5) or kg_lo)
    if c["harvest"]:
        add_activity(c, "harvest", c["harvest"], f"Combine harvest, yield {rng.randrange(600, 950, 10)} kg/rai",
                     photo="mock/harvest.svg")

for c in CALENDARS:
    pid = PADDIES[c["paddy"]][0]
    d = c["planting"] + timedelta(days=rng.randint(3, 10))
    while d <= (c["harvest"] or TODAY):
        age = (d - c["planting"]).days
        ndvi = 0.18 + 0.62 * min(age / 70, 1) - (0.3 * max(age - 95, 0) / 30)  # green-up, then ripening
        water = daily_level.get((c["paddy"], d), 0)
        ndwi = max(min(0.05 + water * 0.015, 0.35), -0.35)  # wet field -> positive, dry -> negative
        source = "Sentinel-2" if rng.random() < 0.8 else "Landsat-9"
        code = "S2" if source == "Sentinel-2" else "L9"
        satellite.append((new_id("b"), pid, d, source, f"mock/satellite/{code}_{c['paddy']}_{d:%Y%m%d}.tif",
                          rng.randint(30, 90) if is_rainy(d) else rng.randint(0, 30),
                          round(ndvi + rng.uniform(-0.04, 0.04), 3), round(ndwi + rng.uniform(-0.03, 0.03), 3)))
        d += timedelta(days=rng.randint(10, 16))

# ---------------------------------------------------------------- carbon credits, notifications

credits, notifications = [], []
REJECT_REASONS = [
    "The harvest photo doesn't show the paddy clearly; please retake it with the paddy sign",
    "The planting photo was taken outside the paddy boundary; please check",
]
for c in CALENDARS:
    if c["existing"] or not c["harvest"] or not c["credit"]:
        continue
    pid, owner, pname, _lat, _lng, rai = PADDIES[c["paddy"]]
    s = [p for p in series[c["paddy"]] if c["planting"] <= p["t"].date() <= c["harvest"]]
    tco2e = ghg.estimate(c["planting"], c["harvest"], rai, s, today=TODAY)["reduction_tco2e"]
    if tco2e <= 0:
        continue  # flooded all season: nothing to claim
    status = c["credit"]
    gap = gap_window(c) if c["gap"] else None
    if gap and status == "passed":
        status = "failed"
    submitted = datetime.combine(c["harvest"] + timedelta(days=5), datetime.min.time()).replace(hour=9)
    verified = submitted + timedelta(days=rng.randint(5, 12), hours=rng.randint(1, 6))
    if verified > NOW:
        status = "not_checked"
    comment = None
    if status == "passed":
        comment = "Sensor data complete; photos and GPS match the paddy"
    elif status == "failed":
        comment = (f"No sensor data {gap[0]:%d/%m} – {gap[1]:%d/%m}, so the drying can't be confirmed"
                   if gap else rng.choice(REJECT_REASONS))
    decided = status != "not_checked"
    credits.append((new_id("c"), c["id"], pid, tco2e, status,
                    round(tco2e * CARBON_PRICE_THB, 2) if status == "passed" else None,
                    submitted, VERIFIER if decided else None, verified if decided else None, comment))
    if decided:
        result = "verified. Your certificate is ready." if status == "passed" else f"not verified. Reason: {comment}"
        notifications.append((new_id("f"), owner, "verification_result",
                              f'Crop planted {c["planting"]:%d/%m/%Y}, paddy "{pname}": {result}',
                              "sent", verified, verified))

for c in CALENDARS:
    if c["harvest"] or c["existing"]:
        continue
    pid, owner, pname, *_ = PADDIES[c["paddy"]]
    recent = [p for p in series[c["paddy"]] if p["t"] >= NOW - timedelta(days=1)]
    if recent and recent[-1]["level"] <= -15:
        at = recent[-1]["t"]
        notifications.append((new_id("f"), owner, "water_level_alert",
                              f'Water in paddy "{pname}" is down to {recent[-1]["level"]} cm. Refill the paddy.',
                              "sent", at, at))

# ---------------------------------------------------------------- write SQL


def sql_value(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, datetime):
        return f"'{v:%Y-%m-%d %H:%M:%S}'"
    if isinstance(v, date):
        return f"'{v:%Y-%m-%d}'"
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"


def insert(f, table, columns, rows, ignore=False, chunk=500):
    if not rows:
        return
    f.write(f"\n-- {table}: {len(rows)} rows\n")
    for i in range(0, len(rows), chunk):
        values = ",\n".join("(" + ",".join(sql_value(v) for v in row) + ")" for row in rows[i : i + chunk])
        f.write(f"INSERT {'IGNORE ' if ignore else ''}INTO `{table}` (`{'`,`'.join(columns)}`) VALUES\n{values};\n")


OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    f.write("-- Extra demo data generated by services/api/scripts/generate_mock_data.py -- do not edit by hand.\n")
    f.write(f"-- Readings end at {NOW:%Y-%m-%d %H:%M}. Runs after carboncrops_mock_data_v4.sql and migrations/002.\n")
    f.write("USE `carboncrops`;\nSET NAMES utf8mb4;\nSET time_zone = '+07:00';\nSTART TRANSACTION;\n")
    insert(f, "users", ["user_id", "display_name", "phone", "role", "address", "province", "district"], users_sql)
    insert(f, "paddy", ["paddy_id", "owner_user_id", "paddy_name", "latitude", "longitude", "area_rai",
                        "province", "district", "subdistrict", "land_doc_no"], paddies_sql)
    insert(f, "farming_calendars", ["calendar_id", "paddy_id", "rice_variety", "planting_date", "harvest_date"],
           calendars_sql)
    insert(f, "devices", ["device_id", "paddy_id", "battery_pct", "installed_at"], devices_sql)
    insert(f, "sensor_readings", ["device_id", "recorded_at", "water_level_cm"], readings, ignore=True)
    insert(f, "activities", ["activity_id", "calendar_id", "stage_no", "activity_type", "activity_date", "note",
                             "fertilizer_formula", "fertilizer_kg_per_rai"], activities)
    insert(f, "activity_evidence", ["evidence_id", "activity_id", "file_path", "file_type", "captured_at",
                                    "latitude", "longitude"], evidence)
    insert(f, "satellite_images", ["image_id", "paddy_id", "captured_at", "source", "file_path", "cloud_cover_pct",
                                   "ndvi_value", "ndwi_value"], satellite)
    insert(f, "carboncredit_info", ["credit_id", "calendar_id", "paddy_id", "credit_tco2e", "credit_status",
                                    "amount_thb", "submitted_at", "verified_by", "verified_at", "verify_comment"],
           credits)
    insert(f, "notifications", ["notification_id", "user_id", "notif_type", "message", "status", "sent_at",
                                "created_at"], notifications)
    if TEST_USERS:
        # Remove every other user and their data (calendars, activities, evidence and
        # satellite images go with the paddy via ON DELETE CASCADE)
        keep = ", ".join(sql_value(u) for u in TEST_USERS)
        others = f"SELECT paddy_id FROM paddy WHERE owner_user_id NOT IN ({keep})"
        f.write(f"""
-- testing scope: keep only {len(TEST_USERS)} users (generate with --all-users to keep everyone)
DELETE FROM carboncredit_info WHERE paddy_id IN ({others});
DELETE FROM sensor_readings WHERE device_id IN (SELECT device_id FROM devices WHERE paddy_id IN ({others}));
DELETE FROM devices WHERE paddy_id IN ({others});
DELETE FROM paddy WHERE owner_user_id NOT IN ({keep});
DELETE FROM users WHERE user_id NOT IN ({keep});
""")
    f.write("\nCOMMIT;\n")

print(f"wrote {OUT.relative_to(API_DIR.parent.parent)} (readings until {NOW:%Y-%m-%d %H:%M})")
print(f"  farmers +{len(users_sql)}, paddies +{len(paddies_sql)}, calendars +{len(calendars_sql)} "
      f"(sensor data for {len(CALENDARS)}), readings {len(readings)}, activities {len(activities)}, "
      f"satellite {len(satellite)}, credits {len(credits)}, notifications {len(notifications)}")
