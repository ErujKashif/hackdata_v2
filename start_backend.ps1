# Synthara — Backend startup script (Windows PowerShell)
# Run from repo root: .\start_backend.ps1

$ErrorActionPreference = "Stop"

Write-Host "==> Activating virtual environment..." -ForegroundColor Cyan
& "backend\.venv\Scripts\Activate.ps1"

Write-Host "==> Starting Synthara API on http://localhost:8000" -ForegroundColor Green
Write-Host "    Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "    Press Ctrl+C to stop.`n"

uvicorn app.main:app --reload --port 8000 --app-dir backend
