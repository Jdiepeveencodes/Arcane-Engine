# run-dev.ps1
# Launch backend (FastAPI/Uvicorn) + frontend (Vite) cleanly on Windows.
# Run from repo root: powershell -ExecutionPolicy Bypass -File .\run-dev.ps1

$ErrorActionPreference = "Stop"

function Write-Info($msg) {
  Write-Host $msg -ForegroundColor Cyan
}

$repoRoot   = (Resolve-Path ".").Path
$backendDir = Join-Path $repoRoot "backend"
$frontDir   = Join-Path $repoRoot "frontend"
$py         = Join-Path $backendDir ".venv\Scripts\python.exe"

Write-Info "Repo root   : $repoRoot"
Write-Info "Backend dir : $backendDir"
Write-Info "Frontend dir: $frontDir"
Write-Info "Python      : $py"
Write-Host ""

if (!(Test-Path $backendDir)) { throw "Missing backend dir: $backendDir" }
if (!(Test-Path $frontDir))   { throw "Missing frontend dir: $frontDir" }
if (!(Test-Path $py))         { throw "Missing venv python: $py (did you create backend\.venv?)" }

# --- Backend command ---
# Your working setup has been: python -m uvicorn app.main:app --reload --port 8000 --app-dir .\backend
$backendCmd = @"
Set-Location -LiteralPath '$repoRoot'
& '$py' -m uvicorn app.main:app --reload --port 8000 --app-dir '.\backend'
"@

# --- Frontend command ---
$frontCmd = @"
Set-Location -LiteralPath '$frontDir'
npm run dev
"@

Write-Info "Starting backend (port 8000) in a new window..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  $backendCmd
) | Out-Null

Write-Info "Starting frontend (port 5173) in a new window..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-Command",
  $frontCmd
) | Out-Null

Write-Host ""
Write-Info "Done."
Write-Info "Backend:  http://127.0.0.1:8000"
Write-Info "Frontend: http://localhost:5173"
