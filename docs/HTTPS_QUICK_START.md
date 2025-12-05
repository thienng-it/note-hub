# 🚀 HTTPS Quick Start Guide

Get your NoteHub instance secured with HTTPS in under 10 minutes.

## 📋 Prerequisites Checklist

Before you begin, ensure you have:

- [ ] Domain name registered (e.g., notehub.example.com)
- [ ] Domain's DNS A record pointing to your server IP
- [ ] Server with Docker and Docker Compose installed
- [ ] Ports 80 and 443 open and accessible from internet
- [ ] Valid email address for certificate notifications

## ⚡ 5-Minute Setup

### Step 1: Clone & Configure (2 minutes)

```bash
# Clone repository
git clone https://github.com/thienng-it/note-hub.git
cd note-hub

# Create configuration
cp .env.example .env
nano .env
```

**Required settings in .env:**
```bash
# SSL Configuration
DOMAIN=notehub.example.com              # Your domain
LETSENCRYPT_EMAIL=admin@example.com     # Your email

# Admin Credentials
NOTES_ADMIN_PASSWORD=YourSecurePass123! # Strong password

# Security
SECRET_KEY=$(openssl rand -hex 32)      # Generate with command
```

### Step 2: Validate Setup (1 minute)

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run validation
./scripts/validate-ssl-setup.sh
```

**Expected output:**
```
✓ All checks passed!
You're ready to deploy with SSL/TLS
```

### Step 3: Initialize SSL (2 minutes)

```bash
# If you have default services running, stop them first
docker compose stop frontend

# Initialize Let's Encrypt certificates
# This script will automatically stop conflicting services and start SSL services
./scripts/init-letsencrypt.sh
```

**Wait for:**
```
✓ Certificate successfully obtained!
Your site should now be accessible via HTTPS
```

**Note**: The init script automatically:
- Stops services using port 80 (frontend, nginx-ssl)
- Requests SSL certificate using Certbot standalone mode
- Starts only nginx-ssl, certbot, and backend services
- Keeps frontend stopped to avoid port conflicts

### Step 4: Verify (30 seconds)

```bash
# Check status
docker compose ps

# Should show: backend, nginx-ssl, certbot (running)
# Should NOT show: frontend (to avoid port conflict)

# View logs (optional)
docker compose logs -f nginx-ssl
```

### Step 5: Test HTTPS (30 seconds)

```bash
# Test HTTPS
curl -I https://notehub.example.com

# Should show: HTTP/2 200
```

**Or open in browser:**
- Navigate to `https://notehub.example.com`
- Look for 🔒 padlock icon
- Certificate should show "Let's Encrypt"

## 🎉 You're Done!

Your NoteHub is now secured with HTTPS!

## 📊 Architecture Diagram

```
Internet
   │
   ├── Port 80 (HTTP)  ──┐
   └── Port 443 (HTTPS) ─┤
                         │
                    ┌────▼─────┐
                    │  nginx   │ ◄── Serves React frontend
                    │  (SSL)   │ ◄── HTTP → HTTPS redirect
                    └────┬─────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐     ┌────▼────┐    ┌────▼────┐
    │ Certbot │     │ Backend │    │ Static  │
    │ (Renew) │     │ API     │    │ Assets  │
    └─────────┘     └─────────┘    └─────────┘
         │
         └── Auto-renew certificates every 12h
```

## 🔧 Common Commands

```bash
# Check certificate status
docker compose exec certbot certbot certificates

# View logs
docker compose logs -f certbot        # Certificate logs
docker compose logs -f nginx-ssl      # Web server logs
docker compose logs -f backend        # API logs

# Restart services
docker compose restart nginx-ssl certbot   # Restart SSL services
docker compose restart backend             # Restart backend

# Start services if stopped
docker compose up -d backend nginx-ssl certbot

# Force certificate renewal (if needed)
docker compose run --rm certbot certbot renew --force-renewal
docker compose exec nginx-ssl nginx -s reload

# Stop SSL services
docker compose stop nginx-ssl certbot

# Switch back to HTTP (stop SSL, start frontend)
docker compose down
docker compose up -d  # Starts default: frontend + backend
```

## 🐛 Quick Troubleshooting

### Certificate request failed

**Problem:** Port 80 not accessible from internet (most common issue)

**Quick fix:**
```bash
# 1. Check if port 80 is accessible from the INTERNET
# Test from another network/computer (not your server):
curl -I http://your-domain.com
# Or use: https://www.yougetsignal.com/tools/open-ports/

# 2. If port 80 is NOT accessible:

# a) Check router port forwarding
#    - Forward port 80 → your server's local IP:80
#    - Forward port 443 → your server's local IP:443

# b) Check firewall
ufw allow 80/tcp
ufw allow 443/tcp

# c) For DuckDNS users - verify IP is current:
#    Go to https://www.duckdns.org/ and check your IP

# 3. Check DNS resolves to correct IP
dig +short your-domain.com
# Should return your PUBLIC IP (not 192.168.x.x)

# 4. Try staging mode first (avoids rate limits)
# In .env, set: LETSENCRYPT_STAGING=1
./scripts/init-letsencrypt.sh

# 5. Once staging works, switch to production
# In .env, set: LETSENCRYPT_STAGING=0
./scripts/init-letsencrypt.sh
```

**Common error:** `Invalid response from http://domain/.well-known/acme-challenge/xxx: 404`
- **Cause:** Let's Encrypt cannot reach your server on port 80 from the internet
- **Fix:** Configure port forwarding on your router and ensure firewall allows port 80

### Port conflict error

**Problem:** `Bind for 0.0.0.0:80 failed: port is already allocated`

**Cause:** Both `frontend` (HTTP) and `nginx-ssl` (HTTPS) try to use port 80

**Quick fix:**
```bash
# Stop the default frontend service
docker compose stop frontend

# Start only SSL services (not using --profile ssl to avoid starting frontend)
docker compose up -d backend nginx-ssl certbot

# Or just run the init script which handles this automatically
./scripts/init-letsencrypt.sh
```

**Note:** 
- The init script automatically manages services to avoid conflicts
- Don't use `docker compose --profile ssl up -d` as it starts both frontend and nginx-ssl
- Use specific service names: `docker compose up -d backend nginx-ssl certbot`

### Can't access site

**Problem:** Firewall blocking ports

**Quick fix:**
```bash
# Open ports with UFW
ufw allow 80/tcp
ufw allow 443/tcp

# Or with iptables
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

## 📚 Learn More

- **Complete Setup Guide:** [CERTBOT_SETUP.md](guides/CERTBOT_SETUP.md)
- **Deployment Options:** [DEPLOYMENT_OPTIONS.md](DEPLOYMENT_OPTIONS.md)
- **Technical Summary:** [SSL_IMPLEMENTATION_SUMMARY.md](guides/SSL_IMPLEMENTATION_SUMMARY.md)
- **Main Documentation:** [README.md](../README.md)

## 🆘 Need Help?

1. **Check validation:** `./scripts/validate-ssl-setup.sh`
2. **View detailed logs:** `docker compose logs certbot`
3. **Read troubleshooting:** [CERTBOT_SETUP.md#troubleshooting](guides/CERTBOT_SETUP.md#troubleshooting)
4. **Open an issue:** [GitHub Issues](https://github.com/thienng-it/note-hub/issues)

## 🔐 Security Checklist

After setup, verify:

- [ ] HTTPS works (green padlock in browser)
- [ ] HTTP redirects to HTTPS
- [ ] Certificate shows "Let's Encrypt" as issuer
- [ ] SSL Labs test shows A or A+ rating: [ssllabs.com/ssltest](https://www.ssllabs.com/ssltest/)
- [ ] Certificate expiration is monitored (email notifications)

## 💡 Pro Tips

1. **Test first with staging:**
   - Set `LETSENCRYPT_STAGING=1` in .env
   - Avoids hitting Let's Encrypt rate limits
   - Switch to `0` once testing succeeds

2. **Monitor renewal:**
   ```bash
   # Check certificate expiration
   docker compose exec certbot certbot certificates
   
   # Should auto-renew when <30 days left
   ```

3. **Backup certificates:**
   ```bash
   tar -czf certs-backup-$(date +%Y%m%d).tar.gz docker/certbot/conf/
   ```

4. **Multiple domains:**
   ```bash
   # In .env:
   DOMAIN=example.com,www.example.com,api.example.com
   ```

## 🎓 What You Just Set Up

✅ **Free SSL certificate** from Let's Encrypt  
✅ **Automatic renewal** every 12 hours  
✅ **A+ security rating** with modern TLS  
✅ **HTTP to HTTPS redirect** for all traffic  
✅ **Security headers** (HSTS, CSP, etc.)  
✅ **Production-ready** HTTPS deployment  

**Certificate valid for:** 90 days (auto-renews)  
**Renewal check:** Every 12 hours  
**Renewal threshold:** When <30 days remaining  

---

**🚀 Happy secure hosting!**
