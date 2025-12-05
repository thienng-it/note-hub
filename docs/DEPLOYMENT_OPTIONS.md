# 🚀 NoteHub Deployment Options

Quick reference guide for deploying NoteHub with different configurations.

## 📋 Comparison Table

| Feature | Development | Production (HTTP) | Production (HTTPS) | Production (Cloudflare) |
|---------|-------------|-------------------|--------------------|-----------------------|
| **Command** | `docker compose up -d` | `docker compose --profile production up -d` | `docker compose --profile ssl up -d` | Custom docker-compose |
| **Database** | SQLite | Cloud MySQL/PostgreSQL | SQLite or MySQL | SQLite or MySQL |
| **SSL/TLS** | ❌ | ❌ | ✅ (Let's Encrypt) | ✅ (Cloudflare) |
| **Domain Required** | ❌ | ❌ | ✅ | ✅ |
| **Ports** | 80 | 80 | 80, 443 | Internal only |
| **Certificate Management** | N/A | N/A | Automatic (Certbot) | Automatic (Cloudflare) |
| **DDoS Protection** | ❌ | ❌ | ❌ | ✅ |
| **CDN** | ❌ | ❌ | ❌ | ✅ |
| **Setup Complexity** | Simple | Simple | Medium | Medium |
| **Cost** | Free | Free | Free | Free |

## 🎯 Choose Your Deployment

### Option 1: Development (Local Testing)

**Best for**: Local development, testing, learning

```bash
# Quick start
cp .env.example .env
nano .env  # Set NOTES_ADMIN_PASSWORD
docker compose up -d
docker compose exec backend node scripts/seed_db.js

# Access
http://localhost
```

**Features**:
- ✅ SQLite database (no external DB needed)
- ✅ Fast setup (< 5 minutes)
- ✅ Sample data seeding available
- ✅ No domain required

**Limitations**:
- ❌ No HTTPS
- ❌ Not production-ready
- ❌ Single server only

---

### Option 2: Production with HTTPS (Let's Encrypt)

**Best for**: Production deployments, small-to-medium traffic, self-hosted

```bash
# Setup
cp .env.example .env
nano .env  # Configure DOMAIN, LETSENCRYPT_EMAIL, NOTES_ADMIN_PASSWORD

# Initialize SSL certificates
chmod +x scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh

# Deploy
docker compose --profile ssl up -d

# Access
https://your-domain.com
```

**Features**:
- ✅ Free SSL certificates (Let's Encrypt)
- ✅ Automatic certificate renewal
- ✅ A+ SSL rating
- ✅ HTTP to HTTPS redirect
- ✅ HSTS and security headers
- ✅ SQLite or MySQL support

**Requirements**:
- Domain name with DNS configured
- Ports 80 and 443 open
- Valid email for certificate notifications

**See**: [Certbot Setup Guide](guides/CERTBOT_SETUP.md)

---

### Option 3: Production with Cloudflare Tunnel

**Best for**: Production deployments, high traffic, DDoS protection needed

```bash
# Setup Cloudflare Tunnel first
# See: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

# Configure
cp .env.example .env
nano .env  # Add CLOUDFLARE_TUNNEL_TOKEN

# Deploy with custom docker-compose (includes cloudflared)
# See Hetzner deployment guide for full setup

# Access
https://your-domain.com (via Cloudflare)
```

**Features**:
- ✅ Unlimited bandwidth (Cloudflare's network)
- ✅ DDoS protection
- ✅ Global CDN
- ✅ Free SSL certificate
- ✅ No ports to open (outbound only)
- ✅ Multiple origins support

**Requirements**:
- Cloudflare account
- Domain added to Cloudflare
- Cloudflare Tunnel configured

**See**: [Hetzner Deployment Guide](guides/HETZNER_DEPLOYMENT.md)

---

### Option 4: Production with Cloud Database

**Best for**: Scaling, multiple servers, managed database

```bash
# Setup cloud database (PlanetScale, AWS RDS, etc.)
# Get DATABASE_URL from provider

# Configure
cp .env.example .env
nano .env  # Set DATABASE_URL, SECRET_KEY, NOTES_ADMIN_PASSWORD

# Deploy with production profile
docker compose --profile production up -d

# Access (add reverse proxy with SSL)
http://your-server-ip
```

**Features**:
- ✅ Managed database (backups, scaling, etc.)
- ✅ Database separated from app
- ✅ Easy horizontal scaling
- ✅ Production-grade reliability

**Requirements**:
- Cloud database provider account
- DATABASE_URL from provider
- Reverse proxy for HTTPS (nginx, Caddy, Traefik)

**See**: [Production Deployment Guide](guides/DEPLOYMENT.md)

---

## 📝 Environment Variables Quick Reference

### Essential (All Deployments)
```bash
SECRET_KEY=<random-hex-32>              # Generate with: openssl rand -hex 32
NOTES_ADMIN_PASSWORD=<strong-password>  # Admin login password
```

### SSL/HTTPS (Let's Encrypt)
```bash
DOMAIN=notehub.example.com              # Your domain name
LETSENCRYPT_EMAIL=admin@example.com     # Certificate notifications
LETSENCRYPT_STAGING=0                   # 0=production, 1=testing
```

### Database (Production)
```bash
# Cloud database
DATABASE_URL=mysql://user:pass@host:3306/db

# Or MySQL details
MYSQL_HOST=db.example.com
MYSQL_PORT=3306
MYSQL_USER=notehub
MYSQL_PASSWORD=<secure-password>
MYSQL_DATABASE=notehub
```

### Optional Enhancements
```bash
# Redis caching (10x faster queries)
REDIS_URL=redis://localhost:6379

# Elasticsearch (5x faster search)
ELASTICSEARCH_NODE=http://localhost:9200

# Google OAuth SSO
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-secret>
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
```

---

## 🔧 Common Tasks

### Switch from HTTP to HTTPS

```bash
# Stop current deployment
docker compose down

# Configure SSL
nano .env  # Add DOMAIN and LETSENCRYPT_EMAIL

# Initialize certificates
./scripts/init-letsencrypt.sh

# Start with SSL
docker compose --profile ssl up -d
```

### Migrate SQLite to MySQL

```bash
# Export SQLite data
docker compose exec backend node scripts/export_data.js > backup.json

# Update .env with MySQL config
nano .env

# Start with MySQL
docker compose --profile mysql up -d

# Import data
docker compose exec backend-mysql node scripts/import_data.js < backup.json
```

### Scale Horizontally

```bash
# Deploy multiple app servers behind load balancer
# All connect to same cloud database

# Server 1
DATABASE_URL=mysql://... docker compose --profile production up -d

# Server 2 (different server)
DATABASE_URL=mysql://... docker compose --profile production up -d

# Configure load balancer (nginx, HAProxy, etc.) to distribute traffic
```

---

## 🐛 Troubleshooting

### "Required variable is missing"

**Error**: `NOTES_ADMIN_PASSWORD is missing a value`

**Fix**: Create/update `.env` file with required variables:
```bash
cp .env.example .env
nano .env  # Fill in required values
```

### Certificate request failed

**Error**: Let's Encrypt certificate request fails

**Fix**:
1. Verify domain DNS points to your server: `dig +short your-domain.com`
2. Check ports 80/443 are open: `curl http://your-domain.com`
3. Try staging mode first: `LETSENCRYPT_STAGING=1 ./scripts/init-letsencrypt.sh`
4. Check rate limits (5 certs/week): wait or use different domain

See [Certbot Troubleshooting](guides/CERTBOT_SETUP.md#troubleshooting)

### nginx won't start

**Error**: nginx container fails to start

**Fix**:
1. Check port conflicts: `netstat -tlnp | grep -E ':80|:443'`
2. Stop conflicting services: `systemctl stop apache2`
3. Validate config: `docker compose exec nginx nginx -t`
4. Check logs: `docker compose logs nginx-ssl`

### Database connection error

**Error**: Can't connect to MySQL/PostgreSQL

**Fix**:
1. Verify DATABASE_URL format: `mysql://user:pass@host:3306/db`
2. Test connection: `docker compose exec backend-mysql node -e "console.log(process.env)"`
3. Check database is running: `docker compose ps mysql`
4. Verify credentials match database setup

---

## 📚 Additional Resources

- [Certbot Setup Guide](guides/CERTBOT_SETUP.md) - Complete HTTPS setup with Let's Encrypt
- [Hetzner Deployment Guide](guides/HETZNER_DEPLOYMENT.md) - VPS deployment with Cloudflare
- [Performance Guide](guides/PERFORMANCE_GUIDE.md) - Redis and Elasticsearch optimization
- [Google OAuth Setup](guides/GOOGLE_SSO_SETUP.md) - Single Sign-On configuration
- [Contributing Guide](guides/CONTRIBUTING.md) - Development and contribution guidelines

---

## 💡 Recommendations

| Use Case | Recommended Option |
|----------|-------------------|
| Local development | Development (SQLite) |
| Personal blog/notes | Production HTTPS (Let's Encrypt) |
| Small team (<10 users) | Production HTTPS (Let's Encrypt) + Redis |
| Medium traffic (10-100 users) | Production HTTPS + MySQL + Redis |
| High traffic (100+ users) | Cloudflare Tunnel + Cloud DB + Redis + Elasticsearch |
| Enterprise | Multiple servers + Load balancer + Cloud DB + Full stack |

**Need help?** Open an issue on [GitHub](https://github.com/thienng-it/note-hub/issues)
