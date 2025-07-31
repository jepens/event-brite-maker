# EasyPanel Deployment Guide

## 🚀 Quick Fix for Environment Variables Issue

If you're seeing this error:
```
VITE_SUPABASE_URL environment variable is not set, using fallback
VITE_SUPABASE_ANON_KEY environment variable is not set, using fallback
```

Follow this guide to fix it.

---

## 📋 Prerequisites

1. **EasyPanel installed** on your VPS
2. **Docker enabled** in EasyPanel
3. **Git repository** cloned to your VPS
4. **Supabase project** created and configured

---

## 🔧 Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Clone your repository** to your VPS:
   ```bash
   git clone https://github.com/jepens/event-brite-maker.git
   cd event-brite-maker
   ```

2. **Create .env file**:
   ```bash
   cp env.example .env
   ```

3. **Edit .env file** with your actual credentials:
   ```bash
   nano .env
   ```

### Step 2: Configure Environment Variables

**Minimum required variables:**
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

**Get these from Supabase:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role secret** → `VITE_SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Deploy with EasyPanel

#### Option A: Using EasyPanel Web Interface

1. **Open EasyPanel** in your browser
2. **Go to Apps** → **New App**
3. **Select "Docker Compose"**
4. **Upload your project folder** or **connect to Git repository**
5. **Set the following configuration:**

```yaml
# docker-compose.yml (EasyPanel will use this)
services:
  event-app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
        - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
        - VITE_SUPABASE_SERVICE_ROLE_KEY=${VITE_SUPABASE_SERVICE_ROLE_KEY}
    container_name: event-registration-app
    ports:
      - "3000:80"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
      - VITE_SUPABASE_SERVICE_ROLE_KEY=${VITE_SUPABASE_SERVICE_ROLE_KEY}
    restart: unless-stopped
```

6. **Add Environment Variables** in EasyPanel:
   - Click on your app
   - Go to **Environment Variables**
   - Add each variable from your `.env` file

#### Option B: Using SSH/Command Line

1. **SSH into your VPS**
2. **Navigate to your project directory**
3. **Run the deployment script:**
   ```bash
   ./docker-run.ps1 deploy
   ```

### Step 4: Verify Deployment

1. **Check container status:**
   ```bash
   docker-compose ps
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Test the application:**
   - Open your domain or IP address
   - Should see the event registration app
   - No more environment variable warnings

---

## 🔍 Troubleshooting

### Issue 1: Environment Variables Still Not Working

**Solution:**
1. **Rebuild the container** with fresh environment variables:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

2. **Check if .env file is in the right location:**
   ```bash
   ls -la .env
   cat .env
   ```

### Issue 2: Build Fails

**Solution:**
1. **Check Docker logs:**
   ```bash
   docker-compose logs
   ```

2. **Verify environment variables are set:**
   ```bash
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```

### Issue 3: Container Won't Start

**Solution:**
1. **Check container logs:**
   ```bash
   docker-compose logs event-app
   ```

2. **Verify port is available:**
   ```bash
   netstat -tulpn | grep :3000
   ```

---

## 📊 Monitoring

### Health Check
The application includes health checks:
- **URL**: `http://your-domain/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds

### Logs
- **Application logs**: `docker-compose logs -f`
- **Nginx logs**: Mounted to `./logs/` directory

---

## 🔄 Updates and Maintenance

### Update Application
```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Restart Application
```bash
docker-compose restart
```

### Stop Application
```bash
docker-compose down
```

---

## 🌐 Domain Configuration

### EasyPanel Domain Setup
1. **Go to EasyPanel** → **Domains**
2. **Add your domain**
3. **Point to your Docker app**
4. **Configure SSL** (recommended)

### Reverse Proxy (Optional)
If you want to use a different port or path:
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## ✅ Success Checklist

- [ ] Environment variables configured in `.env`
- [ ] Docker container builds successfully
- [ ] Application accessible at your domain
- [ ] No environment variable warnings in console
- [ ] Admin dashboard working at `/admin`
- [ ] Supabase connection established
- [ ] SSL certificate configured (recommended)

---

## 🆘 Support

If you're still having issues:

1. **Check the logs:**
   ```bash
   docker-compose logs -f
   ```

2. **Verify your Supabase credentials** are correct

3. **Ensure your VPS has enough resources** (minimum 1GB RAM, 1 CPU)

4. **Check firewall settings** - port 3000 should be open

---

## 🎉 Success!

Once deployed successfully, your Event Management System will be:
- ✅ **Production ready** with Docker
- ✅ **Optimized** for performance (95% API reduction)
- ✅ **Scalable** for hundreds of events per day
- ✅ **Cost-effective** on Supabase Free Tier

**Your application URL**: `http://your-domain.com`
**Admin Dashboard**: `http://your-domain.com/admin` 