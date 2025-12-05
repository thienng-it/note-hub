# 🔒 Let's Encrypt/Certbot HTTPS Setup Guide

Secure your NoteHub deployment with free SSL/TLS certificates from Let's Encrypt.

## 📋 Overview

This guide covers:
- Setting up Let's Encrypt certificates with Certbot
- Configuring nginx for HTTPS
- Automatic certificate renewal
- Troubleshooting common issues

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Free SSL Certificates** | Automatic SSL/TLS via Let's Encrypt |
| **Auto-Renewal** | Certificates renew automatically every 12 hours |
| **HTTP to HTTPS Redirect** | All HTTP traffic redirected to HTTPS |
| **Security Headers** | HSTS, CSP, and other security headers enabled |
| **A+ SSL Rating** | Modern TLS 1.2/1.3 with secure ciphers |

## 🚀 Quick Start

### Prerequisites

1. **Domain Name**: Must be registered and active
2. **DNS Configuration**: A record pointing to your server's IP
3. **Ports Open**: 80 (HTTP) and 443 (HTTPS) accessible from internet
4. **Docker**: Docker and Docker Compose installed
5. **Email**: Valid email for certificate expiration notices

### Step 1: Configure Environment

Edit your `.env` file:

```bash
# Copy template if not already done
cp .env.example .env

# Edit configuration
nano .env
```

Add SSL configuration:

```bash
# SSL/TLS Configuration (REQUIRED for HTTPS)
DOMAIN=notehub.example.com
LETSENCRYPT_EMAIL=admin@example.com
LETSENCRYPT_STAGING=0

# Other required settings
SECRET_KEY=your-super-secret-key-change-this
NOTES_ADMIN_PASSWORD=YourSecurePassword123!
```

**Important**: 
- `DOMAIN` must exactly match your DNS configuration
- `LETSENCRYPT_EMAIL` receives certificate expiration warnings
- `LETSENCRYPT_STAGING=0` for production (set to 1 for testing)

### Step 2: Verify Configuration

Run the validation script to check your setup:

```bash
# Make script executable
chmod +x scripts/validate-ssl-setup.sh

# Run validation
./scripts/validate-ssl-setup.sh
```

The script will check:
- ✅ Required environment variables
- ✅ DNS configuration
- ✅ Docker installation
- ✅ Port availability
- ✅ Configuration files

**Manual DNS verification** (if needed):

```bash
# Check DNS resolution
dig +short your-domain.com

# Should return your server's IP address
# Example output: 192.168.1.100

# Or use nslookup
nslookup your-domain.com

# Verify from external source
curl -I http://your-domain.com
```

**Troubleshooting DNS**:
- Changes can take 5-60 minutes to propagate
- Use [DNS Checker](https://dnschecker.org) to verify globally
- Ensure no CDN/proxy is between DNS and your server yet

### Step 3: Initialize Let's Encrypt

Run the initialization script:

```bash
# Make script executable
chmod +x scripts/init-letsencrypt.sh

# Run initialization
./scripts/init-letsencrypt.sh
```

The script will:
1. ✅ Download TLS security parameters
2. ✅ Create temporary self-signed certificate
3. ✅ Start nginx
4. ✅ Request real Let's Encrypt certificate
5. ✅ Replace temporary with real certificate
6. ✅ Reload nginx with HTTPS

**Expected Output**:
```
==================================================
  Let's Encrypt Certificate Setup for NoteHub
==================================================

Domain: notehub.example.com
Email: admin@example.com
Staging mode: 0

Creating certificate directories...
Downloading recommended TLS parameters...
✓ TLS parameters downloaded
Creating dummy certificate for notehub.example.com...
✓ Dummy certificate created
Starting nginx...
✓ nginx started
Removing dummy certificate...
✓ Dummy certificate removed
Requesting Let's Encrypt certificate...
✓ Certificate successfully obtained!

Your site should now be accessible via HTTPS:
  https://notehub.example.com
```

### Step 4: Start Services with SSL

```bash
# Start with SSL profile
docker compose --profile ssl up -d

# Verify all containers are running
docker compose ps

# Check logs
docker compose logs -f nginx-ssl
docker compose logs -f certbot
```

### Step 5: Verify HTTPS

1. **Check Certificate**:
   ```bash
   # Test HTTPS connection
   curl -I https://your-domain.com
   
   # Should return: HTTP/2 200
   ```

2. **Browser Test**:
   - Open `https://your-domain.com`
   - Check for padlock icon 🔒
   - Click padlock to view certificate details
   - Verify issuer is "Let's Encrypt"

3. **SSL Rating Test**:
   - Visit [SSL Labs](https://www.ssllabs.com/ssltest/)
   - Enter your domain
   - Should achieve **A** or **A+** rating

## 🔧 Configuration Options

### Testing Mode (Staging)

Let's Encrypt has rate limits (5 certificates per week). Test first:

```bash
# Set staging mode in .env
LETSENCRYPT_STAGING=1

# Run initialization
./scripts/init-letsencrypt.sh
```

Staging certificates:
- ✅ Won't hit production rate limits
- ✅ Same validation process
- ❌ Show as untrusted in browsers
- ❌ Can't use for production

### Production Mode

Once testing succeeds:

```bash
# Set production mode in .env
LETSENCRYPT_STAGING=0

# Reinitialize with production certificates
./scripts/init-letsencrypt.sh
```

### Multiple Domains

To secure multiple domains/subdomains:

```bash
# In .env
DOMAIN=example.com,www.example.com,notes.example.com
```

**Requirements**:
- All domains must point to same server
- Comma-separated list (no spaces)
- First domain is primary (certificate name)

## 🔄 Certificate Renewal

### Automatic Renewal

Certbot automatically checks and renews certificates:

- **Schedule**: Every 12 hours
- **Threshold**: Renews when <30 days until expiration
- **Process**: Transparent, no downtime
- **Notification**: Email sent if renewal fails

**Monitor Renewal**:
```bash
# View certbot logs
docker compose logs certbot

# Check certificate expiration
docker compose exec certbot certbot certificates

# Expected output:
# Certificate Name: notehub.example.com
#   Expiry Date: 2024-03-01 12:00:00+00:00 (VALID: 89 days)
```

### Manual Renewal

Force renewal manually if needed:

```bash
# Force certificate renewal
docker compose run --rm certbot certbot renew --force-renewal

# Reload nginx after renewal
docker compose exec nginx-ssl nginx -s reload
```

### Renewal Testing

Test renewal process without actual renewal:

```bash
# Dry run (test only, doesn't renew)
docker compose run --rm certbot certbot renew --dry-run

# Should output: "Congratulations, all simulated renewals succeeded"
```

## 🛠️ Management Commands

### View Certificate Information

```bash
# List all certificates
docker compose exec certbot certbot certificates

# View certificate details
openssl x509 -in docker/certbot/conf/live/your-domain.com/fullchain.pem -text -noout
```

### Restart Services

```bash
# Restart nginx only
docker compose restart nginx-ssl

# Restart all SSL services
docker compose --profile ssl restart

# Full restart (backend + nginx + certbot)
docker compose down
docker compose --profile ssl up -d
```

### Update nginx Configuration

After modifying `docker/nginx-ssl.conf`:

```bash
# Test configuration syntax
docker compose exec nginx-ssl nginx -t

# Reload if valid
docker compose exec nginx-ssl nginx -s reload

# Or restart container
docker compose restart nginx-ssl
```

### Certificate Revocation

If you need to revoke a certificate:

```bash
# Revoke certificate
docker compose run --rm certbot certbot revoke \
  --cert-path /etc/letsencrypt/live/your-domain.com/fullchain.pem

# Delete certificate
docker compose run --rm certbot certbot delete \
  --cert-name your-domain.com

# Request new certificate
./scripts/init-letsencrypt.sh
```

## 🐛 Troubleshooting

### Certificate Request Failed

**Symptom**: Init script fails with "Certificate request failed"

**Common Causes**:

1. **DNS Not Configured**:
   ```bash
   # Verify DNS
   dig +short your-domain.com
   
   # Should return your server IP
   ```
   
   **Fix**: Wait for DNS propagation (5-60 min) or update DNS records

2. **Firewall Blocking Ports**:
   ```bash
   # Check if ports are accessible
   curl http://your-domain.com
   
   # Should connect (even if returns error page)
   ```
   
   **Fix**: Open ports 80 and 443:
   ```bash
   # UFW
   ufw allow 80/tcp
   ufw allow 443/tcp
   
   # iptables
   iptables -A INPUT -p tcp --dport 80 -j ACCEPT
   iptables -A INPUT -p tcp --dport 443 -j ACCEPT
   ```

2.5. **Challenge Failed - Port 80 Not Accessible from Internet (404 error)**:
   ```
   Error: Invalid response from http://domain/.well-known/acme-challenge/xxx: 404
   ```
   
   **Cause**: Let's Encrypt cannot access port 80 on your server from the internet
   
   **This is the most common issue, especially with:**
   - Home/residential internet connections
   - DuckDNS or other dynamic DNS services
   - Router/firewall port forwarding not configured
   - ISP blocking port 80
   
   **Fix**: 
   ```bash
   # 1. Test if port 80 is accessible from internet
   # From ANOTHER computer/network (not your server):
   curl -I http://your-domain.com
   # Or use online tool: https://www.yougetsignal.com/tools/open-ports/
   
   # 2. If port 80 is NOT accessible, check:
   
   # a) Router port forwarding
   #    - Log into your router
   #    - Forward external port 80 to your server's local IP:80
   #    - Forward external port 443 to your server's local IP:443
   
   # b) Firewall on server
   ufw status
   ufw allow 80/tcp
   ufw allow 443/tcp
   
   # c) Check if your ISP blocks port 80
   #    Some residential ISPs block port 80 for hosting
   #    Solution: Use alternative port or business internet
   
   # 3. For DuckDNS users:
   #    - Verify your DuckDNS domain is updated with correct public IP
   #    - Check at: https://www.duckdns.org/
   #    - Update your IP: curl "https://www.duckdns.org/update?domains=YOUR_SUBDOMAIN&token=YOUR_TOKEN&ip="
   
   # 4. After fixing network access, try again:
   ./scripts/init-letsencrypt.sh
   ```
   
   **Note**: The init script now uses standalone mode, which is more reliable than webroot mode.

3. **Rate Limit Exceeded**:
   ```
   Error: too many certificates already issued for: your-domain.com
   ```
   
   **Fix**: Wait 7 days or use staging mode for testing

4. **Domain Already Has Certificate**:
   ```bash
   # Check existing certificates
   docker compose exec certbot certbot certificates
   
   # Delete old certificate
   docker compose run --rm certbot certbot delete --cert-name your-domain.com
   
   # Reinitialize
   ./scripts/init-letsencrypt.sh
   ```

### nginx Won't Start

**Symptom**: nginx container fails to start

**Diagnosis**:
```bash
# Check nginx logs
docker compose logs nginx-ssl

# Test nginx config
docker compose run --rm nginx-ssl nginx -t
```

**Common Issues**:

1. **Port Already in Use**:
   ```bash
   # Find process using port 80/443
   netstat -tlnp | grep -E ':80|:443'
   
   # Stop conflicting service
   systemctl stop apache2  # or nginx
   ```

2. **Invalid Configuration**:
   ```bash
   # Validate nginx config syntax
   docker compose exec nginx-ssl nginx -t
   
   # Check for typos in nginx-ssl.conf
   ```

3. **Missing Certificate Files**:
   ```bash
   # Verify certificate files exist
   ls -la docker/certbot/conf/live/your-domain.com/
   
   # Should show: fullchain.pem, privkey.pem
   ```
   
   **Fix**: Run `./scripts/init-letsencrypt.sh` again

### HTTPS Not Working

**Symptom**: Can access HTTP but not HTTPS

**Diagnosis**:
```bash
# Test HTTPS locally
curl -I https://your-domain.com

# Test from external
curl -I https://your-domain.com --resolve your-domain.com:443:YOUR_SERVER_IP
```

**Common Issues**:

1. **Port 443 Not Open**:
   ```bash
   # Check firewall
   ufw status
   
   # Open port 443
   ufw allow 443/tcp
   ```

2. **Certificate Not Loaded**:
   ```bash
   # Check nginx config for correct paths
   docker compose exec nginx-ssl cat /etc/nginx/conf.d/default.conf | grep ssl_certificate
   
   # Verify files exist at those paths
   docker compose exec nginx-ssl ls -la /etc/letsencrypt/live/
   ```

3. **nginx Not Listening on 443**:
   ```bash
   # Check ports
   docker compose exec nginx-ssl netstat -tlnp | grep 443
   
   # Should show: 0.0.0.0:443
   ```

### Certificate Renewal Failing

**Symptom**: Certbot logs show renewal errors

**Diagnosis**:
```bash
# Check certbot logs
docker compose logs certbot

# Test renewal
docker compose run --rm certbot certbot renew --dry-run
```

**Common Issues**:

1. **Webroot Path Incorrect**:
   ```bash
   # Verify challenge directory exists and is writable
   docker compose exec nginx-ssl ls -la /var/www/certbot/.well-known/
   ```

2. **nginx Not Serving Challenge**:
   ```bash
   # Test challenge location
   curl http://your-domain.com/.well-known/acme-challenge/test
   
   # Should return 404 (not 301 redirect or connection refused)
   ```

3. **DNS Changed**:
   ```bash
   # Verify domain still points to server
   dig +short your-domain.com
   ```

## 🔐 Security Best Practices

### 1. Strong TLS Configuration

Our configuration includes:
- ✅ TLS 1.2 and 1.3 only (no SSL, TLS 1.0/1.1)
- ✅ Modern cipher suites (no weak ciphers)
- ✅ HSTS with 1-year max-age
- ✅ OCSP stapling
- ✅ Session resumption
- ✅ 4096-bit RSA keys

### 2. Security Headers

Automatically enabled:
- `Strict-Transport-Security`: Force HTTPS for 1 year
- `X-Frame-Options`: Prevent clickjacking
- `X-Content-Type-Options`: Prevent MIME sniffing
- `X-XSS-Protection`: XSS filter
- `Content-Security-Policy`: Restrict resource loading
- `Referrer-Policy`: Control referrer information

### 3. Regular Monitoring

```bash
# Check certificate expiration
docker compose exec certbot certbot certificates

# Review nginx access logs
docker compose exec nginx-ssl tail -f /var/log/nginx/access.log

# Monitor renewal attempts
docker compose logs certbot | grep -i renew
```

### 4. Backup Certificates

```bash
# Backup certificate directory
tar -czf certbot-backup-$(date +%Y%m%d).tar.gz docker/certbot/conf/

# Store backups securely off-server
scp certbot-backup-*.tar.gz user@backup-server:/backups/

# Restore from backup
tar -xzf certbot-backup-20241205.tar.gz
```

## 📊 Production Checklist

Before going live with HTTPS:

- [ ] Domain DNS points to server IP
- [ ] Ports 80 and 443 open in firewall
- [ ] `.env` configured with production domain and email
- [ ] Tested with staging certificates first
- [ ] Production certificates obtained successfully
- [ ] HTTPS site accessible in browser
- [ ] HTTP redirects to HTTPS
- [ ] Certificate shows valid (green padlock)
- [ ] SSL Labs rating is A or A+
- [ ] Certbot renewal logs show success
- [ ] Backup of certificate files created

## 📚 Additional Resources

### Official Documentation
- [Let's Encrypt](https://letsencrypt.org/)
- [Certbot](https://certbot.eff.org/)
- [nginx SSL Module](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)

### Security Testing
- [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [Security Headers](https://securityheaders.com/)

### Troubleshooting
- [Let's Encrypt Community](https://community.letsencrypt.org/)
- [Certbot Documentation](https://eff-certbot.readthedocs.io/)

## 🆘 Getting Help

If you encounter issues:

1. **Check Logs**:
   ```bash
   docker compose logs nginx-ssl
   docker compose logs certbot
   docker compose logs backend
   ```

2. **Run Diagnostics**:
   ```bash
   # DNS
   dig +short your-domain.com
   
   # Port accessibility
   curl -I http://your-domain.com
   
   # Certificate status
   docker compose exec certbot certbot certificates
   
   # nginx config test
   docker compose exec nginx-ssl nginx -t
   ```

3. **Open an Issue**:
   - Visit [GitHub Issues](https://github.com/thienng-it/note-hub/issues)
   - Include error messages and diagnostic output
   - Mention you're using the SSL profile

---

**Happy Secure Hosting! 🔒**
