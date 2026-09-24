@echo off
setlocal

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment was not found: .venv
    echo Create it and install dependencies before starting the server.
    pause
    exit /b 1
)

echo Starting Finance Tracker at http://127.0.0.1:8000
echo Press CTRL+C to stop the server.
echo.

for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Stopping previous server process %%P...
    taskkill /PID %%P /T /F >nul 2>&1
)

".venv\Scripts\python.exe" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

echo.
echo Server stopped.
pause