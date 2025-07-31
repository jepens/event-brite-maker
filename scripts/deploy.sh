#!/bin/bash

# Event Registration App Docker Deployment Script
# Usage: ./scripts/deploy.sh [environment] [tag]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="event-registration-app"
DEFAULT_TAG="latest"
DEFAULT_ENV="development"
TAG=${2:-$DEFAULT_TAG}
ENVIRONMENT=${1:-$DEFAULT_ENV}
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"
CONTAINER_NAME="${IMAGE_NAME}-${ENVIRONMENT}"

echo -e "${BLUE}🚀 Starting Docker deployment for Event Registration App${NC}"
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}Image: ${FULL_IMAGE_NAME}${NC}"
echo -e "${YELLOW}Container: ${CONTAINER_NAME}${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found. Please create it from env.docker.template${NC}"
    exit 1
fi

# Function to check if container exists
container_exists() {
    docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# Function to check if container is running
container_running() {
    docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# Function to stop and remove container
cleanup_container() {
    if container_exists; then
        echo -e "${YELLOW}🛑 Stopping existing container...${NC}"
        docker stop "${CONTAINER_NAME}" || true
        echo -e "${YELLOW}🗑️  Removing existing container...${NC}"
        docker rm "${CONTAINER_NAME}" || true
    fi
}

# Function to rollback
rollback() {
    echo -e "${RED}🔄 Rolling back deployment...${NC}"
    if [ -n "$PREVIOUS_CONTAINER" ]; then
        echo -e "${YELLOW}🔄 Starting previous container...${NC}"
        docker start "${PREVIOUS_CONTAINER}" || true
    fi
    exit 1
}

# Set trap for rollback on error
trap rollback ERR

# Check if image exists
if ! docker images "${FULL_IMAGE_NAME}" --format "{{.Repository}}:{{.Tag}}" | grep -q "${FULL_IMAGE_NAME}"; then
    echo -e "${YELLOW}⚠️  Image ${FULL_IMAGE_NAME} not found. Building...${NC}"
    ./scripts/build.sh "${TAG}"
fi

# Store previous container name for rollback
PREVIOUS_CONTAINER=""
if container_exists; then
    PREVIOUS_CONTAINER="${CONTAINER_NAME}-backup-$(date +%s)"
    echo -e "${YELLOW}📦 Creating backup of existing container...${NC}"
    docker rename "${CONTAINER_NAME}" "${PREVIOUS_CONTAINER}"
fi

# Cleanup old container
cleanup_container

# Deploy based on environment
case $ENVIRONMENT in
    "development")
        echo -e "${BLUE}🔧 Deploying in development mode...${NC}"
        docker run -d \
            --name "${CONTAINER_NAME}" \
            --env-file .env \
            -p 3000:80 \
            --restart unless-stopped \
            "${FULL_IMAGE_NAME}"
        ;;
    "production")
        echo -e "${BLUE}🚀 Deploying in production mode...${NC}"
        docker run -d \
            --name "${CONTAINER_NAME}" \
            --env-file .env \
            -p 80:80 \
            -p 443:443 \
            --restart unless-stopped \
            --health-cmd="curl -f http://localhost/health || exit 1" \
            --health-interval=30s \
            --health-timeout=10s \
            --health-retries=3 \
            "${FULL_IMAGE_NAME}"
        ;;
    "staging")
        echo -e "${BLUE}🧪 Deploying in staging mode...${NC}"
        docker run -d \
            --name "${CONTAINER_NAME}" \
            --env-file .env \
            -p 3001:80 \
            --restart unless-stopped \
            "${FULL_IMAGE_NAME}"
        ;;
    *)
        echo -e "${RED}❌ Unknown environment: ${ENVIRONMENT}${NC}"
        echo -e "${YELLOW}Available environments: development, staging, production${NC}"
        exit 1
        ;;
esac

# Wait for container to start
echo -e "${BLUE}⏳ Waiting for container to start...${NC}"
sleep 5

# Check if container is running
if container_running; then
    echo -e "${GREEN}✅ Container is running successfully!${NC}"
    
    # Show container info
    echo -e "${BLUE}📊 Container information:${NC}"
    docker ps --filter "name=${CONTAINER_NAME}"
    
    # Show logs
    echo -e "${BLUE}📋 Recent logs:${NC}"
    docker logs --tail 10 "${CONTAINER_NAME}"
    
    # Health check
    echo -e "${BLUE}🏥 Performing health check...${NC}"
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check passed!${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed, but container is running${NC}"
    fi
    
    # Remove backup container if deployment successful
    if [ -n "$PREVIOUS_CONTAINER" ]; then
        echo -e "${YELLOW}🗑️  Removing backup container...${NC}"
        docker rm "${PREVIOUS_CONTAINER}" || true
    fi
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}🌐 Application URL: http://localhost:3000${NC}"
    
else
    echo -e "${RED}❌ Container failed to start!${NC}"
    echo -e "${BLUE}📋 Container logs:${NC}"
    docker logs "${CONTAINER_NAME}" || true
    rollback
fi 