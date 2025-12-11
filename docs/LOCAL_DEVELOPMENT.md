# Local Development Setup Guide

This guide helps you set up NoteHub for local development without registry cache warnings.

## Quick Start

### Option 1: Simple Setup (with warnings)
Just ignore the cache warnings - they're harmless:

```bash
# Copy environment file
cp .env.example .env

# Edit .env and set NOTES_ADMIN_PASSWORD
nano .env

# Build and run
docker compose build
docker compose up -d
```

**Expected warnings** (safe to ignore):
```
=> importing cache manifest from ghcr.io/thienng-it/note-hub/backend:cache
=> importing cache manifest from ghcr.io/thienng-it/note-hub/frontend:cache
```

### Option 2: Clean Setup (no warnings)
Use the local development override:

```bash
# Copy environment file
cp .env.example .env

# Edit .env and set NOTES_ADMIN_PASSWORD
nano .env

# Build with local override (no registry cache warnings)
docker compose -f docker-compose.yml -f docker-compose.local.yml build
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

Or set an environment variable to always use the local override:

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export COMPOSE_FILE=docker-compose.yml:docker-compose.local.yml

# Then use docker compose normally
docker compose build
docker compose up -d
```

## What's the Difference?

### docker-compose.yml (Default)
- Includes registry cache configuration for CI/CD pipelines
- Tries to pull cached layers from GitHub Container Registry
- Shows warnings in local development (registry doesn't exist)
- **Use this**: In CI/CD environments, production deployments

### docker-compose.local.yml (Local Override)
- Removes registry cache configuration
- No warning messages during local builds
- Still uses BuildKit cache mounts (fast local builds)
- **Use this**: Local development on your machine

## Understanding the Cache

### Registry Cache (cache_from/cache_to)
- Configured in: `docker-compose.yml`
- Purpose: Share cache between CI/CD builds
- Location: GitHub Container Registry (ghcr.io)
- Local behavior: Shows warnings (doesn't exist locally)

### BuildKit Cache Mounts (in Dockerfiles)
- Configured in: Dockerfiles with `RUN --mount=type=cache`
- Purpose: Cache npm packages locally
- Location: Docker BuildKit cache on your machine
- Benefits: 87% faster rebuilds
- **Always works**: Whether you use docker-compose.yml or docker-compose.local.yml

## Troubleshooting

### "SQLITE_READONLY: attempt to write a readonly database"
This is fixed automatically by the entrypoint scripts. Just rebuild:

```bash
docker compose down
docker compose build
docker compose up -d
```

Check logs to verify the fix:
```bash
docker compose logs backend | grep "Fixed permissions"
# Should show:
# Running as root, fixing permissions for appuser...
# Fixed permissions for /app/data
# Switching to appuser and starting application...
```

### Cache Warnings Won't Go Away
Make sure you're using the local override:

```bash
# Check which compose files are being used
docker compose config --files

# Should show:
# docker-compose.yml
# docker-compose.local.yml (if using override)
```

### Build Still Slow
BuildKit cache mounts should make rebuilds fast. Check:

```bash
# Verify BuildKit is enabled
docker info | grep BuildKit
# Should show: BuilderName: default

# Check Docker version (need >= 20.10)
docker version
```

## Development Workflow

### First Time Setup
```bash
# 1. Clone and setup
git clone https://github.com/thienng-it/note-hub.git
cd note-hub
cp .env.example .env
# Edit .env and set NOTES_ADMIN_PASSWORD

# 2. Build and run (choose one):
# Option A: With warnings (simpler)
docker compose build && docker compose up -d

# Option B: No warnings (cleaner)
export COMPOSE_FILE=docker-compose.yml:docker-compose.local.yml
docker compose build && docker compose up -d

# 3. Seed database
docker compose exec backend node scripts/seed_db.js

# 4. Access application
open http://localhost
```

### Daily Development
```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop services
docker compose down

# Rebuild after code changes
docker compose build
docker compose up -d
```

### Reset Everything
```bash
# Stop and remove containers, volumes, and images
docker compose down -v --rmi local

# Clean rebuild
docker compose build --no-cache
docker compose up -d
docker compose exec backend node scripts/seed_db.js
```

## Using Different Profiles

### Default (SQLite)
```bash
docker compose up -d
```

### With MySQL
```bash
# Set MySQL credentials in .env first
docker compose --profile mysql up -d
docker compose exec backend-mysql node scripts/seed_db.js
```

### Production Mode
```bash
docker compose --profile production up -d
# Do NOT seed - use pre-configured cloud database
```

## Additional Resources

- [DOCKER_OPTIMIZATION.md](docs/DOCKER_OPTIMIZATION.md) - Complete optimization guide
- [REQUIRED_FILES.md](docs/REQUIRED_FILES.md) - File requirements for each service
- [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker compose build` | Build images |
| `docker compose up -d` | Start in background |
| `docker compose down` | Stop and remove containers |
| `docker compose logs -f` | Follow logs |
| `docker compose ps` | List running services |
| `docker compose exec backend bash` | Shell into backend |
| `docker stats` | Resource usage |

## Questions?

Check the [DOCKER_OPTIMIZATION.md](docs/DOCKER_OPTIMIZATION.md) troubleshooting section for common issues and solutions.
