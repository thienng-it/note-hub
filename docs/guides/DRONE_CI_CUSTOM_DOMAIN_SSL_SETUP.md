# Drone CI Custom Domain SSL/HTTPS Setup Guide

This guide covers setting up Drone CI with a custom domain and automatic SSL/HTTPS certificates using Let's Encrypt and Traefik.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Configuration Options](#configuration-options)
- [Multiple Domains](#multiple-domains)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Overview

By default, Drone CI is configured to run on `localhost:8080` without SSL. For production deployments with a custom domain (like `drone.yourdomain.com`), you need to:

1. Configure DNS to point your domain to your server
2. Set domain configuration in `.env.drone`
3. Apply domain-specific Traefik routing rules
4. Let Traefik automatically obtain and manage SSL certificates from Let's Encrypt

This guide walks you through the entire process.

## Prerequisites

### 1. Domain Name

You need a domain or subdomain that you control. Examples:
- `drone.yourdomain.com`
- `ci.example.com`
- `build.mycompany.com`

### 2. DNS Configuration

Create an A record pointing your domain to your server's IP address:

```
Type: A
Name: drone (or ci, or build)
Value: Your server's IP address (e.g., 203.0.113.42)
TTL: 300 (or default)
```

**Verify DNS**:
```bash
# Should return your server's IP
nslookup drone.yourdomain.com
```

### 3. Firewall Configuration

Ports 80 and 443 must be accessible from the internet:

```bash
# If using UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# If using firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Verify ports are open
telnet drone.yourdomain.com 80
telnet drone.yourdomain.com 443
```

### 4. GitHub OAuth App

You need a GitHub OAuth App for Drone CI authentication. If you haven't created one yet:

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Set:
   - **Application name**: Drone CI (or your preference)
   - **Homepage URL**: `https://drone.yourdomain.com`
   - **Authorization callback URL**: `https://drone.yourdomain.com/login` (note: use `https://`)
4. Click "Register application"
5. Copy the Client ID and Client Secret

**Important**: Use `https://` in the callback URL for custom domains with SSL.

## Quick Start

For those who want to get up and running quickly:

```bash
# 1. Configure domain in .env.drone
cat >> .env.drone <<EOF
DRONE_DOMAIN=drone.yourdomain.com
DRONE_ACME_EMAIL=admin@yourdomain.com
DRONE_SERVER_PROTO=https
DRONE_SERVER_HOST=drone.yourdomain.com
EOF

# 2. Apply domain configuration
cp docker-compose.drone.domain.yml docker-compose.drone.override.yml

# 3. Deploy Drone CI
docker compose -f docker-compose.drone.yml up -d

# 4. Monitor certificate issuance (wait 30-60 seconds)
docker compose -f docker-compose.drone.yml logs -f drone-traefik | grep -i certificate

# 5. Access your Drone CI instance
# Visit: https://drone.yourdomain.com
```

## Detailed Setup

### Step 1: Configure Environment Variables

Edit your `.env.drone` file (create from `.env.drone.example` if needed):

```bash
# Copy example if starting fresh
cp .env.drone.example .env.drone

# Edit with your favorite editor
nano .env.drone
```

Set these **required** variables:

```bash
# =============================================================================
# GitHub OAuth (from prerequisites step)
# =============================================================================
DRONE_GITHUB_CLIENT_ID=your-github-client-id-here
DRONE_GITHUB_CLIENT_SECRET=your-github-client-secret-here

# =============================================================================
# Server Configuration - IMPORTANT for custom domains
# =============================================================================
# Your domain (without http:// or https://)
DRONE_SERVER_HOST=drone.yourdomain.com

# Use https for custom domains with SSL
DRONE_SERVER_PROTO=https

# =============================================================================
# Custom Domain Configuration - NEW for SSL/HTTPS
# =============================================================================
# Your domain name (must match DRONE_SERVER_HOST)
DRONE_DOMAIN=drone.yourdomain.com

# Email for Let's Encrypt notifications
DRONE_ACME_EMAIL=admin@yourdomain.com

# =============================================================================
# Security
# =============================================================================
# Generate with: openssl rand -hex 16
DRONE_RPC_SECRET=your-randomly-generated-secret-here

# Strong password for PostgreSQL
DRONE_POSTGRES_PASSWORD=your-secure-database-password-here

# =============================================================================
# Database Configuration (can leave as defaults)
# =============================================================================
DRONE_POSTGRES_USER=drone
DRONE_POSTGRES_DB=drone
```

**Important Notes**:
- `DRONE_SERVER_HOST` and `DRONE_DOMAIN` should match your domain (without protocol or port)
- Use `DRONE_SERVER_PROTO=https` for custom domains
- `DRONE_ACME_EMAIL` is used by Let's Encrypt for certificate expiration notifications
- Never commit `.env.drone` to version control (it's already in `.gitignore`)

### Step 2: Apply Domain Configuration

Copy the domain-specific configuration as an override file:

```bash
cp docker-compose.drone.domain.yml docker-compose.drone.override.yml
```

**What this does**:
- The override file adds `Host()` matchers to Traefik router rules
- This ensures Let's Encrypt issues certificates for your specific domain
- Without this, certificates may be issued for the server's IP address, causing browser warnings

**The override file will**:
- Be automatically applied when you run `docker compose -f docker-compose.drone.yml`
- Not be committed to Git (it's in `.gitignore`)
- Override only the necessary labels in the base configuration

### Step 3: Deploy Drone CI

If this is a fresh deployment:

```bash
# Deploy all services
docker compose -f docker-compose.drone.yml up -d

# Verify all services are running
docker compose -f docker-compose.drone.yml ps
```

If you're updating an existing deployment:

```bash
# Stop existing services
docker compose -f docker-compose.drone.yml down

# Deploy with new configuration
docker compose -f docker-compose.drone.yml up -d

# Or force recreate if needed
docker compose -f docker-compose.drone.yml up -d --force-recreate
```

### Step 4: Monitor Certificate Issuance

Traefik will automatically request an SSL certificate from Let's Encrypt. This usually takes 30-60 seconds.

**Monitor the process**:

```bash
# Watch Traefik logs for certificate-related activity
docker compose -f docker-compose.drone.yml logs -f drone-traefik | grep -i certificate

# You should see messages like:
# - "Requesting certificate for drone.yourdomain.com"
# - "Certificate obtained successfully"
```

**If you see errors**:
- Check that DNS is configured correctly: `nslookup drone.yourdomain.com`
- Check that ports 80 and 443 are accessible from the internet
- See [Troubleshooting](#troubleshooting) section below

### Step 5: Verify SSL Certificate

After certificate issuance, verify everything is working:

#### Browser Test

1. Visit `https://drone.yourdomain.com`
2. You should see:
   - ✅ Green padlock icon in address bar
   - ✅ No certificate warnings
   - ✅ Drone CI login page

3. Click the padlock icon and view certificate details:
   - **Issued by**: Let's Encrypt
   - **Issued to**: drone.yourdomain.com
   - **Valid**: Check that dates are current

#### Command Line Test

```bash
# Test HTTPS connection
curl -I https://drone.yourdomain.com

# Should return:
# HTTP/2 200
# (no certificate errors)

# Test certificate details
echo | openssl s_client -connect drone.yourdomain.com:443 -servername drone.yourdomain.com 2>/dev/null | openssl x509 -noout -text | grep -E "(Issuer|Subject):"

# Should show:
# Issuer: C = US, O = Let's Encrypt, CN = R3
# Subject: CN = drone.yourdomain.com

# Test certificate expiration
echo | openssl s_client -connect drone.yourdomain.com:443 -servername drone.yourdomain.com 2>/dev/null | openssl x509 -noout -dates

# Shows certificate valid dates (90 days from issuance)
```

### Step 6: Login and Configure Drone

1. Visit `https://drone.yourdomain.com`
2. Click "Login with GitHub"
3. Authorize the OAuth application
4. You'll be redirected back to Drone CI
5. Click "Sync" to synchronize your repositories
6. Enable repositories you want to build

**First-time admin setup**:

To automatically create an admin user, add to `.env.drone` before first start:

```bash
# Format: username:your-github-username,admin:true
DRONE_USER_CREATE=username:yourgithubusername,admin:true
```

## Configuration Options

### Basic Configuration

**Minimal required configuration**:
```bash
# .env.drone
DRONE_DOMAIN=drone.yourdomain.com
DRONE_ACME_EMAIL=admin@yourdomain.com
DRONE_SERVER_PROTO=https
DRONE_SERVER_HOST=drone.yourdomain.com
DRONE_GITHUB_CLIENT_ID=your-client-id
DRONE_GITHUB_CLIENT_SECRET=your-client-secret
DRONE_RPC_SECRET=your-rpc-secret
DRONE_POSTGRES_PASSWORD=your-db-password
```

### Advanced Configuration

#### User Management

```bash
# Create admin user automatically
DRONE_USER_CREATE=username:yourgithubusername,admin:true

# Close registration (require admin approval)
DRONE_REGISTRATION_CLOSED=true
```

#### Runner Configuration

```bash
# Number of concurrent builds
DRONE_RUNNER_CAPACITY=2

# Runner name (useful with multiple runners)
DRONE_RUNNER_NAME=primary-runner
```

#### Logging and Debugging

```bash
# Enable debug logs (useful for troubleshooting)
DRONE_LOGS_DEBUG=true
DRONE_LOGS_TRACE=false

# Enable runner debug logs
DRONE_DEBUG=true
DRONE_TRACE=false
```

## Multiple Domains

To support multiple domains for the same Drone CI instance:

### Option 1: Edit Override File

Edit `docker-compose.drone.override.yml`:

```yaml
services:
  drone-server:
    labels:
      # Support multiple domains
      - "traefik.http.routers.drone-server.rule=Host(`drone.domain1.com`) || Host(`ci.domain2.com`) || Host(`build.domain3.com`)"
```

### Option 2: Subdomain + Root Domain

Support both `drone.yourdomain.com` and `yourdomain.com`:

```yaml
services:
  drone-server:
    labels:
      - "traefik.http.routers.drone-server.rule=Host(`yourdomain.com`) || Host(`drone.yourdomain.com`)"
```

### DNS Configuration

For each domain, create an A record:
```
Type: A
Name: drone (or ci, or build)
Value: Your server's IP
TTL: 300
```

### GitHub OAuth

Update your GitHub OAuth App:
- Use the primary domain in the callback URL
- Or create separate OAuth apps for each domain

### Certificate

Let's Encrypt will issue a certificate with Subject Alternative Names (SAN) covering all specified domains.

## Troubleshooting

### Issue: Certificate Not Issued

**Symptoms**: Browser shows "not secure" or certificate errors.

**Solutions**:

1. **Check DNS**:
   ```bash
   nslookup drone.yourdomain.com
   # Must return your server's IP
   ```

2. **Check ports are accessible**:
   ```bash
   telnet drone.yourdomain.com 80
   telnet drone.yourdomain.com 443
   # Both should connect successfully
   ```

3. **Check Traefik logs**:
   ```bash
   docker compose -f docker-compose.drone.yml logs drone-traefik | grep -i certificate
   # Look for error messages
   ```

4. **Verify domain configuration**:
   ```bash
   grep DRONE_DOMAIN .env.drone
   # Must match the domain you're accessing
   ```

5. **Try removing and regenerating certificate**:
   ```bash
   docker compose -f docker-compose.drone.yml stop drone-traefik
   sudo rm -f letsencrypt-drone/acme.json
   docker compose -f docker-compose.drone.yml start drone-traefik
   docker compose -f docker-compose.drone.yml logs -f drone-traefik
   ```

For more troubleshooting, see [TROUBLESHOOTING_DRONE_SSL.md](../../TROUBLESHOOTING_DRONE_SSL.md).

### Issue: Port Conflicts

**Symptoms**: "Port already in use" error when starting Drone CI.

**Solutions**:

Drone CI uses ports 8080/8443 by default. For custom domains with SSL on standard ports, edit `docker-compose.drone.yml`:

```yaml
drone-traefik:
  ports:
    - "80:80"      # Standard HTTP port
    - "443:443"    # Standard HTTPS port
```

**Note**: If running NoteHub on the same server:
- NoteHub uses ports 80/443 for its domain (e.g., `yourdomain.com`)
- Drone CI can use ports 80/443 for its domain (e.g., `drone.yourdomain.com`)
- Traefik routes based on domain name, no conflicts

### Issue: Let's Encrypt Rate Limit

**Symptoms**: "too many certificates already issued" error.

**Solution**: Use Let's Encrypt staging server for testing.

Edit `docker-compose.drone.yml`:

```yaml
drone-traefik:
  command:
    # ... existing commands ...
    - "--certificatesresolvers.letsencrypt.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory"
```

**Note**: Staging certificates won't be trusted by browsers (expected for testing).

Once configuration is confirmed, remove the staging server line and recreate:

```bash
docker compose -f docker-compose.drone.yml down
# Remove the staging server line from docker-compose.drone.yml
docker compose -f docker-compose.drone.yml up -d
```

## Security Best Practices

### 1. Strong Secrets

Generate strong secrets for all sensitive values:

```bash
# RPC secret
openssl rand -hex 16

# PostgreSQL password
openssl rand -base64 32
```

### 2. Keep Software Updated

```bash
# Pull latest images
docker compose -f docker-compose.drone.yml pull

# Recreate with new images
docker compose -f docker-compose.drone.yml up -d
```

### 3. Monitor Certificate Expiration

Let's Encrypt certificates expire after 90 days but are automatically renewed by Traefik at ~30 days before expiration.

**Monitor renewal**:
```bash
# Check logs for renewal activity
docker compose -f docker-compose.drone.yml logs drone-traefik | grep -i renew

# Check certificate expiration date
echo | openssl s_client -connect drone.yourdomain.com:443 -servername drone.yourdomain.com 2>/dev/null | openssl x509 -noout -dates
```

### 4. Backup Critical Files

```bash
# Backup configuration
cp .env.drone .env.drone.backup

# Backup certificate
cp letsencrypt-drone/acme.json letsencrypt-drone/acme.json.backup

# Backup database (if needed)
docker compose -f docker-compose.drone.yml exec -T drone-db \
  pg_dump -U drone drone > drone-db-backup.sql
```

### 5. Restrict Access

```bash
# Close registration
echo "DRONE_REGISTRATION_CLOSED=true" >> .env.drone

# Create admin user
echo "DRONE_USER_CREATE=username:yourgithubusername,admin:true" >> .env.drone

# Restart to apply
docker compose -f docker-compose.drone.yml restart drone-server
```

### 6. HSTS Headers

HSTS (HTTP Strict Transport Security) is already configured in `docker/traefik/drone-dynamic.yml`:

```yaml
security-headers-drone:
  headers:
    stsSeconds: 31536000  # 1 year
    stsIncludeSubdomains: true
    forceSTSHeader: true
```

This forces browsers to always use HTTPS for your domain.

## Migration from HTTP to HTTPS

If you have an existing Drone CI deployment on HTTP and want to migrate to HTTPS:

### 1. Update GitHub OAuth Callback URL

1. Go to https://github.com/settings/developers
2. Find your Drone CI OAuth App
3. Update callback URL from `http://` to `https://`
4. Example: `http://drone.yourdomain.com/login` → `https://drone.yourdomain.com/login`

### 2. Update Configuration

```bash
# Edit .env.drone
sed -i 's/DRONE_SERVER_PROTO=http/DRONE_SERVER_PROTO=https/' .env.drone

# Add domain configuration
echo "DRONE_DOMAIN=drone.yourdomain.com" >> .env.drone
echo "DRONE_ACME_EMAIL=admin@yourdomain.com" >> .env.drone
```

### 3. Apply Domain Configuration

```bash
cp docker-compose.drone.domain.yml docker-compose.drone.override.yml
```

### 4. Restart Drone CI

```bash
docker compose -f docker-compose.drone.yml down
docker compose -f docker-compose.drone.yml up -d
```

### 5. Verify Migration

```bash
# Test HTTPS
curl -I https://drone.yourdomain.com

# Test HTTP redirect
curl -I http://drone.yourdomain.com
# Should return 301 or 308 redirect to https://
```

## Port Configuration Reference

### Default Configuration (No Custom Domain)

```yaml
drone-traefik:
  ports:
    - "8080:80"   # HTTP on port 8080
    - "8443:443"  # HTTPS on port 8443
```

Access via: `http://localhost:8080` or `http://your-server-ip:8080`

### Custom Domain Configuration

```yaml
drone-traefik:
  ports:
    - "80:80"     # Standard HTTP port
    - "443:443"   # Standard HTTPS port
```

Access via: `https://drone.yourdomain.com`

### Running Alongside NoteHub

- NoteHub: ports 80/443, domain `yourdomain.com`
- Drone CI: ports 80/443, domain `drone.yourdomain.com`
- Both can coexist on same server
- Traefik routes by domain name

## Complete Example Configuration

Here's a complete example `.env.drone` for a production deployment:

```bash
# =============================================================================
# GitHub OAuth (from GitHub OAuth App)
# =============================================================================
DRONE_GITHUB_CLIENT_ID=abcdef1234567890abcd
DRONE_GITHUB_CLIENT_SECRET=abcdef1234567890abcdef1234567890abcdef12

# =============================================================================
# Server Configuration (Custom Domain)
# =============================================================================
DRONE_SERVER_HOST=drone.yourdomain.com
DRONE_SERVER_PROTO=https

# =============================================================================
# Custom Domain Configuration
# =============================================================================
DRONE_DOMAIN=drone.yourdomain.com
DRONE_ACME_EMAIL=admin@yourdomain.com

# =============================================================================
# Security
# =============================================================================
DRONE_RPC_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
DRONE_POSTGRES_PASSWORD=SuperSecurePassword123!ForDroneDatabase

# =============================================================================
# Database
# =============================================================================
DRONE_POSTGRES_USER=drone
DRONE_POSTGRES_DB=drone

# =============================================================================
# User Management
# =============================================================================
DRONE_USER_CREATE=username:yourgithubusername,admin:true
DRONE_REGISTRATION_CLOSED=true

# =============================================================================
# Runner Configuration
# =============================================================================
DRONE_RUNNER_CAPACITY=2
DRONE_RUNNER_NAME=production-runner

# =============================================================================
# Logging (disabled in production)
# =============================================================================
DRONE_LOGS_DEBUG=false
DRONE_LOGS_TRACE=false
DRONE_DEBUG=false
DRONE_TRACE=false
```

## Summary

✅ **Prerequisites**:
- Domain name with DNS A record
- Ports 80 and 443 accessible
- GitHub OAuth App configured

✅ **Setup Steps**:
1. Configure `.env.drone` with domain settings
2. Copy `docker-compose.drone.domain.yml` to `docker-compose.drone.override.yml`
3. Deploy with `docker compose -f docker-compose.drone.yml up -d`
4. Wait for certificate issuance (30-60 seconds)
5. Access via `https://drone.yourdomain.com`

✅ **Benefits**:
- Automatic SSL certificate from Let's Encrypt
- Automatic certificate renewal
- Professional HTTPS setup
- Browser shows green padlock
- Secure connection for all traffic

## Additional Resources

- [TROUBLESHOOTING_DRONE_SSL.md](../../TROUBLESHOOTING_DRONE_SSL.md) - Comprehensive troubleshooting guide
- [DRONE_CI_README.md](../../DRONE_CI_README.md) - Overview and basic setup
- [Traefik Documentation](https://doc.traefik.io/traefik/) - Official Traefik docs
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/) - Certificate authority docs
- [Drone CI Documentation](https://docs.drone.io/) - Official Drone docs

---

**Last Updated**: December 8, 2024  
**Tested With**: Traefik v2.11, Drone 2.x  
**Certificate Authority**: Let's Encrypt (ACME v2)
