# Drone CI Deployment - Complete Overview

This document provides a comprehensive overview of the automated deployment setup for NoteHub using Drone CI.

## Table of Contents

- [System Architecture](#system-architecture)
- [Deployment Flow](#deployment-flow)
- [Components](#components)
- [Setup Summary](#setup-summary)
- [Quick Links](#quick-links)

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Developer Workflow                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ git push origin main
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          GitHub Repository                          │
│                     github.com/thienng-it/note-hub                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ webhook trigger
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Drone CI Server                            │
│                       http://your-server:8080                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    CI/CD Pipeline                            │  │
│  │                                                              │  │
│  │  Step 1: backend-lint         ✓ npm run lint               │  │
│  │  Step 2: backend-test         ✓ npm test --coverage        │  │
│  │  Step 3: frontend-lint        ✓ npm run lint               │  │
│  │  Step 4: frontend-type-check  ✓ npm run type-check         │  │
│  │  Step 5: frontend-test        ✓ npm test                   │  │
│  │  Step 6: frontend-build       ✓ npm run build              │  │
│  │  Step 7: deploy-production    ✓ SSH deploy                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ SSH connection
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Production VPS Server                         │
│                        /opt/note-hub                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Deployment Script (deploy.sh)                   │  │
│  │                                                              │  │
│  │  1. Create backup           → backups/backup_*.tar.gz       │  │
│  │  2. Pull latest code        → git pull origin main          │  │
│  │  3. Build Docker images     → docker compose build          │  │
│  │  4. Restart services        → docker compose up -d          │  │
│  │  5. Health check            → verify services running       │  │
│  │  6. Cleanup                 → docker system prune           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Running Services                          │  │
│  │                                                              │  │
│  │  • Traefik (port 80/443)   → SSL termination & routing      │  │
│  │  • Backend (Node.js)       → API server                     │  │
│  │  • Frontend (nginx)        → React SPA                      │  │
│  │  • MySQL (optional)        → Database                       │  │
│  │  • Redis (optional)        → Caching                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              Users                                  │
│                    https://your-domain.com                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Deployment Flow

### Detailed Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Development & Commit                                       │
└─────────────────────────────────────────────────────────────────────┘

Developer's Machine
  │
  ├─► Edit code (backend/frontend)
  ├─► Test locally (npm test)
  ├─► Commit changes (git commit)
  └─► Push to GitHub (git push origin main)

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Continuous Integration (Drone CI)                         │
└─────────────────────────────────────────────────────────────────────┘

Drone CI Server (http://your-server:8080)
  │
  ├─► 1. Detect push via webhook
  │    └─► GitHub → Drone webhook
  │
  ├─► 2. Start pipeline in Docker container
  │    └─► Pull repository code
  │
  ├─► 3. Backend Testing (node:20-alpine)
  │    ├─► npm install
  │    ├─► npm run lint          ✓ Code quality
  │    └─► npm test              ✓ Unit & integration tests
  │
  ├─► 4. Frontend Testing (node:20-alpine)
  │    ├─► npm install
  │    ├─► npm run lint          ✓ Code quality
  │    ├─► npm run type-check    ✓ TypeScript validation
  │    └─► npm test              ✓ Component & snapshot tests
  │
  ├─► 5. Build (node:20-alpine)
  │    ├─► npm install
  │    └─► npm run build         ✓ Production build
  │
  └─► 6. All tests passed? → Continue to deployment

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Deployment (SSH to Production)                            │
└─────────────────────────────────────────────────────────────────────┘

Drone CI connects to Production Server
  │
  ├─► 1. SSH Connection
  │    ├─► Host: production_host (from secret)
  │    ├─► User: production_username (from secret)
  │    └─► Auth: production_ssh_key (from secret)
  │
  └─► 2. Execute deployment script

Production Server (/opt/note-hub)
  │
  ├─► scripts/deploy.sh
  │
  ├─► STEP 1: Validate Prerequisites
  │    ├─► Check Docker is running
  │    ├─► Check Docker Compose available
  │    └─► Verify git repository exists
  │
  ├─► STEP 2: Create Backup
  │    ├─► Create backups/ directory
  │    ├─► Backup database (backend/data/)
  │    ├─► Backup uploads (backend/uploads/)
  │    ├─► Backup environment (.env)
  │    └─► Keep last 5 backups
  │
  ├─► STEP 3: Pull Latest Code
  │    ├─► Stash local changes (if any)
  │    ├─► git pull origin main
  │    └─► Show current commit
  │
  ├─► STEP 4: Build & Deploy
  │    ├─► docker compose pull     (pull base images)
  │    ├─► docker compose build    (build application)
  │    └─► docker compose up -d    (restart services)
  │
  ├─► STEP 5: Verify Deployment
  │    ├─► Wait for services to start (10s)
  │    ├─► Check backend health
  │    ├─► View running containers
  │    └─► Show recent logs
  │
  └─► STEP 6: Cleanup
       ├─► Remove unused Docker images
       ├─► Remove unused volumes
       └─► Free up disk space

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Post-Deployment                                           │
└─────────────────────────────────────────────────────────────────────┘

Services Running
  │
  ├─► Traefik (reverse proxy)
  │    ├─► Port 80 → HTTP (redirects to HTTPS)
  │    ├─► Port 443 → HTTPS
  │    └─► Automatic SSL certificates
  │
  ├─► Frontend (nginx + React)
  │    └─► Serves static files
  │
  ├─► Backend (Node.js + Express)
  │    ├─► API endpoints
  │    ├─► JWT authentication
  │    └─► Database connection
  │
  └─► Database (MySQL/SQLite)
       └─► Persistent data storage

Users Access Application
  │
  └─► https://your-domain.com → Production site updated! ✓
```

## Components

### 1. Source Code Repository

**Location**: `github.com/thienng-it/note-hub`

**Key Files**:
- `.drone.yml` - CI/CD pipeline configuration
- `scripts/deploy.sh` - Deployment automation script
- `docker-compose.yml` - Production services configuration

### 2. Drone CI Server

**Location**: `http://your-server:8080`

**Services**:
- `drone-traefik` - Reverse proxy (port 8080/8443)
- `drone-server` - CI/CD server
- `drone-runner` - Pipeline executor
- `drone-db` - PostgreSQL database

**Configuration**:
- `.env.drone` - Drone CI configuration
- `docker-compose.drone.yml` - Drone services

### 3. Production VPS

**Location**: `/opt/note-hub`

**Services**:
- `traefik` - Reverse proxy (port 80/443)
- `backend` - Node.js API
- `frontend` - React SPA
- `mysql` - Database (optional)
- `redis` - Cache (optional)

**Configuration**:
- `.env` - Application configuration
- `docker-compose.yml` - Production services

## Setup Summary

### Prerequisites

1. **VPS Server** with:
   - Docker & Docker Compose installed
   - Drone CI running on port 8080
   - NoteHub repository cloned to `/opt/note-hub`

2. **SSH Access**:
   - SSH key-based authentication
   - Public key added to server
   - Private key added to Drone secrets

3. **Drone CI Secrets**:
   - `production_host` - Server IP/domain
   - `production_username` - SSH username
   - `production_ssh_key` - SSH private key

### Setup Steps

```bash
# 1. Generate SSH key
ssh-keygen -t ed25519 -C "drone-deploy" -f ~/.ssh/drone-deploy

# 2. Copy public key to server
ssh-copy-id -i ~/.ssh/drone-deploy.pub user@your-server

# 3. Add secrets to Drone CI
# Go to http://your-server:8080
# Navigate to repository → Settings → Secrets
# Add: production_host, production_username, production_ssh_key

# 4. Test deployment
git commit --allow-empty -m "test: trigger deployment"
git push origin main

# 5. Monitor in Drone CI
# Watch build at http://your-server:8080
```

## Quick Links

### Documentation

- **[DRONE_CI_DEPLOYMENT.md](DRONE_CI_DEPLOYMENT.md)** - Complete deployment guide (full details)
- **[DRONE_CI_DEPLOYMENT_QUICK.md](DRONE_CI_DEPLOYMENT_QUICK.md)** - Quick 5-minute setup
- **[DRONE_CI_SECRETS_SETUP.md](DRONE_CI_SECRETS_SETUP.md)** - How to configure secrets
- **[DRONE_CI_SETUP.md](DRONE_CI_SETUP.md)** - Drone CI installation

### Configuration Files

- `.drone.yml` - Pipeline configuration
- `.drone.yml.example` - Pipeline example with comments
- `scripts/deploy.sh` - Deployment script
- `.env.drone.example` - Drone CI configuration example

### Monitoring

- **Drone CI UI**: `http://your-server:8080`
- **Production Site**: `https://your-domain.com`
- **Logs**: `docker compose logs -f` (on production server)

## Troubleshooting

### Deployment Failed

**Check**:
1. Drone CI build logs
2. SSH connection (test manually)
3. Secrets configured correctly
4. Production server logs

### Services Not Starting

**Check**:
1. `docker compose ps` on server
2. `docker compose logs` for errors
3. Disk space: `df -h`
4. Memory: `free -h`

### Rollback Needed

**Execute**:
```bash
# SSH to server
ssh user@your-server
cd /opt/note-hub

# List backups
ls -lh backups/

# Restore from backup
tar -xzf backups/backup_YYYYMMDD_HHMMSS.tar.gz
docker compose restart
```

## Benefits

### Automated Deployment Benefits

✅ **Consistency** - Same process every time
✅ **Speed** - Deploys in minutes, not hours
✅ **Safety** - Automatic backups before deployment
✅ **Reliability** - Tests must pass before deploying
✅ **Traceability** - Full audit trail in Drone CI
✅ **Rollback** - Easy to revert if needed

### Development Workflow Benefits

✅ **Fast feedback** - Know immediately if code breaks
✅ **Confidence** - Tests catch bugs before production
✅ **Automation** - No manual deployment steps
✅ **Collaboration** - Anyone can deploy by pushing to main
✅ **Documentation** - Pipeline is self-documenting

## Next Steps

After setting up automated deployment:

1. **Test the pipeline** - Push small changes to verify
2. **Monitor deployments** - Watch first few deployments
3. **Set up notifications** - Get alerts on build status
4. **Add staging environment** - Test before production
5. **Implement approval gates** - Require manual approval for production

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Maintained by**: NoteHub Development Team
