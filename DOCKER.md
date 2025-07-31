# Docker Setup for Event Registration App

This guide will help you run the Event Registration App using Docker.

## 🐳 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (version 20.10 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0 or higher)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd event-brite-maker
```

### 2. Setup Environment Variables
```bash
# Copy the example environment file
cp docker.env.example .env

# Edit .env file with your actual values
nano .env
```

### 3. Run with Docker

#### Production Mode (Recommended)
```bash
# Using the provided script
chmod +x docker-run.sh
./docker-run.sh prod

# Or using docker-compose directly
docker-compose up -d event-app
```

#### Development Mode (with hot reload)
```bash
# Using the provided script
./docker-run.sh dev

# Or using docker-compose directly
docker-compose --profile dev up -d event-app-dev
```

### 4. Access the Application
- **Production**: http://localhost:3000
- **Development**: http://localhost:8080

## 📁 File Structure

```
event-brite-maker/
├── Dockerfile              # Production Docker image
├── Dockerfile.dev          # Development Docker image
├── docker-compose.yml      # Docker Compose configuration
├── nginx.conf             # Nginx configuration for production
├── .dockerignore          # Files to exclude from Docker build
├── docker.env.example     # Example environment variables
├── docker-run.sh          # Convenience script for running Docker
└── DOCKER.md              # This documentation
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `docker.env.example`:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# WhatsApp Business API (Optional)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id_here
WHATSAPP_TEMPLATE_NAME=ticket_beautiful
WHATSAPP_LANGUAGE_CODE=id

# Email Service (Optional)
RESEND_API_KEY=your_resend_api_key_here

# Rate Limiting (Optional)
WHATSAPP_RATE_LIMIT_PER_MINUTE=250
WHATSAPP_RATE_LIMIT_PER_HOUR=1000
```

### Port Configuration

You can modify the ports in `docker-compose.yml`:

```yaml
services:
  event-app:
    ports:
      - "YOUR_PORT:80"  # Change YOUR_PORT to desired port
```

## 🛠️ Docker Commands

### Build Images
```bash
# Build production image
docker-compose build event-app

# Build development image
docker-compose --profile dev build event-app-dev
```

### Run Containers
```bash
# Start production container
docker-compose up -d event-app

# Start development container
docker-compose --profile dev up -d event-app-dev

# Start with logs
docker-compose up event-app
```

### View Logs
```bash
# Production logs
docker-compose logs -f event-app

# Development logs
docker-compose --profile dev logs -f event-app-dev

# All logs
docker-compose logs -f
```

### Stop Containers
```bash
# Stop production
docker-compose down

# Stop development
docker-compose --profile dev down

# Stop and remove volumes
docker-compose down -v
```

### Clean Up
```bash
# Remove containers and images
docker-compose down --rmi all

# Remove all unused Docker resources
docker system prune -a
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
netstat -tulpn | grep :3000

# Kill the process or change the port in docker-compose.yml
```

#### 2. Permission Denied
```bash
# Make script executable
chmod +x docker-run.sh

# Or run with sudo (not recommended)
sudo docker-compose up -d
```

#### 3. Environment Variables Not Loading
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables are loaded
docker-compose config
```

#### 4. Build Fails
```bash
# Clear Docker cache
docker builder prune

# Rebuild without cache
docker-compose build --no-cache event-app
```

### Health Checks

The application includes health checks:

```bash
# Check container health
docker-compose ps

# Test health endpoint
curl http://localhost:3000/health
```

## 🚀 Production Deployment

### Using Docker Compose
```bash
# Build and run production
docker-compose up -d event-app

# Scale if needed
docker-compose up -d --scale event-app=3
```

### Using Docker Swarm
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml event-app
```

### Using Kubernetes
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/
```

## 📊 Monitoring

### View Container Stats
```bash
# Real-time stats
docker stats

# Container resource usage
docker-compose top
```

### Log Analysis
```bash
# View recent logs
docker-compose logs --tail=100 event-app

# Search logs
docker-compose logs event-app | grep ERROR
```

## 🔒 Security

### Best Practices
1. **Never commit `.env` files** - They contain sensitive information
2. **Use secrets management** for production deployments
3. **Regular security updates** - Keep base images updated
4. **Network isolation** - Use Docker networks for service communication

### Security Headers
The nginx configuration includes security headers:
- X-Frame-Options
- X-XSS-Protection
- X-Content-Type-Options
- Content-Security-Policy

## 📝 Development Workflow

### Local Development with Docker
```bash
# Start development container
./docker-run.sh dev

# Make changes to code (hot reload enabled)
# View changes at http://localhost:8080

# Stop development
docker-compose --profile dev down
```

### Testing Changes
```bash
# Build and test production image
docker-compose build event-app
docker-compose up -d event-app

# Test at http://localhost:3000
```

## 🤝 Contributing

When contributing to the Docker setup:

1. Test both development and production builds
2. Update documentation for any changes
3. Ensure environment variables are properly documented
4. Test on different platforms (Linux, macOS, Windows)

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Docker and application logs
3. Verify environment variables are correct
4. Ensure all prerequisites are installed

For additional help, please open an issue in the repository. 