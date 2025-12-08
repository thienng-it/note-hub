# Migration from nginx to Traefik

This guide explains the migration from nginx to Traefik as the reverse proxy for NoteHub.

## Table of Contents

1. [Why Traefik?](#why-traefik)
2. [What Changed](#what-changed)
3. [Migration Steps](#migration-steps)
4. [Configuration](#configuration)
5. [Troubleshooting](#troubleshooting)

## Why Traefik?

Traefik offers several advantages over nginx for containerized applications:

### Benefits of Traefik

- **Automatic Service Discovery**: Traefik automatically detects services via Docker labels
- **Dynamic Configuration**: No container restarts needed when adding/removing services
- **Built-in Let's Encrypt**: Native ACME protocol support for automatic SSL certificates
- **Modern Dashboard**: Real-time monitoring of routes and services
- **Better Middleware Support**: Easy configuration for rate limiting, circuit breakers, etc.
- **Cloud Native**: Designed specifically for microservices and containers
- **Load Balancing**: Built-in support for multiple instances and health checks
- **Hot Reloading**: Configuration changes are applied instantly without restarts

### Comparison: nginx vs Traefik

| Feature | nginx | Traefik |
|---------|-------|---------|
| Configuration | Static config files | Dynamic labels + files |
| Service Discovery | Manual | Automatic (Docker) |
| SSL/TLS | Manual cert management | Automatic Let's Encrypt |
| Reload on Change | Requires restart/reload | Hot reload |
| Container Native | No | Yes |
| Dashboard | No (need third-party) | Built-in |
| Learning Curve | Moderate | Easy for Docker users |

## What Changed

### Architecture Changes

**Before (nginx):**
```
Client → nginx (port 80) → Frontend Container
                         → Backend Container (/api, /uploads)
```

**After (Traefik):**
```
Client → Traefik (port 80) → Frontend Container
                           → Backend Container (/api, /uploads)
```

### File Changes

#### New Files
- `docker/traefik/traefik.yml` - Traefik static configuration
- `docker/traefik/dynamic.yml` - Traefik dynamic configuration (middlewares)
- `docker/traefik/drone-dynamic.yml` - Traefik configuration for Drone CI
- `Dockerfile.frontend.traefik` - Frontend Dockerfile using static file server instead of nginx
- `tests/traefik-config.test.sh` - Test suite for Traefik configuration

#### Modified Files
- `docker-compose.yml` - Updated to use Traefik
- `docker-compose.replication.yml` - Updated to use Traefik
- `docker-compose.drone.yml` - Updated to use Traefik
- All service definitions now include Traefik labels

#### Deprecated Files (kept for reference)
- `docker/nginx.conf` - Old nginx configuration
- `docker/nginx.conf.template` - Old nginx template with variable substitution
- `docker/nginx-drone.conf` - Old nginx configuration for Drone CI
- `Dockerfile.frontend` - Old frontend Dockerfile using nginx
- `tests/nginx-config.test.sh` - Old nginx test suite

### Service Changes

#### Traefik Service
Each deployment profile now includes a Traefik service:

```yaml
traefik:
  image: traefik:v2.11
  ports:
    - "80:80"
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
    - ./docker/traefik/dynamic.yml:/etc/traefik/dynamic/dynamic.yml:ro
  networks:
    - notehub-network
```

#### Frontend Service
Frontend now uses a lightweight static file server with Traefik handling routing:

```yaml
frontend:
  build:
    dockerfile: Dockerfile.frontend.traefik
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.frontend.rule=PathPrefix(`/`)"
    - "traefik.http.routers.frontend.priority=1"
    - "traefik.http.services.frontend.loadbalancer.server.port=80"
```

#### Backend Service
Backend now uses Traefik labels for routing:

```yaml
backend:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.backend-api.rule=PathPrefix(`/api`)"
    - "traefik.http.routers.backend-uploads.rule=PathPrefix(`/uploads`)"
    - "traefik.http.routers.backend-health.rule=Path(`/health`)"
```

## Migration Steps

### For Existing Deployments

If you have an existing NoteHub deployment with nginx, follow these steps to migrate:

#### Step 1: Backup Current Setup

```bash
# Stop current services
docker compose down

# Backup docker-compose files
cp docker-compose.yml docker-compose.yml.nginx-backup

# Backup data volumes (optional but recommended)
docker run --rm -v notehub-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/notehub-data-backup.tar.gz /data

docker run --rm -v notehub-uploads:/uploads -v $(pwd):/backup \
  alpine tar czf /backup/notehub-uploads-backup.tar.gz /uploads
```

#### Step 2: Update Configuration

```bash
# Pull latest changes with Traefik configuration
git pull origin main

# Your existing .env file should work as-is
# No changes needed to environment variables
```

#### Step 3: Start with Traefik

```bash
# Development mode
docker compose up -d

# Production mode
docker compose --profile production up -d

# MySQL mode
docker compose --profile mysql up -d
```

#### Step 4: Verify Migration

```bash
# Check that all services are running
docker compose ps

# Check Traefik logs
docker compose logs traefik

# Test the application
curl http://localhost/api/health
curl http://localhost/
```

### For New Deployments

New deployments automatically use Traefik. Just follow the standard setup:

```bash
# Clone repository
git clone https://github.com/thienng-it/note-hub.git
cd note-hub

# Copy and configure environment
cp .env.example .env
nano .env

# Start services
docker compose up -d
```

## Configuration

### Traefik Static Configuration

Located in `docker/traefik/traefik.yml`:

```yaml
# Entry points
entryPoints:
  web:
    address: ":80"

# Docker provider
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: notehub-network
  file:
    directory: /etc/traefik/dynamic
    watch: true
```

### Traefik Dynamic Configuration

Located in `docker/traefik/dynamic.yml`:

```yaml
http:
  middlewares:
    # Compression
    compression:
      compress:
        minResponseBodyBytes: 1024
    
    # Security headers
    security-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
```

### Service Labels

Services use Docker labels for Traefik configuration:

```yaml
labels:
  # Enable Traefik
  - "traefik.enable=true"
  
  # Define router
  - "traefik.http.routers.myservice.rule=PathPrefix(`/api`)"
  - "traefik.http.routers.myservice.entrypoints=web"
  - "traefik.http.routers.myservice.priority=10"
  
  # Define service
  - "traefik.http.services.myservice.loadbalancer.server.port=5000"
  
  # Apply middlewares
  - "traefik.http.routers.myservice.middlewares=compression@file,security-headers@file"
```

### Priority Rules

Traefik uses priorities to determine which route matches first:

- **Priority 10**: Backend routes (`/api`, `/uploads`, `/health`)
- **Priority 1**: Frontend routes (catch-all `/`)

Higher priority = checked first.

## Troubleshooting

### Services Not Accessible

**Problem**: Services start but are not accessible through Traefik.

**Solution**:
```bash
# Check Traefik logs
docker compose logs traefik

# Verify labels are correct
docker inspect notehub-backend | grep -A 20 Labels

# Ensure services are on the same network
docker network inspect notehub-network
```

### Port Conflicts

**Problem**: Port 80 already in use.

**Solution**:
```bash
# Check what's using port 80
sudo lsof -i :80

# Stop conflicting service
sudo systemctl stop apache2  # or nginx

# Or change Traefik port in docker-compose.yml
ports:
  - "8080:80"  # Use port 8080 instead
```

### Backend Routes Not Working

**Problem**: Frontend loads but API calls fail.

**Solution**:
```bash
# Check that backend labels include all routes
docker compose config | grep -A 5 "backend:"

# Verify backend is healthy
docker compose ps backend
curl http://localhost:5000/api/health  # Direct check

# Check Traefik routing
docker compose logs traefik | grep backend
```

### Performance Issues

**Problem**: Slower than nginx.

**Solution**:
```yaml
# Add connection pooling in traefik.yml
serversTransport:
  maxIdleConnsPerHost: 100
  
# Increase timeouts if needed
forwardingTimeouts:
  dialTimeout: 30s
  responseHeaderTimeout: 30s
```

### SSL/HTTPS Setup

**SSL/HTTPS is now enabled by default** in all deployment profiles! 🔒

Traefik automatically:
- Listens on both HTTP (port 80) and HTTPS (port 443)
- Redirects all HTTP traffic to HTTPS
- Obtains SSL certificates from Let's Encrypt
- Renews certificates automatically before expiration

#### Configuration

Set your email for Let's Encrypt notifications in `.env`:

```bash
# .env file
ACME_EMAIL=your-email@yourdomain.com
```

#### Requirements for Production

For Let's Encrypt to issue certificates, your setup must meet these requirements:

1. **Valid Domain**: Your domain must point to your server's public IP
2. **Open Ports**: Ports 80 and 443 must be accessible from the internet
3. **Valid Email**: Set `ACME_EMAIL` to receive certificate notifications

#### Development/Localhost

For local development, SSL still works but:
- Self-signed certificates are used (browsers show warnings)
- Let's Encrypt cannot validate localhost domains
- Use `http://localhost` or accept the browser warning for `https://localhost`

#### Certificate Storage

Certificates are stored in:
- `./letsencrypt/acme.json` - Main NoteHub deployments
- `./letsencrypt-drone/acme.json` - Drone CI deployment

⚠️ **Important**: 
- These files are automatically excluded from Git
- Back them up to preserve your certificates
- Never edit these files manually

#### Ports

All Traefik services now expose both HTTP and HTTPS:
- **NoteHub**: HTTP 80 → HTTPS 443
- **Drone CI**: HTTP 8080 → HTTPS 8443

#### Disabling SSL (Not Recommended)

If you need to disable SSL for testing:

1. Remove HTTPS configuration from Traefik command:
   - Remove `--entrypoints.websecure.address=:443`
   - Remove all `--certificatesresolvers.*` lines
   - Remove `--entrypoints.web.http.redirections.*` lines

2. Remove port 443 mapping:
   - Change `ports: ["80:80", "443:443"]` to `ports: ["80:80"]`

3. Update service labels to use `web` instead of `websecure`:
   - Change `entrypoints=websecure` to `entrypoints=web`
   - Remove `tls=true` and `tls.certresolver=letsencrypt` labels

### Debugging Tips

```bash
# Enable debug logging
docker compose down
# Edit docker-compose.yml, add to traefik command:
# - "--log.level=DEBUG"
docker compose up -d

# View all Traefik routes
docker compose exec traefik traefik healthcheck --ping

# Check Traefik configuration
docker compose exec traefik cat /etc/traefik/traefik.yml
docker compose exec traefik cat /etc/traefik/dynamic/dynamic.yml
```

## Additional Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Docker Provider Guide](https://doc.traefik.io/traefik/providers/docker/)
- [Traefik Middleware Reference](https://doc.traefik.io/traefik/middlewares/overview/)
- [Let's Encrypt Setup](https://doc.traefik.io/traefik/https/acme/)

## Rollback to nginx

If you need to rollback to nginx:

```bash
# Stop Traefik-based services
docker compose down

# Restore nginx configuration
cp docker-compose.yml.nginx-backup docker-compose.yml

# Start with nginx
docker compose up -d
```

Note: Traefik is recommended for new deployments due to its advantages in container environments.
