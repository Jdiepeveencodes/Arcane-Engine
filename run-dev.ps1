Write-Host "Starting D&D Console Dev Environment..."

# -------------------------
# Backend
# -------------------------
Write-Host "Starting backend (FastAPI)..."
Start-Process powershell -ArgumentList `
  "-NoExit",
  "-Command",
  "cd backend; uvicorn app.main:app --reload --port 8000"

# Give backend a moment to bind the port
Start-Sleep -Seconds 1

# -------------------------
# Frontend
# -------------------------
Write-Host "Starting frontend (Vite)..."
Start-Process powershell -ArgumentList `
  "-NoExit",
  "-Command",
  "cd frontend; npm run dev"
