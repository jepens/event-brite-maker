#!/bin/bash

# Event Registration App Docker Deployment Script
# Usage: ./docker-run.sh [dev|prod|stop|clean]

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

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1; then
        print_error "docker-compose is not installed. Please install it and try again."
        exit 1
    fi
}

# Function to check environment file
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from example..."
        if [ -f env.example ]; then
            cp env.example .env
            print_success "Created .env file from env.example"
            print_warning "Please update .env file with your actual configuration before running in production."
        else
            print_error "No .env file or env.example found. Please create .env file with required environment variables."
            exit 1
        fi
    fi
}

# Function to start development environment
start_dev() {
    print_status "Starting development environment..."
    check_env_file
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Start development container
    docker-compose --profile dev up -d event-app-dev
    
    print_success "Development environment started!"
    print_status "Application is available at: http://localhost:8080"
    print_status "To view logs: docker-compose --profile dev logs -f event-app-dev"
}

# Function to start production environment
start_prod() {
    print_status "Starting production environment..."
    check_env_file
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Build and start production container
    docker-compose up -d event-app
    
    print_success "Production environment started!"
    print_status "Application is available at: http://localhost:3000"
    print_status "To view logs: docker-compose logs -f event-app"
}

# Function to start production with nginx proxy
start_prod_with_proxy() {
    print_status "Starting production environment with nginx proxy..."
    check_env_file
    
    # Create logs directory if it doesn't exist
    mkdir -p logs/nginx
    
    # Build and start production containers with proxy
    docker-compose --profile production up -d
    
    print_success "Production environment with nginx proxy started!"
    print_status "Application is available at: http://localhost:80 (redirects to https://localhost:443)"
    print_status "To view logs: docker-compose --profile production logs -f"
}

# Function to stop containers
stop_containers() {
    print_status "Stopping containers..."
    docker-compose down
    print_success "Containers stopped!"
}

# Function to clean up
clean_up() {
    print_status "Cleaning up Docker resources..."
    
    # Stop and remove containers
    docker-compose down --volumes --remove-orphans
    
    # Remove images
    docker rmi $(docker images -q event-brite-maker_event-app) 2>/dev/null || true
    docker rmi $(docker images -q event-brite-maker_event-app-dev) 2>/dev/null || true
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    print_success "Cleanup completed!"
}

# Function to show status
show_status() {
    print_status "Container status:"
    docker-compose ps
    
    echo ""
    print_status "Resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" || true
}

# Function to show logs
show_logs() {
    local service=${1:-event-app}
    print_status "Showing logs for $service:"
    docker-compose logs -f $service
}

# Function to show help
show_help() {
    echo "Event Registration App Docker Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev                    Start development environment"
    echo "  prod                   Start production environment"
    echo "  prod-proxy             Start production environment with nginx proxy"
    echo "  stop                   Stop all containers"
    echo "  clean                  Stop containers and clean up Docker resources"
    echo "  status                 Show container status and resource usage"
    echo "  logs [SERVICE]         Show logs for a specific service (default: event-app)"
    echo "  help                   Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev                 # Start development environment"
    echo "  $0 prod                # Start production environment"
    echo "  $0 logs event-app-dev  # Show development container logs"
    echo "  $0 clean               # Clean up all Docker resources"
}

# Main script logic
main() {
    # Check prerequisites
    check_docker
    check_docker_compose
    
    case "${1:-help}" in
        dev)
            start_dev
            ;;
        prod)
            start_prod
            ;;
        prod-proxy)
            start_prod_with_proxy
            ;;
        stop)
            stop_containers
            ;;
        clean)
            clean_up
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs $2
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 