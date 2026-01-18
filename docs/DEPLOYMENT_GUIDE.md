# NoteHub Production Deployment Guide

Complete step-by-step guide to deploy NoteHub from scratch to a live production server.

---

## 📋 Prerequisites

Before starting, you need:

| Requirement | Details |
|-------------|---------|
| **VPS Server** | Ubuntu 22.04+ with 2GB+ RAM (Hetzner, DigitalOcean, etc.) |
| **Domain** | DuckDNS (free) or custom domain |
| **SSH Access** | Root or sudo access to server |
| **Git Repository** | NoteHub source code |

---

## Part 1: Server Setup

### Step 1.1: SSH into your server

```bash
ssh root@YOUR_SERVER_IP
```

### Step 1.2: Update system packages

```bash
apt update && apt upgrade -y
```

### Step 1.3: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Verify installation
docker --version
docker compose version
```

### Step 1.4: Install Git (if not present)

```bash
apt install git -y
```

### Step 1.5: Create application directory

```bash
mkdir -p /opt/note-hub
cd /opt/note-hub
```

---

## Part 2: Get the Code

### Step 2.1: Clone the repository

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/note-hub.git
cd note-hub
```

### Step 2.2: Verify files exist

```bash
ls -la
# Should see: docker-compose.yml, docker-compose.domain.yml, .env.example, etc.
```

---

## Part 3: Configure Domain (DuckDNS)

### Step 3.1: Create DuckDNS account

1. Go to [https://www.duckdns.org](https://www.duckdns.org)
2. Sign in with Google, GitHub, Twitter, or Reddit
3. Create a subdomain (e.g., `note-hub`)
4. Set the IP to your server's IP address
5. Click **Update IP**

### Step 3.2: Verify DNS is working

```bash
# Wait 1-2 minutes, then check
nslookup YOUR_SUBDOMAIN.duckdns.org

# Should return your server IP
```

---

## Part 4: Configure Environment

### Step 4.1: Generate a secure secret key

```bash
openssl rand -hex 32
# Copy the output - you'll need it below
```

### Step 4.2: Create the .env file

```bash
cat > .env << 'EOF'
# =============================================================================
# Required Configuration
# =============================================================================
SECRET_KEY=YOUR_GENERATED_SECRET_KEY
NOTES_ADMIN_USERNAME=admin
NOTES_ADMIN_PASSWORD=YourSecurePassword123!

# =============================================================================
# Domain & SSL (REQUIRED)
# =============================================================================
DOMAIN=YOUR_SUBDOMAIN.duckdns.org
ACME_EMAIL=your-email@example.com

# =============================================================================
# Logging
# =============================================================================
LOG_LEVEL=info
LOG_FORMAT=simple
EOF
```

### Step 4.3: Edit with your actual values

```bash
nano .env
# Replace:
# - YOUR_GENERATED_SECRET_KEY with the key from Step 4.1
# - YOUR_SUBDOMAIN with your DuckDNS subdomain
# - your-email@example.com with your actual email
# Save: Ctrl+X, Y, Enter
```

### Step 4.4: Setup domain configuration

```bash
cp docker-compose.domain.yml docker-compose.override.yml
```

---

## Part 5: Deploy the Application

### Step 5.1: Start the containers

```bash
docker compose up -d
```

### Step 5.2: Wait for containers to be healthy

```bash
# Check status (wait until all show "healthy")
docker ps

# Watch logs for any errors
docker compose logs -f
# Press Ctrl+C to exit logs
```

### Step 5.3: Verify SSL certificate

```bash
# Check if Let's Encrypt issued the certificate
docker logs notehub-traefik --tail 30 | grep -i cert
```

### Step 5.4: Test the application

```bash
# Health check
curl -s https://YOUR_SUBDOMAIN.duckdns.org/health

# Open in browser
echo "Open: https://YOUR_SUBDOMAIN.duckdns.org"
```

---

## Part 6: Optional Features

### 6.1: GitHub OAuth (Sign in with GitHub)

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in:
   - Application name: `NoteHub`
   - Homepage URL: `https://YOUR_SUBDOMAIN.duckdns.org`
   - Callback URL: `https://YOUR_SUBDOMAIN.duckdns.org/auth/github/callback`
4. Copy Client ID and Client Secret
5. Add to `.env`:

```bash
cat >> .env << 'EOF'

# GitHub OAuth
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
GITHUB_REDIRECT_URI=https://YOUR_SUBDOMAIN.duckdns.org/auth/github/callback
EOF
```

### 6.2: Google OAuth (Sign in with Google)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project named `NoteHub`
3. Go to **APIs & Services** → **OAuth consent screen** → External → Create
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Type: Web application
6. Add redirect URI: `https://YOUR_SUBDOMAIN.duckdns.org/auth/google/callback`
7. Copy Client ID and Client Secret
8. Add to `.env`:

```bash
cat >> .env << 'EOF'

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://YOUR_SUBDOMAIN.duckdns.org/auth/google/callback
EOF
```

### 6.3: Grafana Monitoring

1. Add DuckDNS subdomain: `monitoring-YOUR_NAME` → same IP
2. Add to `.env`:

```bash
cat >> .env << 'EOF'

# Grafana Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=YourGrafanaPassword123!
GRAFANA_ROOT_URL=https://monitoring-YOUR_NAME.duckdns.org
GRAFANA_DOMAIN=monitoring-YOUR_NAME.duckdns.org
GRAFANA_ROUTER_RULE=Host(`monitoring-YOUR_NAME.duckdns.org`)
EOF
```

3. Deploy monitoring stack:

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

### 6.4: Apply Optional Features

After adding any optional features, restart:

```bash
docker compose down
docker compose up -d
```

---

## Part 7: Setup Automated Backups

### Step 7.1: Create backup script

```bash
cat > /opt/note-hub/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker cp notehub-backend:/app/data/notes.db $BACKUP_DIR/notes.db.$DATE

# Backup .env
cp /opt/note-hub/.env $BACKUP_DIR/.env.$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "notes.db.*" -mtime +7 -delete
find $BACKUP_DIR -name ".env.*" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/note-hub/backup.sh
```

### Step 7.2: Setup daily cron job

```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/note-hub/backup.sh >> /var/log/notehub-backup.log 2>&1") | crontab -
```

### Step 7.3: Test backup

```bash
/opt/note-hub/backup.sh
ls -la /opt/backups/
```

---

## Part 8: Verify Everything Works

### Checklist

| Test | Command/Action |
|------|----------------|
| ✅ App loads | Open `https://YOUR_SUBDOMAIN.duckdns.org` |
| ✅ SSL valid | Check for lock icon in browser |
| ✅ Admin login | Login with credentials from .env |
| ✅ GitHub OAuth | Click GitHub login button |
| ✅ Google OAuth | Click Google login button |
| ✅ Grafana | Open `https://monitoring-YOUR_NAME.duckdns.org` |
| ✅ Backup works | `ls -la /opt/backups/` |

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| SSL certificate error | Check DOMAIN in .env has no `https://` prefix |
| DNS not resolving | Wait 2-5 min for DuckDNS propagation |
| Container not starting | Run `docker compose logs -f` to see errors |
| Port 80 in use | Stop other containers: `docker ps -a` |
| OAuth not working | Verify redirect URI matches exactly |

---

## 📋 Quick Reference Commands

```bash
# View logs
docker compose logs -f

# Restart app
docker compose restart

# Stop app
docker compose down

# Start app
docker compose up -d

# Manual backup
/opt/note-hub/backup.sh

# Update app (pull latest code)
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## 🎉 Congratulations!

Your NoteHub is now live! 

- **App URL:** https://YOUR_SUBDOMAIN.duckdns.org
- **Monitoring:** https://monitoring-YOUR_NAME.duckdns.org (if configured)
- **Backups:** /opt/backups/ (daily at 2 AM)
