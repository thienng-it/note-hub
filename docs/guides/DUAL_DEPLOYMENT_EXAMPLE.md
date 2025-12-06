# Dual Deployment Example: NoteHub + Drone CI

This guide demonstrates how to deploy both NoteHub and Drone CI on the same VPS server without conflicts.

## Quick Setup

### Prerequisites

- VPS with Docker and Docker Compose installed
- 4GB RAM minimum (8GB recommended)
- Ports 80 and 8080 available

### Step 1: Deploy NoteHub

```bash
# Clone repository
git clone https://github.com/thienng-it/note-hub.git
cd note-hub

# Configure NoteHub
cp .env.example .env
nano .env  # Set required variables

# Required environment variables for NoteHub:
# SECRET_KEY=your-secret-key
# NOTES_ADMIN_PASSWORD=YourSecurePassword123!

# Start NoteHub (uses port 80)
docker compose up -d

# Wait for services to be healthy
docker compose ps

# Verify NoteHub is accessible
curl -I http://localhost
```

### Step 2: Deploy Drone CI

```bash
# Still in the note-hub directory

# Configure Drone CI
cp .env.drone.example .env.drone
nano .env.drone  # Set GitHub OAuth credentials

# Required environment variables for Drone CI:
# DRONE_GITHUB_CLIENT_ID=your-github-oauth-client-id
# DRONE_GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
# DRONE_SERVER_HOST=your-server:8080
# DRONE_RPC_SECRET=generate-with-openssl
# DRONE_POSTGRES_PASSWORD=secure-password

# Generate RPC secret
openssl rand -hex 16  # Copy to DRONE_RPC_SECRET

# Start Drone CI (uses port 8080)
docker compose -f docker-compose.drone.yml up -d

# Wait for services to be healthy
docker compose -f docker-compose.drone.yml ps

# Verify Drone is accessible
curl -I http://localhost:8080
```

### Step 3: Verify Both Services

```bash
# Check all running containers
docker ps

# Expected output shows:
# - notehub-frontend (port 80)
# - notehub-backend
# - drone-server (port 8080)
# - drone-runner
# - drone-db

# Test NoteHub
curl -I http://localhost:80
# Expected: HTTP/1.1 200 OK

# Test Drone CI
curl -I http://localhost:8080
# Expected: HTTP/1.1 200 OK (or redirect to login)

# Check networks
docker network ls | grep -E "notehub|drone"
# Expected:
# - notehub-network
# - drone-network
```

## Automated Setup

Use the provided setup script for easier deployment:

```bash
# Setup Drone CI automatically
./scripts/setup-drone.sh

# The script will:
# 1. Check prerequisites
# 2. Create and configure .env.drone
# 3. Generate secure secrets
# 4. Validate configuration
# 5. Optionally start Drone CI
```

## Service URLs

After deployment, access the services at:

- **NoteHub**: http://your-server (port 80)
- **Drone CI**: http://your-server:8080 (port 8080)

## Resource Usage

Monitor resource usage with:

```bash
# Real-time resource monitoring
docker stats

# Expected usage (idle state):
# notehub-frontend:  ~20MB RAM
# notehub-backend:   ~200MB RAM
# drone-server:      ~100MB RAM
# drone-runner:      ~50MB RAM
# drone-db:          ~100MB RAM
# Total:             ~470MB RAM
```

## Port Mapping

| Service | Internal Port | External Port | Network |
|---------|--------------|---------------|---------|
| notehub-nginx | 80 | 80 | notehub-network |
| notehub-backend | 5000 | internal | notehub-network |
| drone-nginx | 80 | 8080 | drone-network |
| drone-server | 80 | internal | drone-network |
| drone-runner | - | internal | drone-network |
| drone-db | 5432 | internal | drone-network |

**Architecture**: Both applications use nginx as a reverse proxy for consistency and production-readiness.

## Managing Both Services

### Start/Stop Services

```bash
# Stop NoteHub
docker compose down

# Stop Drone CI
docker compose -f docker-compose.drone.yml down

# Start NoteHub
docker compose up -d

# Start Drone CI
docker compose -f docker-compose.drone.yml up -d

# Stop everything
docker compose down
docker compose -f docker-compose.drone.yml down
```

### View Logs

```bash
# NoteHub logs
docker compose logs -f

# Drone CI logs
docker compose -f docker-compose.drone.yml logs -f

# Specific service logs
docker compose logs -f backend
docker compose -f docker-compose.drone.yml logs -f drone-server
```

### Update Services

```bash
# Update NoteHub
git pull origin main
docker compose pull
docker compose up -d

# Update Drone CI
docker compose -f docker-compose.drone.yml pull
docker compose -f docker-compose.drone.yml up -d
```

## Production Deployment with Reverse Proxy

For production, use nginx as a reverse proxy:

### Install nginx

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### Configure nginx

Create `/etc/nginx/sites-available/apps`:

```nginx
# NoteHub - notehub.example.com
server {
    listen 80;
    server_name notehub.example.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Drone CI - drone.example.com
server {
    listen 80;
    server_name drone.example.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for Drone
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable configuration:

```bash
sudo ln -s /etc/nginx/sites-available/apps /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Enable HTTPS

```bash
# Get SSL certificates
sudo certbot --nginx -d notehub.example.com -d drone.example.com

# Auto-renewal is configured automatically
```

After HTTPS setup:
- NoteHub: https://notehub.example.com
- Drone CI: https://drone.example.com

Update Drone configuration:
```bash
# Edit .env.drone
DRONE_SERVER_HOST=drone.example.com
DRONE_SERVER_PROTO=https

# Update GitHub OAuth callback URL to:
# https://drone.example.com/login

# Restart Drone CI
docker compose -f docker-compose.drone.yml restart
```

## Backup Strategy

### NoteHub Backup

```bash
# Backup SQLite database
docker compose exec backend tar czf - /app/data | \
  cat > notehub-backup-$(date +%Y%m%d).tar.gz

# Backup uploads
docker compose exec backend tar czf - /app/uploads | \
  cat > notehub-uploads-$(date +%Y%m%d).tar.gz
```

### Drone CI Backup

```bash
# Backup PostgreSQL database
docker compose -f docker-compose.drone.yml exec -T drone-db \
  pg_dump -U drone drone > drone-backup-$(date +%Y%m%d).sql

# Backup Drone data
docker run --rm -v drone-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/drone-data-$(date +%Y%m%d).tar.gz /data
```

### Automated Backups

Create a backup script `/opt/backups/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d)

# NoteHub backup
cd /opt/note-hub
docker compose exec -T backend tar czf - /app/data > \
  $BACKUP_DIR/notehub-data-$DATE.tar.gz

# Drone backup
docker compose -f docker-compose.drone.yml exec -T drone-db \
  pg_dump -U drone drone > $BACKUP_DIR/drone-db-$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
```

Schedule with cron:

```bash
# Run daily at 2 AM
0 2 * * * /opt/backups/backup.sh
```

## Troubleshooting

### Port Conflicts

If you get "port already in use" errors:

```bash
# Check what's using the ports
sudo lsof -i :80
sudo lsof -i :8080

# Or use ss
ss -ltn | grep -E ":80 |:8080 "
```

### Services Won't Start

```bash
# Check logs for errors
docker compose logs
docker compose -f docker-compose.drone.yml logs

# Check container status
docker compose ps
docker compose -f docker-compose.drone.yml ps

# Verify environment variables
docker compose config
docker compose -f docker-compose.drone.yml config
```

### Network Issues

```bash
# Inspect networks
docker network inspect notehub-network
docker network inspect drone-network

# Restart Docker if needed
sudo systemctl restart docker
```

### High Resource Usage

```bash
# Check resource usage
docker stats

# If Drone runner is using too much during builds:
# Reduce DRONE_RUNNER_CAPACITY in .env.drone
DRONE_RUNNER_CAPACITY=1  # Instead of 2

# Restart Drone
docker compose -f docker-compose.drone.yml restart
```

## Monitoring

### Health Checks

```bash
# Check service health
docker compose ps
docker compose -f docker-compose.drone.yml ps

# All services should show "healthy" status
```

### Disk Usage

```bash
# Check Docker disk usage
docker system df

# Clean up old images
docker system prune -a
```

### Logs

```bash
# Monitor logs in real-time
docker compose logs -f --tail=100
docker compose -f docker-compose.drone.yml logs -f --tail=100
```

## Summary

✅ **NoteHub** runs on port 80
✅ **Drone CI** runs on port 8080
✅ **No conflicts** - both run simultaneously
✅ **Separate networks** - complete isolation
✅ **Production ready** - with reverse proxy and HTTPS
✅ **Easy management** - simple Docker Compose commands

## Next Steps

1. ✅ Deploy both services
2. 📝 Configure Drone CI for NoteHub repository
3. 🔄 Set up automated backups
4. 🔒 Enable HTTPS with Let's Encrypt
5. 📊 Configure monitoring and alerts

For more information:
- [NoteHub Deployment Guide](HETZNER_DEPLOYMENT.md)
- [Drone CI Setup Guide](DRONE_CI_SETUP.md)
- [Port Allocation Guide](PORT_ALLOCATION.md)
