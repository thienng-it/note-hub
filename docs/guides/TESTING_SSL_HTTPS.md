# Testing SSL/HTTPS Implementation

This document provides testing instructions for the SSL/HTTPS implementation in NoteHub.

## Pre-Deployment Testing

### 1. Configuration Validation

All configuration files have been validated:

```bash
# Traefik configuration files
✓ docker/traefik/traefik.yml - YAML syntax valid
✓ docker/traefik/dynamic.yml - YAML syntax valid
✓ docker/traefik/drone-dynamic.yml - YAML syntax valid

# Docker Compose files
✓ docker-compose.yml - YAML syntax valid
✓ docker-compose.replication.yml - YAML syntax valid
✓ docker-compose.drone.yml - YAML syntax valid
```

### 2. Service Configuration

Updated services:
- **6 Traefik services** across 3 Docker Compose files
- **18 backend/frontend services** with HTTPS labels
- **6 port 443 mappings** for HTTPS traffic

## Local Testing (Development)

### Test 1: Basic Deployment

```bash
# Setup environment
cp .env.example .env
nano .env  # Set NOTES_ADMIN_PASSWORD

# Start services
docker compose up -d

# Check services are running
docker compose ps
```

**Expected Results:**
- All services should be `healthy`
- Traefik should be listening on ports 80 and 443

### Test 2: HTTP to HTTPS Redirect

```bash
# Test HTTP redirect
curl -I http://localhost

# Expected output:
# HTTP/1.1 301 Moved Permanently
# Location: https://localhost/
```

### Test 3: HTTPS Access (Self-Signed Certificate)

```bash
# Access HTTPS with self-signed cert (ignore verification)
curl -I -k https://localhost

# Expected output:
# HTTP/2 200
# strict-transport-security: max-age=31536000; includeSubDomains
```

### Test 4: Browser Access

1. Open browser to `http://localhost`
2. Should automatically redirect to `https://localhost`
3. Browser will show security warning (expected for localhost)
4. Accept the warning and proceed
5. Verify application loads correctly

### Test 5: Security Headers

```bash
# Check security headers
curl -I -k https://localhost | grep -i "strict-transport-security\|x-frame-options\|x-content-type"

# Expected headers:
# strict-transport-security: max-age=31536000; includeSubDomains
# x-frame-options: SAMEORIGIN
# x-content-type-options: nosniff
```

### Test 6: Certificate Storage

```bash
# Verify certificate directory exists
ls -la letsencrypt/

# After first HTTPS request, check for certificate file
# (Will be empty for localhost, but directory should exist)
```

## Production Testing (With Domain)

### Prerequisites

Before testing in production:
1. Register a domain name
2. Point domain to your server's public IP
3. Ensure ports 80 and 443 are open
4. Wait for DNS propagation

### Test 1: Production Deployment

```bash
# Configure environment
cp .env.example .env
nano .env

# Set these variables:
# SECRET_KEY=<strong-random-key>
# DATABASE_URL=mysql://user:pass@host:3306/db
# NOTES_ADMIN_PASSWORD=<secure-password>
# ACME_EMAIL=admin@yourdomain.com

# Deploy
docker compose --profile production up -d

# Monitor Traefik logs for certificate issuance
docker compose logs -f traefik-prod
```

**Expected Log Output:**
```
traefik-prod | time="..." level=info msg="Retrieving ACME certificates..."
traefik-prod | time="..." level=info msg="Obtaining certificate for yourdomain.com"
traefik-prod | time="..." level=info msg="Certificate obtained for yourdomain.com"
```

### Test 2: Verify Certificate Issuance

```bash
# Check certificate file was created
ls -la letsencrypt/acme.json

# File should exist and have content (not empty)
wc -c letsencrypt/acme.json
```

### Test 3: Test Domain Access

```bash
# Test HTTP redirect
curl -I http://yourdomain.com

# Expected:
# HTTP/1.1 301 Moved Permanently
# Location: https://yourdomain.com/

# Test HTTPS access
curl -I https://yourdomain.com

# Expected:
# HTTP/2 200
# (Valid certificate, no warnings)
```

### Test 4: Verify Let's Encrypt Certificate

```bash
# Check certificate details
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com < /dev/null 2>/dev/null | openssl x509 -noout -text

# Verify:
# - Issuer: Let's Encrypt
# - Subject: CN=yourdomain.com
# - Valid dates (should be valid for 90 days)
```

### Test 5: Browser Verification

1. Open browser to `http://yourdomain.com`
2. Should redirect to `https://yourdomain.com`
3. Check for green padlock/secure indicator
4. Click padlock to view certificate details
5. Verify:
   - Certificate is valid
   - Issued by Let's Encrypt
   - Domain matches

### Test 6: Security Headers in Production

```bash
# Check all security headers
curl -I https://yourdomain.com

# Expected headers:
# strict-transport-security: max-age=31536000; includeSubDomains
# x-frame-options: SAMEORIGIN
# x-content-type-options: nosniff
# x-xss-protection: 1; mode=block
# referrer-policy: strict-origin-when-cross-origin
# content-security-policy: upgrade-insecure-requests
```

## Testing MySQL Profile

```bash
# Set MySQL credentials in .env
nano .env

# Start MySQL profile
docker compose --profile mysql up -d

# Test HTTPS access
curl -I -k https://localhost
```

## Testing Replication Profiles

### MySQL Replication

```bash
# Start MySQL replication
docker compose -f docker-compose.replication.yml --profile mysql-replication up -d

# Check Traefik service
docker compose -f docker-compose.replication.yml ps traefik-mysql-replication

# Test HTTPS
curl -I -k https://localhost
```

### SQLite Replication

```bash
# Start SQLite replication
docker compose -f docker-compose.replication.yml --profile sqlite-replication up -d

# Check Traefik service
docker compose -f docker-compose.replication.yml ps traefik-sqlite-replication

# Test HTTPS
curl -I -k https://localhost
```

## Testing Drone CI

```bash
# Configure Drone environment
cp .env.drone.example .env.drone
nano .env.drone

# Start Drone CI
docker compose -f docker-compose.drone.yml up -d

# Verify Drone uses different ports
# HTTP: 8080, HTTPS: 8443

# Test HTTP redirect
curl -I http://localhost:8080

# Expected:
# HTTP/1.1 301 Moved Permanently
# Location: https://localhost:8443/

# Test HTTPS access
curl -I -k https://localhost:8443
```

## Troubleshooting Tests

### Test Certificate Renewal

```bash
# Force certificate renewal (for testing only)
docker compose stop traefik
rm letsencrypt/acme.json
docker compose start traefik

# Monitor logs
docker compose logs -f traefik
```

### Test with Invalid Domain

```bash
# Try with non-existent domain (should fail gracefully)
# Edit .env to use invalid domain
ACME_EMAIL=test@invalid-domain-12345.com

# Restart
docker compose restart traefik

# Check logs for error messages
docker compose logs traefik | grep -i "error\|failed"
```

### Test Port Conflicts

```bash
# Check if ports are available
sudo lsof -i :80
sudo lsof -i :443

# If ports in use, stop conflicting services
sudo systemctl stop nginx apache2
```

## Validation Checklist

### Configuration
- [x] All YAML files are syntactically valid
- [x] All Traefik services configured with SSL
- [x] All service labels updated for HTTPS
- [x] Certificate storage directories created
- [x] .gitignore updated to exclude certificates

### Documentation
- [x] Comprehensive SSL/HTTPS setup guide created
- [x] Traefik migration guide updated
- [x] README updated with HTTPS information
- [x] Implementation summary documented
- [x] .env.example updated with SSL config

### Security
- [x] HSTS enabled (1-year max-age)
- [x] HSTS preload disabled by default (with warnings)
- [x] CSP upgrade-insecure-requests configured
- [x] All security headers consistent across services
- [x] Certificate files excluded from Git

### Functionality
- [ ] Local deployment tested (manual testing required)
- [ ] HTTP to HTTPS redirect verified
- [ ] Self-signed certificates work for localhost
- [ ] Production deployment tested (requires domain)
- [ ] Let's Encrypt certificate obtained
- [ ] Certificate auto-renewal verified
- [ ] All deployment profiles tested

## Performance Tests

### Test 1: SSL Handshake Time

```bash
# Measure SSL handshake performance
curl -w "@-" -o /dev/null -s https://yourdomain.com << 'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
      time_redirect:  %{time_redirect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_starttransfer:  %{time_starttransfer}\n
          time_total:  %{time_total}\n
EOF
```

### Test 2: HTTP/2 Support

```bash
# Verify HTTP/2 is enabled
curl -I --http2 https://yourdomain.com | grep "HTTP/2"

# Expected: HTTP/2 200
```

### Test 3: Compression

```bash
# Test gzip compression
curl -H "Accept-Encoding: gzip,deflate" -I https://yourdomain.com

# Should see: Content-Encoding: gzip
```

## Security Tests

### Test 1: SSL Labs Scan

For production deployments, run SSL Labs scan:
1. Go to https://www.ssllabs.com/ssltest/
2. Enter your domain
3. Wait for analysis
4. Expected grade: A or A+

### Test 2: Security Headers Check

Use securityheaders.com:
1. Go to https://securityheaders.com
2. Enter your domain
3. Verify all headers are present
4. Expected grade: A or better

### Test 3: Certificate Transparency

Check certificate is logged:
1. Go to https://crt.sh
2. Search for your domain
3. Verify Let's Encrypt certificate is listed

## Load Testing

### Test 1: Concurrent HTTPS Connections

```bash
# Install Apache Bench if not available
sudo apt-get install apache2-utils

# Test with 100 concurrent requests
ab -n 1000 -c 100 https://yourdomain.com/

# Check:
# - Time per request
# - Failed requests (should be 0)
# - Requests per second
```

### Test 2: SSL Session Resumption

```bash
# Test with session resumption
openssl s_client -connect yourdomain.com:443 -reconnect -no_ticket

# Check for "Reused, TLSv1.3"
```

## Monitoring

### Continuous Monitoring Tests

```bash
# Monitor certificate expiration
while true; do
  echo "Checking certificate expiration..."
  echo | openssl s_client -connect yourdomain.com:443 -servername yourdomain.com 2>/dev/null | \
    openssl x509 -noout -dates
  sleep 3600  # Check every hour
done
```

### Log Monitoring

```bash
# Monitor for SSL/TLS errors
docker compose logs -f traefik | grep -i "tls\|ssl\|certificate\|acme"
```

## Test Results Documentation

Document your test results:

```
Test Date: ___________
Tester: ___________
Environment: [ ] Development [ ] Staging [ ] Production

Configuration Tests:
[ ] YAML validation passed
[ ] Docker Compose validation passed
[ ] Service health checks passed

Functional Tests:
[ ] HTTP to HTTPS redirect working
[ ] HTTPS access successful
[ ] Certificate obtained (production)
[ ] Security headers present
[ ] All deployment profiles tested

Performance Tests:
[ ] SSL handshake < 200ms
[ ] HTTP/2 enabled
[ ] Compression working

Security Tests:
[ ] SSL Labs grade: ___
[ ] Security headers grade: ___
[ ] Certificate transparency verified

Issues Found:
_________________________________
_________________________________
_________________________________

Notes:
_________________________________
_________________________________
_________________________________
```

## Support

If tests fail, consult:
- [SSL/HTTPS Setup Guide](docs/guides/SSL_HTTPS_SETUP.md) - Troubleshooting section
- [Traefik Migration Guide](docs/guides/TRAEFIK_MIGRATION.md) - SSL/HTTPS section
- Traefik logs: `docker compose logs traefik`

## Next Steps After Testing

1. ✅ Complete all validation tests
2. ✅ Document test results
3. ✅ Fix any issues found
4. ✅ Re-test after fixes
5. ✅ Deploy to production
6. ✅ Monitor for 24-48 hours
7. ✅ Verify automatic certificate renewal (after 60 days)

---

**Testing Status**: Ready for manual testing ✅  
**Last Updated**: December 8, 2024
