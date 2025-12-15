# Troubleshooting Localhost Access Issues

## Problem: Cannot Access Frontend After Docker Compose Up

If you see containers running but cannot access the frontend, follow these troubleshooting steps.

### Step 1: Verify Containers are Running

```bash
docker compose -f docker-compose.dev.yml ps
```

Expected output:
```
NAME                 IMAGE                      STATUS
notehub-traefik      traefik:v3.2              Up (healthy)
notehub-backend      note-hub-backend          Up (healthy)
notehub-frontend     note-hub-frontend         Up (healthy)
```

If containers show as "Up" but NOT "healthy", wait 30-60 seconds for health checks to pass.

### Step 2: Check Container Logs

**Frontend logs:**
```bash
docker compose -f docker-compose.dev.yml logs frontend
```

Look for:
- ✅ `Configuration complete; ready for start up` - nginx started successfully
- ❌ Errors about missing files or permissions

**Traefik logs:**
```bash
docker compose -f docker-compose.dev.yml logs traefik
```

Look for:
- ✅ Service discovery messages for frontend/backend
- ❌ Routing errors or service not found messages

**Backend logs:**
```bash
docker compose -f docker-compose.dev.yml logs backend
```

Look for:
- ✅ `Server running on port 5000`
- ❌ Database connection errors or startup failures

### Step 3: Verify You're Using HTTP (Not HTTPS)

**IMPORTANT:** After the fix, you MUST use `http://` (not `https://`)

❌ **Wrong:** `https://localhost` or `https://localhost/`  
✅ **Correct:** `http://localhost` or `http://localhost/`

The development configuration uses HTTP only. Trying to access HTTPS will fail.

### Step 4: Test Individual Services

**Test Traefik:**
```bash
curl -I http://localhost/
```

Expected: HTTP response (200 or 30x), not connection refused

**Test Backend directly:**
```bash
docker compose -f docker-compose.dev.yml exec backend wget -O- http://localhost:5000/api/health
```

Expected: `{"status":"ok"}` or similar

**Test Frontend container directly:**
```bash
docker compose -f docker-compose.dev.yml exec frontend wget -O- http://localhost:80/
```

Expected: HTML content of index.html

### Step 5: Check Traefik Routing

List Traefik routers:
```bash
docker compose -f docker-compose.dev.yml exec traefik wget -O- http://localhost:8080/api/http/routers 2>/dev/null | grep -o '"name":"[^"]*"' || echo "Dashboard not enabled"
```

Expected: See `frontend`, `backend-api`, `backend-uploads`, etc.

### Step 6: Verify Network Connectivity

Check if services are on the same network:
```bash
docker network inspect notehub-network | grep -A 5 "Containers"
```

Expected: See traefik, frontend, and backend listed

### Step 7: Check for Port Conflicts

Verify nothing else is using port 80:
```bash
# On Linux/Mac
sudo lsof -i :80

# On Windows
netstat -ano | findstr :80
```

If another service is using port 80, you have two options:

**Option A: Stop the conflicting service**

**Option B: Change the port** in docker-compose.dev.yml:
```yaml
traefik:
  ports:
    - "8080:80"  # Change to 8080 or any available port
```

Then access at: `http://localhost:8080`

### Step 8: Clear Browser Cache

Your browser might be caching the old HTTPS redirect:

1. **Chrome/Edge:** Open DevTools (F12) → Network tab → Check "Disable cache"
2. **Firefox:** Open DevTools (F12) → Network tab → Check "Disable cache"
3. **Try incognito/private mode** to avoid cache issues
4. **Clear HSTS settings** (for Chrome):
   - Go to `chrome://net-internals/#hsts`
   - Enter `localhost` in "Delete domain security policies"
   - Click "Delete"

### Step 9: Restart Everything

Sometimes a clean restart helps:

```bash
# Stop all services
docker compose -f docker-compose.dev.yml down

# Remove volumes (WARNING: This deletes your local data!)
docker compose -f docker-compose.dev.yml down -v

# Remove old images
docker compose -f docker-compose.dev.yml down --rmi local

# Start fresh
docker compose -f docker-compose.dev.yml up -d --build

# Wait for services to be healthy
docker compose -f docker-compose.dev.yml ps

# Seed database
docker compose -f docker-compose.dev.yml exec backend node scripts/seed_db.js
```

### Step 10: Check Frontend Build

If frontend container starts but serves no content:

```bash
# Check if dist folder has files
docker compose -f docker-compose.dev.yml exec frontend ls -la /usr/share/nginx/html/

# Should see: index.html, assets/, etc.
```

If empty, the build failed. Check build logs:
```bash
docker compose -f docker-compose.dev.yml logs frontend | grep -i error
```

## Common Issues and Solutions

### Issue: "Connection Refused"

**Symptoms:** Browser shows "Unable to connect" or "Connection refused"

**Solutions:**
1. Check containers are running: `docker compose -f docker-compose.dev.yml ps`
2. Check Traefik is on port 80: `docker ps | grep traefik`
3. Try accessing backend directly: `curl http://localhost/api/health`

### Issue: "404 Not Found"

**Symptoms:** Traefik responds but shows 404 page

**Solutions:**
1. Verify you're using `http://` not `https://`
2. Check frontend container is healthy: `docker compose -f docker-compose.dev.yml ps frontend`
3. Check Traefik logs for routing errors
4. Verify frontend router exists: Check Step 5 above

### Issue: "This site can't be reached" or "ERR_CONNECTION_REFUSED"

**Symptoms:** Browser cannot connect at all

**Solutions:**
1. Check Docker is running: `docker ps`
2. Check containers are running: `docker compose -f docker-compose.dev.yml ps`
3. Restart Docker Desktop if on Windows/Mac
4. Check port 80 is not blocked by firewall

### Issue: "Containers show as healthy but page loads nothing"

**Symptoms:** Services are healthy but browser shows blank page or spins forever

**Solutions:**
1. Check frontend actually has content: 
   ```bash
   docker compose -f docker-compose.dev.yml exec frontend cat /usr/share/nginx/html/index.html | head -20
   ```
2. Check if nginx is serving:
   ```bash
   docker compose -f docker-compose.dev.yml exec frontend wget -O- http://localhost/
   ```
3. Check browser console (F12) for JavaScript errors
4. Try a different browser or incognito mode

### Issue: Browser Redirects to HTTPS

**Symptoms:** Typing `http://localhost` redirects to `https://localhost` which fails

**Solutions:**
1. Clear browser HSTS settings (see Step 8 above)
2. Use incognito/private browsing mode
3. Try a different browser
4. Access with explicit port: `http://localhost:80`

### Issue: "Failed to fetch" or CORS errors

**Symptoms:** Page loads but API calls fail with CORS or fetch errors

**Solutions:**
1. Check backend is healthy: `docker compose -f docker-compose.dev.yml ps backend`
2. Test API directly: `curl http://localhost/api/health`
3. Check browser console for specific error messages
4. Verify VITE_API_URL is not set (should be empty for Docker deployment)

## Still Having Issues?

If none of the above helps:

1. **Capture full diagnostic info:**
   ```bash
   # Save all logs
   docker compose -f docker-compose.dev.yml logs > docker-logs.txt
   
   # Save container status
   docker compose -f docker-compose.dev.yml ps > docker-ps.txt
   
   # Save network info
   docker network inspect notehub-network > network-info.txt
   ```

2. **Try the alternative setup:**
   Use the npm dev servers instead of Docker:
   ```bash
   # Terminal 1: Backend
   cd backend
   npm install
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm install
   npm run dev
   ```
   
   Access at: `http://localhost:5173`

3. **Report the issue** with the diagnostic files above

## Quick Checklist

Before asking for help, verify:

- [ ] Using `http://localhost` (not `https://`)
- [ ] All containers show as "healthy" not just "up"
- [ ] Port 80 is not used by another service
- [ ] Browser cache cleared or using incognito mode
- [ ] Docker Desktop is running (if on Windows/Mac)
- [ ] Checked all container logs for errors
- [ ] Tried restarting containers with `down` and `up`

## Working Example

When everything is working correctly, you should see:

```bash
$ docker compose -f docker-compose.dev.yml ps
NAME                 IMAGE                      STATUS
notehub-traefik      traefik:v3.2              Up (healthy)
notehub-backend      note-hub-backend          Up (healthy)
notehub-frontend     note-hub-frontend         Up (healthy)

$ curl -I http://localhost/
HTTP/1.1 200 OK
Content-Type: text/html
...

$ curl http://localhost/api/health
{"status":"ok"}

# Browser at http://localhost shows login page
```

If you see this, everything is working! 🎉
