@echo off
cd /d "%~dp0"

if not exist "node_modules\vite\bin\vite.js" (
  echo Installing level generator dependencies...
  call pnpm install --frozen-lockfile
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

start "" "http://127.0.0.1:5173"
call node_modules\.bin\vite.cmd --host 127.0.0.1 --port 5173
