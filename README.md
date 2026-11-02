# CarbonCrops
FRA362 Robotics Innovation Project | Software for AWD Rice Farming &amp; Carbon Credit System

## 1. About the project

CarbonCrops helps rice farmers use **AWD (Alternate Wetting and Drying)**, a way of watering rice fields that cuts methane (CH₄) emissions, and turns that reduction into **carbon credit** data.

In AWD, farmers let the field dry out between irrigations instead of keeping it flooded all the time. Less standing water means less methane. Carbon credits need proof that this really happened, so the system measures the water level in each field automatically and keeps a record.

## 2. Directory structure

```
CarbonCrops/
├── apps/
│   └── web/                 Web app: React + Vite (PWA)
├── services/
│   ├── api/                 Backend API: FastAPI + MySQL
│   ├── database/            MySQL schema + sample data (carboncrops_DB.sql)
│   └── mosquitto/           MQTT broker configuration
├── firmware/
│   ├── gateway/             ESP32 LoRa gateway (LoRa → MQTT)
│   └── sensor-node/         ESP32 sensor node (measurement + LoRa)
├── shared/
│   └── protocol/            LoRa packet format shared by gateway and sensor node
├── hardware/
│   ├── mechanics/           Mechanical design (3D models, enclosures, mounts)
│   └── electronics/         Electronic design (schematics, PCB, wiring)
├── scripts/
│   ├── setup-windows.ps1    One-command setup for Windows
│   └── reset-demo-data.ps1  Rebuild the local database with fresh demo data
├── docs/                    Project documentation
└── README.md
```


## 3. How to run

### Quick setup on Windows (recommended)

One script installs the tools and the project's packages. After cloning the project (Step 2), open **PowerShell** in the project folder and run:

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

> If the script just installed Docker Desktop: **restart the computer**, then open Docker Desktop once and wait for **Engine running**. After that, continue from Step 4.
>
> If you see `winget not found`: install **App Installer** from the Microsoft Store and try again.

macOS / Linux, or doing it by hand: follow Step 1 below. You also need **Python 3.11+** (https://www.python.org/downloads) to run the backend without Docker.

### Step 1: Install the tools (one time only)

| Tool | Why | Download |
|---|---|---|
| **Git** | Download the code | https://git-scm.com/downloads |
| **Node.js** (LTS version) | Run the web app | https://nodejs.org |
| **VS Code** (recommended) | Edit code | https://code.visualstudio.com |
| **Docker Desktop** | Run Mosquitto, database and backend | https://www.docker.com/products/docker-desktop |
| **Python 3.11+** (optional) | Run the backend or its tests without Docker | https://www.python.org/downloads |

Install each one with the default options. Then **close and reopen** your terminal and check:

```bash
git --version
node --version
npm --version
```

Each command should print a version number. If you see "not recognized", restart your computer and try again.

### Step 2: Download the project

```bash
git clone https://github.com/Yhommy741/CarbonCrops.git
cd CarbonCrops
```

(Or in GitHub Desktop: **File → Clone repository**.)

### Step 3: Run the web app

```bash
cd apps/web
npm install
npm run dev
```

- `npm install` downloads the libraries the app needs. It's only required the first time, or after someone changes `package.json`.
- `npm run dev` starts the development server.

Open **http://localhost:5173** in your browser. Press `Ctrl + C` in the terminal to stop the server.

> **Error `Could not read package.json`?** You're in the wrong folder. Run the commands inside `apps/web`, not the project root.

### Step 4: Docker (Mosquitto, database, backend)

Docker runs the server-side parts in containers, so nobody has to install Mosquitto or PostgreSQL by hand, and everyone gets the same versions.

After installing Docker Desktop, open it once and wait until it says **Engine running**. On Windows it may ask you to install or update **WSL 2**. Accept, then restart your computer. Check it works:

```bash
docker --version
docker compose version
```

Run these from the project root:

```bash
docker compose up -d --build   # start MySQL + Mosquitto + FastAPI backend
docker compose ps              # see what's running
docker compose down            # stop everything
```

- On first start, MySQL loads these files in order (only while `services/database/data/` is empty):
  1. `services/database/carboncrops_DB.sql`: tables + sample data
  2. `services/database/migrations/002_activity_fertilizer.sql`: adds fertilizer columns to `activities`
  3. `services/database/mock/003_mock_data.sql`: demo data (see below)
- API docs: **http://localhost:8000/docs**
- With the backend running, start the web app (Step 3). Vite forwards `/api` to the backend. On the login screen, pick any sample user. LINE Login isn't connected yet.

#### Demo data

`003_mock_data.sql` is generated by `services/api/scripts/generate_mock_data.py`. It adds:

- **7 farmers**, most with **2–3 plots** each (GPS, area in rai, land deeds)
- **Crop cycles** per plot: นาปี 2568, นาปรัง 2569 and นาปี 2569. Some are harvested and some are still growing.
- **One water-level sensor per plot**, with readings every 4 hours. The simulated farming patterns:
  - AWD with several dry-downs
  - AWD with one dry-down
  - Flooded all season
  - Rain and the final drain before harvest
  - A few sensor outages
- What farmers record: **planting-day photo**, **fertilizer** (formula + kg/rai) and **harvest-day photo**, all geotagged. The photos are placeholder images from `apps/web/public/mock/`.
- **Satellite image** metadata (Sentinel-2 / Landsat-9) every ~2 weeks
- Carbon estimates computed with the real model, plus verifications (approved / rejected / pending), reports and notifications

The sensor readings stop at the moment the file was generated. Before a demo, rebuild everything so the "growing" plots have data up to today:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\reset-demo-data.ps1
```

⚠️ This **deletes the local database**, including anything you entered in the app. Wait ~30 seconds for MySQL to load before opening the app.

To add the fertilizer columns to an existing database without resetting it, run:
`docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/002_activity_fertilizer.sql`
- Defaults are in `docker-compose.yml`. To change passwords or keys, copy `.env.example` to `.env`.

**Running the backend without Docker** (needs Python 3.11+ and your own MySQL with the SQL file imported):

```bash
cd services/api
python -m venv .venv
.venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env          # then edit DB_USER / DB_PASSWORD
uvicorn app.main:app --reload
pytest                          # GHG calculation tests
```

### How the app works

| Who | Screen | What it does |
|---|---|---|
| Farmer | แปลงนา (Dashboard) | All of the farmer's plots: latest sensor water level, current AWD phase, number of completed cycles, alerts (below −15 cm, low battery, sensor offline) |
| Farmer | Plot | Cycle history with tCO₂e per cycle, sensor status, satellite images. Start a new cycle with a **planting-day photo** |
| Farmer | Crop cycle → ระดับน้ำ | Sensor water chart. The AWD phases (flooded / drying / reflooded / final drain / no data) are **detected automatically from the sensor data**. Farmers don't enter water data. |
| Farmer | Crop cycle → บันทึกแปลง | The only things farmers enter: **fertilizer** (formula + kg/rai) and the **harvest-day photo**. Photos are geotagged. |
| Farmer | Crop cycle → คาร์บอน (MRV) | IPCC Tier 1 CH₄ estimate. A drying phase counts only if the sensor shows ≤ −5 cm. The final drain and periods without sensor data don't count. After harvest: save the estimate, then submit for verification. |
| Farmer | คาร์บอน | Total tCO₂e (certified / pending / estimated) and estimated income at a price you can change |
| Verifier | ตรวจสอบ | Claim a request, review the evidence, approve (report is issued automatically) or reject with a reason |
| Everyone | รายงาน | Printable certificate for each report |

Sensor data comes in through `POST /api/ingest/readings` with an `X-API-Key` header (see `services/api/app/routers/ingest.py`). Water data comes only from the IoT sensors. The `water_measurements` and `awd_phases` tables in the sample schema are no longer used by the app.

**Not built yet:** LINE Login and sending LINE messages (notifications are saved with status `pending`), Google Earth Engine, the MQTT → API bridge, carbon credit trading, and saving edits while offline (offline mode is read-only for now).

### Step 5: Firmware (coming soon)

Instructions for building and uploading the gateway and sensor-node firmware (VS Code + PlatformIO) will be added here once those parts are built.
