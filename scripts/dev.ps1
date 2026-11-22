# Start everything for local development (no Docker; no internet needed once packages are installed).
#   .\scripts\dev.ps1            local database + service + web app (live mode)
#   .\scripts\dev.ps1 -Stop      stop what this script started
#
# Needs: .venv with the service packages, scripts\node_modules and web\node_modules installed.
param([switch]$Stop, [int]$ApiPort = 8000, [int]$DbPort = 5433)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$py = Join-Path $root ".venv\Scripts\python.exe"
$pidFile = Join-Path $root ".dev-pids"

function Stop-Dev {
    if (Test-Path $pidFile) {
        foreach ($id in (Get-Content $pidFile)) { Stop-Process -Id ([int]$id) -Force -ErrorAction SilentlyContinue }
        Remove-Item $pidFile -Force
    }
}
Stop-Dev
if ($Stop) { Write-Host "Stopped."; return }

$dsn = "postgresql://postgres:postgres@127.0.0.1:$DbPort/postgres"
$ids = @()

Write-Host "1/4 Starting the local database on port $DbPort ..."
$env:LOCAL_PG_PORT = "$DbPort"
$db = Start-Process node -ArgumentList "scripts/local_pg.mjs","--memory" -PassThru -WindowStyle Hidden `
      -RedirectStandardOutput "$root\.dev-db.log" -RedirectStandardError "$root\.dev-db.err"
$ids += $db.Id
Start-Sleep -Seconds 4

Write-Host "2/4 Applying migrations and seed data ..."
& $py db\apply_migrations.py --local --seed --dsn $dsn
& $py scripts\load_registry_photos.py --dsn $dsn

Write-Host "3/4 Starting the Python service on http://localhost:$ApiPort (Swagger at /docs) ..."
$env:AUTH_MODE = "local"
$env:DATABASE_URL = $dsn
if (-not $env:JWT_SECRET) { $env:JWT_SECRET = "dev-only-secret-change-me-0123456789abcdef" }
$env:CORS_ORIGINS = "http://localhost:5173"
$svc = Start-Process $py -ArgumentList "-m","uvicorn","app.main:app","--port","$ApiPort" -PassThru -WindowStyle Hidden `
       -WorkingDirectory "$root\service" -RedirectStandardOutput "$root\.dev-service.log" -RedirectStandardError "$root\.dev-service.err"
$ids += $svc.Id

if (Test-Path "web\node_modules") {
    Write-Host "4/4 Starting the web app on http://localhost:5173 ..."
    $env:VITE_API_BASE = "http://localhost:$ApiPort"
    $web = Start-Process node -ArgumentList "node_modules/vite/bin/vite.js","--mode","live" -PassThru -WindowStyle Hidden `
           -WorkingDirectory "$root\web" -RedirectStandardOutput "$root\.dev-web.log" -RedirectStandardError "$root\.dev-web.err"
    $ids += $web.Id
} else {
    Write-Host "4/4 web\node_modules not found: run 'npm install' inside web\ first."
}
$ids | Set-Content $pidFile

Write-Host ""
Write-Host "Ready: web http://localhost:5173  |  API http://localhost:$ApiPort/docs"
Write-Host "Stop with: .\scripts\dev.ps1 -Stop"
