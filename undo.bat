@echo off
REM ============================================================
REM  UNDO.BAT — Restore dev environment from where you left off
REM  Run this in the project root to start all services
REM ============================================================
cd /d "%~dp0"

echo.
echo === Dream-Deskk Dev Restore ===
echo.

REM 1. Kill any leftover processes on our ports
echo [1/4] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    if not "%%a"=="" taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do (
    if not "%%a"=="" taskkill /f /pid %%a >nul 2>&1
)

REM 2. Install dependencies if node_modules is missing
echo [2/4] Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

REM 3. Start the local Express backend (port 3001)
echo [3/4] Starting local Express server (port 3001)...
start "Express Server" cmd /c "node server.js"

REM 4. Start the Vite dev server (port 8000)
echo [4/4] Starting Vite frontend (port 8000)...
start "Vite Dev Server" cmd /c "npx vite --host"

echo.
echo ============================================================
echo  Both servers are starting:
echo   - Frontend: http://localhost:8000
echo   - Backend:  http://localhost:3001
echo  Close this window when done.
echo ============================================================
echo.
pause
