# Drone CI Deployment Guide

This guide explains how to set up automated deployment of NoteHub backend and frontend using Drone CI.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup Steps](#setup-steps)
- [Configuration](#configuration)
- [Deployment Process](#deployment-process)
- [Rollback Procedure](#rollback-procedure)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Overview

The Drone CI deployment pipeline automates the following:

1. **Testing** - Runs backend and frontend tests
2. **Linting** - Validates code quality
3. **Type Checking** - Ensures TypeScript type safety
4. **Building** - Builds production-ready assets
5. **Deployment** - Deploys to production VPS automatically

### Deployment Flow

```
┌─────────────────┐
│  Code Push to   │
│  main branch    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Drone CI       │
│  Triggered      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Run Tests      │
│  - Backend      │
│  - Frontend     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build Assets   │
│  - Frontend     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy via SSH │
│  - Backup       │
│  - Pull code    │
│  - Build images │
│  - Restart      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Verify Deploy  │
│  - Health check │
│  - Logs         │
└─────────────────┘
```

## Architecture

### Components

1. **Drone CI Server** - Runs on VPS (port 8080)
2. **Drone Runner** - Executes pipeline steps
3. **Production Server** - Hosts NoteHub application
4. **Deployment Script** - Handles deployment logic

### Network Flow

```
GitHub Push → Drone CI → SSH to VPS → Execute Deploy Script → Docker Compose
```

## Prerequisites

### 1. Drone CI Setup

Drone CI must be installed and running on your VPS:

```bash
# Verify Drone CI is running
docker compose --env-file .env.drone -f docker-compose.drone.yml ps
```

See [DRONE_CI_SETUP.md](DRONE_CI_SETUP.md) for installation instructions.

### 2. SSH Access

You need SSH key-based authentication to your production server:

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "drone-ci-deploy"

# Copy public key to server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-server
```

### 3. Required Software on VPS

- Docker (20.10+)
- Docker Compose (2.0+)
- Git

## Setup Steps

### Step 1: Configure SSH Secrets in Drone UI

1. Open Drone CI at `http://your-server:8080`
2. Navigate to your NoteHub repository
3. Click **Settings** → **Secrets**
4. Add the following secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `production_host` | Production server IP or domain | `123.45.67.89` |
| `production_username` | SSH username | `root` or `deploy` |
| `production_ssh_key` | Private SSH key | (paste entire key) |

**Adding SSH Key Secret:**

```bash
# Display your private key
cat ~/.ssh/id_ed25519

# Copy the entire output including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ... key content ...
# -----END OPENSSH PRIVATE KEY-----
```

Paste this into the `production_ssh_key` secret in Drone UI.

### Step 2: Verify Repository Configuration

Ensure your repository has the deployment script:

```bash
# Check if deploy script exists
ls -l scripts/deploy.sh

# Make it executable (already done in the repository)
chmod +x scripts/deploy.sh
```

### Step 3: Configure Deployment Path

The default deployment path is `/opt/note-hub`. To change it:

1. Edit `scripts/deploy.sh`
2. Update the `DEPLOYMENT_PATH` variable
3. Or set it via environment variable in `.drone.yml`

### Step 4: Test Deployment Script Locally

Before enabling automatic deployment, test the script manually:

```bash
# SSH to your server
ssh user@your-server

# Navigate to deployment directory
cd /opt/note-hub

# Run deployment script
./scripts/deploy.sh

# Verify deployment
docker compose ps
docker compose logs --tail=50
```

### Step 5: Enable Automatic Deployment

The deployment step is already enabled in `.drone.yml`:

```yaml
- name: deploy-production
  image: appleboy/drone-ssh
  settings:
    host:
      from_secret: production_host
    username:
      from_secret: production_username
    key:
      from_secret: production_ssh_key
    port: 22
    script:
      - cd /opt/note-hub
      - chmod +x scripts/deploy.sh
      - ./scripts/deploy.sh
  when:
    branch:
      - main
    event:
      - push
```

This will automatically deploy when:
- Code is pushed to the `main` branch
- All tests pass successfully

## Configuration

### Deployment Script Options

The `scripts/deploy.sh` script supports:

- **Automatic backups** - Creates timestamped backups before deployment
- **Zero-downtime deployment** - Uses Docker Compose rolling updates
- **Health checks** - Verifies services are running after deployment
- **Cleanup** - Removes old Docker images and volumes

### Environment Variables

The deployment script uses these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DEPLOYMENT_PATH` | `/opt/note-hub` | Path to NoteHub installation |
| `DOCKER_COMPOSE_FILE` | `docker-compose.yml` | Docker Compose file to use |

### Customizing Deployment

To customize deployment behavior, edit `scripts/deploy.sh`:

```bash
# Example: Change backup retention
# Find this line:
ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +6 | xargs -r rm

# Change +6 to +11 to keep 10 backups instead of 5
ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +11 | xargs -r rm
```

## Deployment Process

### Automatic Deployment Flow

1. **Developer pushes to main branch**
   ```bash
   git push origin main
   ```

2. **Drone CI detects push and starts pipeline**
   - Runs backend tests
   - Runs frontend tests
   - Builds frontend assets

3. **Deploy step executes (if tests pass)**
   - Connects to production server via SSH
   - Creates backup of current deployment
   - Pulls latest code from Git
   - Builds Docker images
   - Restarts services with zero downtime
   - Verifies deployment health

4. **Deployment completes**
   - Services are running with new code
   - Backup is available for rollback if needed

### Manual Deployment

To deploy manually without Drone CI:

```bash
# SSH to server
ssh user@your-server

# Navigate to NoteHub directory
cd /opt/note-hub

# Pull latest changes
git pull origin main

# Run deployment script
./scripts/deploy.sh
```

## Rollback Procedure

If a deployment fails or introduces issues, you can rollback:

### Using Backups

The deployment script creates automatic backups in `backend/data/backups/`:

```bash
# SSH to server
ssh user@your-server
cd /opt/note-hub

# List available backups
ls -lh backups/

# Example output:
# backup_20241212_143022.tar.gz
# backup_20241212_135517.tar.gz

# Restore from backup
cd /opt/note-hub
tar -xzf backups/backup_20241212_135517.tar.gz

# Restart services
docker compose restart
```

### Using Git

Rollback to a previous commit:

```bash
# SSH to server
ssh user@your-server
cd /opt/note-hub

# View recent commits
git log --oneline -5

# Rollback to specific commit
git reset --hard <commit-hash>

# Rebuild and restart
docker compose build --no-cache
docker compose up -d
```

### Emergency Rollback via Drone

If you need to rollback via Drone CI:

1. Revert the problematic commit on GitHub
2. Push to main branch
3. Drone will automatically deploy the reverted version

```bash
# On your local machine
git revert <problematic-commit-hash>
git push origin main
```

## Troubleshooting

### Deployment Fails with SSH Error

**Problem**: Drone cannot connect to production server

**Solution**:
```bash
# Verify SSH key is correct in Drone secrets
# Test SSH connection manually
ssh -i /path/to/key user@server

# Check if key has correct permissions
chmod 600 ~/.ssh/id_ed25519

# Ensure server accepts key-based authentication
# On server, check: /etc/ssh/sshd_config
PubkeyAuthentication yes
```

### Deployment Script Permission Denied

**Problem**: `permission denied: ./scripts/deploy.sh`

**Solution**:
```bash
# SSH to server
ssh user@your-server
cd /opt/note-hub

# Make script executable
chmod +x scripts/deploy.sh

# Verify
ls -l scripts/deploy.sh
# Should show: -rwxr-xr-x
```

### Docker Build Fails During Deployment

**Problem**: Docker build fails with out of memory or disk space

**Solution**:
```bash
# SSH to server
ssh user@your-server

# Check disk space
df -h

# Clean up Docker
docker system prune -a --volumes
docker image prune -a

# Check memory
free -h

# If needed, add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Services Don't Start After Deployment

**Problem**: Docker Compose up fails or services crash

**Solution**:
```bash
# Check logs
docker compose logs --tail=100

# Check service status
docker compose ps

# Try restarting specific service
docker compose restart backend
docker compose restart frontend

# If all else fails, rollback
tar -xzf backups/backup_YYYYMMDD_HHMMSS.tar.gz
docker compose restart
```

### Pipeline Stuck or Takes Too Long

**Problem**: Drone pipeline hangs or times out

**Solution**:
```bash
# Check Drone runner logs
docker compose --env-file .env.drone -f docker-compose.drone.yml logs drone-runner

# Restart Drone runner
docker compose --env-file .env.drone -f docker-compose.drone.yml restart drone-runner

# Cancel stuck build in Drone UI
# Go to build → Click "Cancel"
```

## Security Best Practices

### 1. Use SSH Keys, Not Passwords

- Generate dedicated SSH key for Drone CI
- Use ed25519 keys (more secure than RSA)
- Protect private key with passphrase (optional)

### 2. Limit SSH User Permissions

Create a dedicated deployment user:

```bash
# On production server
sudo adduser deploy
sudo usermod -aG docker deploy

# Restrict SSH access to deployment directory
# Add to /etc/ssh/sshd_config
Match User deploy
    ChrootDirectory /opt/note-hub
    ForceCommand internal-sftp
```

### 3. Use Secrets for Sensitive Data

Never commit secrets to Git:
- Use Drone secrets for SSH keys
- Use `.env` file for application secrets
- Add `.env` to `.gitignore`

### 4. Enable Firewall

Restrict SSH access to known IPs:

```bash
# Allow SSH only from specific IP
sudo ufw allow from <drone-server-ip> to any port 22

# Enable firewall
sudo ufw enable
```

### 5. Monitor Deployments

Set up notifications for deployment status:

```yaml
# Add to .drone.yml
- name: notify-deployment
  image: plugins/slack
  settings:
    webhook:
      from_secret: slack_webhook
    message: "Deployment to production: {{build.status}}"
  when:
    status:
      - success
      - failure
```

### 6. Implement Deployment Approvals

For production, consider manual approval:

```yaml
# Add to .drone.yml
- name: deploy-production
  image: appleboy/drone-ssh
  settings:
    # ... existing settings ...
  when:
    branch:
      - main
    event:
      - promote
    target:
      - production
```

Then deploy manually:

```bash
drone build promote <repo> <build-number> production
```

## Advanced Configuration

### Multi-Environment Deployment

Deploy to different environments (staging, production):

```yaml
# In .drone.yml
- name: deploy-staging
  image: appleboy/drone-ssh
  settings:
    host:
      from_secret: staging_host
    # ... other settings ...
  when:
    branch:
      - develop

- name: deploy-production
  image: appleboy/drone-ssh
  settings:
    host:
      from_secret: production_host
    # ... other settings ...
  when:
    branch:
      - main
```

### Health Check Integration

Add health checks to verify deployment:

```bash
# In scripts/deploy.sh, add after deployment:

# Wait for service to be ready
echo "Waiting for service to be ready..."
for i in {1..30}; do
  if curl -sf http://localhost/api/health > /dev/null; then
    echo "Service is healthy!"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 2
done
```

### Slack/Discord Notifications

Get notified of deployment status:

```yaml
# Add to .drone.yml
- name: slack-notify
  image: plugins/slack
  settings:
    webhook:
      from_secret: slack_webhook
    channel: deployments
    template: |
      {{#success build.status}}
        ✅ Deployment succeeded
      {{else}}
        ❌ Deployment failed
      {{/success}}
      
      Branch: {{build.branch}}
      Commit: {{build.commit}}
      Author: {{build.author}}
  when:
    status:
      - success
      - failure
```

## Monitoring Deployments

### View Deployment Logs

In Drone UI:
1. Navigate to your repository
2. Click on the build number
3. View the `deploy-production` step logs

Via CLI:

```bash
# Install Drone CLI
curl -L https://github.com/drone/drone-cli/releases/latest/download/drone_linux_amd64.tar.gz | tar zx
sudo install -t /usr/local/bin drone

# Configure CLI
export DRONE_SERVER=http://your-server:8080
export DRONE_TOKEN=<your-token>

# View build logs
drone build logs <repo> <build-number>
```

### Check Service Health

After deployment:

```bash
# Check if services are running
docker compose ps

# View recent logs
docker compose logs --tail=50 --follow

# Check backend health
curl http://localhost:5000/api/health

# Check frontend
curl http://localhost/
```

## Best Practices

1. **Always test locally first** - Run `./scripts/deploy.sh` manually before enabling automation
2. **Monitor deployments** - Watch the first few automated deployments closely
3. **Keep backups** - The script creates automatic backups, don't delete them
4. **Use staging environment** - Test deployments in staging before production
5. **Document changes** - Keep deployment notes for major changes
6. **Review logs** - Check Drone and Docker logs after each deployment
7. **Plan rollback** - Know how to rollback before deploying

## References

- [Drone CI Documentation](https://docs.drone.io/)
- [Drone SSH Plugin](https://plugins.drone.io/plugins/ssh)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NoteHub Deployment Guide](HETZNER_DEPLOYMENT.md)

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Drone CI logs
3. Check deployment script output
4. Review Docker logs
5. Open an issue on GitHub

---

**Last Updated**: December 2024
