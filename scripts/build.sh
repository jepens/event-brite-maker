#!/bin/bash

# Event Registration App Docker Build Script
# Usage: ./scripts/build.sh [tag]

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
TAG=${1:-$DEFAULT_TAG}
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

echo -e "${BLUE}🚀 Starting Docker build for Event Registration App${NC}"
echo -e "${YELLOW}Image: ${FULL_IMAGE_NAME}${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    if [ -f env.docker.template ]; then
        cp env.docker.template .env
        echo -e "${YELLOW}⚠️  Please edit .env file with your actual values before building.${NC}"
        echo -e "${YELLOW}⚠️  Press Enter to continue or Ctrl+C to cancel...${NC}"
        read
    else
        echo -e "${RED}❌ env.docker.template not found. Please create .env file manually.${NC}"
        exit 1
    fi
fi

# Build the Docker image
echo -e "${BLUE}🔨 Building Docker image...${NC}"
docker build \
    --tag "${FULL_IMAGE_NAME}" \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --progress=plain \
    .

# Check if build was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully!${NC}"
    echo -e "${GREEN}📦 Image: ${FULL_IMAGE_NAME}${NC}"
    
    # Show image info
    echo -e "${BLUE}📊 Image information:${NC}"
    docker images "${FULL_IMAGE_NAME}"
    
    # Show image size
    IMAGE_SIZE=$(docker images "${FULL_IMAGE_NAME}" --format "table {{.Size}}" | tail -n 1)
    echo -e "${GREEN}📏 Image size: ${IMAGE_SIZE}${NC}"
    
    echo -e "${GREEN}🎉 Build completed successfully!${NC}"
    echo -e "${BLUE}💡 Next steps:${NC}"
    echo -e "   • Run: docker run -p 3000:80 ${FULL_IMAGE_NAME}"
    echo -e "   • Or use: docker-compose up"
    echo -e "   • Or use: docker-compose --profile production up"
else
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi 