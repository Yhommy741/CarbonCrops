<#
.SYNOPSIS
  One-time setup for CarbonCrops on Windows 10/11.

.DESCRIPTION
  1. Installs Git, Node.js LTS, Python 3.12 and Docker Desktop with winget
     (skips anything already installed).
  2. Installs the project's dependencies:
       apps/web      -> npm install
       services/api  -> Python virtual environment (.venv) + pip install
  3. Creates .env files from the .env.example templates (existing ones are kept).
  4. Runs the backend tests.

  Safe to run again: steps that are already done are skipped.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1
  powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1 -SkipDocker
#>
param(
    [switch]$SkipDocker,   # don't install Docker Desktop
    [switch]$SkipTests     # don't run pytest at the end
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Ok($text)   { Write-Host "    [ok] $text" -ForegroundColor Green }
function Warn($text) { Write-Host "    [!] $text" -ForegroundColor Yellow }

function Update-PathFromRegistry {
    # Pick up programs installed during this session without reopening the terminal
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user"
}

function Test-Tool($command, $versionPattern) {
    # The Microsoft Store "python" alias exists but isn't real Python, so check the version output
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { return $false }
    try {
        $out = & $command --version 2>&1 | Out-String
        return ($LASTEXITCODE -eq 0) -and ($out -match $versionPattern)
    } catch {
        return $false
    }
}

function Find-Python {
    # The Store alias can stay first on PATH after installing, so also look in the default install folders
    if (Test-Tool 'python' 'Python 3\.(1[1-9]|[2-9]\d)') { return (Get-Command python).Source }
    $candidates = Get-ChildItem "$env:LOCALAPPDATA\Programs\Python\Python3*\python.exe", "$env:ProgramFiles\Python3*\python.exe" -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending
    foreach ($c in $candidates) {
        if (Test-Tool $c.FullName 'Python 3\.(1[1-9]|[2-9]\d)') { return $c.FullName }
    }
    return $null
}

function Install-WithWinget($id, $name) {
    Write-Host "    installing $name ($id) ..."
    winget install --id $id --exact --silent --accept-package-agreements --accept-source-agreements
    # -1978335189 = already installed / no newer version
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1978335189) {
        throw "winget could not install $name (exit code $LASTEXITCODE)"
    }
    Update-PathFromRegistry
}

# ---------------------------------------------------------------- 1. tools
Step 'Checking tools'

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'winget not found. Install "App Installer" from the Microsoft Store, then run this script again.'
}

$tools = @(
    @{ Name = 'Git';         Id = 'Git.Git';            Cmd = 'git';    Pattern = 'git version' },
    @{ Name = 'Node.js LTS'; Id = 'OpenJS.NodeJS.LTS';  Cmd = 'node';   Pattern = '^v\d+' }
)
if (-not $SkipDocker) {
    $tools += @{ Name = 'Docker Desktop'; Id = 'Docker.DockerDesktop'; Cmd = 'docker'; Pattern = 'Docker version' }
}

$dockerInstalledNow = $false
foreach ($t in $tools) {
    if (Test-Tool $t.Cmd $t.Pattern) {
        Ok "$($t.Name) already installed"
        continue
    }
    Install-WithWinget $t.Id $t.Name
    if ($t.Cmd -eq 'docker') { $dockerInstalledNow = $true }
    if (Test-Tool $t.Cmd $t.Pattern) {
        Ok "$($t.Name) installed"
    } elseif ($t.Cmd -eq 'docker') {
        Warn 'Docker Desktop installed but not usable yet (needs a restart).'
    } else {
        throw "$($t.Name) was installed but '$($t.Cmd)' is not on PATH. Close this terminal, open a new one, and run the script again."
    }
}

$Python = Find-Python
if ($Python) {
    Ok "Python already installed ($Python)"
} else {
    Install-WithWinget 'Python.Python.3.12' 'Python 3.12'
    $Python = Find-Python
    if (-not $Python) { throw 'Python was installed but python.exe was not found. Open a new terminal and run the script again.' }
    Ok "Python installed ($Python)"
}

# ---------------------------------------------------------------- 2. web app
Step 'Installing web app packages (apps/web)'
Push-Location (Join-Path $Root 'apps\web')
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
    Ok 'npm packages installed'
} finally {
    Pop-Location
}

# ---------------------------------------------------------------- 3. backend
Step 'Setting up Python environment (services/api/.venv)'
$api = Join-Path $Root 'services\api'
$venvPython = Join-Path $api '.venv\Scripts\python.exe'
if (-not (Test-Path $venvPython)) {
    & $Python -m venv (Join-Path $api '.venv')
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the virtual environment' }
}
& $venvPython -m pip install --upgrade pip --quiet
& $venvPython -m pip install -r (Join-Path $api 'requirements.txt') --quiet
if ($LASTEXITCODE -ne 0) { throw 'pip install failed' }
Ok 'Python packages installed'

# ---------------------------------------------------------------- 4. .env files
Step 'Creating .env files'
foreach ($dir in @($Root, $api)) {
    $example = Join-Path $dir '.env.example'
    $target = Join-Path $dir '.env'
    if (Test-Path $target) {
        Ok "$target already exists (kept)"
    } elseif (Test-Path $example) {
        Copy-Item $example $target
        Ok "created $target"
    }
}

# ---------------------------------------------------------------- 5. tests
if (-not $SkipTests) {
    Step 'Running backend tests'
    Push-Location $api
    try {
        & $venvPython -m pytest -q
        if ($LASTEXITCODE -ne 0) { Warn 'Some tests failed (see above).' } else { Ok 'tests passed' }
    } finally {
        Pop-Location
    }
}

# ---------------------------------------------------------------- done
Step 'Done'
if ($dockerInstalledNow) {
    Warn 'Docker Desktop was just installed:'
    Warn '  1. Restart the computer'
    Warn '  2. Open Docker Desktop and wait for "Engine running" (accept the WSL 2 update if asked)'
}
Write-Host @"

Next:
  docker compose up -d --build      (from the project root: MySQL + Mosquitto + API)
  cd apps\web
  npm run dev                       (then open http://localhost:5173)
"@
