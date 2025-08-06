# Event Registration App Docker Deployment Script for Windows
# Usage: .\docker-run.ps1 [dev|prod|stop|clean]

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

# Function to write colored output
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

# Function to check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Function to check if docker-compose is available
function Test-DockerCompose {
    try {
        docker-compose --version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Function to check environment file
function Test-EnvFile {
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Creating from example..."
        if (Test-Path "env.example") {
            Copy-Item "env.example" ".env"
            Write-Success "Created .env file from env.example"
            Write-Warning "Please update .env file with your actual configuration before running in production."
        }
        else {
            Write-Error "No .env file or env.example found. Please create .env file with required environment variables."
            exit 1
        }
    }
}

# Function to start development environment
function Start-Dev {
    Write-Status "Starting development environment..."
    Test-EnvFile
    
    # Create logs directory if it doesn't exist
    if (-not (Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" | Out-Null
    }
    
    # Start development container
    docker-compose --profile dev up -d event-app-dev
    
    Write-Success "Development environment started!"
    Write-Status "Application is available at: http://localhost:8080"
    Write-Status "To view logs: docker-compose --profile dev logs -f event-app-dev"
}

# Function to start production environment
function Start-Prod {
    Write-Status "Starting production environment..."
    Test-EnvFile
    
    # Create logs directory if it doesn't exist
    if (-not (Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" | Out-Null
    }
    
    # Build and start production container
    docker-compose up -d event-app
    
    Write-Success "Production environment started!"
    Write-Status "Application is available at: http://localhost:3000"
    Write-Status "To view logs: docker-compose logs -f event-app"
}

# Function to start production with nginx proxy
function Start-ProdWithProxy {
    Write-Status "Starting production environment with nginx proxy..."
    Test-EnvFile
    
    # Create logs directory if it doesn't exist
    if (-not (Test-Path "logs\nginx")) {
        New-Item -ItemType Directory -Path "logs\nginx" -Force | Out-Null
    }
    
    # Build and start production containers with proxy
    docker-compose --profile production up -d
    
    Write-Success "Production environment with nginx proxy started!"
    Write-Status "Application is available at: http://localhost:80 (redirects to https://localhost:443)"
    Write-Status "To view logs: docker-compose --profile production logs -f"
}

# Function to stop containers
function Stop-Containers {
    Write-Status "Stopping containers..."
    docker-compose down
    Write-Success "Containers stopped!"
}

# Function to clean up
function Clear-DockerResources {
    Write-Status "Cleaning up Docker resources..."
    
    # Stop and remove containers
    docker-compose down --volumes --remove-orphans
    
    # Remove images (with error handling)
    try {
        $images = docker images -q event-brite-maker_event-app 2>$null
        if ($images) {
            docker rmi $images
        }
    }
    catch {
        # Ignore errors if no images found
    }
    
    try {
        $devImages = docker images -q event-brite-maker_event-app-dev 2>$null
        if ($devImages) {
            docker rmi $devImages
        }
    }
    catch {
        # Ignore errors if no images found
    }
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    Write-Success "Cleanup completed!"
}

# Function to show status
function Show-Status {
    Write-Status "Container status:"
    docker-compose ps
    
    Write-Host ""
    Write-Status "Resource usage:"
    try {
        docker stats --no-stream
    }
    catch {
        Write-Warning "Could not display resource usage"
    }
}

# Function to show logs
function Show-Logs {
    param([string]$Service = "event-app")
    Write-Status "Showing logs for $Service:"
    docker-compose logs -f $Service
}

# Function to show help
function Show-Help {
    Write-Host "Event Registration App Docker Deployment Script for Windows"
    Write-Host ""
    Write-Host "Usage: .\docker-run.ps1 [COMMAND]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  dev                    Start development environment"
    Write-Host "  prod                   Start production environment"
    Write-Host "  prod-proxy             Start production environment with nginx proxy"
    Write-Host "  stop                   Stop all containers"
    Write-Host "  clean                  Stop containers and clean up Docker resources"
    Write-Host "  status                 Show container status and resource usage"
    Write-Host "  logs [SERVICE]         Show logs for a specific service (default: event-app)"
    Write-Host "  help                   Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\docker-run.ps1 dev                 # Start development environment"
    Write-Host "  .\docker-run.ps1 prod                # Start production environment"
    Write-Host "  .\docker-run.ps1 logs event-app-dev  # Show development container logs"
    Write-Host "  .\docker-run.ps1 clean               # Clean up all Docker resources"
}

# Main script logic
function Main {
    # Check prerequisites
    if (-not (Test-Docker)) {
        Write-Error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    }
    
    if (-not (Test-DockerCompose)) {
        Write-Error "docker-compose is not installed. Please install it and try again."
        exit 1
    }
    
    switch ($Command.ToLower()) {
        "dev" {
            Start-Dev
        }
        "prod" {
            Start-Prod
        }
        "prod-proxy" {
            Start-ProdWithProxy
        }
        "stop" {
            Stop-Containers
        }
        "clean" {
            Clear-DockerResources
        }
        "status" {
            Show-Status
        }
        "logs" {
            Show-Logs $args[0]
        }
        "help" {
            Show-Help
        }
        default {
            Write-Error "Unknown command: ${Command}"
            Write-Host ""
            Show-Help
            exit 1
        }
    }
}

# Run main function
Main 