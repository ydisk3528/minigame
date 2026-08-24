@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
if errorlevel 1 pause & exit /b 1
start "Ring AviatorX Level Editor" http://localhost:5173
call npm run dev
