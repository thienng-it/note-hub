# Fly.io Deployment Guide - FREE TIER

This guide walks through deploying NoteHub backend to Fly.io's **completely free tier**.

## Free Tier Limits (No Credit Card Required*)

- ✅ 3 shared-cpu VMs (256MB RAM each)
- ✅ 3GB persistent storage
- ✅ 160GB outbound bandwidth/month
- ✅ Auto-scale to zero when idle
- ✅ Free SSL certificates
- ✅ Global Anycast network

*Credit card required for verification, but won't be charged

## Prerequisites

1. Install Fly.io CLI:
   ```bash
   # macOS
   brew install flyctl
   
   # Or use install script
   curl -L https://fly.io/install.sh | sh
   ```

2. Login to Fly.io:
   ```bash
   flyctl auth login
   ```

## Deployment Steps

### 1. Create Fly.io App

```bash
cd /path/to/note-hub

# Launch app (uses existing fly.toml)
flyctl launch --no-deploy

# When prompted:
# - App name: notehub-backend (or your choice)
# - Region: Choose closest to you
# - PostgreSQL: NO (we use SQLite)
# - Redis: NO (optional feature)
# - Deploy now: NO
```

### 2. Create Persistent Volume (for SQLite)

```bash
# Create 1GB volume (within free tier)
flyctl volumes create notehub_data --region sjc --size 1
```

### 3. Set Environment Secrets

```bash
# Required secrets
flyctl secrets set \
  JWT_SECRET="your-super-secret-jwt-key-min-32-chars" \
  REFRESH_TOKEN_SECRET="your-refresh-token-secret-key-min-32" \
  NOTES_ADMIN_PASSWORD="your-secure-admin-password"

# Optional: Google OAuth
flyctl secrets set \
  GOOGLE_CLIENT_ID="your-google-client-id" \
  GOOGLE_CLIENT_SECRET="your-google-client-secret" \
  GOOGLE_REDIRECT_URI="https://your-app.fly.dev/api/auth/google/callback"
```

### 4. Deploy

```bash
# First deployment
flyctl deploy

# Watch logs
flyctl logs

# Check status
flyctl status
```

### 5. Scale to Free Tier (Important!)

```bash
# Ensure only 1 machine running (free tier)
flyctl scale count 1

# Verify machine specs (should be shared-cpu-1x, 256mb)
flyctl scale show
```

## Configuration Details

### Port Configuration

Fly.io requires apps to listen on `8080` internally. Our `fly.toml` sets:
```toml
[env]
  PORT = "8080"
```

Your backend will automatically use this port via `process.env.PORT`.

### Auto-Scaling (Free Tier Optimization)

```toml
[http_service]
  auto_stop_machines = true  # Stop when idle
  auto_start_machines = true # Wake on request
  min_machines_running = 0   # Scale to zero
```

This ensures your app:
- Stops when idle (saves resources)
- Wakes up automatically on requests
- Stays within free tier

### Health Checks

Fly.io monitors your app via:
```toml
[[services.http_checks]]
  path = "/api/health"
```

Ensure your backend has this endpoint.

## Accessing Your App

```bash
# Get app URL
flyctl info

# Open in browser
flyctl open

# Your backend will be at:
https://your-app-name.fly.dev
```

## Managing Secrets

```bash
# List secrets (values hidden)
flyctl secrets list

# Update a secret
flyctl secrets set JWT_SECRET="new-secret"

# Remove a secret
flyctl secrets unset SOME_SECRET
```

## Viewing Logs

```bash
# Live logs
flyctl logs

# Recent logs
flyctl logs --tail=100
```

## Database Backups

Since we use SQLite on a volume:

```bash
# SSH into machine
flyctl ssh console

# Inside container
cd /app/data
ls -lh *.db

# Exit
exit
```

To backup:
```bash
# Download database file
flyctl ssh sftp get /app/data/notehub.db ./backup-notehub.db
```

## Updating Your App

```bash
# After making code changes
git add .
git commit -m "Update"

# Deploy
flyctl deploy

# Deploy specific Dockerfile
flyctl deploy --dockerfile Dockerfile.backend.node
```

## Cost Monitoring

```bash
# Check resource usage
flyctl status

# Machine details
flyctl machines list

# Ensure staying in free tier
flyctl scale show
```

**Free Tier Checklist:**
- ✅ 1 machine (not 3)
- ✅ 256MB RAM
- ✅ shared-cpu-1x
- ✅ 1GB volume (within 3GB limit)

## Troubleshooting

### App Won't Start

```bash
# Check logs
flyctl logs

# SSH into machine
flyctl ssh console

# Check health endpoint
curl http://localhost:8080/api/health
```

### Volume Issues

```bash
# List volumes
flyctl volumes list

# Volume details
flyctl volumes show notehub_data
```

### Port Binding Issues

Ensure your backend reads `process.env.PORT`:
```javascript
const PORT = process.env.PORT || 5000;
```

### Certificate Issues

```bash
# Check certificates
flyctl certs list

# Add custom domain (optional)
flyctl certs create yourdomain.com
```

## Environment Variables Reference

**Required:**
- `JWT_SECRET` - JWT signing key (min 32 chars)
- `REFRESH_TOKEN_SECRET` - Refresh token key (min 32 chars)
- `NOTES_ADMIN_PASSWORD` - Admin password

**Auto-set by Fly.io:**
- `PORT=8080` - Internal port
- `NODE_ENV=production` - Environment

**Optional:**
- `GOOGLE_CLIENT_ID` - For Google OAuth
- `GOOGLE_CLIENT_SECRET` - For Google OAuth
- `GOOGLE_REDIRECT_URI` - OAuth callback URL

## Next Steps

1. **Frontend Deployment**: Deploy frontend to Vercel/Netlify
2. **Custom Domain**: `flyctl certs create yourdomain.com`
3. **Monitoring**: Use `flyctl dashboard` for metrics
4. **Backups**: Schedule regular SQLite backups

## Useful Commands

```bash
# App dashboard
flyctl dashboard

# SSH into machine
flyctl ssh console

# Restart app
flyctl apps restart

# Destroy app (careful!)
flyctl apps destroy notehub-backend

# Machine details
flyctl machines list
flyctl machine status <machine-id>
```

## Staying in Free Tier

**Always ensure:**
1. Max 1 machine running
2. Machine is `shared-cpu-1x` with 256MB RAM
3. Volume ≤ 3GB total
4. Auto-scale to zero enabled

**Commands to verify:**
```bash
flyctl scale count 1
flyctl scale show
flyctl volumes list
```

## Support

- Fly.io Community: https://community.fly.io
- Documentation: https://fly.io/docs
- Status: https://status.fly.io

---

**Free Tier Summary**: With proper configuration, your NoteHub backend runs completely free with auto-scaling to zero when idle. Perfect for personal use or small projects!
