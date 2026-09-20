@echo off
echo ====================================================
echo Starting GreenWindow Irrigation Scheduler
echo ====================================================
echo.
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"
echo Starting Backend API Server (Port 5000)...
start "GreenWindow API Server (Port 5000)" cmd /k "pnpm run dev:api"

echo Starting Frontend Web App (Port 3000)...
start "GreenWindow Web App (Port 3000)" cmd /k "pnpm run dev:web"

timeout /t 3 /nobreak >nul
echo.
echo Opening GreenWindow in your browser: http://localhost:3000
start http://localhost:3000
echo.
echo All services started! You can close this launcher window.
