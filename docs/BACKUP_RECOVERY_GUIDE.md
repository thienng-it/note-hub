# NoteHub Backup & Disaster Recovery Guide

## Overview

This guide covers backup, recovery, and incident response for NoteHub deployed at `https://note-hub.duckdns.org`.

---

## 📦 What to Backup

| File | Location | Contains |
|------|----------|----------|
| Database | `/app/data/notes.db` | All users, notes, attachments |
| Config | `/opt/note-hub/.env` | Credentials, API keys, secrets |
| SSL Certs | `/opt/note-hub/letsencrypt/` | Let's Encrypt certificates |

---

## 🔄 Manual Backup (Run Anytime)

### Step 1: SSH into your server

```bash
ssh root@135.181.96.141
cd /opt/note-hub
```

### Step 2: Create backup directory

```bash
mkdir -p /opt/backups
```

### Step 3: Backup the database

```bash
docker cp notehub-backend:/app/data/notes.db /opt/backups/notes.db.$(date +%Y%m%d_%H%M%S)
```

### Step 4: Backup environment config

```bash
cp /opt/note-hub/.env /opt/backups/.env.$(date +%Y%m%d_%H%M%S)
```

### Step 5: Backup SSL certificates

```bash
cp -r /opt/note-hub/letsencrypt /opt/backups/letsencrypt.$(date +%Y%m%d_%H%M%S)
```

### Step 6: Verify backups exist

```bash
ls -la /opt/backups/
```

---

## ⏰ Automated Backup (Already Configured)

Backups run automatically at **2:00 AM daily**.

- Location: `/opt/backups/`
- Retention: Last 7 days
- Script: `/opt/note-hub/backup.sh`
- Log: `/var/log/notehub-backup.log`

### Check backup status

```bash
# View recent backups
ls -la /opt/backups/

# Check backup log
cat /var/log/notehub-backup.log
```

---

## 🚨 Disaster Recovery

### Scenario 1: Database Corrupted

```bash
# Step 1: Stop the app
cd /opt/note-hub
docker compose down

# Step 2: List available backups
ls -la /opt/backups/notes.db.*

# Step 3: Restore latest backup (replace DATE with actual date)
cp /opt/backups/notes.db.YYYYMMDD_HHMMSS /opt/note-hub/data/notes.db

# Step 4: Restart app
docker compose up -d

# Step 5: Verify app is working
docker ps
curl -s https://note-hub.duckdns.org/health
```

### Scenario 2: Server Completely Lost (New Server Setup)

```bash
# Step 1: On NEW server, install Docker
curl -fsSL https://get.docker.com | sh

# Step 2: Clone the repository
cd /opt
git clone https://github.com/your-repo/note-hub.git
cd note-hub

# Step 3: Restore .env from backup
# (Transfer from backup location or recreate)
cp /path/to/backup/.env.YYYYMMDD /opt/note-hub/.env

# Step 4: Setup domain override
cp docker-compose.domain.yml docker-compose.override.yml

# Step 5: Create data directory and restore database
mkdir -p /opt/note-hub/data
cp /path/to/backup/notes.db.YYYYMMDD /opt/note-hub/data/notes.db

# Step 6: Start the app
docker compose up -d

# Step 7: Update DuckDNS with new server IP
# Go to https://www.duckdns.org and update IP address
```

### Scenario 3: Container Issues

```bash
# Step 1: Check container status
docker ps -a

# Step 2: View logs for errors
docker compose logs --tail 100

# Step 3: Restart containers
docker compose restart

# Step 4: If still failing, recreate containers
docker compose down
docker compose up -d
```

---

## 🔐 Backup to External Location (Recommended)

### Option A: Download to local machine

```bash
# On your LOCAL machine
scp root@135.181.96.141:/opt/backups/notes.db.* ./local-backups/
scp root@135.181.96.141:/opt/backups/.env.* ./local-backups/
```

### Option B: Backup to cloud storage (S3, Google Cloud, etc.)

```bash
# Install rclone on server
apt install rclone

# Configure rclone (one-time setup)
rclone config

# Add to backup script
rclone copy /opt/backups remote:notehub-backups/
```

---

## 📋 Quick Reference

| Task | Command |
|------|---------|
| Manual backup | `/opt/note-hub/backup.sh` |
| List backups | `ls -la /opt/backups/` |
| Check backup log | `cat /var/log/notehub-backup.log` |
| Stop app | `docker compose down` |
| Start app | `docker compose up -d` |
| View logs | `docker compose logs -f` |
| Restart app | `docker compose restart` |

---

## 🆘 Emergency Contacts

- **Server IP:** 135.181.96.141
- **App URL:** https://note-hub.duckdns.org
- **Monitoring:** https://monitoring-notehub.duckdns.org
- **DuckDNS:** https://www.duckdns.org
