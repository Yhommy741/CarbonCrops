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
│   ├── api/                 Backend API server
│   ├── database/            Database schema and migrations
│   └── mosquitto/           MQTT broker configuration
├── firmware/
│   ├── gateway/             ESP32 LoRa gateway (LoRa → MQTT)
│   └── sensor-node/         ESP32 sensor node (measurement + LoRa)
├── shared/
│   └── protocol/            LoRa packet format shared by gateway and sensor node
├── docs/                    Project documentation
└── README.md
```


## 3. How to run

### Step 1: Install the tools (one time only)

| Tool | Why | Download |
|---|---|---|
| **Git** | Download the code | https://git-scm.com/downloads |
| **Node.js** (LTS version) | Run the web app | https://nodejs.org |
| **VS Code** (recommended) | Edit code | https://code.visualstudio.com |
| **Docker Desktop** | Run Mosquitto, database and backend | https://www.docker.com/products/docker-desktop |

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

> 🚧 The `docker-compose.yml` file hasn't been added yet. Once it is, a single command run from the project root will start everything:
> ```bash
> docker compose up -d     # start Mosquitto + database + backend
> docker compose ps        # see what's running
> docker compose down      # stop everything
> ```

### Step 5: Firmware (coming soon)

Instructions for building and uploading the gateway and sensor-node firmware (VS Code + PlatformIO) will be added here once those parts are built.
