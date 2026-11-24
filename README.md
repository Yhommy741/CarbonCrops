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
│   ├── database/            MySQL schema, team mock data, migrations, extra mock data
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
  1. `services/database/carboncrops_DB_last04112569.sql`: tables (schema only)
  2. `services/database/mock/carboncrops_mock_data_v4.sql`: the team's mock data (5 paddies, rice stages, users)
  3. `services/database/migrations/002_fertilizer_and_photo_gps.sql`: adds `activities.fertilizer_formula` / `fertilizer_kg_per_rai` and `activity_evidence.latitude` / `longitude`
  4. `services/database/mock/004_extra_mock_data.sql`: extra demo data (see below)
- API docs: **http://localhost:8000/docs**
- With the backend running, start the web app (Step 3). Vite forwards `/api` to the backend. On the login screen, pick any sample user. LINE Login isn't connected yet.

#### Demo data

`004_extra_mock_data.sql` is generated by `services/api/scripts/generate_mock_data.py` and adds to the team's v4 mock data:

- **Water-level readings every 4 hours** for the 5 v4 devices, from installation to now. The simulated farming patterns:
  - AWD with several dry-downs
  - AWD with one dry-down
  - Rain and the final drain before harvest
  - A sensor outage on paddy 2, which explains its failed credit
- A new **growing crop calendar** (นาปรัง 2570) on paddies 1–3
- **3 more farmers** with **2–3 paddies** each, a sensor per paddy and seasons นาปี 2568 / นาปรัง 2569 / นาปี 2569
- What farmers record: **planting-day photo** (sowing/transplanting), **fertilizer** (formula + kg/rai) and **harvest-day photo**, all geotagged. The photos are placeholder images from `apps/web/public/mock/`.
- **Satellite images** every ~2 weeks:
  - **NDVI** follows crop age
  - **NDWI** follows that day's water level
- **Carbon credits** (`carboncredit_info`) computed with the real model: passed / failed / not_checked, plus notifications

**Testing scope (for now):** by default the database keeps only **เกษตรกรตัวอย่าง ก** (Farmer A, paddies 1 and 4) and **ผู้ตรวจสอบตัวอย่าง** (the verifier). The generated file removes every other user and their data when it loads. To get everyone back, run `services\api\.venv\Scripts\python services\api\scripts\generate_mock_data.py --all-users`, then reset the database (`docker compose down`, delete `services\database\data`, `docker compose up -d`).

The sensor readings stop at the moment the file was generated. Before a demo, rebuild everything so the "growing" paddies have data up to today:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\reset-demo-data.ps1
```

⚠️ This **deletes the local database**, including anything you entered in the app. Wait ~30 seconds for MySQL to load before opening the app.

To add the fertilizer and GPS columns to an existing database without resetting it, run:
`docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/002_fertilizer_and_photo_gps.sql`
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
| Farmer | แปลงนา (Dashboard) | All of the farmer's paddies: latest sensor water level, current AWD phase, current rice stage, number of completed crops, alerts (below −15 cm, low battery, sensor offline) |
| Farmer | Paddy | Crop calendar history with each crop's credit status, sensors with battery, satellite images (NDVI/NDWI). Start a new crop with a **planting-day photo** |
| Farmer | Crop calendar → ระดับน้ำ | Sensor water chart. The AWD phases (flooded / drying / reflooded / final drain / no data) are **detected automatically from the sensor data**. Farmers don't enter water data. |
| Farmer | Crop calendar → บันทึกแปลง | The only things farmers enter: **fertilizer** (formula + kg/rai) and the **harvest-day photo** (sets `harvest_date`). Photos are geotagged. The rice stage (`stage_no`) is worked out from the date. |
| Farmer | Crop calendar → คาร์บอน (MRV) | IPCC Tier 1 CH₄ estimate. A drying phase counts only if the sensor shows ≤ −5 cm. The final drain and periods without sensor data don't count. After harvest, **submit** stores the result in `carboncredit_info` (`not_checked`). A failed credit can be submitted again. |
| Farmer | คาร์บอน | Total tCO₂e (passed / waiting / not submitted) and baht earned (`amount_thb`), plus an estimate at a price you can change |
| Verifier | ตรวจสอบ | Review the evidence, then mark **passed** (`amount_thb` = tCO₂e × price) or **failed** with a reason |
| Verifier | ชาวนา (Farmers) | All farmers with their paddies, area, crops and verified tCO₂e; open one to see the full farming history and drill into any crop's water chart, photos and MRV |
| Farmer | รายงาน | Printable certificate for each passed credit |

Verifiers see only two tabs, **คำขอตรวจสอบ** (requests) and **ชาวนา** (farmers); their home page opens the request queue.

Sensor data comes in through `POST /api/ingest/readings` with an `X-API-Key` header. Each reading has `device_id` (e.g. `MOCK-DEV-001`), `water_level_cm`, optional `recorded_at` and optional `battery_pct`; battery is saved to `devices.battery_pct`. See `services/api/app/routers/ingest.py`. Water data comes only from the IoT sensors.

`farming_calendars` has no name or status column. The app derives them:
- **Season name:** planted May–Sep = นาปี, otherwise นาปรัง (Buddhist year)
- **Status:** `planned` / `active` / `harvested`, from `planting_date` and `harvest_date`

See `services/api/app/services/calendar.py`.

### Language and theme

The code is written in English. Text shown to users lives in translation files, and the header has two switches: **TH/EN** for language and **🌙/☀️** for light/dark. Both choices are remembered in the browser. On first visit the app follows the browser's language and dark-mode setting.

- **Translations** are in `apps/web/src/locales/en.js` and `th.js`. When you add text, add the same key to both files and use it with `const { t } = usePreferences()` → `t('section.key', { name })`.
- **Dates and numbers** go through `fmt` from the same hook (`fmt.date`, `fmt.num`, `fmt.baht`, `fmt.season`). In Thai, years are shown in the Buddhist era.
- **API errors** come back as `{"detail": {"code": "...", "message": "..."}}` (see `services/api/app/errors.py`). The web app shows `errors.<code>` from the locale files, or the English `message` if the code has no translation yet.
- **Dark mode** mirrors the Tailwind color scales in `apps/web/src/index.css`, so components don't need `dark:` classes. Use the stone/green/amber/sky/red/violet colors, or a `var(--color-...)` in SVG, and dark mode works automatically. Printing always uses the light theme.
- **Data** isn't translated. Names, notes and LINE notification text appear as they are stored.

**Not built yet:** LINE Login and sending LINE messages (notifications are saved with status `pending`), Google Earth Engine, the MQTT → API bridge, carbon credit trading, and saving edits while offline (offline mode is read-only for now).

### Step 5: Firmware (coming soon)

Instructions for building and uploading the gateway and sensor-node firmware (VS Code + PlatformIO) will be added here once those parts are built.
