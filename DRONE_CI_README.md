# Drone CI - Independent CI/CD Platform

> **⚠️ IMPORTANT**: Drone CI is a **standalone, independent application**. It does not depend on NoteHub or any other application and can be deployed anywhere.

## Quick Facts

- ✅ **Independent**: Completely standalone application
- ✅ **Portable**: Can be deployed on any server with Docker
- ✅ **Isolated**: Separate network, configuration, and data storage
- ✅ **Flexible**: Works with or without NoteHub present
- ✅ **Self-contained**: All services included (nginx, server, runner, database)

## What is Drone CI?

Drone CI is a modern, container-native continuous integration and delivery platform. It automates building, testing, and deploying your code whenever you push changes to GitHub.

### Key Features

- 🐳 **Container-native**: Every build runs in a fresh Docker container
- 🔗 **GitHub Integration**: Automatic repository synchronization
- 🚀 **Easy Setup**: Deploy with a single Docker Compose command
- 🔒 **Secure**: OAuth authentication with GitHub
- ⚡ **Fast**: Parallel pipeline execution
- 📊 **Web UI**: Beautiful dashboard for managing builds

## Independence

**Drone CI is NOT dependent on NoteHub or any other application.**

### What This Means

- ✅ Can be deployed on a **different server** from other applications
- ✅ Can be deployed **without any other applications** present
- ✅ Has its **own configuration** (`.env.drone`)
- ✅ Has its **own network** (`drone-network`)
- ✅ Has its **own database** (PostgreSQL)
- ✅ Has its **own services** (nginx, server, runner)
- ✅ Can be **moved, updated, or removed** independently

### No Shared Resources

| Resource | Drone CI | Other Apps | Shared? |
|----------|----------|------------|---------|
| Configuration | `.env.drone` | `.env` | ❌ No |
| Network | `drone-network` | `other-network` | ❌ No |
| Database | `drone-db` (PostgreSQL) | Other databases | ❌ No |
| Services | nginx, server, runner | Other services | ❌ No |
| Ports | 8080 | 80, others | ❌ No |
| Data Volumes | `drone-data`, `drone-postgres-data` | Other volumes | ❌ No |

## Deployment Options

### Option 1: Standalone Server

Deploy Drone CI on its **own dedicated server**:

```bash
# On a fresh server
ssh your-ci-server

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Deploy Drone CI
git clone https://github.com/thienng-it/note-hub.git
cd note-hub

# Configure
cp .env.drone.example .env.drone
nano .env.drone  # Set GitHub OAuth credentials

# Deploy
docker compose -f docker-compose.drone.yml up -d

# Access at http://your-ci-server:8080
```

### Option 2: Same Server (Optional)

Deploy alongside other applications on the same server:

```bash
# Can coexist with other applications
# Uses different port (8080)
# Uses isolated network
# No conflicts or dependencies
```

### Option 3: Cloud Platform

Deploy on any cloud provider:

```bash
# AWS EC2, Google Cloud, DigitalOcean, Azure, etc.
# Same deployment process
# Completely independent infrastructure
```

## Quick Start

### Prerequisites

1. **Server** with Docker and Docker Compose installed
2. **GitHub Account** for OAuth authentication
3. **Domain or IP** accessible from the internet (optional)

### Deployment Steps

1. **Create GitHub OAuth App** (separate from any other apps):
   ```
   Go to: https://github.com/settings/developers
   Click: "New OAuth App"
   Set callback URL: http://your-server:8080/login
   ```

2. **Configure Drone CI**:
   ```bash
   cp .env.drone.example .env.drone
   nano .env.drone
   # Set DRONE_GITHUB_CLIENT_ID
   # Set DRONE_GITHUB_CLIENT_SECRET
   # Set DRONE_SERVER_HOST (your server IP or domain)
   # Set DRONE_RPC_SECRET (generate with: openssl rand -hex 16)
   # Set DRONE_POSTGRES_PASSWORD (strong password)
   ```

3. **Deploy**:
   ```bash
   docker compose -f docker-compose.drone.yml up -d
   ```

4. **Access**:
   ```
   Open: http://your-server:8080
   Login with GitHub
   ```

## Architecture

Drone CI is a complete, self-contained system:

```
┌─────────────────────────────────────────┐
│  Drone CI - Independent System          │
│                                          │
│  ┌────────────┐                         │
│  │   nginx    │ ← Port 8080             │
│  └──────┬─────┘                         │
│         │                                │
│  ┌──────▼─────┐                         │
│  │   Server   │ ← Internal              │
│  └──────┬─────┘                         │
│         │                                │
│  ┌──────▼─────┐                         │
│  │   Runner   │ ← Internal              │
│  └──────┬─────┘                         │
│         │                                │
│  ┌──────▼─────┐                         │
│  │ PostgreSQL │ ← Internal              │
│  └────────────┘                         │
│                                          │
│  Network: drone-network (isolated)      │
│  Config:  .env.drone (independent)      │
└─────────────────────────────────────────┘
```

No connections to other applications - completely isolated.

## Configuration Files

### Required Files

1. **`docker-compose.drone.yml`** - Defines Drone CI services
2. **`.env.drone`** - Configuration variables (create from `.env.drone.example`)
3. **`docker/nginx-drone.conf`** - nginx configuration

### Configuration Variables

All configuration is in **`.env.drone`** (independent from other apps):

```bash
# GitHub OAuth (separate app)
DRONE_GITHUB_CLIENT_ID=your-client-id
DRONE_GITHUB_CLIENT_SECRET=your-client-secret

# Server configuration
DRONE_SERVER_HOST=your-server:8080
DRONE_RPC_SECRET=your-unique-secret

# Database (independent)
DRONE_POSTGRES_PASSWORD=secure-password
```

## Management

### Start Drone CI

```bash
docker compose -f docker-compose.drone.yml up -d
```

### Stop Drone CI

```bash
docker compose -f docker-compose.drone.yml down
```

### View Logs

```bash
docker compose -f docker-compose.drone.yml logs -f
```

### Update Drone CI

```bash
docker compose -f docker-compose.drone.yml pull
docker compose -f docker-compose.drone.yml up -d
```

### Backup Data

```bash
# Backup database
docker compose -f docker-compose.drone.yml exec -T drone-db \
  pg_dump -U drone drone > drone-backup.sql

# Backup volumes
docker run --rm -v drone-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/drone-data.tar.gz /data
```

## Port Configuration

**Default**: Port 8080

**Change Port** (if needed):

Edit `docker-compose.drone.yml`:
```yaml
drone-nginx:
  ports:
    - "9000:80"  # Change to any available port
```

Update `.env.drone`:
```bash
DRONE_SERVER_HOST=your-server:9000
```

Update GitHub OAuth callback URL:
```
http://your-server:9000/login
```

## Using Drone CI

### Enable Repository

1. Access Drone UI: `http://your-server:8080`
2. Login with GitHub
3. Click "Sync" to see your repositories
4. Enable repositories you want to build

### Create Pipeline

Create `.drone.yml` in your repository:

```yaml
kind: pipeline
type: docker
name: default

steps:
  - name: test
    image: node:20
    commands:
      - npm install
      - npm test

  - name: build
    image: node:20
    commands:
      - npm run build
```

Push to GitHub - Drone CI will automatically build!

## Documentation

### Detailed Guides

- **[DRONE_CI_STANDALONE.md](docs/guides/DRONE_CI_STANDALONE.md)** - Complete independence documentation
- **[DRONE_CI_SETUP.md](docs/guides/DRONE_CI_SETUP.md)** - Detailed setup guide
- **[PORT_ALLOCATION.md](docs/guides/PORT_ALLOCATION.md)** - Port management
- **[DUAL_DEPLOYMENT_EXAMPLE.md](docs/guides/DUAL_DEPLOYMENT_EXAMPLE.md)** - Deploy with other apps (optional)

### Quick Reference

- **Configuration**: `.env.drone.example` - See all available settings
- **Docker Compose**: `docker-compose.drone.yml` - Service definitions
- **Setup Script**: `scripts/setup-drone.sh` - Automated setup
- **Tests**: `tests/test-drone-setup.sh` - Validation tests

## Troubleshooting

### Cannot Access UI

**Problem**: Cannot access `http://your-server:8080`

**Solutions**:
1. Check firewall: `sudo ufw allow 8080/tcp`
2. Check services: `docker compose -f docker-compose.drone.yml ps`
3. Check logs: `docker compose -f docker-compose.drone.yml logs`

### GitHub OAuth Error

**Problem**: "Invalid OAuth configuration"

**Solutions**:
1. Verify GitHub OAuth App callback URL matches
2. Check credentials in `.env.drone`
3. Ensure you created a NEW OAuth App for Drone CI

### Port Already in Use

**Problem**: "Port 8080 already in use"

**Solutions**:
1. Check what's using port: `sudo lsof -i :8080`
2. Change Drone CI port (see Port Configuration section)

## FAQs

**Q: Can I deploy Drone CI without other applications?**
A: Yes! Drone CI is completely standalone and doesn't need any other applications.

**Q: Can I deploy on a different server?**
A: Yes! Deploy anywhere with Docker - same process.

**Q: Does it share configuration with other apps?**
A: No! Drone CI uses `.env.drone` which is completely separate.

**Q: Can I use my existing GitHub OAuth App?**
A: No, create a NEW GitHub OAuth App specifically for Drone CI.

**Q: What happens if I remove other applications?**
A: Nothing! Drone CI continues working normally - it's independent.

**Q: Can I move Drone CI to another server?**
A: Yes! Backup data, deploy on new server, restore data. See [DRONE_CI_STANDALONE.md](docs/guides/DRONE_CI_STANDALONE.md).

## Resources

- **Drone CI Documentation**: https://docs.drone.io/
- **Docker Documentation**: https://docs.docker.com/
- **GitHub OAuth Apps**: https://docs.github.com/en/developers/apps/building-oauth-apps

## Summary

✅ **Standalone** - No dependencies on other applications
✅ **Portable** - Deploy anywhere with Docker
✅ **Independent** - Separate configuration, network, data
✅ **Flexible** - Works alone or alongside other apps
✅ **Simple** - Deploy with single Docker Compose command

**Get Started**: See [DRONE_CI_SETUP.md](docs/guides/DRONE_CI_SETUP.md) for detailed setup instructions.

---

**Need Help?** See detailed documentation in `docs/guides/` directory.
