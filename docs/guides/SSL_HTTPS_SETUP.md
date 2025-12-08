# SSL/HTTPS Setup Guide for NoteHub

This guide explains how SSL/HTTPS works in NoteHub and how to configure it for different environments.

## Overview

**SSL/HTTPS is enabled by default** in all NoteHub deployments! 🔒

NoteHub uses Traefik reverse proxy with Let's Encrypt to provide automatic SSL certificate management. All HTTP traffic is automatically redirected to HTTPS, and certificates are obtained and renewed automatically.

## ⚠️ Using a Custom Domain?

**If you're accessing NoteHub via a custom domain** (like `note-hub.duckdns.org`, `app.yourdomain.com`, etc.) and seeing certificate warnings, please see the **[Custom Domain SSL Setup Guide](CUSTOM_DOMAIN_SSL_SETUP.md)** for the proper configuration.

The default configuration works for localhost but requires additional setup for custom domains to ensure Let's Encrypt issues certificates correctly.

## Table of Contents

1. [How It Works](#how-it-works)
2. [Production Setup](#production-setup)
3. [Development Setup](#development-setup)
4. [Troubleshooting](#troubleshooting)
5. [Advanced Configuration](#advanced-configuration)

## How It Works

### Automatic SSL Features

- **Automatic Certificate Issuance**: Let's Encrypt certificates are obtained automatically when you deploy
- **Auto-Renewal**: Certificates are renewed 30 days before expiration (no manual intervention)
- **HTTP to HTTPS Redirect**: All HTTP traffic (port 80) automatically redirects to HTTPS (port 443)
- **Security Headers**: HSTS, CSP, and other security headers are automatically applied
- **Self-Signed Fallback**: For localhost/development, self-signed certificates are used

### Architecture

```
Client Request (HTTP/HTTPS)
         ↓
    Traefik (ports 80/443)
         ↓
   [SSL Termination]
         ↓
   [HTTP Redirect → HTTPS]
         ↓
   [Route to Service]
         ↓
    Frontend/Backend
```

## Production Setup

### Prerequisites

1. **Domain Name**: A registered domain pointing to your server
2. **Public IP**: Server with a public IP address
3. **Open Ports**: Ports 80 and 443 must be accessible from the internet
4. **Valid Email**: For Let's Encrypt notifications

### Step-by-Step Setup

#### 1. Configure DNS

Point your domain to your server's public IP:

```
A Record: yourdomain.com → Your.Server.IP.Address
A Record: www.yourdomain.com → Your.Server.IP.Address (optional)
```

Wait for DNS propagation (can take 5-60 minutes).

#### 2. Configure Environment

Edit your `.env` file:

```bash
# Copy example and edit
cp .env.example .env
nano .env
```

Set these variables:

```bash
# SSL Configuration
ACME_EMAIL=admin@yourdomain.com

# Other required variables
SECRET_KEY=your-super-secret-key-change-this
NOTES_ADMIN_PASSWORD=YourSecurePassword123!
DATABASE_URL=mysql://user:pass@host:3306/database  # For production
```

#### 3. Deploy NoteHub

```bash
# Run with production profile
docker compose --profile production up -d

# Check logs
docker compose logs -f traefik-prod
```

#### 4. Verify SSL

1. Open your browser and go to `http://yourdomain.com`
2. You should be automatically redirected to `https://yourdomain.com`
3. Check that the SSL certificate is valid (green padlock in browser)

### What Happens Behind the Scenes

1. **First Request**: Traefik detects the domain from the incoming request
2. **Certificate Request**: Traefik contacts Let's Encrypt to obtain a certificate
3. **Domain Validation**: Let's Encrypt validates you control the domain (TLS challenge)
4. **Certificate Storage**: Certificate is saved to `./letsencrypt/acme.json`
5. **Automatic Serving**: All future requests use the SSL certificate
6. **Auto-Renewal**: Traefik renews the certificate automatically before expiration

## Development Setup

### Localhost SSL

For local development, SSL still works but with self-signed certificates:

```bash
# Configure environment
cp .env.example .env
nano .env  # Set NOTES_ADMIN_PASSWORD

# Optional: Set ACME_EMAIL (not required for localhost)
# ACME_EMAIL=admin@example.com

# Start services
docker compose up -d

# Access at https://localhost
```

### Browser Security Warnings

When accessing `https://localhost`, your browser will show a security warning because:
- Self-signed certificates are not trusted by default
- Let's Encrypt cannot validate localhost domains

**To proceed**:
- Chrome/Edge: Click "Advanced" → "Proceed to localhost (unsafe)"
- Firefox: Click "Advanced" → "Accept the Risk and Continue"
- Safari: Click "Show Details" → "visit this website"

This is **normal and safe for local development**.

### Alternative: Use HTTP in Development

If you prefer to avoid SSL warnings during development, you can temporarily disable SSL:

1. Edit `docker-compose.yml`
2. Comment out or remove the SSL-related command flags in the Traefik service
3. Remove port 443 mapping
4. Update service labels to use `web` instead of `websecure`

**Note**: This is not recommended as it creates a different environment from production.

## Troubleshooting

### Certificate Not Issued

**Problem**: SSL certificate is not being issued by Let's Encrypt.

**Possible Causes & Solutions**:

1. **DNS Not Configured**
   ```bash
   # Check if domain points to your server
   nslookup yourdomain.com
   dig yourdomain.com
   ```
   Solution: Update DNS A record to point to your server's IP

2. **Ports Not Open**
   ```bash
   # Check if ports are accessible
   telnet yourdomain.com 80
   telnet yourdomain.com 443
   ```
   Solution: Open ports in firewall:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **Invalid Email**
   - Check `ACME_EMAIL` in `.env` is valid
   - Let's Encrypt uses this for important notifications

4. **Rate Limits**
   - Let's Encrypt has rate limits (50 certificates per domain per week)
   - Use staging environment for testing (see Advanced Configuration)

### Certificate Renewal Failed

**Problem**: Certificate expired and auto-renewal failed.

**Solution**:

1. Check Traefik logs:
   ```bash
   docker compose logs traefik
   ```

2. Verify certificate file permissions:
   ```bash
   ls -la letsencrypt/
   # acme.json should be owned by the container user
   ```

3. Restart Traefik to trigger renewal:
   ```bash
   docker compose restart traefik
   ```

### Browser Shows "Not Secure"

**Problem**: Browser shows site is not secure even with SSL configured.

**Possible Causes**:

1. **Mixed Content**: Page loads resources over HTTP
   - Check browser console for mixed content warnings
   - Ensure all resources use HTTPS or relative URLs

2. **Certificate Mismatch**: Certificate domain doesn't match accessed domain
   - Accessing via IP instead of domain name
   - www vs non-www mismatch
   - Solution: Always access via the domain name in the certificate

3. **Certificate Not Trusted**: Self-signed or expired certificate
   - Check certificate details in browser
   - Verify certificate is from Let's Encrypt

### Port Conflicts

**Problem**: Ports 80 or 443 already in use.

**Solution**:

1. Check what's using the ports:
   ```bash
   sudo lsof -i :80
   sudo lsof -i :443
   ```

2. Stop conflicting service:
   ```bash
   sudo systemctl stop apache2
   sudo systemctl stop nginx
   ```

3. Or change NoteHub ports in `docker-compose.yml`:
   ```yaml
   ports:
     - "8080:80"
     - "8443:443"
   ```

## Advanced Configuration

### Using Let's Encrypt Staging Environment

For testing, use Let's Encrypt staging to avoid rate limits:

Edit `docker-compose.yml` Traefik command:

```yaml
command:
  # ... other commands ...
  - "--certificatesresolvers.letsencrypt.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory"
```

**Note**: Staging certificates are not trusted by browsers. Use only for testing.

### Custom Certificate Resolver Name

Change the resolver name from `letsencrypt` to something custom:

1. In `docker-compose.yml`, replace all instances of `letsencrypt` with `myresolver`
2. Update command flags and labels accordingly

### HTTP Challenge Instead of TLS Challenge

Use HTTP challenge for certificate validation:

```yaml
command:
  # ... other commands ...
  # Remove: - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
  # Add:
  - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
  - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
```

### Multiple Domains

To support multiple domains (e.g., yourdomain.com and www.yourdomain.com):

Add service labels:

```yaml
labels:
  - "traefik.http.routers.frontend.rule=Host(`yourdomain.com`) || Host(`www.yourdomain.com`)"
  - "traefik.http.routers.frontend.tls.domains[0].main=yourdomain.com"
  - "traefik.http.routers.frontend.tls.domains[0].sans=www.yourdomain.com"
```

### Wildcard Certificates

For wildcard certificates (*.yourdomain.com), you must use DNS challenge:

```yaml
command:
  # ... other commands ...
  - "--certificatesresolvers.letsencrypt.acme.dnschallenge=true"
  - "--certificatesresolvers.letsencrypt.acme.dnschallenge.provider=cloudflare"  # or other DNS provider

environment:
  - CF_API_EMAIL=your-email@example.com
  - CF_API_KEY=your-cloudflare-api-key
```

### Custom SSL Certificates

To use your own SSL certificates instead of Let's Encrypt:

1. Create a `certs` directory:
   ```bash
   mkdir -p ./certs
   ```

2. Add your certificate files:
   ```bash
   cp yourdomain.crt ./certs/
   cp yourdomain.key ./certs/
   ```

3. Update Traefik configuration to use file provider:
   ```yaml
   # In docker/traefik/dynamic.yml
   tls:
     certificates:
       - certFile: /certs/yourdomain.crt
         keyFile: /certs/yourdomain.key
   ```

4. Mount certs directory in docker-compose.yml:
   ```yaml
   volumes:
     - ./certs:/certs:ro
   ```

## Security Best Practices

### Certificate File Security

The `acme.json` file contains your private keys:

1. **File Permissions**: 
   ```bash
   chmod 600 letsencrypt/acme.json
   ```

2. **Backup**: Regularly backup certificate files
   ```bash
   cp letsencrypt/acme.json backups/acme.json.$(date +%Y%m%d)
   ```

3. **Never Commit**: Ensure `.gitignore` excludes certificate files (already configured)

### HSTS Configuration

HSTS (HTTP Strict Transport Security) is enabled by default with:
- `max-age=31536000` (1 year)
- `includeSubDomains=true`
- `preload=true`

This forces browsers to always use HTTPS for your domain.

### Content Security Policy

CSP is configured with `upgrade-insecure-requests` to automatically upgrade any HTTP resources to HTTPS.

## Certificate Management

### View Current Certificates

```bash
# View certificate file (not recommended - binary format)
cat letsencrypt/acme.json

# Check certificate via OpenSSL
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### Force Certificate Renewal

To force renewal before expiration:

```bash
# Stop Traefik
docker compose stop traefik

# Remove old certificate
rm letsencrypt/acme.json

# Start Traefik (will obtain new certificate)
docker compose start traefik
```

### Backup Certificates

```bash
# Backup before updates
tar czf certificates-backup-$(date +%Y%m%d).tar.gz letsencrypt/ letsencrypt-drone/

# Store in safe location
mv certificates-backup-*.tar.gz /path/to/secure/backup/
```

### Restore Certificates

```bash
# Extract backup
tar xzf certificates-backup-YYYYMMDD.tar.gz

# Restart Traefik
docker compose restart traefik
```

## Monitoring

### Check Certificate Expiration

```bash
# View certificate dates
echo | openssl s_client -connect yourdomain.com:443 -servername yourdomain.com 2>/dev/null | openssl x509 -noout -dates
```

### Monitor Traefik Logs

```bash
# Real-time logs
docker compose logs -f traefik

# Filter for certificate-related logs
docker compose logs traefik | grep -i "certificate\|acme"
```

### Set Up Expiration Alerts

Let's Encrypt sends expiration emails to `ACME_EMAIL`. Ensure:
1. Email is valid and monitored
2. Set up additional monitoring (Uptime Robot, Pingdom, etc.)
3. Consider using a monitoring service for certificate expiration

## Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [TLS Best Practices](https://doc.traefik.io/traefik/https/tls/)
- [ACME Protocol](https://doc.traefik.io/traefik/https/acme/)

## FAQ

### Do I need to manually renew certificates?

No. Traefik automatically renews certificates 30 days before expiration.

### Can I use NoteHub without a domain name?

Yes, but you won't get valid SSL certificates. You can:
- Use HTTP only (not recommended)
- Access via IP with self-signed certificates (browser warnings)
- Use localhost for development

### What happens if Let's Encrypt is down?

- Existing certificates continue to work
- New certificate requests will fail
- Auto-renewal will retry automatically
- Your site remains accessible with existing certificates

### Can I disable SSL/HTTPS redirect?

Not recommended for production, but you can remove the HTTP redirect:

Remove these lines from Traefik command in `docker-compose.yml`:
```yaml
- "--entrypoints.web.http.redirections.entrypoint.to=websecure"
- "--entrypoints.web.http.redirections.entrypoint.scheme=https"
- "--entrypoints.web.http.redirections.entrypoint.permanent=true"
```

### How do I check which domains have certificates?

```bash
# View certificate domains
docker compose exec traefik cat /letsencrypt/acme.json | grep -A 5 "domain"
```

### Can I use CloudFlare with NoteHub?

Yes! CloudFlare works great with NoteHub:

1. **CloudFlare Proxy Disabled** (Orange Cloud Off):
   - Let's Encrypt connects directly to your server
   - TLS challenge works as configured
   - Recommended setup

2. **CloudFlare Proxy Enabled** (Orange Cloud On):
   - Must use DNS challenge instead of TLS challenge
   - Configure CloudFlare API credentials in Traefik
   - CloudFlare provides its own SSL certificate to visitors

---

**Need Help?** Check the [Troubleshooting](#troubleshooting) section or open an issue on GitHub.
