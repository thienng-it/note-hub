# Custom Domain SSL Setup Guide

## Problem: "Not Secure" Certificate Warning

If you're accessing your NoteHub instance via a custom domain (like `note-hub.duckdns.org`, `app.yourdomain.com`, etc.) and seeing a browser warning about an insecure or invalid SSL certificate, this guide will help you fix it.

### Why This Happens

The default NoteHub configuration uses Traefik router rules that match any domain using path-based routing (`PathPrefix('/')`). While this works for localhost development, it can cause problems for custom domains:

1. **Certificate Mismatch**: Let's Encrypt may issue a certificate for the wrong domain or IP address
2. **No Host Validation**: Traefik doesn't know which specific domain to request a certificate for
3. **Browser Warning**: The SSL certificate doesn't match the domain you're accessing, causing security warnings

### The Solution

You need to explicitly configure your domain name in the Traefik router rules. This ensures:
- Let's Encrypt issues certificates for the correct domain
- The SSL certificate matches your actual domain name
- No browser warnings when accessing your site

---

## Quick Fix (Recommended)

### Step 1: Configure Your Domain

Edit your `.env` file and set your domain:

```bash
# Open .env file
nano .env

# Add these lines (replace with your actual domain):
DOMAIN=note-hub.duckdns.org
ACME_EMAIL=your-email@example.com
```

**Important**: 
- Use your actual domain name without `http://` or `https://`
- Examples: `yourdomain.com`, `note-hub.duckdns.org`, `app.example.com`
- ACME_EMAIL is required for Let's Encrypt certificate notifications

### Step 2: Apply Domain Configuration

Copy the domain-specific Docker Compose configuration:

```bash
cp docker-compose.domain.yml docker-compose.override.yml
```

This file adds explicit Host rules to your Traefik routers, ensuring Let's Encrypt issues certificates for your specific domain.

### Step 3: Restart Services

```bash
# Stop current services
docker compose down

# Start with new configuration
docker compose up -d

# Monitor certificate issuance
docker compose logs -f traefik
```

You should see logs like:
```
traefik | time="..." level=info msg="Obtaining certificate for note-hub.duckdns.org"
traefik | time="..." level=info msg="Certificate obtained for note-hub.duckdns.org"
```

### Step 4: Verify

1. Wait 1-2 minutes for certificate issuance
2. Access your domain: `https://your-domain.com`
3. Check for the green padlock icon in your browser
4. Verify the certificate (click padlock → View certificate)
   - Should be issued by "Let's Encrypt"
   - Should match your domain name

---

## What the Override File Does

The `docker-compose.override.yml` file modifies Traefik router rules to include Host matchers:

**Before (default configuration):**
```yaml
- "traefik.http.routers.frontend.rule=PathPrefix(`/`)"
```

**After (with domain configuration):**
```yaml
- "traefik.http.routers.frontend.rule=Host(`note-hub.duckdns.org`) || Host(`www.note-hub.duckdns.org`)"
```

This tells Traefik:
1. Only accept requests for your specific domain
2. Request Let's Encrypt certificates for that domain
3. Ensure the certificate matches the domain being accessed

---

## Alternative: Manual Configuration

If you prefer not to use the override file, you can manually edit `docker-compose.yml`:

### For Frontend

Find the frontend service labels and update the router rule:

```yaml
frontend:
  labels:
    # Change from:
    - "traefik.http.routers.frontend.rule=PathPrefix(`/`)"
    
    # To:
    - "traefik.http.routers.frontend.rule=Host(`your-domain.com`) || Host(`www.your-domain.com`)"
```

### For Backend

Update backend router rules to include Host matcher:

```yaml
backend:
  labels:
    # Change from:
    - "traefik.http.routers.backend-api.rule=PathPrefix(`/api`)"
    
    # To:
    - "traefik.http.routers.backend-api.rule=(Host(`your-domain.com`) || Host(`www.your-domain.com`)) && PathPrefix(`/api`)"
```

Repeat for all router rules (`backend-uploads`, `backend-health`, etc.)

---

## Troubleshooting

### Certificate Not Being Issued

**Check DNS:**
```bash
# Verify domain points to your server
nslookup your-domain.com
dig your-domain.com
```

DNS should show your server's IP address.

**Check Ports:**
```bash
# Test if ports 80 and 443 are accessible
telnet your-domain.com 80
telnet your-domain.com 443
```

If connection fails, check firewall:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

**Check Traefik Logs:**
```bash
docker compose logs traefik | grep -i "certificate\|acme\|error"
```

Look for error messages about certificate issuance.

### "Rate Limit Exceeded" Error

Let's Encrypt has rate limits (50 certificates per domain per week). If you hit this:

1. **Wait 7 days** for the rate limit to reset, OR
2. **Use staging environment** for testing:

Create a `docker-compose.staging.yml` override file with:
```yaml
services:
  traefik:
    command:
      - "--certificatesresolvers.letsencrypt.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory"
```

Then deploy with:
```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.staging.yml up -d
```

**Note**: Staging certificates are not trusted by browsers (for testing only). Remove the staging override file for production use.

### Wrong Certificate Issued

If the certificate is for the wrong domain:

1. Stop Traefik:
   ```bash
   docker compose stop traefik
   ```

2. Remove old certificate:
   ```bash
   rm letsencrypt/acme.json
   ```

3. Verify DOMAIN in `.env` is correct

4. Restart:
   ```bash
   docker compose up -d
   ```

### Certificate for Both www and non-www

The override file automatically requests certificates for both:
- `your-domain.com`
- `www.your-domain.com`

To access both, ensure DNS is configured:
```
A Record:  your-domain.com      →  Your.Server.IP
A Record:  www.your-domain.com  →  Your.Server.IP
```

### Still Seeing Browser Warning

1. **Clear browser cache** (certificates may be cached)
2. **Check certificate details**: Click padlock → View certificate
   - Verify it's from "Let's Encrypt"
   - Verify it matches your domain
   - Check expiration date (should be valid for 90 days)
3. **Try incognito/private browsing** to rule out browser cache
4. **Test with SSL Labs**: https://www.ssllabs.com/ssltest/

---

## DuckDNS Specific Configuration

If you're using DuckDNS (like `note-hub.duckdns.org`):

### DNS Configuration

DuckDNS provides free subdomains with automatic IP updates. To use it:

1. Sign up at [DuckDNS](https://www.duckdns.org)
2. Create a subdomain (e.g., `note-hub`)
3. Set the IP to your server's public IP
4. Keep it updated (DuckDNS provides scripts for auto-update)

### NoteHub Configuration

```bash
# In .env file
DOMAIN=note-hub.duckdns.org
ACME_EMAIL=your-email@example.com
```

### Copy Override File

```bash
cp docker-compose.domain.yml docker-compose.override.yml
```

### Deploy

```bash
docker compose up -d
docker compose logs -f traefik
```

Wait for certificate issuance (usually 30-60 seconds).

---

## For Multiple Domains

If you want to access NoteHub via multiple domains:

Edit `docker-compose.override.yml` and update the Host rule:

```yaml
- "traefik.http.routers.frontend.rule=Host(`domain1.com`) || Host(`domain2.com`) || Host(`domain3.com`)"
```

All domains must:
1. Point to your server's IP
2. Be included in the Host rule
3. Have DNS configured properly

Let's Encrypt will issue a certificate valid for all listed domains.

---

## Security Best Practices

### 1. Keep DOMAIN in .env

Never hardcode domain names in docker-compose.yml. Use `.env` file:

```bash
# .env
DOMAIN=your-domain.com
```

This keeps your configuration portable and secure.

### 2. Backup Certificates

SSL certificates are stored in `letsencrypt/acme.json`:

```bash
# Backup certificates
cp letsencrypt/acme.json backups/acme.json.$(date +%Y%m%d)
```

### 3. Monitor Certificate Expiration

Let's Encrypt certificates expire after 90 days. They auto-renew after 60 days, but monitor for failures:

```bash
# Check certificate expiration
echo | openssl s_client -connect your-domain.com:443 -servername your-domain.com 2>/dev/null | openssl x509 -noout -dates
```

Set up monitoring with services like:
- UptimeRobot
- StatusCake  
- Pingdom

### 4. Enable HSTS Preload (Optional)

For maximum security, submit your domain to HSTS preload list:

1. Visit: https://hstspreload.org
2. Enter your domain
3. Follow submission instructions

**Warning**: This is a permanent action that cannot be easily reversed.

---

## Different Deployment Modes

### Development (localhost)

For localhost development, you don't need the override file:

```bash
# .env
# DOMAIN= (leave blank or commented)
```

Access via: `https://localhost` (will show security warning, which is normal)

### Production with Domain

```bash
# .env
DOMAIN=your-domain.com
ACME_EMAIL=admin@your-domain.com
```

```bash
cp docker-compose.domain.yml docker-compose.override.yml
docker compose --profile production up -d
```

### With MySQL

```bash
# .env
DOMAIN=your-domain.com
ACME_EMAIL=admin@your-domain.com
```

```bash
cp docker-compose.domain.yml docker-compose.override.yml
docker compose --profile mysql up -d
```

The override file works with all deployment profiles.

---

## Reverting to Default (No Domain)

To revert to the default configuration (useful for localhost):

```bash
# Remove override file
rm docker-compose.override.yml

# Comment out DOMAIN in .env
# DOMAIN=

# Restart
docker compose down
docker compose up -d
```

---

## Summary

To fix "not secure" certificate warnings when using a custom domain:

1. ✅ Set `DOMAIN` in `.env` file
2. ✅ Copy `docker-compose.domain.yml` to `docker-compose.override.yml`
3. ✅ Restart services with `docker compose up -d`
4. ✅ Wait for certificate issuance (1-2 minutes)
5. ✅ Verify green padlock in browser

This ensures Let's Encrypt issues SSL certificates for your specific domain, eliminating browser warnings.

---

## Need Help?

- Check [SSL/HTTPS Setup Guide](SSL_HTTPS_SETUP.md) for general SSL configuration
- Check [Traefik Migration Guide](TRAEFIK_MIGRATION.md) for Traefik details
- Open an issue on [GitHub](https://github.com/thienng-it/note-hub/issues)
