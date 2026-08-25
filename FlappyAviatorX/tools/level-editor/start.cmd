@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
if errorlevel 1 (
  pause
  exit /b 1
)
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
pause
