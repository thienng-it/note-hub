# Drone CI Deployment - Quick Setup

This is a quick reference guide for setting up automated deployment with Drone CI.

## Prerequisites Checklist

- [ ] Drone CI installed and running on VPS (port 8080)
- [ ] NoteHub repository activated in Drone CI
- [ ] SSH access to production server
- [ ] Docker and Docker Compose installed on production server

## Setup in 5 Minutes

### 1. Generate SSH Key for Deployment

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "drone-deploy" -f ~/.ssh/drone-deploy

# Copy public key to production server
ssh-copy-id -i ~/.ssh/drone-deploy.pub user@your-server

# Test connection
ssh -i ~/.ssh/drone-deploy user@your-server
```

### 2. Add Secrets to Drone CI

1. Open Drone UI: `http://your-server:8080`
2. Navigate to NoteHub repository
3. Settings → Secrets → Add Secret

Add these three secrets:

```bash
# Secret 1: production_host
Name: production_host
Value: your-server-ip-or-domain

# Secret 2: production_username
Name: production_username
Value: root  # or your deploy user

# Secret 3: production_ssh_key
Name: production_ssh_key
Value: (paste entire private key from ~/.ssh/drone-deploy)
```

**Getting the private key:**
```bash
cat ~/.ssh/drone-deploy
# Copy everything including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ... all content ...
# -----END OPENSSH PRIVATE KEY-----
```

### 3. Verify Deployment Script

On your production server:

```bash
# SSH to server
ssh user@your-server

# Navigate to NoteHub
cd /opt/note-hub

# Ensure script exists and is executable
ls -l scripts/deploy.sh

# If not executable:
chmod +x scripts/deploy.sh
```

### 4. Test Manual Deployment

Before enabling automatic deployment, test manually:

```bash
# On production server
cd /opt/note-hub
./scripts/deploy.sh

# Check if it works
docker compose ps
```

### 5. Enable Automatic Deployment

The deployment is already enabled in `.drone.yml`. Just push to main:

```bash
# On your development machine
git add .
git commit -m "feat: enable automated deployment"
git push origin main
```

Watch the deployment in Drone UI!

## Verification

After pushing, check:

1. **Drone UI**: Watch build progress at `http://your-server:8080`
2. **Build passes all tests**: Backend, frontend, linting
3. **Deploy step executes**: Watch SSH connection and deployment
4. **Services restart**: Verify in Docker logs

## Deployment Workflow

```
Local Machine                Drone CI                Production Server
     |                           |                            |
     | git push origin main      |                            |
     |-------------------------->|                            |
     |                           |                            |
     |                           | Run Tests                  |
     |                           | ✓ Backend tests            |
     |                           | ✓ Frontend tests           |
     |                           | ✓ Linting                  |
     |                           |                            |
     |                           | SSH Connect                |
     |                           |--------------------------->|
     |                           |                            |
     |                           |                    Backup data
     |                           |                    Pull changes
     |                           |                    Build images
     |                           |                    Restart services
     |                           |                            |
     |                           |<---------------------------|
     |                           | Deployment Complete        |
     |<--------------------------|                            |
     |                           |                            |
```

## Common Issues & Fixes

### Issue: SSH Permission Denied

```bash
# Fix: Ensure SSH key is added to server
ssh-copy-id -i ~/.ssh/drone-deploy.pub user@your-server

# Fix: Check key permissions
chmod 600 ~/.ssh/drone-deploy
```

### Issue: Deployment Script Not Executable

```bash
# Fix: Make script executable on server
ssh user@your-server "chmod +x /opt/note-hub/scripts/deploy.sh"
```

### Issue: Docker Build Fails

```bash
# Fix: Clean up Docker resources
ssh user@your-server
docker system prune -a
docker volume prune
```

### Issue: Services Not Starting

```bash
# Fix: Check logs and restart
ssh user@your-server
cd /opt/note-hub
docker compose logs --tail=100
docker compose restart
```

## Rollback

If deployment fails or causes issues:

```bash
# SSH to server
ssh user@your-server
cd /opt/note-hub

# List backups
ls -lh backups/

# Restore from backup
tar -xzf backups/backup_YYYYMMDD_HHMMSS.tar.gz

# Restart
docker compose restart
```

## Monitoring Deployment

### View in Drone UI

1. Go to `http://your-server:8080`
2. Click on your repository
3. View build details
4. Check `deploy-production` step logs

### View on Server

```bash
# SSH to server
ssh user@your-server

# View Docker logs
cd /opt/note-hub
docker compose logs -f

# Check service status
docker compose ps

# Check backend health
curl http://localhost:5000/api/health
```

## Advanced: Multiple Environments

To deploy to staging and production:

1. Add staging secrets to Drone:
   - `staging_host`
   - `staging_username`
   - `staging_ssh_key`

2. Update `.drone.yml`:

```yaml
# Deploy to staging on develop branch
- name: deploy-staging
  image: appleboy/drone-ssh
  settings:
    host:
      from_secret: staging_host
    username:
      from_secret: staging_username
    key:
      from_secret: staging_ssh_key
    port: 22
    script:
      - cd /opt/note-hub
      - ./scripts/deploy.sh
  when:
    branch:
      - develop

# Deploy to production on main branch
- name: deploy-production
  # ... existing production config ...
  when:
    branch:
      - main
```

## Security Checklist

- [ ] Use SSH keys, not passwords
- [ ] Use dedicated deploy user (not root)
- [ ] Restrict SSH access with firewall
- [ ] Keep secrets in Drone, not in Git
- [ ] Enable two-factor authentication on Drone
- [ ] Monitor deployment logs
- [ ] Keep backups enabled
- [ ] Test rollback procedure

## Next Steps

After successful setup:

1. **Test the pipeline**: Make a small change and push to main
2. **Monitor deployment**: Watch first few deployments closely
3. **Set up notifications**: Add Slack/Discord webhooks
4. **Document custom changes**: Keep notes on any modifications
5. **Plan staging environment**: Consider separate staging deployment

## Useful Commands

```bash
# View Drone logs
docker compose --env-file .env.drone -f docker-compose.drone.yml logs -f

# Restart Drone
docker compose --env-file .env.drone -f docker-compose.drone.yml restart

# View NoteHub status on server
ssh user@your-server "cd /opt/note-hub && docker compose ps"

# Manual deployment
ssh user@your-server "cd /opt/note-hub && ./scripts/deploy.sh"

# Check disk space on server
ssh user@your-server "df -h"

# Clean Docker on server
ssh user@your-server "docker system prune -a"
```

## Getting Help

- **Full Documentation**: See [DRONE_CI_DEPLOYMENT.md](DRONE_CI_DEPLOYMENT.md)
- **Drone CI Docs**: https://docs.drone.io/
- **Troubleshooting**: Check logs in Drone UI and on server
- **Issues**: Open GitHub issue with deployment logs

---

**Quick Reference Version**: 1.0  
**Last Updated**: December 2024
