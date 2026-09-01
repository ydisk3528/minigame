@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
    echo Node.js and npm are required. Please install Node.js first.
    pause
    exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
    echo Installing level editor dependencies...
    call npm install
    if errorlevel 1 (
        echo Dependency installation failed.
        pause
        exit /b 1
    )
)

if /i "%~1"=="--no-open" (
    call npm run dev
) else (
    call npm run dev -- --open
)
