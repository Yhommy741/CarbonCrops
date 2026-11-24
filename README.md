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
│ ESP32 + E220 │  10 readings     │              │  JSON message  │  :1883    │   │             │   │       │
│ + ultrasonic │  per packet      └──────────────┘                └───────────┘   └─────────────┘   └───┬───┘
└──────────────┘                                                                                      │
                                                    Browser (phone/PC) ◀── Web app (React) ◀── API (FastAPI)
```

| Part | Where | What it does |
|---|---|---|
| Sensor node | `firmware/CarbonCrop Sensor Node` | Measures the water level every 10 s with an ultrasonic sensor and sends 10 readings per LoRa packet (one packet every ~100 s) |
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
│                                (each has its own copy of the E220 LoRa driver in include/E220.h)
├── shared/
│   └── protocol/                LoRa packet format + radio settings shared by gateway and sensor node
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

| Account | Role | Sees |
|---|---|---|
| **FarmerA** | farmer | Their own paddies, crop calendars, carbon credits and reports |
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

To add the migration's columns to an existing database without resetting it:

```bash
docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/002_fertilizer_and_photo_gps.sql
```

### 5.4 Old demo data (optional)

The earlier sample data is still in `services/database/mock/`:

- `carboncrops_mock_data_v4.sql`: the team's mock data (5 paddies, devices, users)
- `004_extra_mock_data.sql`: generated by `services/api/scripts/generate_mock_data.py`. It adds water readings every 4 hours, extra farmers and paddies, planting/harvest photos, fertilizer records, satellite images (NDVI/NDWI) and computed carbon credits.

To use it, edit the `db` volumes in `docker-compose.yml`: replace the `seed/01_two_accounts.sql` line with

```yaml
      - ./services/database/mock/carboncrops_mock_data_v4.sql:/docker-entrypoint-initdb.d/02_mock_data_v4.sql:ro
      - ./services/database/migrations/002_fertilizer_and_photo_gps.sql:/docker-entrypoint-initdb.d/03_fertilizer_and_photo_gps.sql:ro
      - ./services/database/mock/004_extra_mock_data.sql:/docker-entrypoint-initdb.d/04_extra_mock_data.sql:ro
```

(keeping one `002_fertilizer_and_photo_gps.sql` line), then reset the database (5.3). `scripts\reset-demo-data.ps1` regenerates `004_extra_mock_data.sql` with readings up to today and resets the database; it only loads demo data while these mock files are mounted. Add `--all-users` to `generate_mock_data.py` to keep every sample user.

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

1. The **sensor node** takes 10 water-level readings and sends them in one LoRa packet (binary, CRC-checked, format in `shared/protocol/CarbonCropPacket.h`).
2. The **gateway** receives the packet, checks the CRC and publishes it as JSON to Mosquitto.
3. The **mqtt-bridge** converts it and saves each reading in `sensor_readings`.
4. The **web app** shows it on the paddy's water chart and uses it for AWD phase detection and the carbon calculation.

**MQTT topics** (`GW-01` is the gateway's `GATEWAY_ID`):

| Topic | Payload |
|---|---|
| `carboncrops/gw/GW-01/water` | One message per LoRa packet (below) |
| `carboncrops/gw/GW-01/status` | `online` / `offline` (retained; `offline` is the last will, sent by the broker if the gateway disappears) |

```json
{"gw": "GW-01", "node": 1, "seq": 42, "lat": 13.736717, "lon": 100.523186,
 "samples": [[1795410000, -61], [1795410001, null], [1795410002, -64]]}
```

Each sample is `[unix time in UTC, water level in mm]`. `+` is above the soil, `-` below it, and `null` means the sensor got no echo. The bridge stores:

| JSON | Database (`sensor_readings`) |
|---|---|
| `node: 1` | `device_id = 'NODE-0001'` |
| unix time (UTC) | `recorded_at` in Thai time (UTC+7) |
| `-61` (mm) | `water_level_cm = -6.1` |
| `null` | `water_level_cm = NULL` |

The same `device_id` + time is stored only once, so a re-sent packet does no harm.

### 6.2 Register a sensor node (required)

Readings are saved **only for devices in the `devices` table**, because every device belongs to a paddy. Until then the bridge logs `NODE-0001 is not registered in devices` and skips the readings.

There is no screen for this yet. Create the paddy in the app first, then link the node to it:

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
| `gw=GW-01 node=1 seq=5: 10/10 new reading(s) saved` | Working |
| `... 0/10 new reading(s) saved` | Already stored (duplicate), e.g. the gateway re-sent a packet, or the node restarted with the same build-time clock |
| `NODE-0001 is not registered in devices` | Data arrives; register the node (6.2) |
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

Both projects use the shared files in `shared/protocol/` (packet format, radio channel), and each has its own copy of the E220 driver in `include/E220.h`. **Change these for both devices at the same time** (keep the two `E220.h` copies identical), or they won't understand each other.

### 7.2 Wiring (both boards)

| E220 pin | ESP32 pin |
|---|---|
| TXD | GPIO16 (RX2) |
| RXD | GPIO17 (TX2) |
| M0 | GPIO32 |
| M1 | GPIO33 |
| AUX | GPIO34 |
| VCC | 3V3 |

Radio: **922.125 MHz** (channel 72), inside Thailand's 920–925 MHz LoRa band. Both firmwares set the channel on the E220 at start-up. See `shared/protocol/LoRaConfig.h`.

Sensor node only: ultrasonic **TRIG GPIO25, ECHO GPIO26, power GPIO27**, battery sense **GPIO35** (100k/100k divider). Pin assignments are in each project's `include/PinConfig.h`.

### 7.3 Sensor node settings

The node runs a state machine (`src/App.cpp`); its timing is set in `include/AppConfig.h`:

```
read GPS                                   (once per packet)
repeat APP_SAMPLES_PER_PACKET (10) times:
    read RTC         -> time of this sample
    read ultrasonic  -> one reading, APP_ULTRASONIC_READS (10) times, 500 ms apart
    filter           -> keep only valid readings, median -> water level
    wait until APP_SAMPLE_INTERVAL_MS (10 s) after this sample started
send the packet over LoRa
wait APP_PACKET_PAUSE_MS (0), then start again
```

Samples run on a fixed schedule, so the time a measurement or a send takes doesn't make the interval drift. GPS (`src/Gps.cpp`) and RTC (`src/Rtc.cpp`) are placeholders for now: fixed coordinates and the build-time clock.


| File | Setting | Default | Notes |
|---|---|---|---|
| `include/NodeConfig.h` | `NODE_ID` | `1` | Unique per node. Becomes `NODE-0001` in the database |
| | `NODE_LATITUDE` / `NODE_LONGITUDE` | Bangkok | Placeholder until a GPS module is added |
| | `USE_DUMMY_DATA` | `true` | Sends fixed water levels (real timestamps) to test the LoRa link. Set `false` for real ultrasonic readings |
| `include/AppConfig.h` | `APP_SAMPLES_PER_PACKET` | `10` | Samples per LoRa packet (1–10) |
| | `APP_SAMPLE_INTERVAL_MS` | `10000` | Time between samples. Must be longer than the readings of one sample (~5.5 s; checked at build time) |
| | `APP_ULTRASONIC_READS` | `10` | Single ultrasonic readings per sample, then filtered into one water level |
| | `APP_ULTRASONIC_READ_INTERVAL_MS` | `500` | Time between those readings |
| | `APP_PACKET_PAUSE_MS` | `0` | Extra wait after sending, before the next packet |
| | `APP_STARTUP_DELAY_MS` | `2000` | Wait after boot before the first sample |
| | `APP_ULTRASONIC_FILTER` | `Median` | Filter type (`Filter.h`: Mean / Median / TrimmedMean); `APP_ULTRASONIC_MIN_VALID` (5) valid readings needed |
| `include/PipeConfig.h` | `PIPE_SENSOR_TO_GROUND_CM` | `50` | Distance from the sensor face down to the soil surface. Measure it after installing the pipe. Water level = this − measured distance |
| `include/HCSR04.h` | `HCSR04_CAL_SCALE` / `HCSR04_CAL_OFFSET_CM` | `1` / `0` | Calibration of the filtered distance (two known distances with a ruler) |
| | `HCSR04_TEMPERATURE_C`, range, warm-up | `30 °C`, 20–450 cm, 500 ms | Sensor constants |
| `include/Battery.h` | divider, `BATTERY_CAL_*`, OCV table | 1S LiFePO4 | Battery voltage → SoC (5 % lookup table + interpolation). Low 3.20 V, critical 3.00 V, empty 2.80 V |

> **Clock:** there is no RTC module yet, so the node's clock starts from the firmware **build time** and restarts at every reset. Timestamps are only right if you upload right after building, and they go wrong after a power cycle.

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

`GATEWAY_ID` (default `GW-01`) is in `include/NetConfig.h`; give each gateway its own.

**What the gateway does:** it keeps receiving LoRa packets at all times. If WiFi or MQTT is down, it holds up to **32 packets** in memory (about 50 minutes at the default one packet every ~100 s) and sends them when the connection is back. Packets in memory are lost if the gateway loses power.

**After uploading** you can unplug the gateway from the computer and power it from any USB charger or power bank. The machine running Docker must be on.

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

On a VPS the server parts run all the time, the gateway connects over the internet (any WiFi or a 4G hotspot in the field), and nobody's PC needs to be on.

```
Gateway ──internet──▶ VPS :1883 (Mosquitto) → mqtt-bridge → MySQL
Browser ──HTTPS────▶ VPS :443 (Caddy) → web app files + /api → API
```

> ⚠️ **Read 8.3 before you start.** The default settings are for a laptop. On a public server, `DEV_LOGIN=true` lets **anyone sign in as any user**, and anonymous MQTT lets anyone send fake sensor data.

### 8.1 Requirements

- A VPS with **Ubuntu 22.04 or 24.04**, at least **1 GB RAM** (2 GB recommended), and SSH access
- Recommended: a **domain name** pointing to the VPS (an `A` record). Caddy then gets an HTTPS certificate automatically. Without a domain you can use plain HTTP on the IP for testing.

### 8.2 Install and start

```bash
# 1. Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER        # then log out and back in

# 2. The code
git clone https://github.com/Yhommy741/CarbonCrops.git
cd CarbonCrops

# 3. Settings: copy, then change every password and key (see 8.3)
cp .env.example .env
nano .env

# 4. Start the backend (MySQL, Mosquitto, API, mqtt-bridge)
docker compose up -d --build
docker compose ps
```

**Web app.** Build it once (and after every update), then serve it with Caddy:

```bash
# Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
cd apps/web && npm ci && npm run build && cd ../..    # output: apps/web/dist

# Caddy (web server with automatic HTTPS)
sudo apt install -y caddy
```

Write `/etc/caddy/Caddyfile` (replace the domain and the path to the project):

```caddy
carboncrops.example.com {
    # Temporary site-wide password while DEV_LOGIN is on (see 8.3)
    basic_auth {
        team <hash from: caddy hash-password>
    }

    handle /api/* {
        reverse_proxy localhost:8000
    }
    handle /uploads/* {
        reverse_proxy localhost:8000
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

Caddy needs read access to `apps/web/dist`; if you get a 403, `chmod o+x` the folders on the path to it (e.g. `/home/ubuntu`).

**Firewall:** allow only SSH, web and MQTT:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 1883/tcp
sudo ufw enable
```

MySQL (3306) and the API (8000) are bound to `127.0.0.1` in `docker-compose.yml`, so they are not reachable from the internet. This matters because Docker-published ports bypass `ufw`.

### 8.3 Security checklist (do this before anyone else uses it)

| Item | What to do |
|---|---|
| **Passwords and keys** | In `.env`, set new random values for `DB_ROOT_PASSWORD`, `DB_PASSWORD`, `JWT_SECRET` and `INGEST_API_KEY` (e.g. `openssl rand -hex 32`). The DB passwords only take effect when the database is first created |
| **Development login** | `DEV_LOGIN=true` shows every account on the sign-in page with no password. Until LINE Login is built, keep the whole site behind Caddy's `basic_auth` (above): create the hash with `caddy hash-password` and give the password only to the team |
| **MQTT login** | See below |
| **Updates** | `sudo apt update && sudo apt upgrade` regularly |

**MQTT username and password:**

```bash
# 1. Create the password file (user "carboncrops"; you choose the password)
docker run --rm -v "$PWD/services/mosquitto/config:/c" eclipse-mosquitto:2 \
    mosquitto_passwd -c -b /c/passwd carboncrops '<mqtt-password>'
sudo chown 1883:1883 services/mosquitto/config/passwd   # the user Mosquitto runs as
sudo chmod 0700 services/mosquitto/config/passwd
```

2. In `services/mosquitto/config/mosquitto.conf`, replace `allow_anonymous true` with:

```
allow_anonymous false
password_file /mosquitto/config/passwd
```

3. In `.env`, set the bridge's login:

```
MQTT_USER=carboncrops
MQTT_PASSWORD=<mqtt-password>
```

4. Restart: `docker compose up -d --force-recreate mosquitto mqtt-bridge`
5. In the gateway's `Secrets.h`, set `MQTT_HOST` to the VPS's IP or domain and fill in `MQTT_USER` / `MQTT_PASSWORD`, then upload the firmware again.

Don't commit `passwd`, `.env` or `Secrets.h`. MQTT on port 1883 isn't encrypted: fine for a test, but plan for TLS (port 8883) before real farm data goes through it.

### 8.4 Updating and backups

```bash
git pull
docker compose up -d --build                           # backend
cd apps/web && npm ci && npm run build && cd ../..    # web app (Caddy serves the new files immediately)
```

Back up the database:

```bash
docker compose exec db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" carboncrops' > backup-$(date +%F).sql
```

Uploaded photos are in `services/api/uploads/`; back them up too.

## 9. How the app works

| Who | Screen | What it does |
|---|---|---|
| Farmer | แปลงนา (Dashboard) | All of the farmer's paddies: latest sensor water level, current AWD phase, current rice stage, number of completed crops, alerts (below −15 cm, low battery, sensor offline) |
| Farmer | Paddy | Crop calendar history with each crop's credit status, sensors with battery, satellite images (NDVI/NDWI). Start a new crop with a **planting-day photo** |
| Farmer | Crop calendar → ระดับน้ำ | Sensor water chart. The AWD phases (flooded / drying / reflooded / final drain / no data) are **detected automatically from the sensor data**. Farmers don't enter water data |
| Farmer | Crop calendar → บันทึกแปลง | The only things farmers enter: **fertilizer** (formula + kg/rai) and the **harvest-day photo** (sets `harvest_date`). Photos are geotagged. The rice stage (`stage_no`) is worked out from the date |
| Farmer | Crop calendar → คาร์บอน (MRV) | IPCC Tier 1 CH₄ estimate. A drying phase counts only if the sensor shows ≤ −5 cm. The final drain and periods without sensor data don't count. After harvest, **submit** stores the result in `carboncredit_info` (`not_checked`). A failed credit can be submitted again |
| Farmer | คาร์บอน | Total tCO₂e (passed / waiting / not submitted) and baht earned (`amount_thb`), plus an estimate at a price you can change |
| Farmer | รายงาน | Printable certificate for each passed credit |
| Verifier | คำขอตรวจสอบ (requests) | Review the evidence, then mark **passed** (`amount_thb` = tCO₂e × price) or **failed** with a reason |
| Verifier | ชาวนา (Farmers) | All farmers with their paddies, area, crops and verified tCO₂e; open one to see the full farming history and drill into any crop's water chart, photos and MRV |

Verifiers see only the two verifier tabs; their home page opens the request queue.

`farming_calendars` has no name or status column. The app derives them (see `services/api/app/services/calendar.py`):
- **Season name:** planted May–Sep = นาปี, otherwise นาปรัง (Buddhist year)
- **Status:** `planned` / `active` / `harvested`, from `planting_date` and `harvest_date`

Water data comes only from the IoT sensors (section 6).

## 10. Language and theme

The code is written in English. Text shown to users lives in translation files, and the header has two switches: **TH/EN** for language and **🌙/☀️** for light/dark. Both choices are remembered in the browser. On first visit the app follows the browser's language and dark-mode setting.

- **Translations** are in `apps/web/src/locales/en.js` and `th.js`. When you add text, add the same key to both files and use it with `const { t } = usePreferences()` → `t('section.key', { name })`.
- **Dates and numbers** go through `fmt` from the same hook (`fmt.date`, `fmt.num`, `fmt.baht`, `fmt.season`). In Thai, years are shown in the Buddhist era.
- **API errors** come back as `{"detail": {"code": "...", "message": "..."}}` (see `services/api/app/errors.py`). The web app shows `errors.<code>` from the locale files, or the English `message` if the code has no translation yet.
- **Dark mode** mirrors the Tailwind color scales in `apps/web/src/index.css`, so components don't need `dark:` classes. Use the stone/green/amber/sky/red/violet colors, or a `var(--color-...)` in SVG, and dark mode works automatically. Printing always uses the light theme.
- **Data** isn't translated. Names, notes and LINE notification text appear as they are stored.

## 11. Not built yet

- **LINE Login** (sign-in is the development account picker) and **sending LINE messages** (notifications are saved with status `pending`)
- **Adding sensor devices in the app** (use the SQL in 6.2 for now)
- **Battery level from the sensor node**: `Battery.cpp` exists but isn't used yet and the LoRa packet has no battery field, so `devices.battery_pct` is only set through the HTTP endpoint
- **Real clock and GPS on the sensor node** (build-time clock and fixed coordinates for now)
- **MQTT over TLS** and a production setup beyond section 8
- Google Earth Engine (satellite images), carbon credit trading, and saving edits while offline (offline mode is read-only for now)
