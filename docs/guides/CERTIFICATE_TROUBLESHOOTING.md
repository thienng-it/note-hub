# Certificate Troubleshooting Guide - "Not Secure" Warnings

> **TL;DR**: If you see "not secure" warnings for domains like `drone-ci-notehub` or `monitoring-notehub`, you need to configure explicit domain routing rules in your environment variables.

## Overview

This guide helps you fix SSL certificate issues where certificates are generated but browsers show "not secure" warnings. This typically happens when deploying with custom domains without proper Traefik routing configuration.

## Common Symptoms

- ✅ Certificate is generated (visible in Traefik logs)
- ❌ Browser shows "Your connection is not private" or "Not Secure"
- ❌ Certificate is issued for wrong domain or IP address
- ❌ Certificate doesn't match the domain you're accessing

## Root Cause

**Traefik needs explicit `Host()` matchers** in router rules to determine which specific domain to request certificates for from Let's Encrypt. Without these matchers, Traefik may:

1. Generate certificates for ANY domain that accesses your server
2. Generate certificates for your server's IP address instead of the domain
3. Generate certificates that don't match the domain you're accessing

## Solutions by Service

### 1. Drone CI (drone-ci-notehub)

**Problem**: Accessing `https://drone-ci-notehub.duckdns.org` shows "not secure" warning.

**Solution**: Set `DRONE_ROUTER_RULE` in `.env.drone`

```bash
# Edit .env.drone
DRONE_DOMAIN=drone-ci-notehub.duckdns.org
DRONE_ACME_EMAIL=your-email@example.com
DRONE_SERVER_PROTO=https
DRONE_SERVER_HOST=drone-ci-notehub.duckdns.org

# CRITICAL: Add this line to fix certificate issue
DRONE_ROUTER_RULE=Host(`drone-ci-notehub.duckdns.org`)
```

**Why this works**: The `Host()` matcher tells Traefik to only route requests for this specific domain to Drone CI, and more importantly, tells Let's Encrypt to issue a certificate specifically for this domain.

**Apply the fix**:
```bash
# Restart Drone CI to apply changes
docker compose --env-file .env.drone -f docker-compose.drone.yml down
docker compose --env-file .env.drone -f docker-compose.drone.yml up -d

# Monitor certificate generation (wait 30-60 seconds)
docker compose --env-file .env.drone -f docker-compose.drone.yml logs -f drone-traefik | grep -i certificate
```

### 2. Monitoring/Grafana (monitoring-notehub)

**Problem**: Accessing `https://monitoring-notehub.duckdns.org` shows "not secure" warning.

**Solution**: Set `DOMAIN` variable in `.env`

The monitoring stack uses `monitoring.${DOMAIN}` pattern for the subdomain.

#### Option A: Using Base Domain (Recommended)

```bash
# Edit .env (the main NoteHub .env file)
DOMAIN=notehub.duckdns.org
ACME_EMAIL=your-email@example.com

# Optional: Override the router rule for a different subdomain
# GRAFANA_ROUTER_RULE=Host(`monitoring-notehub.duckdns.org`)
```

With this configuration, Grafana will be accessible at `https://monitoring.notehub.duckdns.org`

#### Option B: Custom Subdomain

If you want `monitoring-notehub.duckdns.org` instead of `monitoring.notehub.duckdns.org`:

```bash
# Edit .env
GRAFANA_ROUTER_RULE=Host(`monitoring-notehub.duckdns.org`)
GRAFANA_DOMAIN=monitoring-notehub.duckdns.org
GRAFANA_ROOT_URL=https://monitoring-notehub.duckdns.org
```

**Apply the fix**:
```bash
# Restart monitoring stack
docker compose -f docker-compose.monitoring.yml down
docker compose -f docker-compose.monitoring.yml up -d

# Monitor certificate generation
docker compose -f docker-compose.monitoring.yml logs -f grafana
docker logs notehub-traefik 2>&1 | grep -i certificate
```

### 3. NoteHub Main Application

**Problem**: Main NoteHub application shows certificate warnings.

**Solution**: Set `DOMAIN` in `.env`

```bash
# Edit .env
DOMAIN=notehub.duckdns.org
ACME_EMAIL=your-email@example.com
```

**Apply the fix**:
```bash
# Restart NoteHub
docker compose down
docker compose up -d

# Monitor certificate generation
docker compose logs -f traefik | grep -i certificate
```

## Understanding Domain Patterns

### DuckDNS Domains

DuckDNS provides free subdomains under `*.duckdns.org`. You can create domains like:

- `notehub.duckdns.org` (base domain)
- `drone-ci-notehub.duckdns.org` (separate subdomain)
- `monitoring-notehub.duckdns.org` (separate subdomain)

**Important**: Each of these is a SEPARATE domain and needs:
1. Its own DNS A record in DuckDNS
2. Its own `Host()` matcher in Traefik configuration
3. Its own SSL certificate from Let's Encrypt

### Subdomain Patterns

If you use a base domain approach:

- Base: `notehub.duckdns.org` → NoteHub main app
- Subdomain: `monitoring.notehub.duckdns.org` → Grafana
- Subdomain: `drone.notehub.duckdns.org` → Drone CI

You need:
1. Wildcard DNS record or individual A records for each subdomain
2. Set `DOMAIN=notehub.duckdns.org` in `.env`
3. Services automatically use `subdomain.${DOMAIN}` pattern

## Step-by-Step Diagnosis

### Step 1: Identify Which Service Has the Problem

```bash
# Check Drone CI certificate
echo | openssl s_client -connect drone-ci-notehub.duckdns.org:8443 -servername drone-ci-notehub.duckdns.org 2>/dev/null | openssl x509 -noout -text | grep -E "Subject:|DNS:"

# Check Grafana certificate
echo | openssl s_client -connect monitoring-notehub.duckdns.org:443 -servername monitoring-notehub.duckdns.org 2>/dev/null | openssl x509 -noout -text | grep -E "Subject:|DNS:"

# Check NoteHub certificate
echo | openssl s_client -connect notehub.duckdns.org:443 -servername notehub.duckdns.org 2>/dev/null | openssl x509 -noout -text | grep -E "Subject:|DNS:"
```

The certificate should show your domain in the Subject Alternative Name (SAN) field. If it doesn't match, you have a routing configuration problem.

### Step 2: Verify DNS Configuration

```bash
# Check DNS resolution for each domain
nslookup drone-ci-notehub.duckdns.org
nslookup monitoring-notehub.duckdns.org
nslookup notehub.duckdns.org

# All should point to the same server IP
```

### Step 3: Check Traefik Router Configuration

```bash
# For Drone CI
docker compose --env-file .env.drone -f docker-compose.drone.yml config | grep -A5 "traefik.http.routers.drone-server.rule"

# For Grafana
docker compose -f docker-compose.monitoring.yml config | grep -A5 "traefik.http.routers.grafana.rule"

# For NoteHub
docker compose config | grep -A5 "traefik.http.routers.frontend.rule"
```

Look for `Host()` matchers. If you see `PathPrefix(\`/\`)` without a `Host()` matcher, that's the problem.

### Step 4: Check Environment Variables

```bash
# Check Drone CI env
grep -E "DRONE_DOMAIN|DRONE_ROUTER_RULE|DRONE_ACME_EMAIL" .env.drone

# Check monitoring/NoteHub env
grep -E "DOMAIN|GRAFANA_ROUTER_RULE|ACME_EMAIL" .env
```

### Step 5: Verify Traefik Logs

```bash
# For Drone CI
docker compose --env-file .env.drone -f docker-compose.drone.yml logs drone-traefik | grep -i "certificate\|acme\|letsencrypt"

# For Grafana (uses NoteHub's Traefik)
docker compose logs traefik | grep -i "certificate\|acme\|letsencrypt"
```

Look for messages like:
- ✅ "Generating certificate for domain..." (good)
- ❌ "No domain found in request" (bad - missing Host matcher)
- ❌ "Failed to obtain certificate" (check DNS/firewall)

## Quick Fix Commands

### Drone CI Quick Fix

```bash
# Backup current config
cp .env.drone .env.drone.backup

# Add/update configuration
cat >> .env.drone <<'EOF'
DRONE_DOMAIN=drone-ci-notehub.duckdns.org
DRONE_ROUTER_RULE=Host(`drone-ci-notehub.duckdns.org`)
DRONE_ACME_EMAIL=your-email@example.com
DRONE_SERVER_PROTO=https
DRONE_SERVER_HOST=drone-ci-notehub.duckdns.org
EOF

# Restart to apply
docker compose --env-file .env.drone -f docker-compose.drone.yml down
docker compose --env-file .env.drone -f docker-compose.drone.yml up -d

# Wait and verify
sleep 60
curl -I https://drone-ci-notehub.duckdns.org
```

### Grafana Quick Fix (Option 1: Subdomain of Base Domain)

```bash
# Edit .env
cat >> .env <<'EOF'
DOMAIN=notehub.duckdns.org
ACME_EMAIL=your-email@example.com
EOF

# Restart
docker compose -f docker-compose.monitoring.yml down
docker compose -f docker-compose.monitoring.yml up -d

# Access at https://monitoring.notehub.duckdns.org
```

### Grafana Quick Fix (Option 2: Separate Domain)

```bash
# Edit .env
cat >> .env <<'EOF'
GRAFANA_ROUTER_RULE=Host(`monitoring-notehub.duckdns.org`)
GRAFANA_DOMAIN=monitoring-notehub.duckdns.org
GRAFANA_ROOT_URL=https://monitoring-notehub.duckdns.org
ACME_EMAIL=your-email@example.com
EOF

# Restart
docker compose -f docker-compose.monitoring.yml down
docker compose -f docker-compose.monitoring.yml up -d

# Access at https://monitoring-notehub.duckdns.org
```

## Multiple Domains on Same Server

If you run NoteHub, Drone CI, and Grafana on the same server with different domains:

```
notehub.duckdns.org (port 80/443)          → NoteHub
drone-ci-notehub.duckdns.org (port 80/443) → Drone CI (via different Traefik)
monitoring-notehub.duckdns.org (port 80/443) → Grafana (via NoteHub's Traefik)
```

**Key Points**:
1. Drone CI uses its own Traefik instance on ports 8080/8443 (no conflict)
2. Grafana uses NoteHub's Traefik on ports 80/443
3. Each domain needs its own DNS A record
4. Each needs explicit `Host()` matcher configuration

**Configuration**:

```bash
# .env.drone (for Drone CI)
DRONE_DOMAIN=drone-ci-notehub.duckdns.org
DRONE_ROUTER_RULE=Host(`drone-ci-notehub.duckdns.org`)
DRONE_SERVER_HOST=drone-ci-notehub.duckdns.org
DRONE_SERVER_PROTO=https
DRONE_ACME_EMAIL=admin@example.com

# .env (for NoteHub + Grafana)
DOMAIN=notehub.duckdns.org
GRAFANA_ROUTER_RULE=Host(`monitoring-notehub.duckdns.org`)
GRAFANA_DOMAIN=monitoring-notehub.duckdns.org
GRAFANA_ROOT_URL=https://monitoring-notehub.duckdns.org
ACME_EMAIL=admin@example.com
```

## Port Conflicts and Traefik Instances

### Understanding the Setup

- **NoteHub Traefik**: Uses ports 80/443, handles:
  - NoteHub frontend and backend
  - Grafana (monitoring-notehub.duckdns.org)
  
- **Drone CI Traefik**: Uses ports 8080/8443, handles:
  - Drone CI (drone-ci-notehub.duckdns.org)

### Why Separate Traefik Instances?

Drone CI uses its own Traefik on non-standard ports (8080/8443) to avoid conflicts with NoteHub which uses standard ports (80/443).

**Important**: Even though Drone uses ports 8080/8443, you can still access it on standard HTTPS port 443 if you:

1. Use `docker-compose.drone.duckdns.yml` which uses DNS challenge (no port 80 needed)
2. OR set up a reverse proxy in front of both services

## Common Mistakes

### ❌ Mistake 1: Using PathPrefix Without Host Matcher

```yaml
# Wrong - certificate won't match domain
- "traefik.http.routers.service.rule=PathPrefix(`/`)"
```

```yaml
# Correct - certificate matches domain
- "traefik.http.routers.service.rule=Host(`yourdomain.com`)"
```

### ❌ Mistake 2: Not Setting DRONE_ROUTER_RULE

```bash
# Wrong - DRONE_ROUTER_RULE not set
DRONE_DOMAIN=drone.example.com
# Missing: DRONE_ROUTER_RULE=Host(`drone.example.com`)
```

### ❌ Mistake 3: Mismatched Domain Names

```bash
# Wrong - domain mismatch
DRONE_DOMAIN=drone-ci.example.com
DRONE_ROUTER_RULE=Host(`drone.example.com`)  # Different domain!
```

### ❌ Mistake 4: Forgetting to Restart After Config Change

Environment variables are read at container startup. You must restart services after changing them.

### ❌ Mistake 5: Using Wrong Traefik Instance

Grafana uses NoteHub's Traefik (port 80/443), not Drone's Traefik (port 8080/8443).

## Verification Checklist

- [ ] DNS A records point to correct IP address for each domain
- [ ] Ports 80 and 443 are accessible from the internet
- [ ] `DOMAIN` variable is set in `.env` for NoteHub/Grafana
- [ ] `DRONE_ROUTER_RULE` is set in `.env.drone` for Drone CI
- [ ] All domain names match exactly between variables and DNS
- [ ] Services have been restarted after configuration changes
- [ ] Certificate logs show successful certificate generation
- [ ] Browser shows green padlock when accessing each service
- [ ] Certificate Subject Alternative Name matches your domain

## Testing Your Fix

After applying the fixes, test each service:

```bash
# Test 1: Check certificate details
echo | openssl s_client -connect YOUR-DOMAIN:443 -servername YOUR-DOMAIN 2>/dev/null | openssl x509 -noout -text | grep -E "Subject:|DNS:"

# Test 2: Check HTTP to HTTPS redirect
curl -I http://YOUR-DOMAIN

# Test 3: Check HTTPS response
curl -I https://YOUR-DOMAIN

# Test 4: Check certificate issuer
echo | openssl s_client -connect YOUR-DOMAIN:443 -servername YOUR-DOMAIN 2>/dev/null | openssl x509 -noout -issuer
# Should show: Issuer: C = US, O = Let's Encrypt, CN = R3

# Test 5: Browser test
# Open https://YOUR-DOMAIN in browser
# Click the padlock icon → Should show "Connection is secure"
# View certificate details → Should match your domain
```

## Still Having Issues?

### Check Traefik Dashboard (if enabled)

```bash
# Enable Traefik dashboard temporarily for debugging
# Edit docker-compose file and add:
- "--api.dashboard=true"
- "--api.insecure=true"

# Restart and access dashboard
docker compose restart traefik
# Visit http://YOUR-SERVER-IP:8080/dashboard/
```

### Check Let's Encrypt Rate Limits

Let's Encrypt has rate limits:
- 50 certificates per domain per week
- 5 failed validation attempts per hour

If you hit the limit, use staging server:

```yaml
# Add to Traefik command in docker-compose file
- "--certificatesresolvers.letsencrypt.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory"
```

### Reset Certificates and Try Again

```bash
# Stop services
docker compose down
docker compose --env-file .env.drone -f docker-compose.drone.yml down

# Remove certificate storage (be careful!)
sudo rm -f letsencrypt/acme.json
sudo rm -f letsencrypt-drone/acme.json

# Restart services
docker compose up -d
docker compose --env-file .env.drone -f docker-compose.drone.yml up -d
```

## Need More Help?

1. Check Traefik logs: `docker compose logs traefik`
2. Check DNS: `nslookup your-domain.com`
3. Check firewall: `telnet your-domain.com 80`
4. Review Docker Compose config: `docker compose config`
5. Create an issue on GitHub with:
   - Your domain names (redacted if private)
   - Traefik logs (last 100 lines)
   - Environment variables (redact secrets)
   - DNS lookup results

## Related Documentation

- [Drone CI SSL Troubleshooting](./TROUBLESHOOTING_DRONE_SSL.md)
- [Drone CI Custom Domain Setup](./DRONE_CI_CUSTOM_DOMAIN_SSL_SETUP.md)
- [Traefik Migration Summary](./TRAEFIK_MIGRATION_SUMMARY.md)
- [Hetzner Deployment Guide](./HETZNER_DEPLOYMENT.md)

## Summary

**The Fix**: Add explicit `Host()` matchers to Traefik router rules via environment variables:

- **Drone CI**: Set `DRONE_ROUTER_RULE=Host(\`your-domain\`)` in `.env.drone`
- **Grafana**: Set `DOMAIN=base-domain` in `.env` OR `GRAFANA_ROUTER_RULE=Host(\`your-domain\`)` 
- **NoteHub**: Set `DOMAIN=your-domain` in `.env`

**Why It Works**: Let's Encrypt needs to know which specific domain to issue certificates for. The `Host()` matcher tells Traefik and Let's Encrypt exactly which domain to use, preventing certificate mismatches.

**Key Takeaway**: When using custom domains with Traefik and Let's Encrypt, always use explicit `Host()` matchers instead of generic `PathPrefix()` rules.
