@echo off
title Arynox Hotel ERP - Launcher
cd /d "%~dp0"

echo ============================================================
echo   ARYNOX HOTEL ERP - Hotel + Restaurant + POS
echo   Local dev: frontend (Vite) + backend (Express) + offline DB
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install it from https://nodejs.org
  pause
  exit /b 1
)

if not exist "backend\node_modules" (
  echo [1/3] Installing backend dependencies...
  pushd backend
  call npm install
  popd
) else (
  echo [1/3] Backend dependencies already installed.
)

if not exist "frontend\node_modules" (
  echo [2/3] Installing frontend dependencies...
  pushd frontend
  call npm install
  popd
) else (
  echo [2/3] Frontend dependencies already installed.
)

echo [3/3] Starting services...

start "Arynox Backend (port 5000)" cmd /k "cd /d "%~dp0backend" && node server.js"
start "Arynox Printer Bridge (port 8765)" cmd /k "cd /d "%~dp0backend" && node bridge.js"
start "Arynox Frontend (port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Waiting for services to boot...
timeout /t 7 /nobreak >nul
start http://localhost:5173
echo.
echo All services started. Close the opened windows to stop them.
echo Default login: admin / admin123
pause