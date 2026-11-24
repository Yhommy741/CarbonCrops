# Start the whole app in one terminal:
#   backend (MySQL + Mosquitto + FastAPI) in Docker, then the web app (Vite).
# Press Ctrl + C to stop the web app; the Docker containers are stopped too.
#
#   powershell -ExecutionPolicy Bypass -File scripts\dev.ps1
#   npm run dev                      (same thing, from the project root)
#
# Options:
#   -Build         Rebuild the backend image (after changing services/api code
#                  or requirements.txt)
#   -KeepBackend   Leave the Docker containers running after Ctrl + C

param(
    [switch]$Build,
    [switch]$KeepBackend
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# ---- Docker must be running -------------------------------------------------
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Docker is not running. Open Docker Desktop, wait for "Engine running", then try again.' -ForegroundColor Red
    exit 1
}

# ---- Backend ----------------------------------------------------------------
Write-Host '==> Starting backend (MySQL, Mosquitto, FastAPI)...' -ForegroundColor Cyan
if ($Build) { docker compose up -d --build } else { docker compose up -d }
if ($LASTEXITCODE -ne 0) { Write-Host 'docker compose failed.' -ForegroundColor Red; exit 1 }

Write-Host '==> Waiting for the API on http://localhost:8000 ...' -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    try {
        Invoke-WebRequest -Uri 'http://localhost:8000/docs' -UseBasicParsing -TimeoutSec 2 | Out-Null
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if ($ready) {
    Write-Host '    API ready: http://localhost:8000/docs' -ForegroundColor Green
} else {
    Write-Host '    API did not answer after 90 s. Check: docker compose logs api' -ForegroundColor Yellow
}

# ---- Frontend ---------------------------------------------------------------
Set-Location (Join-Path $root 'apps\web')
if (-not (Test-Path 'node_modules')) {
    Write-Host '==> Installing web app packages (first run)...' -ForegroundColor Cyan
    npm install
}

Write-Host '==> Starting web app: http://localhost:5173  (Ctrl + C to stop)' -ForegroundColor Cyan
try {
    npm run dev
} finally {
    Set-Location $root
    if (-not $KeepBackend) {
        Write-Host '==> Stopping backend containers...' -ForegroundColor Cyan
        docker compose stop
    }
}
