# Troubleshooting Drone CI SSL/HTTPS with Custom Domains

> **Quick Fix**: If you're seeing "not secure" warnings or certificate issuance errors when accessing Drone CI via a custom domain, you need to apply the domain configuration.

## Known Issues & Fixes

### Issue: TLS-ALPN-01 Challenge Failures

**Error Message:**
```
error: 403 :: urn:ietf:params:acme:error:unauthorized :: Incorrect validation certificate for tls-alpn-01 challenge
```

**Solution:**
This has been fixed in the latest version. The Drone CI configuration now uses HTTP-01 challenge instead of TLS-ALPN-01, which is more reliable and avoids conflicts with other services. If you're still experiencing this:

1. Pull the latest configuration: `git pull`
2. Restart Drone CI: `docker compose -f docker-compose.drone.yml down && docker compose -f docker-compose.drone.yml up -d`
3. Remove old certificates if needed: `sudo rm -f letsencrypt-drone/acme.json`

The HTTP-01 challenge uses port 80 for validation, which is more reliable than the TLS-ALPN-01 challenge on port 443.

## Quick Fix (3 Commands)

```bash
# 1. Set your domain in .env.drone
echo "DRONE_DOMAIN=drone.yourdomain.com" >> .env.drone
echo "DRONE_ACME_EMAIL=admin@yourdomain.com" >> .env.drone
echo "DRONE_SERVER_PROTO=https" >> .env.drone
sed -i 's/DRONE_SERVER_HOST=.*/DRONE_SERVER_HOST=drone.yourdomain.com/' .env.drone

# 2. Apply domain configuration
cp docker-compose.drone.domain.yml docker-compose.drone.override.yml

# 3. Restart Drone CI
docker compose -f docker-compose.drone.yml down
docker compose -f docker-compose.drone.yml up -d

# 4. Monitor certificate issuance (wait 30-60 seconds)
docker compose -f docker-compose.drone.yml logs -f drone-traefik | grep -i certificate
```

## Why This Happens

When you access Drone CI via a custom domain (like `drone.yourdomain.com`), but the Traefik configuration doesn't explicitly specify the domain using a `Host()` matcher, Let's Encrypt cannot determine which domain to issue certificates for. This results in:

- ❌ Browser warnings: "Your connection is not private"
- ❌ Certificate issued for wrong domain or IP address
- ❌ SSL/TLS errors in API clients

## The Solution

The `docker-compose.drone.domain.yml` file adds explicit Host() rules to Traefik router configuration, ensuring Let's Encrypt issues certificates for your specific domain.

**Default router rule** (works for localhost/IP but NOT custom domains):
```yaml
- "traefik.http.routers.drone-server.rule=PathPrefix(`/`)"
```

**With domain override** (works for custom domains):
```yaml
- "traefik.http.routers.drone-server.rule=Host(`drone.yourdomain.com`)"
```

## Detailed Setup Instructions

### Prerequisites

1. **DNS Configuration**: Your domain must point to your server
   ```bash
   # Verify DNS is working
   nslookup drone.yourdomain.com
   
   # Should return your server's IP address
   ```

2. **Firewall Configuration**: Ports 80 and 443 must be accessible
   ```bash
   # Test port 80 (HTTP - required for Let's Encrypt challenge)
   telnet drone.yourdomain.com 80
   
   # Test port 443 (HTTPS)
   telnet drone.yourdomain.com 443
   
   # If blocked, open ports:
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **GitHub OAuth Configuration**: Update callback URL
   - Go to https://github.com/settings/developers
   - Find your Drone CI OAuth App
   - Update callback URL to: `https://drone.yourdomain.com/login`
   - Note: Use `https://` not `http://` for custom domains

### Step-by-Step Setup

#### 1. Configure Domain Variables

Edit `.env.drone`:

```bash
# Set your custom domain (without http:// or https://)
DRONE_DOMAIN=drone.yourdomain.com

# Set email for Let's Encrypt notifications
DRONE_ACME_EMAIL=admin@yourdomain.com

# IMPORTANT: Use https for custom domains
DRONE_SERVER_PROTO=https

# Server host should match your domain (without port)
DRONE_SERVER_HOST=drone.yourdomain.com

# Keep other settings unchanged
DRONE_GITHUB_CLIENT_ID=your-client-id
DRONE_GITHUB_CLIENT_SECRET=your-client-secret
DRONE_RPC_SECRET=your-rpc-secret
# ... rest of config
```

#### 2. Apply Domain Configuration

```bash
# Copy domain configuration as override file
cp docker-compose.drone.domain.yml docker-compose.drone.override.yml

# The override file is automatically applied when you run docker compose
```

#### 3. Restart Drone CI

```bash
# Stop existing containers
docker compose -f docker-compose.drone.yml down

# Start with new configuration
docker compose -f docker-compose.drone.yml up -d

# Verify services are running
docker compose -f docker-compose.drone.yml ps
```

#### 4. Monitor Certificate Issuance

```bash
# Watch Traefik logs for certificate activity
docker compose -f docker-compose.drone.yml logs -f drone-traefik

# Look for messages like:
# - "Serving default certificate"
# - "Requesting certificate for drone.yourdomain.com"
# - "Certificate obtained successfully"
```

#### 5. Verify SSL Certificate

After 30-60 seconds, test your site:

```bash
# Check certificate in browser
# Visit: https://drone.yourdomain.com
# Look for green padlock icon

# Check certificate via command line
echo | openssl s_client -connect drone.yourdomain.com:443 -servername drone.yourdomain.com 2>/dev/null | openssl x509 -noout -text | grep -A2 "Issuer:"

# Should show "Let's Encrypt" as issuer
```

## Common Issues and Solutions

### Issue 0: TLS-ALPN-01 Challenge Validation Errors

**Symptoms:**
- Error in Traefik logs: "Incorrect validation certificate for tls-alpn-01 challenge"
- Error code 403 from ACME (Let's Encrypt)
- Certificate validation fails during issuance

**Root Cause:**
The TLS-ALPN-01 challenge can fail when:
- Multiple Traefik instances are running on the same server
- Port 443 has conflicts or routing issues
- Docker networking interferes with TLS validation

**Solution:**

This issue has been fixed in the current version by switching to HTTP-01 challenge. To apply the fix:

1. **Pull latest configuration**:
   ```bash
   cd /path/to/note-hub
   git pull origin main
   ```

2. **Remove old certificates**:
   ```bash
   # Stop Traefik
   docker compose -f docker-compose.drone.yml stop drone-traefik
   
   # Remove certificate file to force re-issuance
   sudo rm -f letsencrypt-drone/acme.json
   ```

3. **Restart with updated configuration**:
   ```bash
   docker compose -f docker-compose.drone.yml up -d
   ```

4. **Monitor certificate issuance**:
   ```bash
   docker compose -f docker-compose.drone.yml logs -f drone-traefik | grep -i "certificate\|acme"
   ```

**Why HTTP-01 is Better:**
- Uses port 80 for validation (more reliable)
- No conflicts with TLS on port 443
- Recommended by Let's Encrypt for most use cases
- Works better with multiple services

### Issue 1: Certificate Not Issued

**Symptoms:**
- Traefik logs show "default certificate" being served
- Browser shows invalid certificate
- Certificate is self-signed

**Solutions:**

1. **Verify DNS is correct**:
   ```bash
   nslookup drone.yourdomain.com
   # Must return your server's IP
   ```

2. **Check ports are accessible**:
   ```bash
   # From another machine or online tool
   telnet drone.yourdomain.com 80
   telnet drone.yourdomain.com 443
   ```

3. **Check Traefik configuration**:
   ```bash
   # Verify DRONE_DOMAIN is set
   docker compose -f docker-compose.drone.yml exec drone-traefik env | grep ACME_EMAIL
   
   # Should show your configured email
   ```

4. **Check Let's Encrypt rate limits**:
   - Let's Encrypt limits: 5 certificates per domain per week
   - Use staging server for testing (see below)

### Issue 2: Wrong Certificate Issued

**Symptoms:**
- Certificate is for different domain (IP address, wrong subdomain)
- Browser shows certificate mismatch warning

**Solutions:**

1. **Remove existing certificate and retry**:
   ```bash
   # Stop Traefik
   docker compose -f docker-compose.drone.yml stop drone-traefik
   
   # Remove certificate file
   sudo rm -f letsencrypt-drone/acme.json
   
   # Restart everything
   docker compose -f docker-compose.drone.yml up -d
   
   # Monitor certificate issuance
   docker compose -f docker-compose.drone.yml logs -f drone-traefik | grep -i certificate
   ```

2. **Verify domain configuration**:
   ```bash
   # Check that DRONE_DOMAIN matches the domain you're accessing
   grep DRONE_DOMAIN .env.drone
   
   # Should match exactly (no http://, no port)
   ```

3. **Check override file is applied**:
   ```bash
   # View final configuration
   DRONE_DOMAIN=drone.yourdomain.com docker compose -f docker-compose.drone.yml config | grep "Host("
   
   # Should show: Host(`drone.yourdomain.com`)
   ```

### Issue 3: Port Conflicts

**Symptoms:**
- Cannot access Drone CI on ports 80/443
- Ports already in use error
- Conflict with NoteHub or other applications

**Solutions:**

Drone CI uses ports 8080/8443 by default to avoid conflicts. However, for custom domains with SSL, you need ports 80/443:

1. **If running alongside NoteHub**:
   - NoteHub uses ports 80/443
   - Drone CI should use ports 8080/8443
   - You cannot have both on the same domain
   - Use subdomain: `drone.yourdomain.com` vs `yourdomain.com`

2. **Update port mapping** (if needed):
   Edit `docker-compose.drone.yml`:
   ```yaml
   drone-traefik:
     ports:
       - "80:80"      # For Let's Encrypt HTTP challenge
       - "443:443"    # For HTTPS
   ```

3. **For multiple domains on same server**:
   - Use different subdomains
   - Both apps can share ports 80/443 if properly configured
   - Traefik will route based on domain name

### Issue 4: Let's Encrypt Rate Limit Exceeded

**Symptoms:**
- Error: "too many certificates already issued"
- Certificate not being issued after multiple attempts

**Solutions:**

1. **Use Let's Encrypt staging server for testing**:
   
   Edit `docker-compose.drone.yml`, add to Traefik command section:
   ```yaml
   drone-traefik:
     command:
       # ... existing commands ...
       - "--certificatesresolvers.letsencrypt.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory"
   ```

2. **Wait for rate limit to reset**:
   - Rate limit: 5 certificates per domain per week
   - Reset: 7 days from first issuance
   - Monitor at: https://crt.sh/?q=yourdomain.com

3. **Use staging certificates for testing**:
   - Staging server has higher rate limits
   - Certificates won't be trusted by browsers (expected)
   - Switch to production server once configuration is confirmed

### Issue 5: HTTP to HTTPS Redirect Not Working

**Symptoms:**
- HTTP (port 80) accessible but doesn't redirect to HTTPS
- Users can access unsecured version

**Solution:**

This is configured by default in Traefik. Verify configuration:

```bash
# Check if redirect is configured
docker compose -f docker-compose.drone.yml config | grep -A5 "redirections"

# Should see:
# - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
# - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
# - "--entrypoints.web.http.redirections.entrypoint.permanent=true"
```

### Issue 6: Changes Not Taking Effect

**Symptoms:**
- Updated configuration but still seeing old behavior
- Certificate not updating after changes

**Solutions:**

1. **Ensure override file is being used**:
   ```bash
   # Check if docker-compose.drone.override.yml exists
   ls -la docker-compose.drone.override.yml
   
   # If not, copy it:
   cp docker-compose.drone.domain.yml docker-compose.drone.override.yml
   ```

2. **Force recreate containers**:
   ```bash
   docker compose -f docker-compose.drone.yml down
   docker compose -f docker-compose.drone.yml up -d --force-recreate
   ```

3. **Clear Docker's label cache**:
   ```bash
   # Restart Docker daemon
   sudo systemctl restart docker
   
   # Restart containers
   docker compose -f docker-compose.drone.yml restart
   ```

## Multiple Domains Support

To support multiple domains for Drone CI:

1. **Edit the override file** (`docker-compose.drone.override.yml`):
   ```yaml
   services:
     drone-server:
       labels:
         - "traefik.http.routers.drone-server.rule=Host(`drone.domain1.com`) || Host(`ci.domain2.com`) || Host(`build.domain3.com`)"
   ```

2. **Update GitHub OAuth**:
   - Add multiple callback URLs in GitHub OAuth App (if supported)
   - Or use a single primary domain

3. **DNS Configuration**:
   - Add A records for all domains pointing to your server
   - Ensure all domains are accessible

4. **Restart Drone CI**:
   ```bash
   docker compose -f docker-compose.drone.yml down
   docker compose -f docker-compose.drone.yml up -d
   ```

Let's Encrypt will issue a certificate that covers all specified domains (Subject Alternative Names).

## Testing Your Configuration

### 1. Test DNS Resolution

```bash
# Should return your server IP
nslookup drone.yourdomain.com
dig drone.yourdomain.com +short
```

### 2. Test Port Accessibility

```bash
# HTTP (should redirect to HTTPS)
curl -I http://drone.yourdomain.com

# HTTPS (should work)
curl -I https://drone.yourdomain.com
```

### 3. Test Certificate

```bash
# Check certificate issuer (should be Let's Encrypt)
echo | openssl s_client -connect drone.yourdomain.com:443 -servername drone.yourdomain.com 2>/dev/null | openssl x509 -noout -issuer

# Check certificate domain (should match your domain)
echo | openssl s_client -connect drone.yourdomain.com:443 -servername drone.yourdomain.com 2>/dev/null | openssl x509 -noout -subject

# Check certificate expiration
echo | openssl s_client -connect drone.yourdomain.com:443 -servername drone.yourdomain.com 2>/dev/null | openssl x509 -noout -dates
```

### 4. Test in Browser

1. Visit `https://drone.yourdomain.com`
2. Check for green padlock icon
3. Click padlock → Certificate
4. Verify:
   - Issued by: Let's Encrypt
   - Issued to: drone.yourdomain.com
   - Valid dates

## Advanced Configuration

### Custom Certificate Storage Location

By default, certificates are stored in `./letsencrypt-drone/acme.json`. To change:

```yaml
# docker-compose.drone.yml
drone-traefik:
  volumes:
    - ./my-custom-path:/letsencrypt
```

### Certificate Backup

```bash
# Backup certificate file
cp letsencrypt-drone/acme.json letsencrypt-drone/acme.json.backup

# Restore certificate file
cp letsencrypt-drone/acme.json.backup letsencrypt-drone/acme.json
docker compose -f docker-compose.drone.yml restart drone-traefik
```

### Using Wildcard Certificates

Wildcard certificates require DNS challenge (not HTTP challenge). Edit Traefik configuration:

```yaml
drone-traefik:
  command:
    - "--certificatesresolvers.letsencrypt.acme.dnschallenge=true"
    - "--certificatesresolvers.letsencrypt.acme.dnschallenge.provider=cloudflare"
  environment:
    - CF_API_EMAIL=your-cloudflare-email
    - CF_API_KEY=your-cloudflare-api-key
```

## Logs and Debugging

### View Traefik Logs

```bash
# All logs
docker compose -f docker-compose.drone.yml logs drone-traefik

# Follow logs (real-time)
docker compose -f docker-compose.drone.yml logs -f drone-traefik

# Filter for certificate-related logs
docker compose -f docker-compose.drone.yml logs drone-traefik | grep -i certificate

# Filter for errors
docker compose -f docker-compose.drone.yml logs drone-traefik | grep -i error
```

### Enable Debug Logging

Edit `docker-compose.drone.yml`:

```yaml
drone-traefik:
  command:
    # ... existing commands ...
    - "--log.level=DEBUG"
```

Then restart:
```bash
docker compose -f docker-compose.drone.yml restart drone-traefik
```

### Check Certificate File

```bash
# View certificate file (if exists)
sudo cat letsencrypt-drone/acme.json | jq '.letsencrypt.Certificates'

# Check file permissions (should be 600)
ls -la letsencrypt-drone/acme.json
```

## Security Best Practices

1. **Use Strong Passwords**:
   - PostgreSQL password in `.env.drone`
   - RPC secret should be randomly generated

2. **Keep Software Updated**:
   ```bash
   docker compose -f docker-compose.drone.yml pull
   docker compose -f docker-compose.drone.yml up -d
   ```

3. **Monitor Certificate Expiration**:
   - Let's Encrypt certificates expire after 90 days
   - Traefik automatically renews at ~30 days before expiration
   - Monitor renewal: `docker compose -f docker-compose.drone.yml logs drone-traefik | grep renewal`

4. **Backup Configuration**:
   ```bash
   # Backup critical files
   cp .env.drone .env.drone.backup
   cp letsencrypt-drone/acme.json letsencrypt-drone/acme.json.backup
   ```

5. **Use HSTS Headers** (already configured):
   - Forces browsers to use HTTPS
   - Configured in `docker/traefik/drone-dynamic.yml`

## Getting Help

If you're still experiencing issues:

1. **Check documentation**:
   - [DRONE_CI_README.md](DRONE_CI_README.md) - Overview and basic setup
   - [docs/guides/CUSTOM_DOMAIN_SSL_SETUP.md](docs/guides/CUSTOM_DOMAIN_SSL_SETUP.md) - NoteHub guide (similar concepts)

2. **Collect diagnostic information**:
   ```bash
   # System information
   docker --version
   docker compose version
   
   # Service status
   docker compose -f docker-compose.drone.yml ps
   
   # Recent logs
   docker compose -f docker-compose.drone.yml logs --tail=100 drone-traefik
   
   # Network configuration
   docker network ls
   docker network inspect drone-network
   
   # DNS resolution
   nslookup drone.yourdomain.com
   
   # Port accessibility
   telnet drone.yourdomain.com 80
   telnet drone.yourdomain.com 443
   ```

3. **Common resources**:
   - Traefik documentation: https://doc.traefik.io/traefik/
   - Let's Encrypt docs: https://letsencrypt.org/docs/
   - Drone CI docs: https://docs.drone.io/

## Summary

✅ **For Custom Domains**:
1. Set `DRONE_DOMAIN`, `DRONE_ACME_EMAIL`, `DRONE_SERVER_PROTO=https` in `.env.drone`
2. Copy `docker-compose.drone.domain.yml` to `docker-compose.drone.override.yml`
3. Restart Drone CI: `docker compose -f docker-compose.drone.yml up -d`
4. Wait 30-60 seconds for certificate issuance
5. Access via `https://drone.yourdomain.com`

✅ **For Localhost/IP Access**:
- No changes needed
- Browser warnings are expected (self-signed certificate)
- Use for development/testing only

---

**Last Updated**: December 2025  
**Traefik Version**: v2.11  
**Let's Encrypt**: ACME v2 (HTTP-01 Challenge)
