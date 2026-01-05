# SysDes Deployment Guide

## Prerequisites

- VPS with Ubuntu 22.04 or later
- Docker and Docker Compose installed
- Domain name (optional but recommended)
- At least 2GB RAM and 20GB disk space

## Quick Start

### 1. Initial VPS Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Logout and login again for docker group to take effect
exit
```

### 2. Clone Repository

```bash
cd /opt
sudo git clone https://github.com/your-username/sysdes.git
sudo chown -R $USER:$USER sysdes
cd sysdes
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

Required environment variables:
- `DB_PASSWORD` - Strong PostgreSQL password
- `JWT_SECRET` - Random 32+ character string
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `GOOGLE_REDIRECT_URL` - Your domain callback URL
- `NEXT_PUBLIC_API_URL` - Your domain API URL

### 4. Set up SSL (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot -y

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to docker volume
sudo mkdir -p docker/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/ssl/

# Set up auto-renewal
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet --deploy-hook "docker-compose -f /opt/sysdes/docker-compose.yml restart nginx"
```

### 5. Update Nginx Config

```bash
# Edit nginx.conf and replace 'your-domain.com' with your actual domain
nano docker/nginx.conf
```

### 6. Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh production
```

### 7. Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test endpoints
curl http://localhost:8080/health
curl http://localhost:3000
```

## Maintenance Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
```

### Update Application
```bash
# Pull latest code and redeploy
./deploy.sh production
```

### Database Backup
```bash
# Backup
docker-compose exec postgres pg_dump -U sysdes sysdes > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker-compose exec -T postgres psql -U sysdes sysdes < backup.sql
```

### Stop All Services
```bash
docker-compose down
```

### Clean Up (removes volumes)
```bash
docker-compose down -v
```

## Monitoring

### Check Resource Usage
```bash
docker stats
```

### Check Disk Space
```bash
df -h
docker system df
```

### Clean Up Docker
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
docker-compose logs backend

# Check database connection
docker-compose exec backend env | grep DB_

# Restart backend
docker-compose restart backend
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Connect to database
docker-compose exec postgres psql -U sysdes -d sysdes
```

### SSL Certificate Issues
```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Check certificate expiry
sudo certbot certificates
```

### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :8080

# Stop the service or change ports in docker-compose.yml
```

## Security Best Practices

1. **Firewall Setup**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

2. **Regular Updates**
```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Update system
sudo apt update && sudo apt upgrade -y
```

3. **Backup Strategy**
- Daily database backups
- Weekly full system backups
- Store backups off-site

4. **Monitoring**
- Set up log aggregation (ELK stack, Grafana)
- Configure alerts for service downtime
- Monitor disk space and memory usage

## Production Checklist

- [ ] SSL certificates installed and auto-renewal configured
- [ ] Firewall configured
- [ ] Strong passwords in .env
- [ ] Database backups automated
- [ ] Monitoring set up
- [ ] Domain DNS configured
- [ ] Google OAuth credentials configured
- [ ] CORS settings verified
- [ ] Rate limiting configured in nginx
- [ ] Log rotation configured

## Support

For issues and questions:
- Check logs: `docker-compose logs`
- GitHub Issues: https://github.com/your-username/sysdes/issues
- Documentation: https://github.com/your-username/sysdes
