# Docker Deployment Guide

This guide provides comprehensive instructions for deploying the Event Registration App using Docker.

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running
- Docker Compose installed
- Git (to clone the repository)

### Basic Commands

#### Using the provided scripts:

**Linux/macOS:**
```bash
# Make script executable
chmod +x docker-run.sh

# Start development environment
./docker-run.sh dev

# Start production environment
./docker-run.sh prod

# Start production with nginx proxy
./docker-run.sh prod-proxy

# Stop containers
./docker-run.sh stop

# Clean up Docker resources
./docker-run.sh clean

# Show status
./docker-run.sh status

# View logs
./docker-run.sh logs event-app
```

**Windows (PowerShell):**
```powershell
# Start development environment
.\docker-run.ps1 dev

# Start production environment
.\docker-run.ps1 prod

# Start production with nginx proxy
.\docker-run.ps1 prod-proxy

# Stop containers
.\docker-run.ps1 stop

# Clean up Docker resources
.\docker-run.ps1 clean

# Show status
.\docker-run.ps1 status

# View logs
.\docker-run.ps1 logs event-app
```

#### Using Docker Compose directly:

```bash
# Development
docker-compose --profile dev up -d event-app-dev

# Production
docker-compose up -d event-app

# Production with nginx proxy
docker-compose --profile production up -d

# Stop all containers
docker-compose down

# View logs
docker-compose logs -f event-app
```

## 📁 File Structure

```
├── Dockerfile              # Production Docker image
├── Dockerfile.dev          # Development Docker image
├── docker-compose.yml      # Multi-service orchestration
├── nginx.conf             # Nginx configuration for production
├── nginx-proxy.conf       # Nginx reverse proxy configuration
├── .dockerignore          # Files to exclude from Docker build
├── docker-run.sh          # Linux/macOS deployment script
├── docker-run.ps1         # Windows PowerShell deployment script
└── logs/                  # Application logs directory
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# WhatsApp Configuration (optional)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_TEMPLATE_NAME=ticket_beautiful
WHATSAPP_LANGUAGE_CODE=id

# Email Service (optional)
RESEND_API_KEY=your_resend_api_key

# Rate Limiting (optional)
WHATSAPP_RATE_LIMIT_PER_MINUTE=250
WHATSAPP_RATE_LIMIT_PER_HOUR=1000

# Application Environment
VITE_APP_ENV=production
```

### Port Configuration

- **Development**: `http://localhost:8080`
- **Production**: `http://localhost:3000`
- **Production with Proxy**: `http://localhost:80` (redirects to `https://localhost:443`)

## 🏗️ Architecture

### Development Environment

- **Base Image**: `node:20-alpine`
- **Port**: 8080
- **Features**:
  - Hot reload enabled
  - Volume mounting for live code changes
  - Development dependencies included
  - Non-root user for security

### Production Environment

- **Multi-stage Build**:
  1. **Dependencies Stage**: Install production dependencies
  2. **Builder Stage**: Build the application
  3. **Runner Stage**: Nginx serving static files
- **Base Image**: `nginx:alpine`
- **Port**: 80 (internal), 3000 (external)
- **Features**:
  - Optimized for production
  - Security headers
  - Gzip compression
  - Static file caching
  - Health checks

### Production with Nginx Proxy

- **Additional Service**: Nginx reverse proxy
- **Features**:
  - SSL/TLS termination
  - Rate limiting
  - Load balancing ready
  - Enhanced security headers
  - HTTP to HTTPS redirect

## 🔒 Security Features

### Container Security

- **Non-root User**: All containers run as non-root user (UID: 1001)
- **Read-only Filesystem**: Production containers use read-only filesystem
- **No New Privileges**: Security option prevents privilege escalation
- **Signal Handling**: Proper signal handling with dumb-init
- **Resource Limits**: CPU and memory limits configured

### Network Security

- **Security Headers**: Comprehensive security headers
- **Rate Limiting**: API rate limiting to prevent abuse
- **SSL/TLS**: HTTPS support with modern cipher suites
- **Content Security Policy**: CSP headers for XSS protection

### File Security

- **Sensitive File Blocking**: Access to sensitive files denied
- **Environment Variables**: Secure handling of secrets
- **Volume Isolation**: Proper volume permissions

## 📊 Monitoring & Logging

### Health Checks

```bash
# Check container health
docker-compose ps

# View health check logs
docker-compose logs event-app | grep health
```

### Logging

```bash
# View application logs
docker-compose logs -f event-app

# View nginx logs
docker-compose logs -f nginx-proxy

# View all logs
docker-compose logs -f
```

### Resource Monitoring

```bash
# View resource usage
docker stats

# View container status
docker-compose ps
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using the port
lsof -i :3000  # Linux/macOS
netstat -ano | findstr :3000  # Windows

# Stop conflicting services
sudo systemctl stop nginx  # If nginx is running
```

#### 2. Permission Issues

```bash
# Fix file permissions
chmod +x docker-run.sh

# Fix Docker socket permissions (Linux)
sudo usermod -aG docker $USER
```

#### 3. Build Failures

```bash
# Clean build
docker-compose down
docker system prune -f
docker-compose build --no-cache
```

#### 4. Environment Variables Not Loading

```bash
# Check if .env file exists
ls -la .env

# Verify environment variables
docker-compose config
```

### Debug Commands

```bash
# Enter running container
docker-compose exec event-app sh

# View container details
docker inspect event-registration-app

# Check container logs
docker logs event-registration-app

# Monitor resource usage
docker stats event-registration-app
```

## 🔄 Deployment Workflows

### Development Workflow

1. **Start Development Environment**:
   ```bash
   ./docker-run.sh dev
   ```

2. **Make Code Changes**: Files are automatically reloaded

3. **View Logs**:
   ```bash
   ./docker-run.sh logs event-app-dev
   ```

4. **Stop Development**:
   ```bash
   ./docker-run.sh stop
   ```

### Production Deployment

1. **Prepare Environment**:
   ```bash
   # Copy environment template
   cp env.example .env
   
   # Edit .env with production values
   nano .env
   ```

2. **Deploy Production**:
   ```bash
   ./docker-run.sh prod
   ```

3. **Verify Deployment**:
   ```bash
   ./docker-run.sh status
   curl http://localhost:3000/health
   ```

4. **Monitor Application**:
   ```bash
   ./docker-run.sh logs event-app
   ```

### Production with SSL

1. **Prepare SSL Certificates**:
   ```bash
   # Create SSL directory
   mkdir -p logs/nginx
   
   # Add your certificates to nginx-proxy.conf
   # Uncomment and configure SSL lines
   ```

2. **Deploy with Proxy**:
   ```bash
   ./docker-run.sh prod-proxy
   ```

## 📈 Performance Optimization

### Build Optimization

- **Multi-stage Build**: Reduces final image size
- **Layer Caching**: Optimized Dockerfile for better caching
- **Dockerignore**: Excludes unnecessary files from build context

### Runtime Optimization

- **Resource Limits**: Prevents resource exhaustion
- **Gzip Compression**: Reduces bandwidth usage
- **Static File Caching**: Improves load times
- **Keep-alive Connections**: Reduces connection overhead

### Monitoring

- **Health Checks**: Automatic container health monitoring
- **Resource Monitoring**: CPU and memory usage tracking
- **Log Aggregation**: Centralized logging

## 🔧 Customization

### Custom Nginx Configuration

Edit `nginx.conf` or `nginx-proxy.conf` to customize:

- SSL/TLS settings
- Security headers
- Rate limiting rules
- Caching policies
- Proxy settings

### Custom Docker Configuration

Modify `docker-compose.yml` to:

- Add additional services
- Change resource limits
- Modify volume mounts
- Add environment variables
- Configure networks

### Custom Build Process

Modify `Dockerfile` to:

- Add build dependencies
- Customize build steps
- Optimize for specific environments
- Add custom scripts

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## 🤝 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review the logs: `./docker-run.sh logs`
3. Verify your environment configuration
4. Check Docker and Docker Compose versions
5. Ensure all prerequisites are met 