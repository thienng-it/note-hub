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
# Initialize Let's Encrypt certificates
./scripts/init-letsencrypt.sh
```

**Wait for:**
```
✓ Certificate successfully obtained!
Your site should now be accessible via HTTPS
```

### Step 4: Deploy (1 minute)

```bash
# Start with SSL profile
docker compose --profile ssl up -d

# Check status
docker compose ps

# View logs (optional)
docker compose logs -f nginx-ssl
```

### Step 5: Verify (30 seconds)

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
docker compose restart nginx-ssl      # Restart web server
docker compose restart                # Restart all

# Force certificate renewal (if needed)
docker compose run --rm certbot certbot renew --force-renewal
docker compose exec nginx-ssl nginx -s reload

# Stop everything
docker compose down
```

## 🐛 Quick Troubleshooting

### Certificate request failed

**Problem:** DNS not configured or ports blocked

**Quick fix:**
```bash
# 1. Check DNS
dig +short your-domain.com
# Should return your server IP

# 2. Check ports
curl http://your-domain.com
# Should connect (even if shows error page)

# 3. Try staging mode first (avoids rate limits)
# In .env, set: LETSENCRYPT_STAGING=1
./scripts/init-letsencrypt.sh

# 4. Once staging works, switch to production
# In .env, set: LETSENCRYPT_STAGING=0
./scripts/init-letsencrypt.sh
```

### nginx won't start

**Problem:** Port already in use

**Quick fix:**
```bash
# Check what's using port 80/443
netstat -tlnp | grep -E ':80|:443'

# Stop conflicting service
systemctl stop apache2   # or nginx, or whatever is running

# Try again
docker compose --profile ssl up -d
```

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
