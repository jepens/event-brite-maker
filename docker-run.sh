#!/bin/bash

# Docker Run Script for Event Registration App
# Usage: ./docker-run.sh [dev|prod]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from example..."
        if [ -f docker.env.example ]; then
            cp docker.env.example .env
            print_warning "Please update .env file with your actual configuration values."
        else
            print_error "docker.env.example not found. Please create .env file manually."
            exit 1
        fi
    fi
}

# Build and run production
run_production() {
    print_status "Building and running production version..."
    
    # Build the image
    print_status "Building Docker image..."
    docker-compose build event-app
    
    # Run the container
    print_status "Starting production container..."
    docker-compose up -d event-app
    
    print_success "Production app is running at http://localhost:3000"
    print_status "To view logs: docker-compose logs -f event-app"
    print_status "To stop: docker-compose down"
}

# Build and run development
run_development() {
    print_status "Building and running development version..."
    
    # Build the development image
    print_status "Building development Docker image..."
    docker-compose --profile dev build event-app-dev
    
    # Run the development container
    print_status "Starting development container..."
    docker-compose --profile dev up -d event-app-dev
    
    print_success "Development app is running at http://localhost:8080"
    print_status "To view logs: docker-compose --profile dev logs -f event-app-dev"
    print_status "To stop: docker-compose --profile dev down"
}

# Main script
main() {
    print_status "Event Registration App Docker Runner"
    echo "=========================================="
    
    # Check prerequisites
    check_docker
    check_env
    
    # Parse command line arguments
    case "${1:-prod}" in
        "dev"|"development")
            run_development
            ;;
        "prod"|"production")
            run_production
            ;;
        *)
            print_error "Invalid option. Use 'dev' or 'prod'"
            echo "Usage: $0 [dev|prod]"
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 