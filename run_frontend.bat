@echo off
title DVEM - Vite Frontend Dev Server
echo ========================================================
echo Starting Disposable Virtual Environment Manager Frontend
echo Running on http://localhost:5173
echo ========================================================
cd /d "%~dp0frontend"
npm.cmd run dev
pause
