# Docker Deployment Guide - Event Registration App

## Overview

This guide provides comprehensive instructions for deploying the Event Registration App using Docker. The application is containerized using a multi-stage build with Nginx for optimal performance and security.

## Prerequisites

- Docker installed and running
- Docker Compose (optional, for multi-container setup)
- Git (for cloning the repository)
- Environment variables configured

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd event-brite-maker

# Copy environment template
cp env.docker.template .env

# Edit environment variables
nano .env
```

### 2. Build and Run

```bash
# Make scripts executable
chmod +x scripts/build.sh scripts/deploy.sh

# Build the Docker image
./scripts/build.sh

# Deploy in development mode
./scripts/deploy.sh development
```

### 3. Access Application

- **Development**: http://localhost:3000
- **Staging**: http://localhost:3001
- **Production**: http://localhost:80

## Detailed Instructions

### Environment Configuration

#### Important: Environment Variables Separation

**Frontend Variables (Required for Docker):**
- These are needed in your `.env` file for the Docker container
- They are used by the React application to connect to Supabase

**Backend Variables (Already in Supabase Secrets):**
- These are already stored in Supabase Edge Function Secrets
- You DON'T need to add them to your `.env` file
- They are used by Edge Functions (WhatsApp, Email services)

#### 1. Copy Environment Template:
```bash
cp env.docker.template .env
```

#### 2. Configure Required Variables (Frontend Only):
```bash
# Supabase Configuration (WAJIB untuk frontend)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

#### 3. Backend Variables (Already Configured):
```bash
# WhatsApp Business API (stored in Supabase Secrets)
# WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
# WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id_here

# Email Service (stored in Supabase Secrets)
# RESEND_API_KEY=your_resend_api_key_here
```

**Note:** The backend variables above are commented out because they're already stored in Supabase Edge Function Secrets and don't need to be in your Docker environment.

### Build Options

#### Option 1: Using Build Script (Recommended)
```bash
# Build with default tag (latest)
./scripts/build.sh

# Build with custom tag
./scripts/build.sh v1.0.0
```

#### Option 2: Direct Docker Build
```bash
# Build image
docker build -t event-registration-app:latest .

# Build with custom tag
docker build -t event-registration-app:v1.0.0 .
```

### Deployment Options

#### Option 1: Using Deploy Script (Recommended)
```bash
# Deploy in development mode
./scripts/deploy.sh development

# Deploy in staging mode
./scripts/deploy.sh staging

# Deploy in production mode
./scripts/deploy.sh production

# Deploy with custom tag
./scripts/deploy.sh production v1.0.0
```

#### Option 2: Using Docker Compose
```bash
# Development mode
docker-compose up -d

# Production mode with reverse proxy
docker-compose --profile production up -d
```

#### Option 3: Direct Docker Run
```bash
# Development
docker run -d \
  --name event-registration-app \
  --env-file .env \
  -p 3000:80 \
  --restart unless-stopped \
  event-registration-app:latest

# Production
docker run -d \
  --name event-registration-app \
  --env-file .env \
  -p 80:80 \
  -p 443:443 \
  --restart unless-stopped \
  event-registration-app:latest
```

## Environment-Specific Configurations

### Development Environment
- **Port**: 3000
- **Features**: Hot reload, debugging, development tools
- **Use Case**: Local development and testing

### Staging Environment
- **Port**: 3001
- **Features**: Production-like setup, testing
- **Use Case**: Pre-production testing

### Production Environment
- **Port**: 80/443
- **Features**: Optimized performance, security headers, health checks
- **Use Case**: Live production deployment

## Docker Compose Configurations

### Development Setup
```yaml
version: '3.8'
services:
  event-registration-app:
    build: .
    ports:
      - "3000:80"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
    volumes:
      - ./src:/app/src  # For development hot reload
```

### Production Setup
```yaml
version: '3.8'
services:
  event-registration-app:
    build: .
    ports:
      - "80:80"
      - "443:443"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check container health
docker ps --filter "name=event-registration-app"

# View health check logs
docker inspect event-registration-app | grep -A 10 "Health"
```

### Logs
```bash
# View application logs
docker logs event-registration-app

# Follow logs in real-time
docker logs -f event-registration-app

# View last 100 lines
docker logs --tail 100 event-registration-app
```

### Container Management
```bash
# Stop container
docker stop event-registration-app

# Start container
docker start event-registration-app

# Restart container
docker restart event-registration-app

# Remove container
docker rm event-registration-app

# Remove image
docker rmi event-registration-app:latest
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
lsof -i :3000

# Kill process using the port
sudo kill -9 <PID>
```

#### 2. Environment Variables Not Loading
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables in container
docker exec event-registration-app env | grep VITE
```

#### 3. Build Failures
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t event-registration-app:latest .
```

#### 4. Container Won't Start
```bash
# Check container logs
docker logs event-registration-app

# Check container status
docker ps -a --filter "name=event-registration-app"
```

#### 5. WhatsApp/Email Not Working
```bash
# Check if Edge Functions are deployed
supabase functions list

# Check Edge Function logs
supabase functions logs send-whatsapp-ticket
supabase functions logs send-ticket-email

# Verify secrets are set
supabase secrets list
```

### Performance Optimization

#### 1. Multi-Stage Build
The Dockerfile uses multi-stage builds to reduce image size:
- Builder stage: Compiles the application
- Production stage: Contains only runtime dependencies

#### 2. Nginx Optimization
- Gzip compression enabled
- Static file caching
- Security headers
- Rate limiting

#### 3. Resource Limits
```bash
# Run with resource limits
docker run -d \
  --name event-registration-app \
  --memory=512m \
  --cpus=1.0 \
  --env-file .env \
  -p 3000:80 \
  event-registration-app:latest
```

## Security Considerations

### 1. Non-Root User
The container runs as a non-root user for security.

### 2. Security Headers
Nginx configuration includes security headers:
- X-Frame-Options
- X-XSS-Protection
- X-Content-Type-Options
- Content-Security-Policy

### 3. Rate Limiting
API endpoints are protected with rate limiting.

### 4. File Access Restrictions
Sensitive files are denied access.

### 5. Environment Variables Security
- Only frontend variables are exposed to Docker container
- Backend secrets remain secure in Supabase Edge Function Secrets
- No sensitive credentials in Docker images

## Scaling

### Horizontal Scaling
```bash
# Run multiple containers
docker run -d --name event-registration-app-1 -p 3001:80 event-registration-app:latest
docker run -d --name event-registration-app-2 -p 3002:80 event-registration-app:latest
docker run -d --name event-registration-app-3 -p 3003:80 event-registration-app:latest
```

### Load Balancing
Use the nginx-proxy configuration for load balancing:
```bash
docker-compose --profile production up -d
```

## Backup and Recovery

### Backup Container
```bash
# Create backup
docker commit event-registration-app event-registration-app:backup-$(date +%Y%m%d)

# Export container
docker export event-registration-app > backup.tar
```

### Restore Container
```bash
# Import container
docker import backup.tar event-registration-app:restored

# Run restored container
docker run -d --name event-registration-app-restored -p 3000:80 event-registration-app:restored
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Docker image
        run: ./scripts/build.sh ${{ github.sha }}
      - name: Deploy to server
        run: ./scripts/deploy.sh production ${{ github.sha }}
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review container logs
3. Verify environment configuration
4. Check Docker and system resources
5. Verify Supabase Edge Function Secrets are properly configured

## Changelog

### v1.0.0
- Initial Docker implementation
- Multi-stage build optimization
- Nginx configuration
- Health checks
- Security headers
- Rate limiting
- Comprehensive documentation
- Environment variables separation (Frontend vs Backend) 