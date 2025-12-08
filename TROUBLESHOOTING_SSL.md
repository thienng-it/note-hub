# 🔒 SSL Certificate Troubleshooting

## Problem: "Not Secure" or "Invalid Certificate" Warning

If you're seeing SSL certificate warnings when accessing NoteHub via a custom domain (e.g., `note-hub.duckdns.org`, `app.yourdomain.com`), you need to configure domain-specific routing.

### Quick Fix

```bash
# 1. Set your domain in .env
echo "DOMAIN=your-domain.com" >> .env
echo "ACME_EMAIL=your-email@example.com" >> .env

# 2. Apply domain configuration
cp docker-compose.domain.yml docker-compose.override.yml

# 3. Restart services
docker compose down
docker compose up -d

# 4. Monitor certificate issuance (wait 1-2 minutes)
docker compose logs -f traefik
```

### Why This Happens

The default Traefik configuration uses path-based routing without explicit domain matching. This causes:
- Let's Encrypt to issue certificates for the wrong domain or IP
- Certificate mismatch errors in browsers
- "Not secure" warnings even though HTTPS is enabled

### Detailed Solution

See the **[Custom Domain SSL Setup Guide](docs/guides/CUSTOM_DOMAIN_SSL_SETUP.md)** for:
- Step-by-step configuration instructions
- DuckDNS-specific setup
- Multiple domain configuration
- Comprehensive troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| API returns HTML instead of JSON after enabling SSL | This is fixed in the latest version. Run `git pull` to update |
| Certificate not being issued | Check DNS points to your server's IP |
| Ports 80/443 blocked | Open firewall: `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp` |
| Rate limit exceeded | Wait 7 days or use Let's Encrypt staging |
| Wrong domain in certificate | Remove `letsencrypt/acme.json` and restart |

## Problem: API Returns HTML Instead of JSON After Enabling SSL

### Symptoms
- Login fails with 200 OK response
- API endpoints return HTML (frontend index.html) instead of JSON
- Issue appears after enabling SSL/HTTPS with Traefik

### Root Cause
Traefik routers were only configured for the HTTPS entrypoint (`websecure`). When HTTP requests came in, Traefik's global HTTP->HTTPS redirect didn't preserve the routing rules properly, causing API requests to be routed to the frontend's catch-all route instead of the backend.

### Solution
This issue has been fixed in commit 812975f. All docker-compose files now include both HTTP and HTTPS routers for proper routing during the redirect process.

**To apply the fix:**

```bash
# 1. Pull the latest changes
git pull origin main

# 2. Restart your services
docker compose down
docker compose up -d

# Or for specific profiles:
docker compose --profile production down
docker compose --profile production up -d
```

### Technical Details
The fix adds HTTP entrypoint routers alongside HTTPS routers:
- Backend API, uploads, and health endpoints have both `web` and `websecure` entrypoints
- Frontend has both entrypoints
- Routing priorities are preserved (backend priority 10 > frontend priority 1)
- This ensures correct routing before the HTTP->HTTPS redirect happens

### Verification
After updating, you can verify the fix is applied:

```bash
# Check that HTTP routers exist
grep -c "entrypoints=web" docker-compose.yml
# Should return a number > 0

# Run the Traefik configuration tests
bash tests/traefik-config.test.sh
# Should show: "All tests passed!"
```

### For Localhost Development

If you're running NoteHub locally and seeing certificate warnings, this is **normal and expected**:
- Leave `DOMAIN` blank in `.env`
- Accept the browser warning (safe for development)
- Self-signed certificates are used automatically

### Need Help?

- **Custom Domain Issues**: [Custom Domain SSL Setup Guide](docs/guides/CUSTOM_DOMAIN_SSL_SETUP.md)
- **General SSL Setup**: [SSL/HTTPS Setup Guide](docs/guides/SSL_HTTPS_SETUP.md)
- **GitHub Issues**: [Open an issue](https://github.com/thienng-it/note-hub/issues)
