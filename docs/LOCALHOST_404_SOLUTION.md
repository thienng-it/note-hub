# Localhost 404 - Complete Solution Guide

## Problem

After running `docker compose -f docker-compose.dev.yml up -d`, the containers show as running:
```
✔ Container notehub-traefik   Healthy
✔ Container notehub-backend   Healthy
✔ Container notehub-frontend  Started  ← Notice: "Started" not "Healthy"!
```

But accessing `http://localhost/` returns:
```
HTTP/1.1 404 Not Found
```

## Root Cause

The frontend container is **Starting but NOT Healthy**. This happens when:
1. Frontend build fails during Docker build
2. nginx isn't starting properly in the container
3. Frontend files aren't being served correctly

When the frontend isn't healthy, Traefik cannot route traffic to it, resulting in a 404 error.

## Quick Fix

### Step 1: Clean Rebuild

```bash
# Stop all containers
docker compose -f docker-compose.dev.yml down

# Remove old images and build cache
docker rmi note-hub-frontend note-hub-backend 2>/dev/null || true

# Rebuild from scratch
docker compose -f docker-compose.dev.yml build --no-cache

# Start services
docker compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy (give it 30-60 seconds)
sleep 30

# Check status
docker compose -f docker-compose.dev.yml ps
```

### Step 2: Verify Frontend is Healthy

```bash
# Check if frontend is healthy (not just "started")
docker compose -f docker-compose.dev.yml ps frontend

# Should show: "Up (healthy)" not just "Up"
```

If frontend shows "Up (healthy)", try accessing again:
```bash
curl -I http://localhost/
# Should return: HTTP/1.1 200 OK
```

## Detailed Diagnosis

### Check 1: Frontend Container Logs

```bash
docker compose -f docker-compose.dev.yml logs frontend
```

**Look for:**
- Build errors during npm install or npm run build
- nginx startup errors
- Permission errors

### Check 2: Frontend Health Check

```bash
# Test healthcheck manually inside container
docker exec notehub-frontend wget -q -O- http://localhost:80/

# Should return HTML content, not empty
```

### Check 3: Frontend Files

```bash
# Check if built files exist
docker exec notehub-frontend ls -la /usr/share/nginx/html/

# Should see: index.html, assets/, etc.
```

### Check 4: nginx Status

```bash
# Check if nginx is running
docker exec notehub-frontend ps aux | grep nginx

# Should see nginx master and worker processes
```

### Check 5: Traefik Routing

```bash
# Check if Traefik can reach frontend
docker exec notehub-traefik wget -q -O- http://notehub-frontend:80/ | head -20

# Should return HTML content
```

## Common Issues and Solutions

### Issue 1: Frontend Build Fails (npm errors)

**Symptoms:**
```
frontend  | npm error ...
frontend  | error building ...
```

**Solution:**
```bash
# Clean npm cache and rebuild
docker compose -f docker-compose.dev.yml build --no-cache frontend
docker compose -f docker-compose.dev.yml up -d frontend
```

### Issue 2: nginx Not Starting

**Symptoms:**
```
frontend  | nginx: [emerg] ...
```

**Solution:**
```bash
# Check nginx configuration
docker exec notehub-frontend nginx -t

# Restart frontend
docker compose -f docker-compose.dev.yml restart frontend
```

### Issue 3: Permission Errors

**Symptoms:**
```
frontend  | permission denied
```

**Solution:**
The Dockerfile should run nginx as non-root user. Verify:
```bash
docker exec notehub-frontend whoami
# Should show: nginx
```

### Issue 4: Frontend Never Becomes Healthy

**Symptoms:**
Frontend container stays in "Up" state, never reaches "Up (healthy)"

**Solution:**
```bash
# Check healthcheck logs
docker inspect notehub-frontend | grep -A 10 "Health"

# Manual healthcheck test
docker exec notehub-frontend wget --no-verbose --tries=1 --spider http://localhost:80/

# If healthcheck fails, rebuild
docker compose -f docker-compose.dev.yml up -d --build --force-recreate frontend
```

### Issue 5: Traefik Can't Route to Frontend

**Symptoms:**
- Frontend is healthy
- But still getting 404

**Solution:**
```bash
# Restart Traefik to pick up changes
docker compose -f docker-compose.dev.yml restart traefik

# Wait a few seconds
sleep 5

# Try again
curl -I http://localhost/
```

## Complete Clean Restart

If nothing else works, do a complete clean restart:

```bash
# Stop everything
docker compose -f docker-compose.dev.yml down -v

# Remove all related images
docker rmi $(docker images | grep note-hub | awk '{print $3}') 2>/dev/null || true

# Clean build cache
docker builder prune -af

# Rebuild everything from scratch
docker compose -f docker-compose.dev.yml build --no-cache

# Start services
docker compose -f docker-compose.dev.yml up -d

# Monitor logs
docker compose -f docker-compose.dev.yml logs -f
```

Watch the logs. You should see:
1. Backend building and starting
2. Frontend building (npm install, npm run build)
3. Frontend nginx starting
4. All services becoming healthy
5. No errors

Then try accessing `http://localhost/`

## Verification Checklist

After applying the fix, verify:

- [ ] `docker compose -f docker-compose.dev.yml ps` shows:
  ```
  notehub-traefik   Up (healthy)
  notehub-backend   Up (healthy)
  notehub-frontend  Up (healthy)  ← Must say "healthy"!
  ```

- [ ] `curl -I http://localhost/` returns:
  ```
  HTTP/1.1 200 OK
  ```

- [ ] `curl http://localhost/` returns HTML content (not 404 page)

- [ ] Opening `http://localhost` in browser shows NoteHub login page

## Still Not Working?

If you've tried everything and it still doesn't work:

1. **Check Docker version:**
   ```bash
   docker --version
   docker compose version
   ```
   Minimum: Docker 20.10+, Docker Compose 2.0+

2. **Check available resources:**
   ```bash
   docker system df
   ```
   Make sure you have enough disk space

3. **Check for port conflicts:**
   ```bash
   lsof -i :80
   ```
   Port 80 must be free

4. **Run diagnostic script:**
   ```bash
   bash scripts/diagnose-localhost-404.sh
   ```

5. **Check detailed logs:**
   ```bash
   # Frontend build logs
   docker compose -f docker-compose.dev.yml logs --tail=100 frontend

   # Backend logs  
   docker compose -f docker-compose.dev.yml logs --tail=100 backend

   # Traefik logs
   docker compose -f docker-compose.dev.yml logs --tail=100 traefik
   ```

## Alternative: Run Without Docker

If Docker continues to have issues, you can run directly with npm:

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Access at http://localhost:5173 (Vite dev server)
```

This bypasses Docker entirely and uses the native Node.js development servers.

## Summary

The key issue is that **frontend must be "healthy" not just "started"**. The healthcheck validates that nginx is serving content on port 80. If the frontend never becomes healthy:

1. Check build logs for errors
2. Verify nginx is running
3. Ensure files were copied correctly
4. Rebuild from scratch if needed

Once frontend shows as "Up (healthy)", Traefik will successfully route traffic to it and `http://localhost/` will work.
