@echo off
echo Starting TGT3 Warehouse (SQLite Version - No MySQL Required)...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist node_modules (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start SQLite server
echo.
echo Starting SQLite server...
echo Server will be available at: http://localhost:3000
echo Default login: admin / admin123
echo.
echo Press Ctrl+C to stop the server
echo.

node server-sqlite.js
