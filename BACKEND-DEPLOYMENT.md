# Backend-Only Deployment Guide

Deploy your SysDes backend to a VPS in production-ready fashion.

## 🎯 What You Need

### On Your VPS (t1.small is perfect):
- **OS**: Ubuntu 22.04 LTS
- **Specs**: 2 vCPU, 2GB RAM, 8GB storage (as per your screenshot)
- **Network**: 1 Public IPv4
- **Domain**: Optional but recommended (e.g., api.yourdomain.com)

### Software to Install:
1. Docker & Docker Compose
2. Nginx (handled by Docker)
3. Let's Encrypt (for SSL)

### NOT Needed (Yet):
- ❌ Jenkins - Use GitHub Actions or simple scripts
- ❌ Kafka - Only needed for high-volume event streaming
- ❌ Kubernetes - Overkill for single server
- ❌ Redis - Add later if you need caching

---

## 📦 Step-by-Step Deployment

### 1️⃣ Initial VPS Setup

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Create deploy user (security best practice)
adduser deploy
usermod -aG docker deploy
usermod -aG sudo deploy

# Switch to deploy user
su - deploy
```

### 2️⃣ Setup Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 3️⃣ Clone Your Repository

```bash
cd /opt
sudo mkdir sysdes
sudo chown deploy:deploy sysdes
cd sysdes

# Clone your repo (use deploy key or HTTPS)
git clone https://github.com/AnupamSingh2004/sysdes.git .

# Or if you're pushing for the first time:
# git init
# git remote add origin https://github.com/AnupamSingh2004/sysdes.git
```

### 4️⃣ Configure Environment Variables

```bash
# Copy example and edit
cp .env.example .env
nano .env
```

**Required variables:**
```bash
# Database
DB_NAME=sysdes
DB_USER=sysdes
DB_PASSWORD=your_super_secure_password_here  # Generate strong password

# JWT
JWT_SECRET=your_jwt_secret_min_32_characters_random  # Generate with: openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URL=https://api.yourdomain.com/api/auth/google/callback

# Environment
ENV=production
PORT=8080
```

**Generate secure secrets:**
```bash
# For DB_PASSWORD
openssl rand -base64 32

# For JWT_SECRET
openssl rand -base64 48
```

### 5️⃣ Setup Domain (Optional but Recommended)

**Option A: With Domain**
```bash
# Point your domain DNS A record to your VPS IP:
# api.yourdomain.com -> your-vps-ip
```

**Option B: Without Domain (IP only)**
```bash
# You can use IP directly, but SSL will be more complex
# Access via: http://your-vps-ip
```

### 6️⃣ Setup SSL Certificate (Let's Encrypt)

**If using domain:**
```bash
# Install Certbot
sudo apt install certbot -y

# Stop nginx temporarily (if running)
docker-compose -f docker-compose.backend.yml stop nginx 2>/dev/null || true

# Get certificate
sudo certbot certonly --standalone -d api.yourdomain.com

# Create SSL directory for Docker
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/api.yourdomain.com/privkey.pem nginx/ssl/
sudo chown -R deploy:deploy nginx/ssl

# Auto-renewal (add to crontab)
sudo crontab -e
# Add this line:
# 0 0 * * * certbot renew --quiet --deploy-hook "cd /opt/sysdes && docker-compose -f docker-compose.backend.yml restart nginx"
```

**If using IP only:**
```bash
# Generate self-signed certificate (not recommended for production)
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=your-vps-ip"
```

### 7️⃣ Update Nginx Configuration

```bash
# Edit nginx config with your domain
nano nginx/backend.conf

# Replace these lines:
# Line 56: server_name your-domain.com api.your-domain.com;
# With your actual domain: server_name api.yourdomain.com;

# Line 70: add_header Access-Control-Allow-Origin "https://your-frontend-domain.com" always;
# With your frontend URL (or localhost for testing)
```

### 8️⃣ Deploy!

```bash
# Make deploy script executable
chmod +x deploy-backend.sh

# Run deployment
./deploy-backend.sh
```

### 9️⃣ Verify Deployment

```bash
# Check if services are running
docker-compose -f docker-compose.backend.yml ps

# All services should show "Up (healthy)"

# Test backend directly
curl http://localhost:8080/health
# Should return: {"status":"ok"}

# Test through Nginx (if SSL setup)
curl https://api.yourdomain.com/health
# Should return: {"status":"ok"}

# View logs
docker-compose -f docker-compose.backend.yml logs -f backend
```

---

## 🔧 Maintenance Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.backend.yml logs -f

# Backend only
docker-compose -f docker-compose.backend.yml logs -f backend

# PostgreSQL only
docker-compose -f docker-compose.backend.yml logs -f postgres

# Last 100 lines
docker-compose -f docker-compose.backend.yml logs --tail=100
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.backend.yml restart

# Restart backend only
docker-compose -f docker-compose.backend.yml restart backend

# Full redeploy
./deploy-backend.sh
```

### Database Operations
```bash
# Backup database
docker-compose -f docker-compose.backend.yml exec postgres \
  pg_dump -U sysdes sysdes > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
docker-compose -f docker-compose.backend.yml exec -T postgres \
  psql -U sysdes sysdes < backup.sql

# Connect to database
docker-compose -f docker-compose.backend.yml exec postgres \
  psql -U sysdes -d sysdes

# Inside psql:
# \dt          - List tables
# \d users     - Describe users table
# SELECT * FROM users LIMIT 5;
# \q           - Quit
```

### Update Backend Code
```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
./deploy-backend.sh
```

### Monitor Resources
```bash
# Container stats
docker stats

# Disk usage
df -h
docker system df

# Memory usage
free -h
```

### Clean Up Docker
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (careful!)
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

---

## 🛡️ Security Checklist

- [x] Firewall configured (only ports 22, 80, 443 open)
- [x] Non-root user created
- [x] Strong database password
- [x] Strong JWT secret (32+ characters)
- [x] SSL certificate installed
- [x] Database not exposed to internet (127.0.0.1 only)
- [x] Backend not directly exposed (nginx proxy)
- [x] Rate limiting enabled
- [x] Security headers configured
- [x] CORS properly configured

**Additional Security (recommended):**
```bash
# Disable root SSH login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd

# Setup fail2ban (prevents brute force)
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Auto-update security patches
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose -f docker-compose.backend.yml logs backend

# Common issues:
# 1. Database not ready - wait 30 seconds
# 2. Port already in use - check with: sudo lsof -i :8080
# 3. Environment variables missing - check .env file
```

### Database connection failed
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.backend.yml ps postgres

# Check database logs
docker-compose -f docker-compose.backend.yml logs postgres

# Test connection
docker-compose -f docker-compose.backend.yml exec postgres \
  psql -U sysdes -d sysdes -c "SELECT 1;"
```

### SSL certificate errors
```bash
# Check certificate files exist
ls -la nginx/ssl/

# Renew certificate manually
sudo certbot renew --force-renewal

# Copy new certificates
sudo cp /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/api.yourdomain.com/privkey.pem nginx/ssl/

# Restart nginx
docker-compose -f docker-compose.backend.yml restart nginx
```

### Out of disk space
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Remove old logs
sudo journalctl --vacuum-time=7d

# Check large files
sudo du -h / | sort -rh | head -20
```

---

## 📊 Monitoring (Optional)

### Simple Log Monitoring
```bash
# Watch logs in real-time
docker-compose -f docker-compose.backend.yml logs -f | grep -i error

# Count errors
docker-compose -f docker-compose.backend.yml logs --since 1h | grep -i error | wc -l

# Find slow requests
docker-compose -f docker-compose.backend.yml logs | grep "took more than"
```

### Setup Uptime Monitoring
Use free services like:
- **UptimeRobot** (https://uptimerobot.com)
- **BetterUptime** (https://betteruptime.com)
- **Pingdom** (https://pingdom.com)

Monitor: `https://api.yourdomain.com/health`

---

## 💰 Cost Estimate (t1.small)

Based on your screenshot:
- **Instance**: ₹159.84/month (~$2/month)
- **Storage (8GB)**: ₹20/month
- **Network**: ₹36/month
- **Total**: ~₹216/month (~$2.60/month)

**Cost-saving tips:**
- Use reserved instances for 30-50% discount
- Monitor bandwidth usage
- Clean up unused Docker images regularly

---

## 🚀 What's Next?

After backend is deployed:

1. **Test Your Backend**
   ```bash
   # Health check
   curl https://api.yourdomain.com/health
   
   # Test API
   curl https://api.yourdomain.com/api/projects
   ```

2. **Update Frontend** (when ready)
   - Point frontend `NEXT_PUBLIC_API_URL` to `https://api.yourdomain.com`
   - Deploy frontend on Vercel/Netlify (free tier)

3. **Monitor**
   - Setup uptime monitoring
   - Check logs daily
   - Monitor disk space

4. **Backup Strategy**
   - Daily database backups
   - Store backups off-server (S3, Google Drive)

---

## 📞 Need Help?

Common commands reference:
```bash
# Quick status check
docker-compose -f docker-compose.backend.yml ps

# Quick restart
./deploy-backend.sh

# Emergency stop
docker-compose -f docker-compose.backend.yml down

# Full reset (destroys data!)
docker-compose -f docker-compose.backend.yml down -v
```

Your backend is now production-ready! 🎉
