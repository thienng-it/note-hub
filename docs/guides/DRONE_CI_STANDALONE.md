# Drone CI Standalone Deployment Guide

This guide explains how Drone CI can be deployed **completely independently** from NoteHub. Drone CI is a self-contained CI/CD platform that does not depend on NoteHub's infrastructure, configuration, or services.

## Table of Contents

- [Independence Overview](#independence-overview)
- [Standalone Architecture](#standalone-architecture)
- [Deployment Without NoteHub](#deployment-without-notehub)
- [Configuration Independence](#configuration-independence)
- [Network Independence](#network-independence)
- [Data Independence](#data-independence)
- [Use Cases](#use-cases)
- [Migration and Portability](#migration-and-portability)

## Independence Overview

**Drone CI is completely independent from NoteHub.** It can be:
- ✅ Deployed on the same server as NoteHub
- ✅ Deployed on a different server
- ✅ Deployed without NoteHub at all
- ✅ Moved between servers independently
- ✅ Configured, started, stopped, and managed separately

### What Drone CI Does NOT Depend On

| Dependency | Status | Explanation |
|------------|--------|-------------|
| **NoteHub Code** | ❌ Independent | Drone CI has its own codebase |
| **NoteHub Services** | ❌ Independent | Uses own nginx, database, services |
| **NoteHub Network** | ❌ Independent | Uses separate Docker network `drone-network` |
| **NoteHub Database** | ❌ Independent | Uses own PostgreSQL database |
| **NoteHub Configuration** | ❌ Independent | Uses separate `.env.drone` file |
| **NoteHub Ports** | ❌ Independent | Uses port 8080, NoteHub uses port 80 |
| **NoteHub Docker Compose** | ❌ Independent | Uses separate `docker-compose.drone.yml` |

### What is Shared (Optional)

The only shared resources when deployed on the same server:
- ✅ Docker daemon (system requirement)
- ✅ Physical server resources (CPU, RAM, disk)
- ✅ Operating system
- ✅ Domain/DNS (if using subdomains like `drone.example.com`)

These are normal for any multi-application deployment and do not create dependencies.

## Standalone Architecture

Drone CI is a complete, self-contained system:

```
┌─────────────────────────────────────────────────────────┐
│  Drone CI - Complete Independent System                 │
│                                                          │
│  ┌────────────────┐                                     │
│  │  nginx Proxy   │ ← Port 8080 (or any port you want) │
│  │  (port 8080)   │                                     │
│  └────────┬───────┘                                     │
│           │                                              │
│  ┌────────▼───────┐                                     │
│  │  Drone Server  │ ← Internal only                     │
│  │  (internal)    │                                     │
│  └────────┬───────┘                                     │
│           │                                              │
│  ┌────────▼───────┐                                     │
│  │  Drone Runner  │ ← Internal only                     │
│  │  (internal)    │                                     │
│  └────────┬───────┘                                     │
│           │                                              │
│  ┌────────▼───────┐                                     │
│  │  PostgreSQL    │ ← Internal only                     │
│  │  (internal)    │                                     │
│  └────────────────┘                                     │
│                                                          │
│  Network: drone-network (isolated)                      │
│  Volumes: drone-data, drone-postgres-data               │
│  Config:  .env.drone (independent)                      │
└─────────────────────────────────────────────────────────┘
```

**No arrows or connections to NoteHub** - it's a completely separate system.

## Deployment Without NoteHub

You can deploy Drone CI on a **completely separate server** without NoteHub:

### Scenario 1: Dedicated CI/CD Server

```bash
# On a fresh server (no NoteHub)
ssh your-ci-server

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone just the Drone CI files (or copy them)
mkdir drone-ci
cd drone-ci

# Copy these files (can be extracted from the repository):
# - docker-compose.drone.yml
# - .env.drone.example
# - docker/nginx-drone.conf

# Configure
cp .env.drone.example .env.drone
nano .env.drone  # Set your GitHub OAuth credentials

# Deploy
docker compose -f docker-compose.drone.yml up -d

# Access at http://your-ci-server:8080
```

### Scenario 2: Different Cloud Provider

You can deploy Drone CI on a completely different infrastructure:

```bash
# NoteHub on Hetzner VPS
# Drone CI on AWS EC2 / DigitalOcean / Google Cloud

# Same deployment steps - completely independent
```

### Scenario 3: Corporate Environment

Deploy Drone CI behind your corporate firewall:

```bash
# Deploy internally for private repositories
# No need for NoteHub to be present

docker compose -f docker-compose.drone.yml up -d
```

## Configuration Independence

### Separate Configuration Files

Drone CI uses its **own configuration file** (`.env.drone`) which is completely separate from NoteHub's `.env` file.

**`.env.drone`** (Drone CI configuration):
```bash
# GitHub OAuth (independent from NoteHub)
DRONE_GITHUB_CLIENT_ID=your-drone-github-client-id
DRONE_GITHUB_CLIENT_SECRET=your-drone-github-client-secret

# Server configuration (independent)
DRONE_SERVER_HOST=drone.example.com
DRONE_RPC_SECRET=your-unique-secret

# Database (independent)
DRONE_POSTGRES_PASSWORD=your-secure-password
```

**`.env`** (NoteHub configuration - if present):
```bash
# Completely separate configuration
SECRET_KEY=notehub-secret
NOTES_ADMIN_PASSWORD=notehub-password
```

**No variables are shared between these files.**

### GitHub OAuth Independence

Drone CI requires its **own GitHub OAuth App**:

1. Go to https://github.com/settings/developers
2. Create **separate OAuth App** for Drone CI
3. Set callback URL: `http://your-drone-server:8080/login`
4. Use these credentials **only** in `.env.drone`

This is **completely independent** from any NoteHub OAuth configuration.

## Network Independence

### Separate Docker Networks

```bash
# List Docker networks
docker network ls

# You'll see:
# notehub-network  (used by NoteHub - if present)
# drone-network    (used by Drone CI)
```

These networks are **completely isolated**:
- Drone CI containers **cannot** communicate with NoteHub containers
- NoteHub containers **cannot** communicate with Drone CI containers
- No shared network means no security vulnerabilities between apps

### Verify Network Isolation

```bash
# Inspect Drone CI network
docker network inspect drone-network

# Shows only Drone CI containers:
# - drone-traefik
# - drone-server
# - drone-runner
# - drone-db

# Inspect NoteHub network (if present)
docker network inspect notehub-network

# Shows only NoteHub containers - no Drone CI containers
```

## Data Independence

### Separate Data Volumes

Drone CI stores data in its **own Docker volumes**:

```bash
# List volumes
docker volume ls

# Drone CI volumes (independent):
# - drone-data (Drone server data)
# - drone-postgres-data (Database data)

# NoteHub volumes (if present, separate):
# - notehub-data
# - notehub-uploads
```

### Independent Backups

Backup Drone CI data **independently**:

```bash
# Backup Drone CI database
docker compose -f docker-compose.drone.yml exec -T drone-db \
  pg_dump -U drone drone > drone-backup-$(date +%Y%m%d).sql

# This does NOT backup NoteHub data
# Each system is backed up separately
```

### Data Portability

Move Drone CI data to another server:

```bash
# Export volumes
docker run --rm -v drone-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/drone-data.tar.gz /data

# Import on new server
docker run --rm -v drone-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/drone-data.tar.gz -C /
```

## Use Cases

### Use Case 1: CI/CD for Multiple Projects

Deploy Drone CI to handle CI/CD for **all your projects**, not just NoteHub:

```yaml
# .drone.yml in any project
kind: pipeline
type: docker
name: default

steps:
  - name: test
    image: node:20
    commands:
      - npm install
      - npm test
```

Drone CI works with **any GitHub repository**, not just NoteHub.

### Use Case 2: Team CI/CD Server

Deploy Drone CI as a **shared CI/CD platform** for your team:

```bash
# One Drone CI server
# Multiple developers
# Multiple projects
# No NoteHub needed
```

### Use Case 3: Client Projects

Deploy Drone CI for **client projects**:

```bash
# Client 1: Drone CI on their server
# Client 2: Drone CI on their server
# Your infrastructure: NoteHub only

# Each deployment is independent
```

## Migration and Portability

### Scenario: Move Drone CI to Different Server

Drone CI can be moved **without affecting NoteHub**:

**Step 1: Backup on old server**
```bash
cd /path/to/drone
docker compose -f docker-compose.drone.yml down
docker run --rm -v drone-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/drone-backup.tar.gz /data
```

**Step 2: Deploy on new server**
```bash
ssh new-server
mkdir drone-ci
cd drone-ci
# Copy files: docker-compose.drone.yml, .env.drone, docker/nginx-drone.conf
```

**Step 3: Restore and start**
```bash
docker run --rm -v drone-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/drone-backup.tar.gz -C /
docker compose -f docker-compose.drone.yml up -d
```

**Step 4: Update DNS/GitHub OAuth callback URL**
```bash
# Point drone.example.com to new server
# Update GitHub OAuth App callback URL to new server
```

**NoteHub is not affected at all** during this migration.

### Scenario: Remove NoteHub, Keep Drone CI

You can remove NoteHub while keeping Drone CI running:

```bash
# Stop and remove NoteHub
docker compose down -v  # Removes NoteHub

# Drone CI continues running normally
docker compose -f docker-compose.drone.yml ps
# All Drone CI services still running

# Drone CI is completely unaffected
```

### Scenario: Remove Drone CI, Keep NoteHub

You can remove Drone CI while keeping NoteHub running:

```bash
# Stop and remove Drone CI
docker compose -f docker-compose.drone.yml down -v

# NoteHub continues running normally
docker compose ps
# All NoteHub services still running
```

## Port Management

Drone CI uses port **8080 by default**, but this is **completely configurable**:

### Change Drone CI Port

Edit `docker-compose.drone.yml`:

```yaml
drone-traefik:
  ports:
    - "9000:80"   # Use port 9000 instead
    - "9443:443"  # HTTPS port
```

Update `.env.drone`:

```bash
DRONE_SERVER_HOST=your-server:9000
```

Update GitHub OAuth callback:
```
http://your-server:9000/login
```

**NoteHub remains on port 80** - completely independent.

### Multiple Drone CI Instances

You can even run **multiple Drone CI instances** independently:

```yaml
# drone-ci-team1/docker-compose.yml
drone-traefik:
  ports:
    - "8080:80"
    - "8443:443"

# drone-ci-team2/docker-compose.yml
drone-traefik:
  ports:
    - "8081:80"
    - "8444:443"
```

Each with its own:
- Configuration (`.env.drone`)
- Network (`drone-network-team1`, `drone-network-team2`)
- Data volumes
- GitHub OAuth app

## Docker Compose Independence

### Separate Docker Compose Files

```bash
# NoteHub deployment
docker compose up -d
# Uses: docker-compose.yml

# Drone CI deployment
docker compose -f docker-compose.drone.yml up -d
# Uses: docker-compose.drone.yml
```

These are **completely separate** Docker Compose stacks:
- Can be started/stopped independently
- Can be on different servers
- No shared services
- No shared networks
- No shared volumes

### Service Management

```bash
# Restart NoteHub (does NOT restart Drone CI)
docker compose restart

# Restart Drone CI (does NOT restart NoteHub)
docker compose -f docker-compose.drone.yml restart

# Update NoteHub (does NOT affect Drone CI)
git pull
docker compose pull
docker compose up -d

# Update Drone CI (does NOT affect NoteHub)
docker compose -f docker-compose.drone.yml pull
docker compose -f docker-compose.drone.yml up -d
```

## Resource Isolation

While deployed on the same server, resources are **logically isolated**:

### CPU and Memory

```bash
# Set resource limits for Drone CI
# Edit docker-compose.drone.yml

drone-server:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M

drone-runner:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 2G
```

### Disk Space

Each system uses its own volumes:

```bash
# Check Drone CI disk usage
docker system df -v | grep drone

# Check NoteHub disk usage
docker system df -v | grep notehub
```

## Monitoring Independence

Monitor each system separately:

```bash
# Monitor Drone CI only
docker compose -f docker-compose.drone.yml logs -f

# Monitor NoteHub only
docker compose logs -f

# Monitor specific Drone CI service
docker compose -f docker-compose.drone.yml logs -f drone-server
```

## Summary: Complete Independence

**Drone CI is a standalone application** that can be:

✅ **Deployed anywhere** - same server, different server, cloud, on-premise
✅ **Configured independently** - separate `.env.drone` file
✅ **Networked separately** - isolated Docker network
✅ **Stored separately** - independent Docker volumes
✅ **Managed separately** - separate Docker Compose stack
✅ **Moved independently** - backup and restore without NoteHub
✅ **Scaled independently** - adjust resources as needed
✅ **Updated independently** - pull new versions separately

**What happens if NoteHub is removed?**
- Drone CI continues to work normally
- No configuration changes needed
- No data loss
- No service interruption

**What happens if Drone CI is removed?**
- NoteHub continues to work normally
- No configuration changes needed
- No data loss
- No service interruption

## Next Steps

Ready to deploy Drone CI independently?

1. **Standalone deployment**: See [DRONE_CI_SETUP.md](DRONE_CI_SETUP.md)
2. **Configuration details**: See [environment variables documentation](.env.drone.example)
3. **Port management**: See [PORT_ALLOCATION.md](PORT_ALLOCATION.md)
4. **Dual deployment** (optional): See [DUAL_DEPLOYMENT_EXAMPLE.md](DUAL_DEPLOYMENT_EXAMPLE.md)

---

**Key Takeaway**: Drone CI is **completely independent**. The fact that it can be deployed alongside NoteHub is a **convenience**, not a **dependency**.
