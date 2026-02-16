@echo off
echo Starting TGT3 Warehouse Multi-User Server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if MySQL is running
echo Checking MySQL connection...
mysqladmin ping -h localhost -u root -p 2>nul
if errorlevel 1 (
    echo WARNING: MySQL may not be running or accessible
    echo Please ensure MySQL service is started
    echo.
    echo Continuing anyway...
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

REM Initialize database
echo Initializing database...
node scripts/init-database.js
if errorlevel 1 (
    echo ERROR: Database initialization failed
    echo Please check your MySQL configuration in .env file
    pause
    exit /b 1
)

REM Start server
echo.
echo Starting server...
echo Server will be available at: http://localhost:3000
echo Default login: admin / admin123
echo.
echo Press Ctrl+C to stop the server
echo.

npm start
