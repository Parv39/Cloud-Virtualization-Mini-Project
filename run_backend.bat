@echo off
title DVEM - FastAPI Backend Server
echo ========================================================
echo Starting Disposable Virtual Environment Manager Backend
echo Running on http://127.0.0.1:8001
echo ========================================================
cd /d "%~dp0"
call backend\.venv\Scripts\activate.bat
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload
pause
