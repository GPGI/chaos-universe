@echo off
REM Sarakt Land Registry - Start Script (Windows)
REM Starts both backend and frontend, then opens browser

setlocal enabledelayedexpansion

set BACKEND_PORT=5001
set FRONTEND_PORT=8080
set FRONTEND_URL=http://localhost:%FRONTEND_PORT%
set BACKEND_URL=http://localhost:%BACKEND_PORT%

echo.
echo ╔════════════════════════════════════════╗
echo ║  Sarakt Land Registry - Starting      ║
echo ╚════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>&1
if %errorlevel% neq 0 (
    where python3 >nul 2>&1
    if %errorlevel% neq 0 (
        echo Error: Python is not installed
        exit /b 1
    )
    set PYTHON_CMD=python3
) else (
    set PYTHON_CMD=python
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

if not exist "backend\__pycache__" if not exist "backend\.dependencies_installed" (
    echo Installing backend dependencies...
    cd backend
    %PYTHON_CMD% -m pip install -r requirements.txt --quiet
    cd ..
    type nul > backend\.dependencies_installed
)

REM Start backend server
echo Starting backend server on port %BACKEND_PORT%...
cd backend
start /B %PYTHON_CMD% -m uvicorn app:app --host 0.0.0.0 --port %BACKEND_PORT% > ..\backend.log 2>&1
cd ..

REM Wait for backend
echo Waiting for backend to be ready...
timeout /t 3 /nobreak >nul
set BACKEND_READY=0
for /L %%i in (1,1,30) do (
    curl -s %BACKEND_URL%/health >nul 2>&1
    if !errorlevel! equ 0 (
        set BACKEND_READY=1
        goto :backend_ready
    )
    timeout /t 1 /nobreak >nul
)
:backend_ready

if %BACKEND_READY% equ 1 (
    echo ✓ Backend server is ready
) else (
    echo ⚠ Backend may still be starting
)

REM Start frontend server
echo Starting frontend server on port %FRONTEND_PORT%...
start /B npm run dev > frontend.log 2>&1

REM Wait a bit for frontend
timeout /t 5 /nobreak >nul

REM Open browser
echo.
echo Opening browser...
start %FRONTEND_URL%

echo.
echo ╔════════════════════════════════════════╗
echo ║  Application is running!              ║
echo ╚════════════════════════════════════════╝
echo.
echo Frontend: %FRONTEND_URL%
echo Backend API: %BACKEND_URL%
echo API Docs: %BACKEND_URL%/docs
echo.
echo Press Ctrl+C to stop all servers
echo.

REM Keep script running and show logs
powershell -Command "Get-Content backend.log,frontend.log -Wait -Tail 10" 2>nul || (
    REM If PowerShell command fails, just wait
    pause
)

