@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Install Node.js 20 or newer from https://nodejs.org/
  pause
  exit /b 1
)

if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  echo A default .env file was created. Please edit it before use.
  pause
  exit /b 1
)

echo Starting RickyYY Todo...
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:3000'"
node server.mjs

echo.
echo RickyYY Todo has stopped. You can close this window.
pause
