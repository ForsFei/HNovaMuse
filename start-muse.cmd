@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title HNova Muse

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 20.9 or newer, then run this file again.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Check your Node.js installation.
  pause
  exit /b 1
)

set "MUSE_PORT="
for /f "usebackq delims=" %%P in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-port.ps1"`) do set "MUSE_PORT=%%P"
if not defined MUSE_PORT (
  echo No available port was found between 43120 and 43129.
  pause
  exit /b 1
)
if not "%MUSE_PORT%"=="43120" echo Port 43120 is occupied. Using %MUSE_PORT% instead.
title HNova Muse - %MUSE_PORT%

if not exist "node_modules\next\package.json" (
  echo Installing project dependencies...
  call npm ci
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting HNova Muse at http://127.0.0.1:%MUSE_PORT%
start "HNova Muse browser helper" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0scripts\open-browser.ps1" -Port %MUSE_PORT%
call ".\node_modules\.bin\next.cmd" dev --hostname 127.0.0.1 --port %MUSE_PORT%

echo.
echo HNova Muse has stopped.
pause
