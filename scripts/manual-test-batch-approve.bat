@echo off
echo ========================================
echo Manual Batch Approve Feature Test
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if development server is running
echo Checking if development server is running...
curl -s http://localhost:8080 >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Development server is not running on http://localhost:8080
    echo Please start the development server first with: npm run dev
    echo.
    set /p startServer="Do you want to start the development server now? (y/n): "
    if /i "%startServer%"=="y" (
        echo Starting development server...
        start "Dev Server" cmd /k "npm run dev"
        echo Waiting for server to start...
        timeout /t 10 /nobreak >nul
    ) else (
        echo Please start the development server manually and run this script again.
        pause
        exit /b 1
    )
)

REM Create test directories
if not exist "test-logs" mkdir test-logs

echo.
echo ========================================
echo Starting Manual Batch Approve Tests...
echo ========================================
echo.
echo This test will guide you through manual testing steps.
echo Please follow the instructions and answer the questions.
echo.

REM Run the manual test script
node scripts/manual-batch-approve-test.cjs

echo.
echo ========================================
echo Manual Test Complete
echo ========================================
echo.
echo Check the following files for results:
echo - test-logs/manual-batch-approve-test.log (detailed logs)
echo - test-logs/manual-batch-approve-test-report.json (test report)
echo.

pause 