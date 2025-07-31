# Docker Run Script for Event Registration App (PowerShell)
# Usage: .\docker-run.ps1 [dev|prod]

param(
    [Parameter(Position=0)]
    [ValidateSet("dev", "prod", "development", "production")]
    [string]$Mode = "prod"
)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Docker is installed
function Test-Docker {
    try {
        $null = docker version
        return $true
    }
    catch {
        Write-Error "Docker is not installed or not running. Please install Docker Desktop first."
        return $false
    }
}

# Check if .env file exists
function Test-EnvFile {
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Creating from example..."
        if (Test-Path "docker.env.example") {
            Copy-Item "docker.env.example" ".env"
            Write-Warning "Please update .env file with your actual configuration values."
        }
        else {
            Write-Error "docker.env.example not found. Please create .env file manually."
            exit 1
        }
    }
}

# Build and run production
function Start-Production {
    Write-Status "Building and running production version..."
    
    # Build the image
    Write-Status "Building Docker image..."
    docker-compose build event-app
    
    # Run the container
    Write-Status "Starting production container..."
    docker-compose up -d event-app
    
    Write-Success "Production app is running at http://localhost:3000"
    Write-Status "To view logs: docker-compose logs -f event-app"
    Write-Status "To stop: docker-compose down"
}

# Build and run development
function Start-Development {
    Write-Status "Building and running development version..."
    
    # Build the development image
    Write-Status "Building development Docker image..."
    docker-compose --profile dev build event-app-dev
    
    # Run the development container
    Write-Status "Starting development container..."
    docker-compose --profile dev up -d event-app-dev
    
    Write-Success "Development app is running at http://localhost:8080"
    Write-Status "To view logs: docker-compose --profile dev logs -f event-app-dev"
    Write-Status "To stop: docker-compose --profile dev down"
}

# Main script
function Main {
    Write-Status "Event Registration App Docker Runner"
    Write-Host "==========================================" -ForegroundColor Cyan
    
    # Check prerequisites
    if (-not (Test-Docker)) {
        exit 1
    }
    
    Test-EnvFile
    
    # Parse command line arguments
    switch ($Mode) {
        { $_ -in @("dev", "development") } {
            Start-Development
        }
        { $_ -in @("prod", "production") } {
            Start-Production
        }
        default {
            Write-Error "Invalid option. Use 'dev' or 'prod'"
            Write-Host "Usage: .\docker-run.ps1 [dev|prod]"
            exit 1
        }
    }
}

# Run main function
Main 