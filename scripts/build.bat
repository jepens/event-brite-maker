@echo off
REM Event Registration App Docker Build Script for Windows
REM Usage: scripts\build.bat [tag]

setlocal enabledelayedexpansion

REM Configuration
set IMAGE_NAME=event-registration-app
set DEFAULT_TAG=latest
set TAG=%1
if "%TAG%"=="" set TAG=%DEFAULT_TAG%
set FULL_IMAGE_NAME=%IMAGE_NAME%:%TAG%

echo 🚀 Starting Docker build for Event Registration App
echo Image: %FULL_IMAGE_NAME%

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo ⚠️  .env file not found. Creating from template...
    if exist env.docker.template (
        copy env.docker.template .env >nul
        echo ⚠️  Please edit .env file with your actual values before building.
        echo ⚠️  Press Enter to continue or Ctrl+C to cancel...
        pause
    ) else (
        echo ❌ env.docker.template not found. Please create .env file manually.
        exit /b 1
    )
)

REM Build the Docker image
echo 🔨 Building Docker image...
docker build --tag %FULL_IMAGE_NAME% --build-arg BUILDKIT_INLINE_CACHE=1 --progress=plain .

REM Check if build was successful
if errorlevel 1 (
    echo ❌ Docker build failed!
    exit /b 1
) else (
    echo ✅ Docker image built successfully!
    echo 📦 Image: %FULL_IMAGE_NAME%
    
    REM Show image info
    echo 📊 Image information:
    docker images %FULL_IMAGE_NAME%
    
    echo 🎉 Build completed successfully!
    echo 💡 Next steps:
    echo    • Run: docker run -p 3000:80 %FULL_IMAGE_NAME%
    echo    • Or use: docker-compose up
    echo    • Or use: docker-compose --profile production up
)

endlocal 