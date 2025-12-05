# Certbot Data Directory

This directory stores Let's Encrypt SSL/TLS certificates and related data.

## Structure

```
certbot/
├── conf/              # Certificate files and Certbot configuration
│   ├── live/          # Symlinks to current certificates
│   ├── archive/       # All certificates (including old ones)
│   ├── renewal/       # Renewal configuration files
│   ├── options-ssl-nginx.conf  # Recommended SSL settings
│   └── ssl-dhparams.pem        # DH parameters for SSL
└── www/               # ACME challenge files
    └── .well-known/   # Let's Encrypt validation
```

## Important Notes

⚠️ **This directory contains sensitive data!**

- **Never commit** the `conf/` directory to version control
- **Never share** certificate files or private keys
- Files are automatically excluded via `.gitignore`
- Only created after running `./scripts/init-letsencrypt.sh`

## Files Created

After running the initialization script, you'll find:

### conf/live/YOUR_DOMAIN/
- `fullchain.pem` - Full certificate chain (public)
- `privkey.pem` - Private key (sensitive!)
- `cert.pem` - Server certificate only
- `chain.pem` - Certificate chain only

### conf/
- `options-ssl-nginx.conf` - SSL/TLS parameters
- `ssl-dhparams.pem` - Diffie-Hellman parameters

### www/.well-known/acme-challenge/
- Temporary challenge files (created during renewal)

## Backup

To backup your certificates:

```bash
# Create backup
tar -czf certbot-backup-$(date +%Y%m%d).tar.gz docker/certbot/conf/

# Restore backup
tar -xzf certbot-backup-20241205.tar.gz
```

## Certificate Renewal

Certificates are automatically renewed by the Certbot container:
- Checks every 12 hours
- Renews when <30 days until expiration
- No manual intervention needed

Check renewal status:
```bash
docker compose exec certbot certbot certificates
```

## Troubleshooting

If certificates are missing or invalid:

1. **Verify files exist**:
   ```bash
   ls -la docker/certbot/conf/live/YOUR_DOMAIN/
   ```

2. **Check permissions**:
   ```bash
   # Files should be readable
   stat docker/certbot/conf/live/YOUR_DOMAIN/fullchain.pem
   ```

3. **Reinitialize**:
   ```bash
   # Remove existing (if any)
   rm -rf docker/certbot/conf/live/YOUR_DOMAIN/
   
   # Run init script again
   ./scripts/init-letsencrypt.sh
   ```

## Security

These files are critical for your HTTPS security:

✅ **DO**:
- Keep backups in secure location
- Monitor certificate expiration
- Review Certbot logs regularly

❌ **DON'T**:
- Commit to version control
- Share or expose publicly
- Modify manually (use Certbot commands)

See [Certbot Setup Guide](../../docs/guides/CERTBOT_SETUP.md) for complete documentation.
