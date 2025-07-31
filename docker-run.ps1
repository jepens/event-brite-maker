# Event Registration App Docker Deployment Script for EasyPanel
# This script helps deploy the application with proper environment variables

param(
    [string]$Action = "deploy",
    [string]$Port = "3000"
)

Write-Host "🚀 Event Registration App Docker Deployment" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your Supabase credentials:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "VITE_SUPABASE_URL=your_supabase_url" -ForegroundColor Cyan
    Write-Host "VITE_SUPABASE_ANON_KEY=your_supabase_anon_key" -ForegroundColor Cyan
    Write-Host "VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Load environment variables from .env file
Write-Host "📋 Loading environment variables from .env file..." -ForegroundColor Blue
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2]
        Set-Variable -Name $name -Value $value -Scope Global
        Write-Host "  ✅ Loaded: $name" -ForegroundColor Green
    }
}

# Validate required environment variables
$requiredVars = @("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY")
$missingVars = @()

foreach ($var in $requiredVars) {
    if (-not (Get-Variable -Name $var -ErrorAction SilentlyContinue) -or 
        [string]::IsNullOrEmpty((Get-Variable -Name $var).Value)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ Error: Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    exit 1
}

Write-Host "✅ All required environment variables are set!" -ForegroundColor Green

switch ($Action.ToLower()) {
    "deploy" {
        Write-Host "🐳 Building and deploying application..." -ForegroundColor Blue
        
        # Stop existing containers
        Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
        docker-compose down 2>$null
        
        # Build with environment variables
        Write-Host "🔨 Building Docker image with environment variables..." -ForegroundColor Yellow
        docker-compose build --no-cache
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Build failed!" -ForegroundColor Red
            exit 1
        }
        
        # Start containers
        Write-Host "🚀 Starting containers..." -ForegroundColor Yellow
        docker-compose up -d
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to start containers!" -ForegroundColor Red
            exit 1
        }
        
        # Wait for container to be ready
        Write-Host "⏳ Waiting for application to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Check container status
        $containerStatus = docker-compose ps --format "table {{.Name}}\t{{.Status}}"
        Write-Host "📊 Container Status:" -ForegroundColor Blue
        Write-Host $containerStatus -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "🎉 Deployment successful!" -ForegroundColor Green
        Write-Host "🌐 Application URL: http://localhost:$Port" -ForegroundColor Cyan
        Write-Host "🔧 Admin Dashboard: http://localhost:$Port/admin" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📝 Useful commands:" -ForegroundColor Yellow
        Write-Host "  docker-compose logs -f    # View logs" -ForegroundColor White
        Write-Host "  docker-compose down       # Stop application" -ForegroundColor White
        Write-Host "  docker-compose restart    # Restart application" -ForegroundColor White
    }
    
    "stop" {
        Write-Host "🛑 Stopping application..." -ForegroundColor Yellow
        docker-compose down
        Write-Host "✅ Application stopped!" -ForegroundColor Green
    }
    
    "restart" {
        Write-Host "🔄 Restarting application..." -ForegroundColor Yellow
        docker-compose restart
        Write-Host "✅ Application restarted!" -ForegroundColor Green
    }
    
    "logs" {
        Write-Host "📋 Showing application logs..." -ForegroundColor Yellow
        docker-compose logs -f
    }
    
    "status" {
        Write-Host "📊 Application status:" -ForegroundColor Yellow
        docker-compose ps
    }
    
    "rebuild" {
        Write-Host "🔨 Rebuilding application..." -ForegroundColor Yellow
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        Write-Host "✅ Application rebuilt and started!" -ForegroundColor Green
    }
    
    default {
        Write-Host "❌ Unknown action: $Action" -ForegroundColor Red
        Write-Host "Available actions: deploy, stop, restart, logs, status, rebuild" -ForegroundColor Yellow
        exit 1
    }
} 