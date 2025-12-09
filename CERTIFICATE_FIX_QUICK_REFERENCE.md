# Quick Fix: Certificate "Not Secure" Warnings

> **Problem**: Browser shows "Your connection is not private" or "Not Secure" warning for custom domains like `drone-ci-notehub.duckdns.org` or `monitoring-notehub.duckdns.org`

## TL;DR - Quick Fixes

### For Drone CI (`drone-ci-notehub.duckdns.org`)

```bash
# Add this to .env.drone:
DRONE_ROUTER_RULE=Host(`drone-ci-notehub.duckdns.org`)

# Restart:
docker compose --env-file .env.drone -f docker-compose.drone.yml restart drone-traefik
```

### For Grafana (`monitoring-notehub.duckdns.org`)

**Option 1**: If using subdomain pattern (e.g., `monitoring.notehub.duckdns.org`)
```bash
# Add this to .env:
DOMAIN=notehub.duckdns.org

# Restart:
docker compose -f docker-compose.monitoring.yml restart grafana
```

**Option 2**: If using separate domain (e.g., `monitoring-notehub.duckdns.org`)
```bash
# Add this to .env:
GRAFANA_ROUTER_RULE=Host(`monitoring-notehub.duckdns.org`)

# Restart:
docker compose -f docker-compose.monitoring.yml restart grafana
```

### For NoteHub Main App

```bash
# Add this to .env:
DOMAIN=notehub.duckdns.org

# Restart:
docker compose restart traefik
```

## Why This Happens

Without explicit `Host()` matchers in Traefik router rules, Let's Encrypt doesn't know which specific domain to issue certificates for. This causes:

- ❌ Certificates issued for wrong domain or IP address
- ❌ Browser shows "not secure" warnings
- ❌ Certificate doesn't match the domain you're accessing

## The Fix Explained

### The Root Cause

Traefik uses routing rules to determine:
1. Which requests to route to which service
2. Which domains to request SSL certificates for

**Without `Host()` matcher**:
```yaml
rule: PathPrefix(`/`)  # ❌ Accepts ANY domain
```
Result: Traefik tries to generate certificates for ANY domain that accesses your server.

**With `Host()` matcher**:
```yaml
rule: Host(`drone-ci-notehub.duckdns.org`)  # ✅ Specific domain only
```
Result: Traefik generates certificates ONLY for this specific domain.

### Environment Variables That Fix This

| Service | Variable | Example Value |
|---------|----------|--------------|
| Drone CI | `DRONE_ROUTER_RULE` | `Host(\`drone-ci-notehub.duckdns.org\`)` |
| Grafana (separate) | `GRAFANA_ROUTER_RULE` | `Host(\`monitoring-notehub.duckdns.org\`)` |
| Grafana (subdomain) | `DOMAIN` | `notehub.duckdns.org` |
| NoteHub | `DOMAIN` | `notehub.duckdns.org` |

## Validation Tool

Before deploying, validate your configuration:

```bash
# Validate all services
./scripts/validate-ssl-config.sh

# Validate specific service
./scripts/validate-ssl-config.sh --service drone
./scripts/validate-ssl-config.sh --service monitoring
./scripts/validate-ssl-config.sh --service notehub
```

## Complete Setup Examples

### Example 1: Separate Domains for Each Service

```bash
# Services:
# - NoteHub: notehub.duckdns.org
# - Drone CI: drone-ci-notehub.duckdns.org
# - Grafana: monitoring-notehub.duckdns.org

# .env (for NoteHub + Grafana)
DOMAIN=notehub.duckdns.org
GRAFANA_ROUTER_RULE=Host(`monitoring-notehub.duckdns.org`)
GRAFANA_DOMAIN=monitoring-notehub.duckdns.org
GRAFANA_ROOT_URL=https://monitoring-notehub.duckdns.org
ACME_EMAIL=your-email@example.com

# .env.drone (for Drone CI)
DRONE_DOMAIN=drone-ci-notehub.duckdns.org
DRONE_ROUTER_RULE=Host(`drone-ci-notehub.duckdns.org`)
DRONE_SERVER_HOST=drone-ci-notehub.duckdns.org
DRONE_SERVER_PROTO=https
DRONE_ACME_EMAIL=your-email@example.com
```

### Example 2: Subdomain Pattern

```bash
# Services:
# - NoteHub: notehub.duckdns.org
# - Drone CI: drone.notehub.duckdns.org
# - Grafana: monitoring.notehub.duckdns.org

# .env (for NoteHub + Grafana)
DOMAIN=notehub.duckdns.org
ACME_EMAIL=your-email@example.com
# Grafana automatically uses monitoring.${DOMAIN}

# .env.drone (for Drone CI)
DRONE_DOMAIN=drone.notehub.duckdns.org
DRONE_ROUTER_RULE=Host(`drone.notehub.duckdns.org`)
DRONE_SERVER_HOST=drone.notehub.duckdns.org
DRONE_SERVER_PROTO=https
DRONE_ACME_EMAIL=your-email@example.com
```

## Verification Steps

After applying the fix:

### 1. Check Configuration
```bash
# Validate
./scripts/validate-ssl-config.sh

# Check rendered config
docker compose config | grep "Host("
docker compose --env-file .env.drone -f docker-compose.drone.yml config | grep "Host("
```

### 2. Restart Services
```bash
# Restart affected services
docker compose restart traefik
docker compose --env-file .env.drone -f docker-compose.drone.yml restart drone-traefik
docker compose -f docker-compose.monitoring.yml restart grafana
```

### 3. Wait for Certificates (30-60 seconds)
```bash
# Monitor certificate generation
docker compose logs -f traefik | grep -i certificate
docker compose --env-file .env.drone -f docker-compose.drone.yml logs -f drone-traefik | grep -i certificate
```

### 4. Test in Browser
```bash
# Should show green padlock
https://notehub.duckdns.org
https://drone-ci-notehub.duckdns.org
https://monitoring-notehub.duckdns.org
```

### 5. Verify Certificate
```bash
# Check certificate details
echo | openssl s_client -connect your-domain:443 -servername your-domain 2>/dev/null | openssl x509 -noout -text | grep -E "Subject:|DNS:"

# Should show your domain in Subject Alternative Name
```

## Common Mistakes

### ❌ Mistake 1: Forgetting DRONE_ROUTER_RULE
```bash
# Wrong - will cause certificate issues
DRONE_DOMAIN=drone-ci-notehub.duckdns.org
# Missing: DRONE_ROUTER_RULE=Host(`drone-ci-notehub.duckdns.org`)
```

### ❌ Mistake 2: Domain Mismatch
```bash
# Wrong - domains don't match
DRONE_DOMAIN=drone-ci.example.com
DRONE_ROUTER_RULE=Host(`drone.example.com`)  # Different!
```

### ❌ Mistake 3: Not Restarting After Changes
```bash
# Configuration changed but services not restarted
# Certificates won't be regenerated until restart
```

### ❌ Mistake 4: Using PathPrefix Without Host
```yaml
# Wrong - generic rule, no specific domain
rule: PathPrefix(`/`)

# Correct - specific domain
rule: Host(`your-domain.com`)
```

## Still Having Issues?

### Full Documentation
- [Complete Certificate Troubleshooting Guide](docs/guides/CERTIFICATE_TROUBLESHOOTING.md)
- [Drone CI SSL Troubleshooting](docs/guides/TROUBLESHOOTING_DRONE_SSL.md)
- [Drone CI Custom Domain Setup](docs/guides/DRONE_CI_CUSTOM_DOMAIN_SSL_SETUP.md)

### Quick Checks
```bash
# 1. DNS resolves?
nslookup your-domain.com

# 2. Ports accessible?
telnet your-domain.com 80
telnet your-domain.com 443

# 3. Config variables set?
grep DOMAIN .env
grep DRONE_ROUTER_RULE .env.drone

# 4. Traefik logs?
docker compose logs traefik | tail -50
```

### Reset and Retry
```bash
# If all else fails, reset certificates
docker compose down
docker compose --env-file .env.drone -f docker-compose.drone.yml down

# Remove old certificates
sudo rm -f letsencrypt/acme.json
sudo rm -f letsencrypt-drone/acme.json

# Restart
docker compose up -d
docker compose --env-file .env.drone -f docker-compose.drone.yml up -d

# Wait 60 seconds and check
sleep 60
curl -I https://your-domain.com
```

## Summary

**The Fix**: Add explicit `Host()` matchers to tell Traefik which specific domains to request certificates for.

**Key Variables**:
- Drone CI: Set `DRONE_ROUTER_RULE=Host(\`your-domain\`)` in `.env.drone`
- Grafana: Set `DOMAIN=base-domain` in `.env` OR `GRAFANA_ROUTER_RULE=Host(\`your-domain\`)`
- NoteHub: Set `DOMAIN=your-domain` in `.env`

**Result**: Certificates issued for correct domains, green padlock in browser, no warnings! ✅
