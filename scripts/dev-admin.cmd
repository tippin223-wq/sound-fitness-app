@echo off
setlocal

cd /d "%~dp0\.."

set "PORT=%~1"
if "%PORT%"=="" set "PORT=3000"

if not exist "node_modules\next\dist\bin\next" (
  echo Next.js is not installed. Run npm install first.
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on PATH.
  exit /b 1
)

node "node_modules\next\dist\bin\next" dev --port "%PORT%"
