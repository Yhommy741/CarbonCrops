"""Generate demo data: services/database/mock/003_mock_data.sql

Adds to the sample data in carboncrops_DB.sql:
  - more farmers, several with more than one plot (GPS, area, land deeds)
  - crop cycles per plot: นาปี 2568, นาปรัง 2569, นาปี 2569 (some still growing)
  - an IoT water-level sensor per plot, readings every 4 hours from install to NOW,
    simulating AWD (flood -> dry down to -10..-18 cm -> refill), rain, final drain,
    fallow between seasons, and a few sensor outages
  - farmer records: planting photo, fertilizer (formula + kg/rai), harvest photo
  - satellite image metadata (Sentinel-2 / Landsat-9) every ~2 weeks
  - GHG estimates computed with the real model, verifications, reports, notifications

Readings run up to the moment the script is run (or --now YYYY-MM-DD), so regenerate
before a demo to make "active" cycles current, then reset the database:
  services\\api\\.venv\\Scripts\\python services\\api\\scripts\\generate_mock_data.py
  services\\api\\.venv\\Scripts\\python services\\api\\scripts\\generate_mock_data.py --now 2026-11-02
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

OUT = API_DIR.parent / "database" / "mock" / "003_mock_data.sql"
READING_EVERY_H = 4

_args = argparse.ArgumentParser(description=__doc__.splitlines()[0])
_args.add_argument("--now", type=date.fromisoformat, help="end of the data (default: now)")
_now_arg = _args.parse_args().now
_now = datetime.combine(_now_arg, datetime.min.time()) if _now_arg else datetime.now()
NOW = _now.replace(hour=_now.hour - _now.hour % READING_EVERY_H, minute=0, second=0, microsecond=0)  # readings stop here
TODAY = NOW.date()
SENSOR_FLOOR_CM = -30.0  # bottom of the sensor tube
rng = random.Random(2569)

VERIFIER = "10000000-0000-4000-8000-000000000004"
_counters = defaultdict(lambda: 100)


def new_id(prefix):
    """IDs follow the sample data pattern: 4xxxxxxx-... for cycles, etc. New ones start at 101."""
    _counters[prefix] += 1
    return f"{prefix}0000000-0000-4000-8000-{_counters[prefix]:012d}"


def old_id(prefix, n):
    return f"{prefix}0000000-0000-4000-8000-{n:012d}"


# ---------------------------------------------------------------- people and plots

NEW_FARMERS = [
    # name, phone, address, province, district
    ("บุญมี ศรีสุข", "0812345681", "88 ม.4 ต.ป่าโมก", "อ่างทอง", "ป่าโมก"),
    ("มาลี แก้วประเสริฐ", "0812345682", "19 ม.2 ต.บางบาล", "พระนครศรีอยุธยา", "บางบาล"),
    ("สุรชัย คำภา", "0812345683", "5 ม.7 ต.โพนางดำออก", "ชัยนาท", "สรรพยา"),
    ("อำไพ พุ่มพวง", "0812345684", "201 ม.1 ต.บางเลน", "สุพรรณบุรี", "สองพี่น้อง"),
]

U = {"somchai": old_id(1, 1), "somying": old_id(1, 2), "prayoon": old_id(1, 3)}
users = []
for key, (name, phone, address, province, district) in zip(
    ["boonmee", "malee", "surachai", "ampai"], NEW_FARMERS
):
    U[key] = new_id(1)
    users.append((U[key], name, phone, "farmer", address, province, district))

# plot_key: (plot_id, owner, name, lat, lng, area_rai, province, district, subdistrict, deed, existing)
PLOTS = {
    "p1": (old_id(3, 1), U["somchai"], "นาหลังบ้าน", 14.339512, 100.867204, 12.5, None, None, None, None, True),
    "p2": (old_id(3, 2), U["somchai"], "นาริมคลอง", 14.342880, 100.871115, 6.0, None, None, None, None, True),
    "p3": (old_id(3, 3), U["somying"], "แปลงบางปลาม้า", 14.396721, 100.153309, 8.25, None, None, None, None, True),
    "p4": (old_id(3, 4), U["prayoon"], "นาใหญ่ท่าช้าง", 14.885430, 100.401877, 20.0, None, None, None, None, True),
    "p5": (old_id(3, 5), U["prayoon"], "นาเช่าหัวไผ่", 14.902115, 100.388640, 15.75, None, None, None, None, True),
}
NEW_PLOTS = [
    ("somying", "นาดอนเจดีย์", 14.633812, 100.012455, 5.5, "สุพรรณบุรี", "ดอนเจดีย์", "สระกระโจม", "นส.3ก 8102"),
    ("boonmee", "นาทุ่งใหญ่", 14.482215, 100.440871, 18.0, "อ่างทอง", "ป่าโมก", "ป่าโมก", "โฉนด 22051"),
    ("boonmee", "นาข้างวัด", 14.478930, 100.452310, 9.5, "อ่างทอง", "ป่าโมก", "บางปลากด", "นส.4 3310"),
    ("boonmee", "นาโคกกลาง", 14.471106, 100.436742, 11.0, "อ่างทอง", "ป่าโมก", "โผงเผง", None),
    ("malee", "นาริมเจ้าพระยา", 14.381655, 100.483120, 22.0, "พระนครศรีอยุธยา", "บางบาล", "บางบาล", "โฉนด 10877"),
    ("malee", "นาหนองน้ำ", 14.392870, 100.471905, 7.25, "พระนครศรีอยุธยา", "บางบาล", "วัดยม", "นส.3ก 4420"),
    ("surachai", "นาเหนือ", 15.145320, 100.290115, 14.0, "ชัยนาท", "สรรพยา", "โพนางดำออก", "นส.4 7781"),
    ("surachai", "นาใต้", 15.131877, 100.296604, 16.5, "ชัยนาท", "สรรพยา", "โพนางดำตก", "นส.4 7782"),
    ("ampai", "นาสองพี่น้อง", 14.221452, 100.041873, 10.0, "สุพรรณบุรี", "สองพี่น้อง", "บางเลน", "โฉนด 5590"),
]
plots_sql = []
for i, (owner, name, lat, lng, area, prov, dist, sub, deed) in enumerate(NEW_PLOTS, start=1):
    pid = new_id(3)
    PLOTS[f"n{i}"] = (pid, U[owner], name, lat, lng, area, prov, dist, sub, deed, False)
    plots_sql.append((pid, U[owner], name, lat, lng, area, prov, dist, sub, deed))

# ---------------------------------------------------------------- crop cycles

VARIETY_DAYS = {
    "กข43": 100, "ปทุมธานี 1": 120, "กข79": 115, "ขาวดอกมะลิ 105": 145,
    "กข41": 110, "พิษณุโลก 2": 115, "กข85": 105,
}
NAPI = ["กข43", "ปทุมธานี 1", "กข79", "ขาวดอกมะลิ 105"]
NAPRANG = ["กข41", "กข43", "พิษณุโลก 2", "กข85"]


def cycle(plot, name, variety, start, end=None, status=None, behavior="multiple", existing_id=None,
          planned_days=None, gap=None, verification=None, record_activities=True):
    planned_days = planned_days or VARIETY_DAYS[variety] + rng.randint(-4, 4)
    if end is None and status in ("harvested", "closed"):
        end = start + timedelta(days=planned_days)
    if end is None and status is None:
        harvest = start + timedelta(days=planned_days)
        if harvest <= TODAY - timedelta(days=3):
            end, status = harvest, "harvested"
        else:
            status = "active"
    return {
        "id": existing_id or new_id(4), "plot": plot, "name": name, "variety": variety,
        "start": start, "end": end, "status": status, "behavior": behavior,
        "planned_days": planned_days, "gap": gap, "existing": existing_id is not None,
        "verification": verification, "record_activities": record_activities,
    }


CYCLES = [
    # existing cycles from the sample data: add sensor data (and missing farmer records)
    cycle("p1", "นาปี 2568", "กข43", date(2025, 6, 1), date(2025, 11, 15), "closed",
          existing_id=old_id(4, 1), behavior="c1_story", record_activities=False),
    cycle("p1", "นาปรัง 2569", "กข41", date(2026, 1, 10), date(2026, 5, 5), "harvested",
          existing_id=old_id(4, 2), behavior="multiple"),
    cycle("p3", "นาปี 2569", "ขาวดอกมะลิ 105", date(2026, 6, 15), None, "active",
          existing_id=old_id(4, 3), behavior="multiple", planned_days=158),
    cycle("p4", "นาปี 2569", "ปทุมธานี 1", date(2026, 7, 1), None, "active",
          existing_id=old_id(4, 4), behavior="single", planned_days=125),
    # new cycles on existing plots
    cycle("p1", "นาปี 2569", "กข43", date(2026, 6, 5), behavior="multiple"),
    cycle("p2", "นาปี 2568", "ปทุมธานี 1", date(2025, 6, 10), status="closed", behavior="multiple",
          verification="approved"),
    cycle("p2", "นาปรัง 2569", "กข85", date(2026, 1, 15), behavior="single", verification="approved"),
    cycle("p2", "นาปี 2569", "กข79", date(2026, 7, 10), behavior="multiple"),
    cycle("p5", "นาปรัง 2569", "กข41", date(2026, 1, 5), behavior="continuous"),
]
for key, (pid, owner, *_rest) in PLOTS.items():
    if not key.startswith("n"):
        continue
    plot_no = int(key[1:])
    if plot_no != 1:  # นาดอนเจดีย์ is a new plot for this season only
        start = date(2025, 6, 5) + timedelta(days=rng.randint(0, 30))
        CYCLES.append(cycle(key, "นาปี 2568", rng.choice(NAPI), start, status="closed",
                            behavior=rng.choices(["multiple", "single", "continuous"], [6, 3, 1])[0],
                            verification="approved"))
    if plot_no not in (4, 9):  # some farmers only grow นาปี
        start = date(2026, 1, 3) + timedelta(days=rng.randint(0, 25))
        CYCLES.append(cycle(key, "นาปรัง 2569", rng.choice(NAPRANG), start,
                            behavior=rng.choices(["multiple", "single"], [7, 3])[0],
                            gap=rng.random() < 0.25,
                            verification=rng.choice(["approved", "approved", "rejected", "in_review", "pending"])))
    start = date(2026, 6, 1) + timedelta(days=rng.randint(0, 40))
    CYCLES.append(cycle(key, "นาปี 2569", rng.choice(NAPI), start,
                        behavior=rng.choices(["multiple", "single"], [7, 3])[0]))

# every closed cycle of นาปี 2568 has a status "closed"; นาปรัง harvested earlier this year are closed once verified
for c in CYCLES:
    if not c["existing"] and c["status"] == "harvested" and c["verification"] == "approved":
        c["status"] = "closed"

# ---------------------------------------------------------------- water simulation


def is_rainy(d):
    return 6 <= d.month <= 10


def fallow_level(d):
    return -24 + rng.uniform(-2, 2) + (rng.uniform(4, 10) if is_rainy(d) and rng.random() < 0.15 else 0)


def drying_windows(c, days):
    """Days (from planting) when the farmer lets the field dry: list of (start_day, target_cm, rate)."""
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


def simulate_cycle(c):
    """Daily mean water level (cm) from 7 days before planting to harvest (or TODAY)."""
    days = c["planned_days"]
    last = (c["end"] or TODAY) - c["start"]
    final_drain_from = days - rng.randint(10, 14)
    if c["behavior"] == "c1_story":  # matches awd_phases / water_measurements in the sample data
        # 2nd drying (31 Jul - ~7 Aug) falls entirely inside the sensor outage below
        windows = [(25, -12.5, 1.7), (60, -8.0, 2.4)]
        final_drain_from = 151
    else:
        windows = drying_windows(c, days)

    out = {}
    for i in range(-7, 0):  # soaking and land preparation
        out[c["start"] + timedelta(days=i)] = rng.uniform(6, 10)

    level, drying_until, target, rate = rng.uniform(4, 7), -1, None, None
    for d in range(0, last.days + 1):
        day = c["start"] + timedelta(days=d)
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
    if c["behavior"] == "c1_story":
        return date(2025, 7, 31), date(2025, 8, 9)  # the reason the sample verification was rejected
    if not c["gap"]:
        return None
    start = c["start"] + timedelta(days=rng.randint(40, 70))
    return start, start + timedelta(days=rng.randint(6, 10))


# ---------------------------------------------------------------- devices

# plot_key -> list of (device_id, serial, installed_at, removed_at, existing)
INSTALLS = {
    "p1": [(old_id(9, 1), None, datetime(2025, 5, 20, 10), datetime(2025, 11, 20, 10), True),
           (old_id(9, 3), None, datetime(2026, 1, 5, 10), datetime(2026, 5, 10, 10), True)],
    "p3": [(old_id(9, 1), None, datetime(2026, 6, 10, 9), None, True)],
    "p4": [(old_id(9, 2), None, datetime(2026, 6, 25, 9), None, True)],
}
devices_sql, installs_sql = [], []
serial_no = 100
for key in PLOTS:
    plot_cycles = [c for c in CYCLES if c["plot"] == key]
    if not plot_cycles:
        continue
    first = min(c["start"] for c in plot_cycles)
    if key == "p1":
        first = date(2026, 6, 5)  # new sensor after the old ones were moved
    elif key in INSTALLS:
        continue
    serial_no += 1
    dev = new_id(9)
    installed = datetime.combine(first - timedelta(days=10), datetime.min.time()).replace(hour=9)
    devices_sql.append((dev, f"CC-WL-{serial_no:04d}", "water_level", "active"))
    installs_sql.append((new_id("a"), dev, PLOTS[key][0], installed, None))
    INSTALLS.setdefault(key, []).append((dev, None, installed, None, False))

# ---------------------------------------------------------------- readings

readings = []  # (device_id, recorded_at, level, battery, received_at)
series_by_plot = defaultdict(list)  # for the GHG estimates
gaps_by_cycle = {}

for key, installs in INSTALLS.items():
    timeline, gaps = {}, []
    for c in [c for c in CYCLES if c["plot"] == key]:
        timeline.update(simulate_cycle(c))
        g = gap_window(c)
        gaps_by_cycle[c["id"]] = g
        if g:
            gaps.append(g)
    for dev, _serial, installed, removed, _existing in installs:
        low_battery = dev == old_id(9, 2)  # sample notification: CC-WL-0002 battery 15%
        t = installed.replace(minute=0) + timedelta(hours=READING_EVERY_H - installed.hour % READING_EVERY_H)
        end = removed or NOW
        total_h = (end - t).total_seconds() / 3600
        while t <= end:
            d = t.date()
            if any(g0 <= d <= g1 for g0, g1 in gaps):
                t += timedelta(hours=READING_EVERY_H)
                continue
            if d not in timeline:
                timeline[d] = fallow_level(d)
            nxt = timeline.get(d + timedelta(days=1), timeline[d])
            level = timeline[d] + (nxt - timeline[d]) * t.hour / 24 + rng.uniform(-0.3, 0.3)
            level = round(max(level, SENSOR_FLOOR_CM), 1)
            done = 1 - (end - t).total_seconds() / 3600 / max(total_h, 1)
            if low_battery:
                battery = round(95 - 80 * done)
            else:  # solar panel: drains at night, recharges in the day
                battery = round(78 + 14 * (1 if 8 <= t.hour <= 16 else -1) * rng.uniform(0.3, 1))
            readings.append((dev, t, level, battery, t + timedelta(seconds=rng.randint(20, 90))))
            series_by_plot[key].append({"t": t, "level": level})
            t += timedelta(hours=READING_EVERY_H)

# ---------------------------------------------------------------- farmer records

activities, evidence = [], []
FERTILIZER = [  # (day range, formula, kg/rai range, note)
    ((15, 22), "16-20-0", (20, 30), "ปุ๋ยรองพื้น"),
    ((40, 50), "46-0-0", (8, 15), "ปุ๋ยแต่งหน้า"),
    ((60, 70), "15-15-15", (10, 20), "ปุ๋ยช่วงตั้งท้อง"),
]


def add_activity(c, kind, day, note, formula=None, kg=None, photo=None):
    pid, owner, _name, lat, lng = PLOTS[c["plot"]][:5]
    aid = new_id(6)
    activities.append((aid, c["id"], owner, kind, day, note, formula, kg,
                       datetime.combine(day, datetime.min.time()).replace(hour=18)))
    if photo:
        taken = datetime.combine(day, datetime.min.time()).replace(hour=rng.randint(6, 10), minute=rng.randint(0, 59))
        evidence.append((new_id(7), aid, photo, "image/svg+xml", taken,
                         round(lat + rng.uniform(-0.0004, 0.0004), 6), round(lng + rng.uniform(-0.0004, 0.0004), 6)))


for c in CYCLES:
    if not c["record_activities"]:
        continue
    seed_rate = rng.choice([12, 15, 18, 20])
    add_activity(c, "planting", c["start"], f"หว่านน้ำตม {c['variety']} {seed_rate} กก./ไร่",
                 photo="mock/planting.svg")
    last_day = c["end"] or TODAY
    for (lo, hi), formula, (kg_lo, kg_hi), note in FERTILIZER:
        day = c["start"] + timedelta(days=rng.randint(lo, hi))
        if day <= last_day and (formula != "15-15-15" or rng.random() < 0.6):
            add_activity(c, "fertilizing", day, note, formula, rng.randrange(kg_lo, kg_hi + 1, 5) or kg_lo)
    if c["end"]:
        add_activity(c, "harvest", c["end"], f"รถเกี่ยว ได้ข้าว {rng.randrange(600, 950, 10)} กก./ไร่",
                     photo="mock/harvest.svg")

# ---------------------------------------------------------------- satellite images

satellite = []
for key in PLOTS:
    plot_cycles = [c for c in CYCLES if c["plot"] == key]
    for c in plot_cycles:
        d = c["start"] + timedelta(days=rng.randint(3, 10))
        while d <= (c["end"] or TODAY):
            source = "Sentinel-2" if rng.random() < 0.8 else "Landsat-9"
            cloud = rng.randint(30, 90) if is_rainy(d) else rng.randint(0, 30)
            code = "S2" if source == "Sentinel-2" else "L9"
            satellite.append((new_id("b"), PLOTS[key][0], d, source,
                              f"satellite/{d:%Y/%m}/{code}_{key}_{d:%Y%m%d}.tif", cloud))
            d += timedelta(days=rng.randint(10, 16))

# ---------------------------------------------------------------- MRV: estimates, verifications, reports

estimates, verifications, reports, notifications = [], [], [], []
report_seq = {2568: 2, 2569: 3}  # sample data already has CC-2568-000002 and CC-2569-000003
REJECT_REASONS = [
    "รูปถ่ายวันเก็บเกี่ยวไม่เห็นแปลงชัดเจน ขอให้ถ่ายใหม่พร้อมป้ายแปลง",
    "พิกัดรูปถ่ายวันเริ่มปลูกอยู่นอกขอบเขตแปลง ขอตรวจสอบอีกครั้ง",
]

for c in CYCLES:
    if c["existing"] or c["status"] not in ("harvested", "closed"):
        continue
    pid, owner, plot_name, _lat, _lng, area = PLOTS[c["plot"]][:6]
    series = [p for p in series_by_plot[c["plot"]] if c["start"] <= p["t"].date() <= c["end"]]
    result = ghg.estimate({"start_date": c["start"], "end_date": c["end"]}, area, series, today=TODAY)
    calculated = datetime.combine(c["end"] + timedelta(days=3), datetime.min.time()).replace(hour=9)
    eid = new_id("c")
    estimates.append((eid, c["id"], result["method_version"], result["baseline_tco2e"],
                      result["project_tco2e"], result["reduction_tco2e"], calculated, owner))

    outcome = c["verification"]
    if not outcome or result["reduction_tco2e"] <= 0:
        continue  # nothing to claim (flooded all season) or not submitted yet
    if gaps_by_cycle.get(c["id"]) and outcome == "approved":
        outcome = "rejected"
    submitted = calculated + timedelta(days=2)
    decided = submitted + timedelta(days=rng.randint(5, 12), hours=rng.randint(0, 6))
    if decided > NOW and outcome in ("approved", "rejected"):
        outcome = "in_review"
    vid = new_id("d")
    comment = None
    if outcome == "approved":
        comment = "ข้อมูลเซ็นเซอร์ครบถ้วน รูปถ่ายและพิกัดสอดคล้องกับแปลง"
    elif outcome == "rejected":
        g = gaps_by_cycle.get(c["id"])
        comment = (f"เซ็นเซอร์ไม่ส่งข้อมูลช่วง {g[0]:%d/%m} – {g[1]:%d/%m} ไม่สามารถยืนยันการปล่อยแห้งได้"
                   if g else rng.choice(REJECT_REASONS))
    verifications.append((vid, c["id"], eid, None if outcome == "pending" else VERIFIER, outcome, submitted,
                          decided if outcome in ("approved", "rejected") else None, comment))
    if outcome == "approved":
        year = decided.year + 543
        report_seq[year] = report_seq.get(year, 0) + 1
        reports.append((new_id("e"), c["id"], eid, vid, f"CC-{year}-{report_seq[year]:06d}",
                        result["reduction_tco2e"], None, decided, VERIFIER))
        notifications.append((new_id("f"), owner, "verification_result",
                              f'ผลตรวจสอบรอบ "{c["name"]}" แปลง "{plot_name}" : ผ่านการรับรอง ดาวน์โหลดรายงานได้แล้ว',
                              "sent", decided, decided))
    elif outcome == "rejected":
        notifications.append((new_id("f"), owner, "verification_result",
                              f'ผลตรวจสอบรอบ "{c["name"]}" แปลง "{plot_name}" : ไม่ผ่าน เหตุผล: {comment}',
                              "sent", decided, decided))

# water alerts on growing plots, like the dashboard would send
for c in CYCLES:
    if c["status"] != "active":
        continue
    owner, plot_name = PLOTS[c["plot"]][1], PLOTS[c["plot"]][2]
    recent = [p for p in series_by_plot[c["plot"]] if p["t"] >= NOW - timedelta(days=1)]
    if recent and recent[-1]["level"] <= -15:
        at = recent[-1]["t"]
        notifications.append((new_id("f"), owner, "phase_reminder",
                              f'ระดับน้ำแปลง "{plot_name}" ลดลงเหลือ {recent[-1]["level"]} ซม. ควรเติมน้ำเข้าแปลง',
                              "sent", at, at))

# ---------------------------------------------------------------- write SQL


def sql_value(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
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


new_cycles = [c for c in CYCLES if not c["existing"]]
members = [(p[0], p[1], "owner") for p in plots_sql]

OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    f.write("-- Demo data generated by services/api/scripts/generate_mock_data.py -- do not edit by hand.\n")
    f.write(f"-- Readings end at {NOW:%Y-%m-%d %H:%M}. Runs after carboncrops_DB.sql and migrations/002.\n")
    f.write("SET NAMES utf8mb4;\nSET time_zone = '+07:00';\n")
    insert(f, "users", ["user_id", "display_name", "phone", "role", "address", "province", "district"], users)
    insert(f, "plots", ["plot_id", "owner_user_id", "plot_name", "latitude", "longitude", "area_rai",
                        "province", "district", "subdistrict", "land_doc_no"], plots_sql)
    insert(f, "plot_members", ["plot_id", "user_id", "member_role"], members)
    insert(f, "crop_cycles", ["cycle_id", "plot_id", "cycle_name", "rice_variety", "start_date", "end_date", "status"],
           [(c["id"], PLOTS[c["plot"]][0], c["name"], c["variety"], c["start"], c["end"], c["status"])
            for c in new_cycles])
    insert(f, "devices", ["device_id", "serial_no", "device_type", "status"], devices_sql)
    insert(f, "device_installations", ["installation_id", "device_id", "plot_id", "installed_at", "removed_at"],
           installs_sql)
    # IGNORE: the sample data already has a few readings at the same device + time
    insert(f, "sensor_readings", ["device_id", "recorded_at", "water_level_cm", "battery_pct", "received_at"],
           readings, ignore=True)
    insert(f, "activities", ["activity_id", "cycle_id", "recorded_by", "activity_type", "activity_date", "note",
                             "fertilizer_formula", "fertilizer_kg_per_rai", "created_at"], activities)
    insert(f, "activity_evidence", ["evidence_id", "activity_id", "file_path", "file_type", "captured_at",
                                    "latitude", "longitude"], evidence)
    insert(f, "satellite_images", ["image_id", "plot_id", "captured_at", "source", "file_path", "cloud_cover_pct"],
           satellite)
    insert(f, "ghg_estimates", ["estimate_id", "cycle_id", "method_version", "baseline_tco2e", "project_tco2e",
                                "reduction_tco2e", "calculated_at", "calculated_by"], estimates)
    insert(f, "verifications", ["verification_id", "cycle_id", "estimate_id", "verifier_user_id", "status",
                                "submitted_at", "decided_at", "comment"], verifications)
    insert(f, "ghg_reports", ["report_id", "cycle_id", "estimate_id", "verification_id", "report_no",
                              "reduction_tco2e", "file_path", "generated_at", "generated_by"], reports)
    insert(f, "notifications", ["notification_id", "user_id", "notif_type", "message", "status", "sent_at",
                                "created_at"], notifications)

print(f"wrote {OUT.relative_to(API_DIR.parent.parent)}")
print(f"  farmers +{len(users)}, plots +{len(plots_sql)}, cycles +{len(new_cycles)} "
      f"(sensor data for {len(CYCLES)}), readings {len(readings)}, activities {len(activities)}, "
      f"satellite {len(satellite)}, estimates {len(estimates)}, verifications {len(verifications)}, "
      f"reports {len(reports)}, notifications {len(notifications)}")
