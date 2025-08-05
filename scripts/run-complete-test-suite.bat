@echo off
echo ========================================
echo Complete Batch Approve Test Suite
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected
echo.

echo 📋 TEST DATA PREPARATION
echo ========================================
echo.
echo Choose how to create test data:
echo 1. Manual instructions (recommended)
echo 2. SQL file for Supabase Dashboard
echo 3. Skip data preparation
echo.
set /p dataChoice="Enter your choice (1-3): "

if "%dataChoice%"=="1" (
    echo.
    echo 📋 Generating manual test data instructions...
    node scripts/simple-test-data.cjs
    echo.
    echo ✅ Manual instructions generated
    echo 📄 Check test-data-logs/manual-test-data-instructions.json
) else if "%dataChoice%"=="2" (
    echo.
    echo 📄 SQL file available: test-data.sql
    echo 📋 Instructions:
    echo 1. Open Supabase Dashboard
    echo 2. Go to SQL Editor
    echo 3. Copy and paste contents of test-data.sql
    echo 4. Run the query
    echo.
    echo ✅ SQL file ready for use
) else (
    echo.
    echo ⚠️ Skipping data preparation
    echo Make sure you have test data ready for testing
)

echo.
echo ========================================
echo TESTING OPTIONS
echo ========================================
echo.

echo Choose testing method:
echo 1. Quick overview and checklist
echo 2. Interactive manual test
echo 3. Automated test (requires Puppeteer)
echo 4. Run all tests
echo 5. Exit
echo.

set /p testChoice="Enter your choice (1-5): "

if "%testChoice%"=="1" (
    echo.
    echo 📋 Running quick overview...
    node scripts/test-summary.js
    node scripts/quick-test.js
) else if "%testChoice%"=="2" (
    echo.
    echo 🔍 Running interactive manual test...
    REM Check if development server is running
    curl -s http://localhost:8080 >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠️ Development server not running on localhost:8080
        set /p startServer="Start development server? (y/n): "
        if /i "%startServer%"=="y" (
            echo Starting development server...
            start "Dev Server" cmd /k "npm run dev"
            timeout /t 5 /nobreak >nul
        )
    )
    node scripts/manual-batch-approve-test.cjs
) else if "%testChoice%"=="3" (
    echo.
    echo 🤖 Running automated test...
    REM Check if Puppeteer is installed
    npm list puppeteer >nul 2>&1
    if %errorlevel% neq 0 (
        echo Installing Puppeteer...
        npm install puppeteer
    )
    REM Check if development server is running
    curl -s http://localhost:8080 >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠️ Development server not running on localhost:8080
        set /p startServer="Start development server? (y/n): "
        if /i "%startServer%"=="y" (
            echo Starting development server...
            start "Dev Server" cmd /k "npm run dev"
            timeout /t 5 /nobreak >nul
        )
    )
    node scripts/simple-automated-test.cjs
) else if "%testChoice%"=="4" (
    echo.
    echo 🚀 Running complete test suite...
    echo.
    echo 📋 Step 1: Quick overview
    node scripts/test-summary.js
    node scripts/quick-test.js
    echo.
    echo 🔍 Step 2: Interactive manual test
    REM Check if development server is running
    curl -s http://localhost:8080 >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠️ Development server not running on localhost:8080
        set /p startServer="Start development server? (y/n): "
        if /i "%startServer%"=="y" (
            echo Starting development server...
            start "Dev Server" cmd /k "npm run dev"
            timeout /t 5 /nobreak >nul
        )
    )
    node scripts/manual-batch-approve-test.cjs
    echo.
    echo 🤖 Step 3: Automated test
    REM Check if Puppeteer is installed
    npm list puppeteer >nul 2>&1
    if %errorlevel% neq 0 (
        echo Installing Puppeteer...
        npm install puppeteer
    )
    node scripts/simple-automated-test.cjs
) else (
    echo.
    echo 👋 Exiting test suite
    pause
    exit /b 0
)

echo.
echo ========================================
echo TEST SUITE COMPLETE
echo ========================================
echo.
echo 📄 Test reports available in:
echo - test-logs/ (manual and automated test reports)
echo - test-data-logs/ (data preparation reports)
echo - test-screenshots/ (automated test screenshots)
echo.
echo 🎯 Batch Approve Feature Testing Complete!
echo.
pause 