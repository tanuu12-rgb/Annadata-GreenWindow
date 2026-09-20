Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Starting GreenWindow Irrigation Scheduler" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm"

Write-Host "Starting Backend API Server (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:Path = '$($env:Path.Replace("'", "''"))'; pnpm run dev:api"

Write-Host "Starting Frontend Web App (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:Path = '$($env:Path.Replace("'", "''"))'; pnpm run dev:web"

Start-Sleep -Seconds 3
Write-Host "Opening http://localhost:3000 in your browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"
