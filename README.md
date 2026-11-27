# CarbonCrops
FRA362 Robotics Innovation Project | Software for AWD Rice Farming &amp; Carbon Credit System

## Contents

1. [About the project](#1-about-the-project)
2. [How the system fits together](#2-how-the-system-fits-together)
3. [Directory structure](#3-directory-structure)
4. [Getting started (local computer)](#4-getting-started-local-computer)
5. [Backend and database](#5-backend-and-database)
6. [Sensor data: gateway → MQTT → database](#6-sensor-data-gateway--mqtt--database)
7. [Firmware (sensor node and gateway)](#7-firmware-sensor-node-and-gateway)
8. [Deploying to a VPS](#8-deploying-to-a-vps)
9. [How the app works](#9-how-the-app-works)
10. [Language and theme](#10-language-and-theme)
11. [Not built yet](#11-not-built-yet)

## 1. About the project

CarbonCrops helps rice farmers use **AWD (Alternate Wetting and Drying)**, a way of watering rice fields that cuts methane (CH₄) emissions, and turns that reduction into **carbon credit** data.

In AWD, farmers let the field dry out between irrigations instead of keeping it flooded all the time. Less standing water means less methane. Carbon credits need proof that this really happened, so the system measures the water level in each field automatically and keeps a record.

## 2. How the system fits together

```
 Rice field                         Gateway                         Server (your PC or a VPS, in Docker)
┌──────────────┐   LoRa 922 MHz   ┌──────────────┐  WiFi / MQTT   ┌───────────┐   ┌─────────────┐   ┌───────┐
│ Sensor node  │ ───────────────▶ │ ESP32 + E220 │ ─────────────▶ │ Mosquitto │──▶│ mqtt-bridge │──▶│ MySQL │
│ ESP32 + E220 │  6 readings      │              │  JSON message  │  :1883    │   │             │   │       │
│ + ultrasonic │  per packet/hour └──────────────┘                └───────────┘   └─────────────┘   └───┬───┘
└──────────────┘                                                                                      │
                                                    Browser (phone/PC) ◀── Web app (React) ◀── API (FastAPI)
```

| Part | Where | What it does |
|---|---|---|
| Sensor node | `firmware/CarbonCrop Sensor Node` | Wakes every 10 min to measure the water level with an ultrasonic sensor, sends the 6 readings in one LoRa packet every hour, and deep-sleeps in between |
| Gateway | `firmware/CarbonCrop Gateway` | Receives LoRa packets and publishes each one to Mosquitto over WiFi |
| Mosquitto | `services/mosquitto` | MQTT broker: the gateway sends its data here |
| mqtt-bridge | `services/api/app/mqtt_bridge.py` | Reads messages from Mosquitto and saves them in `sensor_readings` |
| MySQL | `services/database` | All data: users, paddies, crop calendars, readings, carbon credits |
| API | `services/api` | FastAPI backend used by the web app |
| Web app | `apps/web` | React PWA for farmers and the verifier |

| Port | Service | Reachable from |
|---|---|---|
| 5173 | Web app (development) | This computer |
| 8000 | API (docs at `/docs`) | This computer only |
| 1883 | Mosquitto (MQTT) | The network (the gateway must reach it) |
| 3306 | MySQL | This computer only |

## 3. Directory structure

```
CarbonCrops/
├── apps/
│   └── web/                     Web app: React + Vite + Tailwind (PWA)
├── services/
│   ├── api/                     Backend: FastAPI (+ the MQTT → MySQL bridge)
│   ├── database/
│   │   ├── carboncrops_DB_last04112569.sql   Schema (tables, views)
│   │   ├── seed/                Clean start: 2 accounts + rice stages (loaded by default)
│   │   ├── migrations/          Schema changes on top of the base SQL file
│   │   ├── mock/                Old sample/demo data (not loaded by default)
│   │   └── data/                MySQL files (created by Docker, gitignored)
│   └── mosquitto/               MQTT broker configuration
├── firmware/
│   ├── CarbonCrop Gateway/      PlatformIO project: ESP32 LoRa gateway (LoRa → WiFi/MQTT)
│   └── CarbonCrop Sensor Node/  PlatformIO project: ESP32 sensor node (ultrasonic + LoRa)
│                                (both use the E220 LoRa driver in shared/drivers/E220.h)
├── shared/
│   ├── protocol/                LoRa packet format + radio settings shared by gateway and sensor node
│   └── drivers/                 E220 LoRa driver shared by gateway and sensor node
├── hardware/
│   ├── mechanics/               Mechanical design (3D models, enclosures, mounts)
│   └── electronics/             Electronic design (schematics, PCB, wiring)
├── scripts/
│   ├── setup-windows.ps1        One-command setup for Windows
│   ├── dev.ps1                  Start backend + web app in one terminal (npm run dev)
│   └── reset-demo-data.ps1      Regenerate the old demo data (see 5.4)
├── docs/                        Project documentation
├── docker-compose.yml           MySQL, Mosquitto, API, mqtt-bridge
└── README.md
```

## 4. Getting started (local computer)

### 4.1 Quick setup on Windows (recommended)

One script installs the tools and the project's packages. Clone the project first (4.3), then open **PowerShell** in the project folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1
```

What the script does:

1. Installs **Git, Node.js LTS, Python 3.12 and Docker Desktop** with `winget`. Anything already installed is skipped. Windows may ask you to allow the install (UAC). Click **Yes**.
2. Runs `npm install` in `apps/web`.
3. Creates a Python environment in `services/api/.venv` and installs `requirements.txt`.
4. Creates `.env` and `services/api/.env` from the `.env.example` files. Existing `.env` files are left alone.
5. Runs the backend tests (`pytest`).

You can run it again at any time, for example after someone changes `package.json` or `requirements.txt`. Options:

| Option | Effect |
|---|---|
| `-SkipDocker` | Don't install Docker Desktop |
| `-SkipTests` | Don't run the tests at the end |

> If the script just installed Docker Desktop: **restart the computer**, then open Docker Desktop once and wait for **Engine running**.
>
> If you see `winget not found`: install **App Installer** from the Microsoft Store and try again.

### 4.2 Install the tools by hand (macOS / Linux, or without the script)

| Tool | Why | Download |
|---|---|---|
| **Git** | Download the code | https://git-scm.com/downloads |
| **Node.js** (LTS) | Run the web app | https://nodejs.org |
| **Docker Desktop** | Run MySQL, Mosquitto, the API and the bridge | https://www.docker.com/products/docker-desktop |
| **VS Code** + **PlatformIO** extension | Edit code, build and upload firmware | https://code.visualstudio.com, then Extensions → "PlatformIO IDE" |
| **Python 3.11+** (optional) | Run the backend or its tests without Docker | https://www.python.org/downloads |

Install each one with the default options. Then **close and reopen** your terminal and check:

```bash
git --version
node --version
docker --version
docker compose version
```

Each command should print a version number. If you see "not recognized", restart your computer and try again. On Windows, Docker Desktop may ask you to install or update **WSL 2**. Accept, then restart.

### 4.3 Download the project

```bash
git clone https://github.com/Yhommy741/CarbonCrops.git
cd CarbonCrops
```

(Or in GitHub Desktop: **File → Clone repository**.)

### 4.4 Run everything

Open Docker Desktop and wait for **Engine running**. Then, from the **project root**:

```bash
npm run dev
```

This starts the backend in Docker (MySQL, Mosquitto, API, mqtt-bridge), waits for the API, then starts the web app. Open **http://localhost:5173** and sign in as **FarmerA** or **VBB** (see 5.2).

- `Ctrl + C` stops the web app and the Docker containers.
- `npm run dev:build` does the same but **rebuilds the backend image** first. Use it after pulling changes to `services/api` (Python code or `requirements.txt`). Without a rebuild Docker keeps running the old backend code, and the web app can show a blank page.
- To keep the backend running after `Ctrl + C`: `powershell -ExecutionPolicy Bypass -File scripts\dev.ps1 -KeepBackend`.

Running the parts separately:

```bash
docker compose up -d --build     # backend only (from the project root)
cd apps/web && npm install && npm run dev   # web app only
```

> **`Could not read package.json`?** Run `npm run dev` from the project root, or `npm install` / `npm run dev` inside `apps/web`.
>
> **Blank page?** Rebuild the backend (`npm run dev:build`) and reload. If it is still blank, the page now shows the error message; send that to the team.

## 5. Backend and database

### 5.1 Docker services

```bash
docker compose up -d --build     # start / rebuild everything
docker compose ps                # what is running
docker compose logs -f api       # follow one service's log (api, db, mosquitto, mqtt-bridge)
docker compose down              # stop everything (data is kept)
```

| Service | Image / code | Notes |
|---|---|---|
| `db` | `mysql:8.0` | Data in `services/database/data/`. Time zone Asia/Bangkok: all timestamps are Thai local time |
| `mosquitto` | `eclipse-mosquitto:2` | Config in `services/mosquitto/config/mosquitto.conf` |
| `api` | `services/api` | API docs at **http://localhost:8000/docs** |
| `mqtt-bridge` | `services/api` (`python -m app.mqtt_bridge`) | Saves gateway messages to MySQL (section 6) |

Settings have defaults in `docker-compose.yml`. To change passwords or keys, copy `.env.example` to `.env` next to `docker-compose.yml` and edit it.

### 5.2 Accounts and starting data

When MySQL starts with an **empty** `services/database/data/` folder, it loads these files in order:

1. `services/database/carboncrops_DB_last04112569.sql`: tables and views (no data)
2. `services/database/seed/01_two_accounts.sql`: the 6 rice growth stages and two accounts
3. `services/database/migrations/002_fertilizer_and_photo_gps.sql`: adds `activities.fertilizer_formula` / `fertilizer_kg_per_rai` and `activity_evidence.latitude` / `longitude`
4. `services/database/migrations/003_drop_satellite_images.sql`: drops `satellite_images` (the project doesn't use satellite images)
5. `services/database/migrations/004_readings_paddy.sql`: adds `sensor_readings.paddy_id` (the paddy the sensor was in when it recorded) and lets `devices.paddy_id` be empty, so a sensor can move to a new paddy and deleting a paddy deletes its readings
6. `services/database/migrations/005_planting_activity.sql`: adds the `planting` activity type (the crop start; sowing vs transplanting isn't asked any more)
7. `services/database/migrations/006_harvest_amount.sql`: adds `farming_calendars.harvest_kg` (total kg harvested; the API works out kg/rai)

| Account | Role | Sees |
|---|---|---|
| **FarmerA** | farmer | Their own paddies, crop calendars, carbon credits and history |
| **VBB** | verifier | The verification request queue and all farmers |

There are no paddies, devices or readings yet. Sign in as FarmerA and create a paddy in the app.

Login is a **development login**: the sign-in page lists every user and you pick one (`DEV_LOGIN=true`). LINE Login isn't connected yet.

### 5.3 Reset the database

This **deletes all local data**, including everything entered in the app:

```powershell
docker compose down
Remove-Item -Recurse -Force services\database\data     # macOS/Linux: rm -rf services/database/data
docker compose up -d --build
```

Wait ~30 seconds for MySQL to load the files above before opening the app.

To apply the migrations to an existing database without resetting it (run each once):

```bash
docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/002_fertilizer_and_photo_gps.sql
docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/003_drop_satellite_images.sql
docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/004_readings_paddy.sql
docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/005_planting_activity.sql
docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/006_harvest_amount.sql
```

### 5.4 Old demo data (optional)

The earlier sample data is still in `services/database/mock/`:

- `carboncrops_mock_data_v4.sql`: the team's mock data (5 paddies, devices, users)
- `004_extra_mock_data.sql`: generated by `services/api/scripts/generate_mock_data.py`. It adds water readings every 4 hours, extra farmers and paddies, planting/harvest photos, fertilizer records and computed carbon credits.

To use it, edit the `db` volumes in `docker-compose.yml`: replace the `seed/01_two_accounts.sql` line with

```yaml
      - ./services/database/mock/carboncrops_mock_data_v4.sql:/docker-entrypoint-initdb.d/02_mock_data_v4.sql:ro
      - ./services/database/migrations/002_fertilizer_and_photo_gps.sql:/docker-entrypoint-initdb.d/03_fertilizer_and_photo_gps.sql:ro
      - ./services/database/mock/004_extra_mock_data.sql:/docker-entrypoint-initdb.d/04_extra_mock_data.sql:ro
      - ./services/database/migrations/003_drop_satellite_images.sql:/docker-entrypoint-initdb.d/04_drop_satellite_images.sql:ro
      - ./services/database/migrations/004_readings_paddy.sql:/docker-entrypoint-initdb.d/05_readings_paddy.sql:ro
      - ./services/database/migrations/005_planting_activity.sql:/docker-entrypoint-initdb.d/06_planting_activity.sql:ro
      - ./services/database/migrations/006_harvest_amount.sql:/docker-entrypoint-initdb.d/07_harvest_amount.sql:ro
```

(keeping one line each for the `migrations/` files), then reset the database (5.3). `scripts\reset-demo-data.ps1` regenerates `004_extra_mock_data.sql` with readings up to today and resets the database; it only loads demo data while these mock files are mounted. Add `--all-users` to `generate_mock_data.py` to keep every sample user.

Crops harvested before credits were created at harvest have no credit. Give them their Pending credit once (safe to repeat):

```bash
docker compose exec api python -m app.backfill_credits
```

### 5.4.2 Snapshot: the same data on another computer

`services/database/snapshot/carboncrops_snapshot.sql` is a full copy of a working database (tables, views and data), so a new computer can start from the same data. It doesn't include uploaded photos (`services/api/uploads/` isn't in Git); the snapshot's crops only use the built-in sample pictures.

On the new computer, start once so MySQL creates the database (section 5), then replace it with the snapshot:

```bash
docker compose exec -T db mysql --default-character-set=utf8mb4 -uroot -prootpass carboncrops < services/database/snapshot/carboncrops_snapshot.sql
```

(Use your `DB_ROOT_PASSWORD` if you changed it in `.env`.) To make a new snapshot from your database:

```bash
docker compose exec -T db mysqldump --default-character-set=utf8mb4 --no-tablespaces --skip-dump-date --single-transaction -ucarboncrops -pcarboncrops carboncrops > services/database/snapshot/carboncrops_snapshot.sql
```

then remove the views' `DEFINER=...` (`sed -i 's#DEFINER=`[^`]*`@`[^`]*` SQL SECURITY DEFINER#SQL SECURITY INVOKER#' services/database/snapshot/carboncrops_snapshot.sql`) so it loads on any MySQL user.

### 5.4.1 Test data for the current accounts (no reset)

Adds 4 test paddies with sensors, readings, crops and credits for **FarmerA** (and one credit waiting for **VBB**) to the database you already have, keeping everything else. Run it again any time; it replaces its own rows (ids `c1000000-…`, devices `NODE-0101`–`NODE-0104`) and extends readings to now:

```bash
services/api/.venv/Scripts/python services/api/scripts/seed_test_data.py | docker compose exec -T db mysql --default-character-set=utf8mb4 -ucarboncrops -pcarboncrops carboncrops
```

The paddies and what each one tests are listed at the top of `services/api/scripts/seed_test_data.py`.

### 5.5 Running the backend without Docker

Needs Python 3.11+ and your own MySQL with the SQL files from 5.2 imported.

```bash
cd services/api
python -m venv .venv
.venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env          # then edit DB_USER / DB_PASSWORD
uvicorn app.main:app --reload   # API on http://localhost:8000
python -m app.mqtt_bridge       # MQTT bridge (another terminal; set MQTT_HOST if not localhost)
pytest                          # GHG calculation tests
```

## 6. Sensor data: gateway → MQTT → database

### 6.1 The path of one reading

1. The **sensor node** takes one water-level reading every 10 minutes and sends the last 6 in one LoRa packet every hour (binary, CRC-checked, format in `shared/protocol/CarbonCropPacket.h`).
2. The **gateway** receives the packet, checks the CRC and publishes it as JSON to Mosquitto.
3. The **mqtt-bridge** converts it and saves each reading in `sensor_readings`.
4. The **web app** shows it on the paddy's water chart and uses it for AWD phase detection and the carbon calculation.

**MQTT topics** (`GW-01` is the gateway's `GATEWAY_ID`):

| Topic | Payload |
|---|---|
| `carboncrops/gw/GW-01/water` | One message per LoRa packet (below) |
| `carboncrops/gw/GW-01/status` | `online` / `offline` (retained; `offline` is the last will, sent by the broker if the gateway disappears) |

```json
{"gw": "GW-01", "node": 1, "seq": 42, "lat": 13.736717, "lon": 100.523186, "tz": 25200,
 "samples": [[1795410000, -61], [1795410001, null], [1795410002, -64]]}
```

Each sample is `[unix time in UTC, water level in mm]`. `tz` is the farm's UTC offset in seconds (`LOCAL_UTC_OFFSET_S` in the gateway's `include/NetConfig.h`; 25200 = UTC+7). `+` is above the soil, `-` below it, and `null` means the sensor got no echo. The bridge stores:

| JSON | Database (`sensor_readings`) |
|---|---|
| `node: 1` | `device_id = 'NODE-0001'` |
| unix time (UTC) + `tz` | `recorded_at` in the farm's local time (UTC+7 if `tz` is missing) |
| `-61` (mm) | `water_level_cm = -6.1` |
| `null` | `water_level_cm = NULL` |

The same `device_id` + time is stored only once, so a re-sent packet does no harm.

### 6.2 Register a sensor node (required)

Readings are saved **only for devices linked to a paddy** (`devices.paddy_id`). Until then the bridge logs `NODE-0001 is not registered in devices or not linked to a paddy` and skips the readings. Each reading is stored with that paddy (`sensor_readings.paddy_id`).

The app does this when a paddy is added: **Add paddy** asks for the sensor device ID (`NODE-0001`, or just `1`). The same sensor can be used again next season: once its paddy is harvested, adding a new paddy with that ID moves the sensor there, and the old crop keeps its readings. A sensor in a paddy that is still growing is refused. To link a node by hand instead:

```bash
# list paddies to find the paddy_id
docker compose exec db mysql -ucarboncrops -pcarboncrops carboncrops -e "SELECT paddy_id, paddy_name FROM paddy;"

# link node 1 to that paddy
docker compose exec db mysql -ucarboncrops -pcarboncrops carboncrops -e "INSERT INTO devices (device_id, paddy_id, installed_at) VALUES ('NODE-0001', '<paddy_id>', CURDATE());"
```

Use `NODE-0002` for a node with `NODE_ID = 2`, and so on.

### 6.3 Check that data arrives

```bash
docker compose logs -f mqtt-bridge
```

| Log line | Meaning |
|---|---|
| `connected to mosquitto:1883, subscribing to ...` | The bridge is running |
| `gw=GW-01 node=1 seq=5: 6/6 new reading(s) saved` | Working |
| `... 0/6 new reading(s) saved` | Already stored (duplicate), e.g. the gateway re-sent a packet, or the node restarted with the same build-time clock |
| `NODE-0001 is not registered in devices or not linked to a paddy` | Data arrives; add a paddy with that sensor (6.2) |
| `bad message on ...` | The payload isn't valid JSON in the format above |

**Test without hardware:** publish a fake gateway message:

```bash
docker compose exec mosquitto mosquitto_pub -t carboncrops/gw/GW-01/water -q 1 -m '{"gw":"GW-01","node":1,"seq":1,"lat":13.7,"lon":100.5,"samples":[[1795410000,-61]]}'
```

**See all MQTT messages** (for example from the gateway):

```bash
docker compose exec mosquitto mosquitto_sub -v -t 'carboncrops/#'
```

### 6.4 HTTP alternative

A device or script can also POST readings directly to `POST /api/ingest/readings` with the header `X-API-Key: <INGEST_API_KEY>` (default `dev-ingest-key`):

```json
[{"device_id": "NODE-0001", "water_level_cm": -6.1, "recorded_at": "2026-11-23T12:00:00", "battery_pct": 87}]
```

`recorded_at` (Thai time) and `battery_pct` are optional; battery is saved to `devices.battery_pct`. See `services/api/app/routers/ingest.py`. Because port 8000 is bound to `127.0.0.1`, this works only from the server itself unless you expose the API (on a VPS it is reachable through Caddy at `/api`).

## 7. Firmware (sensor node and gateway)

Both are **PlatformIO** projects for the **ESP32 DOIT DevKit V1** with an **EBYTE E220-900T22D** LoRa module.

### 7.1 Build and upload

1. Install **VS Code** and the **PlatformIO IDE** extension.
2. In VS Code: **File → Open Folder** and choose `firmware/CarbonCrop Gateway` or `firmware/CarbonCrop Sensor Node` (the folder that contains `platformio.ini`, not the project root).
3. Connect the ESP32 with a USB cable.
4. Click **✓ Build**, then **→ Upload** in the PlatformIO toolbar (bottom bar).
5. Click **🔌 Serial Monitor** (115200 baud) to see the log.

From a terminal instead: `pio run -t upload -t monitor` inside the project folder.

Both projects use the shared files in `shared/protocol/` (packet format, radio channel), and the E220 driver in `shared/drivers/E220.h`. **Reflash both devices after changing these**, or they won't understand each other.

### 7.2 Wiring (both boards)

| E220 pin | ESP32 pin |
|---|---|
| TXD | GPIO16 (RX2) |
| RXD | GPIO17 (TX2) |
| M0 | GPIO32 |
| M1 | GPIO33 |
| AUX | GPIO34 |
| VCC | Gateway: 3V3. Sensor node: 3V3 through a MOSFET switched by **GPIO14** |

Radio: **922.125 MHz** (channel 72), inside Thailand's 920–925 MHz LoRa band. Both firmwares set the channel on the E220 at start-up. See `shared/protocol/LoRaConfig.h`.

Sensor node only:

| Part | ESP32 pin |
|---|---|
| Ultrasonic TRIG / ECHO / power | GPIO25 / GPIO26 / GPIO27 (VCC straight from the GPIO) |
| GPS TX → / RX ← (Serial1) | GPIO18 / GPIO19 |
| GPS power MOSFET | GPIO13 |
| E220 power MOSFET | GPIO14 |
| Battery sense (100k/100k divider) | GPIO35 |

The MOSFET gates are **HIGH = module on**. They are held LOW during deep sleep, so the GPS and E220 draw nothing between sends. Gateway only: INA219 current sensor (lab power test) on **SDA GPIO21, SCL GPIO22**. Pin assignments are in each project's `include/PinConfig.h`.

### 7.3 Sensor node settings

The node runs a state machine (`src/App.cpp`) and **deep-sleeps between samples**. Each wake takes one sample; the wake that fills the packet also reads GPS and sends it. Timing is set in `include/AppConfig.h`:

```
wake 1-5  (every 10 min)   read RTC -> ultrasonic on, wait 500 ms
                           -> APP_ULTRASONIC_READS (10) readings, 500 ms apart
                           -> filter (mean) -> water level -> deep sleep
wake 6                     GPS + E220 on -> wait for a GPS fix (max APP_GPS_TIMEOUT_MS)
                           -> same sample as above -> send the 6 samples over LoRa
                           -> deep sleep
```

The packet being filled is kept in RTC memory, which survives deep sleep but not a power cut or reset. The awake time is subtracted from each sleep, so wakes stay 10 min apart. The LED blinks once on a reading wake and twice on a sending wake.

Code layout: `App.cpp` holds only the state machine; the hardware is in `Power.cpp` (MOSFETs, deep sleep), `Radio.cpp` (E220), `Gps.cpp`, `Rtc.cpp`, `Ultrasonic.cpp` and `Filter.cpp`. GPS and RTC are placeholders for now: fixed coordinates and the build-time clock.

| File | Setting | Default | Notes |
|---|---|---|---|
| `include/NodeConfig.h` | `NODE_ID` | `1` | Unique per node. Becomes `NODE-0001` in the database |
| | `NODE_LATITUDE` / `NODE_LONGITUDE` | Bangkok | Placeholder until a GPS module is added |
| | `USE_DUMMY_DATA` | `true` | Sends fixed water levels (real timestamps) to test the LoRa link. Set `false` for real ultrasonic readings |
| `include/AppConfig.h` | `APP_SAMPLES_PER_PACKET` | `6` | Samples per LoRa packet (1–10); the last one also reads GPS and sends |
| | `APP_SAMPLE_INTERVAL_MS` | `600000` (10 min) | Time between wakes. For a bench test, use the commented-out 10 s line. Must be longer than one sample (~5.5 s) + `APP_MIN_SLEEP_MS`; checked at build time |
| | `APP_MIN_SLEEP_MS` | `1000` | Shortest sleep, if a wake ran longer than the interval |
| | `APP_GPS_TIMEOUT_MS` | `7000` | Longest wait for a GPS fix on the sending wake. Raise to ~60000 with a real GPS module |
| | `APP_ULTRASONIC_READS` | `10` | Single ultrasonic readings per sample, then filtered into one water level |
| | `APP_ULTRASONIC_READ_INTERVAL_MS` | `500` | Time between those readings |
| | `APP_ULTRASONIC_FILTER` | `Mean` | Filter type (`Filter.h`: Mean / Median / TrimmedMean); `APP_ULTRASONIC_MIN_VALID` (5) valid readings needed |
| `include/PipeConfig.h` | `PIPE_SENSOR_TO_GROUND_CM` | `50` | Distance from the sensor face down to the soil surface. Measure it after installing the pipe. Water level = this − measured distance |
| `include/HCSR04.h` | `HCSR04_CAL_SCALE` / `HCSR04_CAL_OFFSET_CM` | `1` / `0` | Calibration of the filtered distance (two known distances with a ruler) |
| | `HCSR04_TEMPERATURE_C`, range, warm-up | `30 °C`, 20–450 cm, 500 ms | Sensor constants |
| `include/Battery.h` | divider, `BATTERY_CAL_*`, OCV table | 1S LiFePO4 | Battery voltage → SoC (5 % lookup table + interpolation). Low 3.20 V, critical 3.00 V, empty 2.80 V |

> **Clock:** there is no RTC module yet, so the node's clock starts from the firmware **build time**. It keeps running through deep sleep, but restarts from the build time after a reset or power cut. Timestamps are only right if you upload right after building. The ESP32's sleep clock can also drift by a few percent, so expect the time to wander until a DS3231 RTC is added.

### 7.4 Gateway settings

1. Copy `firmware/CarbonCrop Gateway/include/Secrets.example.h` to `Secrets.h` in the same folder. `Secrets.h` is gitignored, so passwords never reach GitHub. The build stops with a clear message if the file is missing.
2. Fill it in:

```c
#define WIFI_SSID     "your-wifi-name"      // 2.4 GHz only
#define WIFI_PASSWORD "your-wifi-password"
#define MQTT_HOST     "192.168.1.100"       // the machine running Docker (see below)
#define MQTT_PORT     1883
#define MQTT_USER     ""                    // empty = no MQTT login (local development)
#define MQTT_PASSWORD ""
```

**`MQTT_HOST`** is the address of the computer or VPS that runs Mosquitto, not `localhost` (on the ESP32 that means the ESP32 itself).
- **Your PC:** its LAN IP. On Windows run `ipconfig` and use the **IPv4 Address** of the Wi-Fi adapter. The PC and the gateway must be on the **same WiFi**, and the IP can change when the PC reconnects.
- **A VPS:** its public IP or domain name (section 8).

`GATEWAY_ID` (default `GW-01`) is in `include/NetConfig.h`; give each gateway its own. `LOCAL_UTC_OFFSET_S` there is the farm's time zone (default UTC+7); keep it the same as the sensor node's.

**What the gateway does:** it keeps receiving LoRa packets at all times. If WiFi or MQTT is down, it holds up to **32 packets** in memory (about 32 hours per sensor node at one packet an hour) and sends them when the connection is back. Packets in memory are lost if the gateway loses power.

**After uploading** you can unplug the gateway from the computer and power it from any USB charger or power bank. The machine running Docker (your PC or the VPS) must be on.

**Power logger (lab test):** to measure the sensor node's current, connect an INA219 to the gateway (SDA GPIO21, SCL GPIO22) with the node's supply running through it. Then upload the `powerlog` build: `pio run -e powerlog -t upload`. The gateway then also prints a CSV line `Time_s,Voltage_V,Current_mA,Power_mW` every 100 ms. The normal build (`pio run -t upload`) leaves the logger out.

Serial monitor output when everything works:

```
[WiFi] connected, IP 10.61.x.x
[MQTT] connecting to 10.61.6.44:1883 ... ok
[RX] node=1 seq=12  79 bytes
[MQTT] published node=1 seq=12 (0 waiting)
```

| Problem | Likely cause |
|---|---|
| Never prints `[WiFi] connected` | Wrong SSID/password, 5 GHz-only network, or a WiFi with a login web page (the ESP32 can't use those) |
| `[MQTT] connecting ... failed (state -2)` | Can't reach the broker: wrong `MQTT_HOST`, PC not on the same WiFi, or **Windows Firewall blocking port 1883** (allow Docker Desktop / TCP 1883). Some university and office WiFi networks also block devices from talking to each other; use a phone hotspot for both devices instead |
| `failed (state 5)` | Broker requires a login: set `MQTT_USER` / `MQTT_PASSWORD` |
| `E220: AUX stays LOW` | Check E220 power and wiring |
| No `[RX]` lines | Sensor node off, out of range, or on a different channel |

## 8. Deploying to a VPS

On a VPS the server parts run all the time, the gateway connects over the internet (any WiFi or a 4G hotspot in the field), and nobody's PC needs to be on. Only the server runs on the VPS; the firmware is still built and uploaded from a PC (section 7).

```
Gateway ──internet──▶ VPS :1883 (Mosquitto) → mqtt-bridge → MySQL
Browser ──HTTPS────▶ VPS :443 (Caddy) → web app files + /api → API
```

> ⚠️ **Do the steps in order.** The default settings are for a laptop. On a public server, `DEV_LOGIN=true` lets **anyone sign in as any user**, and anonymous MQTT lets anyone send fake sensor data. 8.4 turns on the MQTT login before the broker starts, and 8.6 puts the whole site behind a password: the API is only reachable through Caddy.

### 8.1 Requirements

- A VPS with **Ubuntu 22.04 or 24.04**, at least **1 GB RAM** (2 GB recommended), and SSH access. A Singapore region is closest to Thailand.
- Recommended: a **domain name** pointing to the VPS (an `A` record with the VPS's IP). Caddy then gets an HTTPS certificate automatically. Without a domain you can use plain HTTP on the IP for testing.
- If the GitHub repository is **private**, the VPS needs access to clone it: a [personal access token](https://github.com/settings/tokens) (used as the password) or a deploy key.

### 8.2 Prepare the server

Log in with `ssh <user>@<vps-ip>`, then:

```bash
# Updates
sudo apt update && sudo apt upgrade -y

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER        # then log out and back in (exit, ssh again)

# Firewall: only SSH, web and MQTT
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 1883/tcp
sudo ufw enable
```

MySQL (3306) and the API (8000) are bound to `127.0.0.1` in `docker-compose.yml`, so they are not reachable from the internet. This matters because Docker-published ports bypass `ufw`.

**1 GB RAM only:** add 2 GB of swap so MySQL and the web app build don't run out of memory:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 8.3 Code and settings

```bash
git clone https://github.com/Yhommy741/CarbonCrops.git
cd CarbonCrops
cp .env.example .env
openssl rand -hex 32        # run once per value below, paste each result into .env
nano .env
```

Set in `.env`:

| Setting | Value |
|---|---|
| `DB_ROOT_PASSWORD`, `DB_PASSWORD` | New random values. **Set them before the first start**: MySQL only reads them when it creates the database |
| `JWT_SECRET`, `INGEST_API_KEY` | New random values |
| `DEV_LOGIN` | Leave `true` until LINE Login is built (the sign-in page lists every user), but then the whole site **must** be behind the Caddy password in 8.6 |
| `MQTT_USER`, `MQTT_PASSWORD` | `carboncrops` and a password you choose (used in 8.4 and 8.7) |

Never commit `.env`. It is gitignored.

### 8.4 MQTT login

Create Mosquitto's password file, using the same user and password as in `.env`:

```bash
docker run --rm -v "$PWD/services/mosquitto/config:/c" eclipse-mosquitto:2 \
    mosquitto_passwd -c -b /c/passwd carboncrops '<mqtt-password>'
sudo chown 1883:1883 services/mosquitto/config/passwd   # the user Mosquitto runs as
sudo chmod 0700 services/mosquitto/config/passwd
```

Then in `services/mosquitto/config/mosquitto.conf`, replace `allow_anonymous true` with:

```
allow_anonymous false
password_file /mosquitto/config/passwd
```

Don't commit this change or `passwd`: on a laptop the broker stays anonymous. MQTT on port 1883 isn't encrypted: fine for a test, but plan for TLS (port 8883) before real farm data goes through it.

### 8.5 Start the backend

```bash
docker compose up -d --build
docker compose ps                    # db, mosquitto, api, mqtt-bridge: all "Up" (db "healthy")
docker compose logs mqtt-bridge      # should say: connected to mosquitto:1883, subscribing to ...
```

The first start takes ~30 seconds while MySQL loads the schema and the two accounts (5.2). All four services have `restart: unless-stopped`, so they come back by themselves after a crash or a VPS reboot.

### 8.6 Web app and HTTPS (Caddy)

Build the web app (again after every update):

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
cd apps/web && npm ci && npm run build && cd ../..    # output: apps/web/dist
```

Install Caddy from its official repository (Ubuntu 22.04 doesn't include it):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Create the site password (needed while `DEV_LOGIN=true`):

```bash
caddy hash-password          # type the team password, copy the hash it prints
```

Write `/etc/caddy/Caddyfile` (`sudo nano /etc/caddy/Caddyfile`), with your domain, the hash, and the path to the project (`pwd` inside `CarbonCrops` shows it):

```caddy
carboncrops.example.com {
    # Site-wide password while DEV_LOGIN is on
    basic_auth {
        team <hash from caddy hash-password>
    }

    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }
    handle /uploads/* {
        reverse_proxy 127.0.0.1:8000
    }
    handle {
        root * /home/ubuntu/CarbonCrops/apps/web/dist
        try_files {path} /index.html
        file_server
    }
}
```

Without a domain, use `:80 {` as the first line instead (HTTP only). Then:

```bash
sudo systemctl reload caddy
```

Open `https://<your-domain>` (or `http://<vps-ip>`), enter `team` and the password, then sign in as **FarmerA** or **VBB**.

- **403 error:** Caddy needs read access to `apps/web/dist`. Run `chmod o+x` on the folders on the path to it (e.g. `chmod o+x /home/ubuntu`).
- **HTTPS fails:** check that the domain's `A` record points to the VPS and ports 80/443 are open, then read `sudo journalctl -u caddy -n 50`.

### 8.7 Connect the gateway

On your PC, in the gateway's `include/Secrets.h` (7.4):

```c
#define MQTT_HOST     "carboncrops.example.com"   // or the VPS's public IP
#define MQTT_PORT     1883
#define MQTT_USER     "carboncrops"
#define MQTT_PASSWORD "<mqtt-password>"           // the one from 8.4
```

Upload the gateway firmware again. The gateway can now be on any WiFi with internet access. Its serial monitor should show `[MQTT] connecting to ... ok`; `failed (state 5)` means the MQTT user or password is wrong.

### 8.8 Check the whole chain

1. **Server:** `docker compose ps` shows all four services up.
2. **Gateway online:** on the VPS, `docker compose exec mosquitto mosquitto_sub -u carboncrops -P '<mqtt-password>' -v -t 'carboncrops/#'` shows `carboncrops/gw/GW-01/status online` once the gateway connects.
3. **Sensor node registered:** in the app, sign in as FarmerA and add a paddy with the sensor ID (`NODE-0001`; see 6.2).
4. **Readings saved:** `docker compose logs -f mqtt-bridge` shows `node=1 seq=...: 6/6 new reading(s) saved`. The node sends one packet per hour, so the first one can take up to an hour after it starts.
5. **Web app:** the paddy's water chart shows the readings.

With the MQTT login on, the test commands in 6.3 (`mosquitto_pub` / `mosquitto_sub`) also need `-u carboncrops -P '<mqtt-password>'`.

### 8.9 Updating and backups

```bash
cd ~/CarbonCrops
git pull
docker compose up -d --build                           # backend
cd apps/web && npm ci && npm run build && cd ../..    # web app (Caddy serves the new files immediately)
```

A new migration file in `services/database/migrations/` isn't applied to an existing database automatically: run it once as in 5.3.

> The `mysql` commands elsewhere in this README use the local default passwords (`-pcarboncrops`, `-prootpass`). On the VPS, use your `DB_PASSWORD` / `DB_ROOT_PASSWORD` from `.env` instead.

Back up the database (e.g. daily, and before every update):

```bash
docker compose exec db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" carboncrops' > backup-$(date +%F).sql
```

Uploaded photos are in `services/api/uploads/`; back them up too. Copy both off the VPS (e.g. with `scp` to your PC): a backup kept only on the server is lost with it.

## 9. How the app works

| Who | Screen | What it does |
|---|---|---|
| Farmer | แปลงนา (Dashboard) | One card per **farm in progress** (paddy with a growing crop): latest water level, a water graph one week per screen that scrolls back to planting, sensor ID and battery, GPS position (from the sensor) on a Google satellite map. **+ Fertilizer** and **Harvest** buttons; after Harvest the card leaves this page and the crop appears in History. 🗑️ deletes the paddy with everything recorded for it (crops, photos, readings, credits) after a confirmation; its sensor can then go into a new paddy |
| Farmer | แปลงนา → **+ Add paddy** | Name, area, sensor device ID, planting date and the **planting-day photo** (take it or pick from the gallery), saved together. Rice variety and sowing vs transplanting aren't asked: the IPCC Tier 1 calculation doesn't use them. Next season, add a new paddy (the same sensor can be reused) |
| Farmer | Crop calendar → ระดับน้ำ | Sensor water chart. The AWD phases (flooded / drying / reflooded / final drain / no data) are **detected automatically from the sensor data**. Farmers don't enter water data |
| Farmer | Crop calendar → บันทึกแปลง | The only things farmers enter: **fertilizer** (formula + kg/rai) and the **harvest**: date, **amount harvested in kg** (required; stored in `harvest_kg`, the API works out kg/rai from the paddy's area) and the harvest-day photo. The paddy's GPS position comes from its sensor node, not the phone. The rice stage (`stage_no`) is worked out from the date |
| Farmer | Crop calendar → คาร์บอน (MRV) | IPCC Tier 1 CH₄ estimate. A drying phase counts only if the sensor shows ≤ −5 cm. The final drain and periods without sensor data don't count. Recording the harvest stores the result in `carboncredit_info` automatically as **Pending** (`not_checked`); there is no submit step. A credit has 3 states: **Pending**, **Approved** (`passed`), **Disapproved** (`failed`) |
| Farmer | คาร์บอน | Two totals in tCO₂e: **Pending** (waiting for the verifier) and **Approved carbon** |
| Farmer | ประวัติ (History) | Every harvested crop, newest first, with its credit status; opens the crop, and the printable **certificate** for each passed credit |
| Verifier | คำขอตรวจสอบ (requests) | Review the evidence of each **Pending** credit (created at harvest), then mark it **Approved** (`passed`) or **Disapproved** (`failed`, with a reason) |
| Verifier | ชาวนา (Farmers) | All farmers with their paddies, area, crops and verified tCO₂e; open one to see the full farming history and drill into any crop's water chart, photos and MRV |

Verifiers see only the two verifier tabs; their home page opens the request queue.

`farming_calendars` has no name or status column. The app derives them (see `services/api/app/services/calendar.py`):
- **Season name:** planted May–Sep = นาปี, otherwise นาปรัง (Buddhist year)
- **Status:** `planned` / `active` / `harvested`, from `planting_date` and `harvest_date`

Water data comes only from the IoT sensors (section 6).

## 10. Language and theme

The code is written in English. Text shown to users lives in translation files, and the header has two switches: **TH/EN** for language and **🌙/☀️** for light/dark. Both choices are remembered in the browser. On first visit the app follows the browser's language and dark-mode setting.

- **Translations** are in `apps/web/src/locales/en.js` and `th.js`. When you add text, add the same key to both files and use it with `const { t } = usePreferences()` → `t('section.key', { name })`.
- **Dates and numbers** go through `fmt` from the same hook (`fmt.date`, `fmt.num`, `fmt.season`). In Thai, years are shown in the Buddhist era.
- **API errors** come back as `{"detail": {"code": "...", "message": "..."}}` (see `services/api/app/errors.py`). The web app shows `errors.<code>` from the locale files, or the English `message` if the code has no translation yet.
- **Dark mode** mirrors the Tailwind color scales in `apps/web/src/index.css`, so components don't need `dark:` classes. Use the stone/green/amber/sky/red/violet colors, or a `var(--color-...)` in SVG, and dark mode works automatically. Printing always uses the light theme.
- **Data** isn't translated. Names, notes and LINE notification text appear as they are stored.

## 11. Not built yet

- **The carbon credit market**: this prototype measures and verifies the reduction (tCO₂e) only. There are no prices, sales or income (`carboncredit_info.amount_thb` stays empty)
- **LINE Login** (sign-in is the development account picker) and **sending LINE messages** (notifications are saved with status `pending`)
- **Changing the sensor of a growing paddy, or adding a second one, in the app** (use the SQL in 6.2)
- **Battery level from the sensor node**: `Battery.cpp` exists but isn't used yet and the LoRa packet has no battery field, so `devices.battery_pct` is only set through the HTTP endpoint
- **Real clock and GPS on the sensor node** (build-time clock and fixed coordinates for now)
- **MQTT over TLS** and a production setup beyond section 8
- Saving edits while offline (offline mode is read-only for now)
