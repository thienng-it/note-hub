# Localhost 404 Issue - Resolution

## Problem

After running `docker compose -f docker-compose.dev.yml up -d`, services showed as healthy but accessing https://localhost/ resulted in a 404 error.

## Root Cause

The docker-compose.dev.yml was configured with:
1. **HTTPS redirect** - Port 80 redirected to port 443
2. **Let's Encrypt certificate resolver** - Trying to generate SSL certificates
3. **Dual routing rules** - Both HTTP and HTTPS endpoints configured

For localhost development, this caused issues because:
- Self-signed certificates aren't trusted by browsers
- HTTPS redirect prevented HTTP access
- Traefik routing was overly complex for local dev

## Solution

Simplified docker-compose.dev.yml to use **HTTP-only** configuration:

### Changes Made

**Before:**
```yaml
traefik:
  command:
    - "--entrypoints.web.address=:80"
    - "--entrypoints.websecure.address=:443"
    - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
    - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./letsencrypt:/letsencrypt

backend:
  labels:
    - "traefik.http.routers.backend-api-http.rule=PathPrefix(`/api`)"
    - "traefik.http.routers.backend-api-http.entrypoints=web"
    - "traefik.http.routers.backend-api.rule=PathPrefix(`/api`)"
    - "traefik.http.routers.backend-api.entrypoints=websecure"
    - "traefik.http.routers.backend-api.tls=true"
```

**After:**
```yaml
traefik:
  command:
    - "--entrypoints.web.address=:80"
  ports:
    - "80:80"
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro

backend:
  labels:
    - "traefik.http.routers.backend-api.rule=PathPrefix(`/api`)"
    - "traefik.http.routers.backend-api.entrypoints=web"
    - "traefik.http.routers.backend-api.priority=10"
```

### Key Improvements

1. ✅ **Removed HTTPS redirect** - HTTP stays on port 80
2. ✅ **Removed SSL certificate configuration** - No cert warnings
3. ✅ **Simplified routing rules** - Single endpoint per route
4. ✅ **Removed unnecessary volumes** - No letsencrypt directory needed
5. ✅ **Removed dynamic config** - No middleware file required

## How to Use

```bash
# 1. Start services
docker compose -f docker-compose.dev.yml up -d

# 2. Wait for services to be healthy
docker compose -f docker-compose.dev.yml ps

# 3. Access application
open http://localhost  # ✅ Works! No certificate warnings!
```

## Expected Output

```
NAME                 IMAGE            STATUS
notehub-traefik      traefik:v3.2     Up (healthy)
notehub-backend      note-hub-backend Up (healthy)
notehub-frontend     note-hub-frontend Up (healthy)
```

**Access URLs:**
- Frontend: http://localhost
- Backend API: http://localhost/api
- Health Check: http://localhost/health

## Production vs Development

| Feature | development (docker-compose.dev.yml) | Production (docker-compose.yml) |
|---------|--------------------------------------|--------------------------------|
| Protocol | HTTP only | HTTPS with auto-SSL |
| Port | 80 | 80 → 443 redirect |
| Certificates | None needed | Let's Encrypt automatic |
| Use case | Local development | Production deployment |

## Verification Steps

1. **Check Traefik is running:**
   ```bash
   docker compose -f docker-compose.dev.yml ps traefik
   ```
   Should show: `Up (healthy)`

2. **Check backend is accessible:**
   ```bash
   curl http://localhost/health
   ```
   Should return: `{"status":"ok"}`

3. **Check frontend is accessible:**
   ```bash
   curl -I http://localhost/
   ```
   Should return: `HTTP/1.1 200 OK`

4. **Open in browser:**
   - Navigate to http://localhost
   - Should see NoteHub login page
   - No certificate warnings!

## Troubleshooting

### Still getting 404?

1. Check all services are healthy:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

2. Check Traefik logs:
   ```bash
   docker compose -f docker-compose.dev.yml logs traefik
   ```

3. Check backend logs:
   ```bash
   docker compose -f docker-compose.dev.yml logs backend
   ```

4. Verify network connectivity:
   ```bash
   docker network inspect notehub-network
   ```

### Port 80 already in use?

Change the port mapping in docker-compose.dev.yml:
```yaml
traefik:
  ports:
    - "8080:80"  # Change first port to avoid conflict
```

Then access at: http://localhost:8080

## Related Documentation

- [Docker Compose Quick Start](../DOCKER_COMPOSE_QUICKSTART.md)
- [Local Development Guide](./guides/DOCKER_COMPOSE_LOCAL_DEV.md)
- [Fix Summary](./DOCKER_COMPOSE_FIX_SUMMARY.md)
