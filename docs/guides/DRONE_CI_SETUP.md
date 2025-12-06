# Drone CI Setup Guide

This guide explains how to deploy Drone CI alongside NoteHub on the same VPS server without port conflicts.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Port Configuration](#port-configuration)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Production Deployment](#production-deployment)
- [Integration with NoteHub](#integration-with-notehub)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Overview

[Drone CI](https://www.drone.io/) is a modern, container-native continuous integration platform. This setup allows you to run Drone CI alongside NoteHub on the same VPS server without port conflicts.

### Key Features

- 🐳 **Container-native**: Pipelines run in Docker containers
- 🔗 **GitHub Integration**: Automatic repository synchronization
- 🚀 **Easy Setup**: Simple Docker Compose deployment
- 🔒 **Secure**: OAuth authentication with GitHub
- ⚡ **Fast**: Parallel pipeline execution
- 📊 **Web UI**: Beautiful dashboard for build management

## Architecture

Drone CI uses nginx as a reverse proxy (similar to NoteHub) for consistency and production-readiness:

```
┌─────────────────┐
│  nginx Proxy    │ ← Port 8080 (External)
│                 │
│  - Compression  │
│  - SSL/TLS      │
│  - Caching      │
└────────┬────────┘
         │ HTTP Proxy
         │
┌────────▼────────┐
│  Drone Server   │ ← Web UI & API (Internal)
│                 │
│  - Web UI       │
│  - API Server   │
│  - Webhooks     │
└────────┬────────┘
         │
         │ RPC (Internal)
         │
┌────────▼────────┐
│  Drone Runner   │ ← Pipeline Executor (Internal)
│                 │
│  - Docker       │
│  - Executes CI  │
└────────┬────────┘
         │
         │ Creates containers
         │
┌────────▼────────┐
│  PostgreSQL     │ ← Database (Internal port 5432)
│                 │
│  - Build data   │
│  - Repositories │
└─────────────────┘
```

**Key Points:**
- nginx handles all external traffic on port 8080
- Consistent with NoteHub's architecture (nginx → services)
- Ready for SSL/TLS termination in production
- Provides compression and caching out of the box

## Port Configuration

To avoid conflicts with NoteHub:

| Service | Internal Port | External Port | Purpose |
|---------|--------------|---------------|---------|
| **NoteHub nginx** | 80 | 80 | NoteHub reverse proxy |
| **NoteHub Backend** | 5000 | Internal only | NoteHub API |
| **Drone nginx** | 80 | **8080** | Drone CI reverse proxy |
| **Drone Server** | 80 | Internal only | Drone CI server |
| **Drone Runner** | - | Internal only | Pipeline executor |
| **PostgreSQL (Drone)** | 5432 | Internal only | Drone database |

**Key Point**: Both NoteHub and Drone CI use nginx as a reverse proxy. Drone's nginx uses port **8080** externally to avoid conflict with NoteHub's port 80.

## Prerequisites

1. **VPS Server** with Docker and Docker Compose installed
2. **GitHub Account** for OAuth authentication
3. **Domain/IP** accessible from the internet (optional but recommended)
4. **Minimum Resources**:
   - 2GB RAM (4GB recommended)
   - 2 CPU cores
   - 20GB disk space

## Quick Start

### 1. Clone Repository

```bash
cd /opt
git clone https://github.com/thienng-it/note-hub.git
cd note-hub
```

### 2. Create GitHub OAuth App

1. Go to [GitHub Settings > Developer Settings > OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Drone CI
   - **Homepage URL**: `http://your-server-ip:8080`
   - **Authorization callback URL**: `http://your-server-ip:8080/login`
4. Click "Register application"
5. Copy the **Client ID** and **Client Secret**

### 3. Configure Environment

```bash
# Copy example configuration
cp .env.drone.example .env.drone

# Generate RPC secret
openssl rand -hex 16

# Edit configuration
nano .env.drone
```

Set the following values:
```bash
# GitHub OAuth credentials from step 2
DRONE_GITHUB_CLIENT_ID=your-client-id
DRONE_GITHUB_CLIENT_SECRET=your-client-secret

# Your server's hostname or IP (without http://)
DRONE_SERVER_HOST=your-server-ip:8080

# RPC secret (from openssl command above)
DRONE_RPC_SECRET=generated-secret-here

# Database password (generate a strong password)
DRONE_POSTGRES_PASSWORD=strong-database-password

# Optional: Auto-create admin user
DRONE_USER_CREATE=username:your-github-username,admin:true
```

### 4. Deploy Drone CI

```bash
# Start Drone CI services
docker compose -f docker-compose.drone.yml up -d

# Check status
docker compose -f docker-compose.drone.yml ps

# View logs
docker compose -f docker-compose.drone.yml logs -f
```

### 5. Access Drone CI

1. Open browser: `http://your-server-ip:8080`
2. Click "Continue" to authenticate with GitHub
3. Authorize the application
4. You should see the Drone CI dashboard with your repositories

## Detailed Setup

### Environment Variables Explained

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DRONE_GITHUB_CLIENT_ID` | GitHub OAuth Client ID | `abc123...` |
| `DRONE_GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | `secret123...` |
| `DRONE_SERVER_HOST` | Server hostname (no http://) | `drone.example.com` or `1.2.3.4:8080` |
| `DRONE_RPC_SECRET` | Shared secret for server-runner | Generate with `openssl rand -hex 16` |
| `DRONE_POSTGRES_PASSWORD` | PostgreSQL password | Strong password |

#### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DRONE_SERVER_PROTO` | `http` | Protocol (`http` or `https`) |
| `DRONE_REGISTRATION_CLOSED` | `false` | Require admin approval for users |
| `DRONE_RUNNER_CAPACITY` | `2` | Max concurrent pipelines |
| `DRONE_LOGS_DEBUG` | `false` | Enable debug logging |

### Database Configuration

Drone uses PostgreSQL by default. The database configuration is handled automatically via the `docker-compose.drone.yml` file.

**Data Persistence**: Database data is stored in Docker volume `drone-postgres-data`.

### GitHub Integration

Drone synchronizes with GitHub to:
- List your repositories
- Receive webhook events (push, pull request)
- Update commit statuses
- Access repository files

## Production Deployment

### Using a Reverse Proxy (Recommended)

For production, use a reverse proxy (nginx, Caddy, Traefik) to:
- Enable HTTPS
- Handle SSL/TLS certificates
- Improve security
- Use standard ports (80/443)

#### Example: nginx Configuration

```nginx
# /etc/nginx/sites-available/drone
server {
    listen 80;
    server_name drone.example.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name drone.example.com;
    
    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/drone.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drone.example.com/privkey.pem;
    
    # Proxy to Drone
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

After setting up nginx:
```bash
# Update .env.drone
DRONE_SERVER_HOST=drone.example.com
DRONE_SERVER_PROTO=https

# Update GitHub OAuth callback URL to:
# https://drone.example.com/login

# Restart Drone
docker compose -f docker-compose.drone.yml restart
```

### Security Hardening

1. **Close Registration**:
   ```bash
   DRONE_REGISTRATION_CLOSED=true
   ```

2. **Create Admin User**:
   ```bash
   DRONE_USER_CREATE=username:your-github-username,admin:true
   ```

3. **Use Strong Secrets**:
   ```bash
   # Generate strong secrets
   openssl rand -hex 32  # For RPC secret
   openssl rand -base64 32  # For database password
   ```

4. **Restrict GitHub Access**:
   - In GitHub OAuth App settings, restrict to specific organizations
   - Use GitHub webhooks with secret tokens

5. **Monitor Logs**:
   ```bash
   docker compose -f docker-compose.drone.yml logs -f drone-server
   ```

## Integration with NoteHub

Both NoteHub and Drone CI can run simultaneously on the same server:

```bash
# Start NoteHub (uses port 80)
docker compose up -d

# Start Drone CI (uses port 8080)
docker compose -f docker-compose.drone.yml up -d

# Both services are now running without conflicts
```

### Access Both Services

- **NoteHub**: `http://your-server` (port 80)
- **Drone CI**: `http://your-server:8080` (port 8080)

### Using Drone CI for NoteHub

You can use Drone CI to build and test NoteHub automatically:

1. **Enable Repository** in Drone UI
2. **Create `.drone.yml`** in NoteHub repository:

```yaml
kind: pipeline
type: docker
name: default

steps:
  - name: test-backend
    image: node:20
    commands:
      - cd backend
      - npm install
      - npm run lint
      - npm test

  - name: test-frontend
    image: node:20
    commands:
      - cd frontend
      - npm install
      - npm run lint
      - npm run type-check
      - npm test

  - name: build
    image: node:20
    commands:
      - cd frontend
      - npm run build
```

3. **Push to GitHub** - Drone will automatically build on push

## Troubleshooting

### Cannot Access Drone UI

**Problem**: Cannot access `http://your-server:8080`

**Solutions**:
1. Check if services are running:
   ```bash
   docker compose -f docker-compose.drone.yml ps
   ```

2. Check firewall:
   ```bash
   # Allow port 8080
   sudo ufw allow 8080/tcp
   ```

3. Check logs:
   ```bash
   docker compose -f docker-compose.drone.yml logs drone-server
   ```

### GitHub OAuth Error

**Problem**: "Invalid OAuth configuration" or redirect errors

**Solutions**:
1. Verify callback URL in GitHub OAuth App:
   - Must match: `http://your-server:8080/login`
   - Or: `https://drone.example.com/login` (if using HTTPS)

2. Check environment variables:
   ```bash
   docker compose -f docker-compose.drone.yml exec drone-server env | grep DRONE_GITHUB
   ```

### Runner Not Connecting

**Problem**: Pipelines stuck in "pending" state

**Solutions**:
1. Check runner logs:
   ```bash
   docker compose -f docker-compose.drone.yml logs drone-runner
   ```

2. Verify RPC secret matches between server and runner:
   ```bash
   # Check in .env.drone
   grep DRONE_RPC_SECRET .env.drone
   ```

3. Restart runner:
   ```bash
   docker compose -f docker-compose.drone.yml restart drone-runner
   ```

### Port Already in Use

**Problem**: "Port 8080 already in use"

**Solutions**:
1. Find what's using the port:
   ```bash
   sudo lsof -i :8080
   ```

2. Change Drone's external port in `docker-compose.drone.yml`:
   ```yaml
   ports:
     - "8081:80"  # Use 8081 instead
   ```
   
3. Update `DRONE_SERVER_HOST` accordingly

### Database Connection Issues

**Problem**: Drone server cannot connect to database

**Solutions**:
1. Check database is running:
   ```bash
   docker compose -f docker-compose.drone.yml ps drone-db
   ```

2. Check database logs:
   ```bash
   docker compose -f docker-compose.drone.yml logs drone-db
   ```

3. Verify password in `.env.drone`

## Security Best Practices

1. **Never commit `.env.drone`** to version control
   ```bash
   # Add to .gitignore
   echo ".env.drone" >> .gitignore
   ```

2. **Use strong passwords** for all credentials
   ```bash
   # Generate secure passwords
   openssl rand -base64 32
   ```

3. **Enable HTTPS** in production
   - Use Let's Encrypt certificates
   - Configure reverse proxy (nginx/Caddy)

4. **Restrict GitHub access**
   - Use private repositories
   - Limit OAuth app scope

5. **Regular backups**
   ```bash
   # Backup PostgreSQL data (use -T to disable TTY)
   docker compose -f docker-compose.drone.yml exec -T drone-db \
     pg_dump -U drone drone > drone-backup-$(date +%Y%m%d).sql
   ```

6. **Monitor resource usage**
   ```bash
   docker stats
   ```

7. **Keep Docker images updated**
   ```bash
   docker compose -f docker-compose.drone.yml pull
   docker compose -f docker-compose.drone.yml up -d
   ```

## Resources

- [Drone CI Documentation](https://docs.drone.io/)
- [Drone CI GitHub](https://github.com/harness/drone)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)

## Next Steps

1. ✅ Set up Drone CI following this guide
2. 📝 Create `.drone.yml` for NoteHub repository
3. 🔄 Configure webhooks for automatic builds
4. 🔒 Enable HTTPS with reverse proxy
5. 📊 Monitor builds and optimize pipeline

---

For questions or issues, please check the [NoteHub issues](https://github.com/thienng-it/note-hub/issues) or [Drone community](https://discourse.drone.io/).
