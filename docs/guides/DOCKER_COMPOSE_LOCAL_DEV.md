# Docker Compose for Local Development

This guide explains how to use Docker Compose for local development of NoteHub, including troubleshooting common issues.

## Overview

NoteHub provides three Docker Compose configurations:

1. **docker-compose.yml** - Full production configuration with registry caching
2. **docker-compose.dev.yml** - Simplified development configuration (recommended)
3. **docker-compose.local.yml** - Override file to disable caching

## Quick Start (Recommended)

The easiest way to get started with Docker Compose for local development:

```bash
# 1. Clone the repository
git clone https://github.com/thienng-it/note-hub.git
cd note-hub

# 2. Copy and configure environment
cp .env.example .env
nano .env  # Set NOTES_ADMIN_PASSWORD and other values

# 3. Build and run with simplified development configuration
docker compose -f docker-compose.dev.yml up -d

# 4. Seed the database with sample data
docker compose -f docker-compose.dev.yml exec backend node scripts/seed_db.js

# 5. Access the application
# Open http://localhost (redirects to https://localhost)
# Note: Browser will show security warning for self-signed cert in dev
```

## Configuration Files Explained

### docker-compose.yml

The main production-ready configuration with:
- ✅ Multi-stage builds for optimized images
- ✅ Registry cache for faster CI/CD builds
- ✅ Multiple deployment profiles (production, mysql)
- ✅ Full Traefik integration with SSL
- ⚠️ Requires GitHub Container Registry authentication for cache

**When to use:**
- Production deployments
- Testing production configuration locally
- CI/CD pipelines with registry access

**Potential issues:**
- Cache registry errors (403 Forbidden from ghcr.io) without authentication

### docker-compose.dev.yml

Simplified development configuration with:
- ✅ No registry cache (no authentication needed)
- ✅ BuildKit cache mounts for fast local rebuilds
- ✅ All essential services (traefik, backend, frontend)
- ✅ Development mode (SQLite database)
- ✅ Clean, easy-to-understand structure

**When to use:**
- Local development (recommended)
- First-time setup
- Avoiding cache registry errors
- Learning the project structure

**Benefits:**
- No authentication required
- Faster startup (no cache fetch attempts)
- Simpler configuration

### docker-compose.local.yml

Override file that removes cache directives from docker-compose.yml:
- ✅ Disables registry cache
- ✅ Keeps all other docker-compose.yml features
- ⚠️ Requires combining with docker-compose.yml

**When to use:**
- When you need production profiles but without cache
- Testing with MySQL profile locally
- Advanced configuration customization

**Usage:**
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

## Common Issues and Solutions

### Issue 1: Cache Registry Errors (403 Forbidden)

**Error message:**
```
failed to configure registry cache importer: failed to authorize: 
failed to fetch anonymous token: 403 Forbidden
```

**Why this happens:**
The main `docker-compose.yml` includes cache directives that reference GitHub Container Registry (ghcr.io). These require authentication for private repositories.

**Solution A - Use docker-compose.dev.yml (Recommended):**
```bash
docker compose -f docker-compose.dev.yml up -d
```

**Solution B - Use override file:**
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

**Solution C - Set COMPOSE_FILE environment variable:**
```bash
export COMPOSE_FILE=docker-compose.dev.yml
docker compose up -d
```

**Solution D - Ignore the warnings:**
The cache errors are non-fatal warnings. The build will continue and succeed:
```bash
# Build will complete successfully despite cache warnings
docker compose up -d
```

### Issue 2: Network Timeout During Build

**Error message:**
```
WARNING: fetching https://dl-cdn.alpinelinux.org/alpine/v3.21/main: Permission denied
ERROR: unable to select packages
```

**Why this happens:**
Alpine Linux package manager (apk) cannot reach package repositories. This can be caused by:
- Network connectivity issues
- Firewall blocking package repositories
- DNS resolution problems
- Temporary repository outages

**Solutions:**

**A. Wait and retry:**
```bash
# Often just a temporary network issue
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d --build
```

**B. Change DNS (Linux/Mac):**
```bash
# Use Google DNS
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf

# Or use Cloudflare DNS
echo "nameserver 1.1.1.1" | sudo tee /etc/resolv.conf
```

**C. Check Docker daemon DNS:**
```json
// /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}
```

```bash
sudo systemctl restart docker
```

**D. Use local development instead:**
If Docker networking continues to be problematic, run services directly:
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

### Issue 3: Container Won't Start - Missing Environment Variables

**Error message:**
```
error: required variable is not set: NOTES_ADMIN_PASSWORD
```

**Solution:**
```bash
# Copy and configure .env file
cp .env.example .env
nano .env  # Set all required variables

# Restart containers
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

**Required variables:**
- `SECRET_KEY` - JWT secret key
- `NOTES_ADMIN_PASSWORD` - Admin account password (min 12 chars)

**Optional but recommended:**
- `REDIS_URL` - For caching (10x performance boost)
- `ELASTICSEARCH_NODE` - For full-text search (5x faster)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google OAuth

### Issue 4: Port Already in Use

**Error message:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:80: bind: address already in use
```

**Solution:**
```bash
# Check what's using the port
sudo lsof -i :80
sudo lsof -i :443

# Stop the conflicting service
sudo systemctl stop nginx  # If nginx is running
sudo systemctl stop apache2  # If Apache is running

# Or change ports in docker-compose.dev.yml
nano docker-compose.dev.yml
# Change "80:80" to "8080:80"
# Change "443:443" to "8443:443"
```

### Issue 5: Database Seeding Fails

**Error message:**
```
Error: NOTES_ADMIN_PASSWORD environment variable is not set
```

**Solution:**
```bash
# Make sure backend container has environment variables
docker compose -f docker-compose.dev.yml exec backend env | grep NOTES_ADMIN_PASSWORD

# If not set, restart with correct .env
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d

# Wait for backend to be healthy
docker compose -f docker-compose.dev.yml ps

# Then seed
docker compose -f docker-compose.dev.yml exec backend node scripts/seed_db.js
```

## Development Workflow

### Recommended: Direct Node.js Development

For active development, running directly with Node.js is faster:

```bash
# Terminal 1: Backend
cd backend
npm install
cp .env.example .env
nano .env  # Configure environment
npm run dev  # Hot reload enabled

# Terminal 2: Frontend  
cd frontend
npm install
cp .env.example .env
nano .env  # Set VITE_API_URL=http://localhost:5000
npm run dev  # Hot module replacement
```

**Advantages:**
- ⚡ Instant hot reload
- 🐛 Better debugging (direct access to Node.js inspector)
- 📊 Clear console output
- 🔄 No container restart needed

### Docker Compose for Integration Testing

Use Docker Compose when you need:
- Testing production-like environment
- Testing Traefik routing and SSL
- Testing with MySQL instead of SQLite
- Multi-service integration
- Containerized deployment validation

```bash
# Use docker-compose.dev.yml for testing
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend

# Rebuild after code changes
docker compose -f docker-compose.dev.yml up -d --build

# Clean up
docker compose -f docker-compose.dev.yml down -v  # -v removes volumes
```

## MySQL Development Mode

To test with MySQL instead of SQLite:

```bash
# Set MySQL credentials in .env
nano .env
# Add:
# MYSQL_ROOT_PASSWORD=your-root-password
# MYSQL_USER=notehub
# MYSQL_PASSWORD=your-password
# MYSQL_DATABASE=notehub

# Run with MySQL profile
docker compose --profile mysql up -d

# Seed MySQL database
docker compose exec backend-mysql node scripts/seed_db.js

# Connect to MySQL for debugging
docker compose exec mysql mysql -u notehub -p notehub
```

## Performance Tips

### BuildKit Cache

Docker BuildKit cache mounts speed up builds significantly. They're enabled by default in:
- ✅ docker-compose.dev.yml
- ✅ docker-compose.yml (with registry cache)
- ✅ docker-compose.local.yml

**Cache locations:**
- npm: `/root/.npm`
- apk: `/var/cache/apk`

**To clear cache:**
```bash
# Remove all build cache
docker builder prune -a

# Remove specific cache
docker volume rm $(docker volume ls -q -f name=buildkit)
```

### Layer Caching

Docker layer caching is automatic. To maximize benefit:

1. Don't change package.json often
2. Copy package.json before source code
3. Use .dockerignore to exclude unnecessary files

### Faster Rebuilds

```bash
# Only rebuild changed services
docker compose -f docker-compose.dev.yml up -d --build backend

# Parallel builds
COMPOSE_PARALLEL_LIMIT=4 docker compose -f docker-compose.dev.yml build

# No cache (clean build)
docker compose -f docker-compose.dev.yml build --no-cache
```

## Useful Commands

### Service Management

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Start specific service
docker compose -f docker-compose.dev.yml up -d backend

# Stop all services
docker compose -f docker-compose.dev.yml down

# Stop and remove volumes
docker compose -f docker-compose.dev.yml down -v

# Restart service
docker compose -f docker-compose.dev.yml restart backend

# View status
docker compose -f docker-compose.dev.yml ps
```

### Logs and Debugging

```bash
# View logs (all services)
docker compose -f docker-compose.dev.yml logs -f

# View logs (specific service)
docker compose -f docker-compose.dev.yml logs -f backend

# View last 100 lines
docker compose -f docker-compose.dev.yml logs --tail=100

# Execute command in container
docker compose -f docker-compose.dev.yml exec backend sh
docker compose -f docker-compose.dev.yml exec backend node scripts/seed_db.js

# Check environment variables
docker compose -f docker-compose.dev.yml exec backend env
```

### Database Management

```bash
# Access SQLite database
docker compose -f docker-compose.dev.yml exec backend sh
sqlite3 /app/data/notes.db

# Backup SQLite database
docker compose -f docker-compose.dev.yml exec backend sh -c 'cp /app/data/notes.db /app/data/notes.db.backup'

# Restore SQLite database
docker compose -f docker-compose.dev.yml exec backend sh -c 'cp /app/data/notes.db.backup /app/data/notes.db'

# Reset database (delete and reseed)
docker compose -f docker-compose.dev.yml exec backend sh -c 'rm -f /app/data/notes.db'
docker compose -f docker-compose.dev.yml restart backend
docker compose -f docker-compose.dev.yml exec backend node scripts/seed_db.js
```

### Image Management

```bash
# List images
docker images | grep notehub

# Remove unused images
docker image prune

# Remove all notehub images
docker rmi $(docker images | grep notehub | awk '{print $3}')

# Pull latest base images
docker compose -f docker-compose.dev.yml pull
```

## When to Use Each Approach

### Use docker-compose.dev.yml when:
- ✅ Starting local development
- ✅ First time setup
- ✅ Avoiding authentication issues
- ✅ Testing full stack integration
- ✅ Validating Traefik routing

### Use direct npm when:
- ✅ Active development with frequent code changes
- ✅ Debugging backend/frontend issues
- ✅ Maximum development speed
- ✅ Learning the codebase
- ✅ Not testing Docker-specific features

### Use docker-compose.yml when:
- ✅ Production deployment
- ✅ CI/CD pipelines
- ✅ Testing production configuration
- ✅ Have registry authentication
- ✅ Need production profiles (mysql, etc.)

## Further Reading

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker BuildKit](https://docs.docker.com/build/buildkit/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [NoteHub Hetzner Deployment Guide](./HETZNER_DEPLOYMENT.md)
- [NoteHub Environment Configuration](./ENVIRONMENT_CONFIGURATION.md)
