<#
.SYNOPSIS
  Rebuild the local database with fresh demo data (sensor readings up to now).

.DESCRIPTION
  1. Regenerates services/database/mock/003_mock_data.sql
  2. Stops the containers and DELETES the local MySQL data (services/database/data)
  3. Starts everything again; MySQL loads carboncrops_DB.sql + migrations + mock data

  Anything you added through the app on this machine is lost.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\reset-demo-data.ps1
  powershell -ExecutionPolicy Bypass -File scripts\reset-demo-data.ps1 -Now 2026-11-02
#>
param(
    [string]$Now  # end date of the generated data (YYYY-MM-DD); default: right now
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $Root 'services\api\.venv\Scripts\python.exe'
if (-not (Test-Path $python)) {
    throw 'services\api\.venv not found. Run scripts\setup-windows.ps1 first.'
}

Push-Location $Root
try {
    Write-Host '==> Generating mock data' -ForegroundColor Cyan
    $genArgs = @('services\api\scripts\generate_mock_data.py')
    if ($Now) { $genArgs += @('--now', $Now) }
    & $python @genArgs
    if ($LASTEXITCODE -ne 0) { throw 'generate_mock_data.py failed' }

    Write-Host '==> Resetting the database' -ForegroundColor Cyan
    docker compose down
    if (Test-Path 'services\database\data') { Remove-Item -Recurse -Force 'services\database\data' }
    docker compose up -d --build
    if ($LASTEXITCODE -ne 0) { throw 'docker compose up failed' }

    Write-Host '==> Done. MySQL may need ~30 s to load the data the first time.' -ForegroundColor Green
} finally {
    Pop-Location
}
