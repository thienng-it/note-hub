# 🚀 Hetzner VPS Deployment Guide

Deploy NoteHub on **Hetzner VPS** (€3.29/month) with **Cloudflare Tunnel** (free unlimited bandwidth).

## ✨ Why This Setup?

| Component             | Cost          | Benefits                                            |
| --------------------- | ------------- | --------------------------------------------------- |
| **Hetzner VPS**       | €3.29/mo      | 2 vCPU, 2GB RAM, 20GB SSD, 20TB traffic             |
| **Cloudflare Tunnel** | Free          | Unlimited bandwidth, DDoS protection, Global CDN    |
| **MySQL**             | Included      | Runs on VPS, no external DB needed                  |
| **Total**             | **~$3.50/mo** | Full control, unlimited bandwidth, production-ready |

## 📋 Prerequisites

1. **Hetzner Account**: [hetzner.com](https://hetzner.com)
2. **Domain Name**: Registered and DNS configured
3. **SSH Client**: Terminal (macOS/Linux) or PuTTY (Windows)
4. **HTTPS Option**: Choose one:
   - **Cloudflare Tunnel** (free): DDoS protection + CDN
   - **Let's Encrypt** (free): Direct HTTPS with Certbot (see below)

---

## Part 1: Set Up Hetzner VPS

### Step 1: Create Hetzner Account

1. Go to [hetzner.com](https://www.hetzner.com/cloud)
2. Sign up for an account
3. Add a payment method

### Step 2: Create a Server

1. Go to [Hetzner Cloud Console](https://console.hetzner.cloud)
2. Click **"Create Server"**
3. Configure:
   - **Location**: Choose nearest (Nuremberg, Falkenstein, Helsinki, etc.)
   - **Image**: Ubuntu 24.04
   - **Type**: CX22 (€3.29/mo) - 2 vCPU, 2GB RAM, 40GB SSD
   - **SSH Key**: Add your public SSH key (recommended)
   - **Name**: `notehub`
4. Click **"Create & Buy Now"**

### Step 3: Connect to Your Server

```bash
# Connect via SSH (replace with your server IP)
ssh root@YOUR_SERVER_IP
```

### Step 4: Initial Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version

# Create app user (optional but recommended)
adduser --disabled-password --gecos "" notehub
usermod -aG docker notehub
```

---

## Part 2: Set Up Cloudflare Tunnel

### Step 1: Add Domain to Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **"Add a Site"**
3. Enter your domain name
4. Select the **Free** plan
5. Update your domain's nameservers to Cloudflare's
6. Wait for DNS propagation (5-30 minutes)

### Step 2: Create Cloudflare Tunnel

1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com)
2. Navigate to **Networks** → **Tunnels**
3. Click **"Create a tunnel"**
4. Choose **"Cloudflared"**
5. Name: `notehub`
6. **Save the tunnel token** (you'll need this!)

### Step 3: Configure Public Hostname

In the tunnel configuration:

1. Click **"Add a public hostname"**
2. Configure:
   - **Subdomain**: `notes` (or leave blank for root)
   - **Domain**: Select your domain
   - **Service Type**: `HTTP`
   - **URL**: `notehub:8080`
3. Click **"Save hostname"**

---

## Part 3: Deploy NoteHub

### Step 1: Clone Repository

```bash
# On your Hetzner VPS
cd /opt
git clone https://github.com/thienng-it/note-hub.git
cd note-hub
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Generate secure secrets
FLASK_SECRET=$(openssl rand -hex 32)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
MYSQL_PASSWORD=$(openssl rand -hex 16)

# Edit .env file
nano .env
```

Fill in your `.env` file:

```bash
# Flask Configuration
FLASK_SECRET=<paste generated FLASK_SECRET>

# Admin Credentials (CHANGE THESE!)
NOTES_ADMIN_USERNAME=admin
NOTES_ADMIN_PASSWORD=YourSecurePassword123!

# MySQL Database
MYSQL_ROOT_PASSWORD=<paste generated MYSQL_ROOT_PASSWORD>
MYSQL_USER=notehub
MYSQL_PASSWORD=<paste generated MYSQL_PASSWORD>
MYSQL_DATABASE=notehub

# Cloudflare Tunnel Token (from Step 2)
CLOUDFLARE_TUNNEL_TOKEN=<paste your tunnel token>

# CAPTCHA
CAPTCHA_TYPE=simple
```

### Step 3: Deploy

```bash
# Build and start all services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step 4: Verify Deployment

1. Check all containers are running:
   ```bash
   docker compose ps
   ```
2. Test health endpoint:

   ```bash
   docker compose exec notehub curl http://localhost:8080/health
   ```

3. Open your domain in a browser:
   - `https://notes.yourdomain.com`

---

## 🔧 Management Commands

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f notehub
docker compose logs -f mysql
docker compose logs -f cloudflared
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart notehub
```

### Update Application

```bash
cd /opt/note-hub

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build
```

### Backup Database

```bash
# Create backup
docker compose exec mysql mysqldump -u root -p notehub > backup_$(date +%Y%m%d).sql

# Restore backup
docker compose exec -T mysql mysql -u root -p notehub < backup_20241130.sql
```

### Stop Everything

```bash
# Stop (keeps data)
docker compose stop

# Stop and remove containers (keeps data volumes)
docker compose down

# Stop and remove everything including data (DANGEROUS!)
docker compose down -v
```

---

## 🔒 Security Hardening

### 1. Configure Firewall

```bash
# Install UFW
apt install ufw -y

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow ssh

# Enable firewall (no other ports needed - Cloudflare Tunnel handles everything!)
ufw enable
```

### 2. Automatic Updates

```bash
# Install unattended-upgrades
apt install unattended-upgrades -y

# Enable automatic security updates
dpkg-reconfigure -plow unattended-upgrades
```

### 3. Fail2ban (SSH Protection)

```bash
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 📊 Monitoring

### Check Resource Usage

```bash
# Container stats
docker stats

# Disk usage
df -h

# Memory usage
free -h
```

### Cloudflare Analytics

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. View **Analytics** for traffic, threats, and performance

---

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs notehub

# Check if port is in use
netstat -tlnp | grep 8080

# Rebuild container
docker compose up -d --build --force-recreate notehub
```

### Database Connection Error

```bash
# Check if MySQL is healthy
docker compose ps mysql

# Check MySQL logs
docker compose logs mysql

# Connect to MySQL manually
docker compose exec mysql mysql -u root -p
```

### Tunnel Not Working

```bash
# Check cloudflared logs
docker compose logs cloudflared

# Verify token is correct
grep CLOUDFLARE_TUNNEL_TOKEN .env

# Restart tunnel
docker compose restart cloudflared
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker resources
docker system prune -a

# Clean old logs
docker compose logs --no-log-prefix notehub 2>&1 | tail -1000 > /tmp/recent_logs.txt
```

---

## 💰 Cost Summary

| Item                   | Monthly Cost      |
| ---------------------- | ----------------- |
| Hetzner CX22 VPS       | €3.29             |
| Cloudflare (Free tier) | €0                |
| Domain (.com)          | ~€1/mo (€12/year) |
| **Total**              | **~€4.29/mo**     |

---

## 🔗 Useful Links

- [Hetzner Cloud Console](https://console.hetzner.cloud)
- [Cloudflare Zero Trust](https://one.dash.cloudflare.com)
- [Docker Documentation](https://docs.docker.com)
- [Project GitHub](https://github.com/thienng-it/note-hub)

---

## 🔒 Alternative: Let's Encrypt HTTPS (Instead of Cloudflare Tunnel)

If you prefer direct HTTPS without Cloudflare Tunnel:

### Setup Steps

1. **Configure DNS**: Point your domain's A record to your server IP
   ```bash
   # Example DNS record:
   # Type: A
   # Name: @ (or subdomain)
   # Value: YOUR_SERVER_IP
   # TTL: Auto
   ```

2. **Configure Environment**:
   ```bash
   # Edit .env
   nano .env
   
   # Add SSL configuration
   DOMAIN=notehub.example.com
   LETSENCRYPT_EMAIL=admin@example.com
   LETSENCRYPT_STAGING=0
   ```

3. **Initialize SSL Certificates**:
   ```bash
   # Make script executable
   chmod +x scripts/init-letsencrypt.sh
   
   # Run initialization
   ./scripts/init-letsencrypt.sh
   ```

4. **Deploy with SSL**:
   ```bash
   # Start with SSL profile
   docker compose --profile ssl up -d
   
   # Check status
   docker compose ps
   
   # Access at https://notehub.example.com
   ```

### Let's Encrypt vs Cloudflare Tunnel

| Feature | Let's Encrypt | Cloudflare Tunnel |
|---------|---------------|-------------------|
| **Cost** | Free | Free |
| **Setup** | One script | Manual token setup |
| **DDoS Protection** | ❌ | ✅ |
| **CDN** | ❌ | ✅ |
| **Direct Connection** | ✅ | ❌ (proxied) |
| **SSL Rating** | A+ | A+ |
| **Bandwidth** | Server limited | Unlimited |

**Recommendation**: 
- Use **Let's Encrypt** for simple, direct HTTPS
- Use **Cloudflare Tunnel** for DDoS protection and unlimited bandwidth

See [Certbot Setup Guide](CERTBOT_SETUP.md) for complete Let's Encrypt documentation.

---

**Need help?** Open an issue on [GitHub](https://github.com/thienng-it/note-hub/issues)!
