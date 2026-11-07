@echo off
title DVEM - Disposable Virtual Environment Manager Launcher
echo ================================================================
echo   DISPOSABLE VIRTUAL ENVIRONMENT MANAGER (DVEM)
echo   MCA Academic Project: OS-Level Virtualization with Docker
echo ================================================================
echo.
echo [1/2] Verifying Python Virtual Environment...
if not exist "backend\.venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found in backend\.venv
    pause
    exit /b 1
)

echo [2/2] Launching DVEM Unified Server on http://127.0.0.1:8001 ...
start http://127.0.0.1:8001
call backend\.venv\Scripts\activate.bat
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001
pause
