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
| Certificate not being issued | Check DNS points to your server's IP |
| Ports 80/443 blocked | Open firewall: `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp` |
| Rate limit exceeded | Wait 7 days or use Let's Encrypt staging |
| Wrong domain in certificate | Remove `letsencrypt/acme.json` and restart |

### For Localhost Development

If you're running NoteHub locally and seeing certificate warnings, this is **normal and expected**:
- Leave `DOMAIN` blank in `.env`
- Accept the browser warning (safe for development)
- Self-signed certificates are used automatically

### Need Help?

- **Custom Domain Issues**: [Custom Domain SSL Setup Guide](docs/guides/CUSTOM_DOMAIN_SSL_SETUP.md)
- **General SSL Setup**: [SSL/HTTPS Setup Guide](docs/guides/SSL_HTTPS_SETUP.md)
- **GitHub Issues**: [Open an issue](https://github.com/thienng-it/note-hub/issues)
