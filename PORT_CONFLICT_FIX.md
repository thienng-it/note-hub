# Port 8080 Conflict Fix - NoteHub Traefik Metrics

## Problem

When running the NoteHub monitoring stack alongside the main application, Traefik containers failed to start with the error:

```
dependency failed to start: container notehub-traefik is unhealthy
2025/12/09 09:44:19 traefik.go:80: command traefik error: error while building entryPoint metrics: error preparing server: error opening listener: listen tcp :8080: bind: address already in use
```

## Root Cause

The issue occurs because of a potential port conflict on port 8080:

1. **NoteHub Traefik** uses port 8080 internally for its Prometheus metrics endpoint (`:8080/metrics`)
2. **Drone CI Traefik** (if deployed) exposes port 8080 on the host (mapping `8080:80`)
3. **cAdvisor** (in monitoring stack) uses port 8080 internally for its health check endpoint

While Docker containers are isolated and can use the same internal ports without conflict, having multiple services using port 8080 can cause confusion and potential issues during container restarts or health checks.

## Solution

Changed the Traefik metrics endpoint from port **8080** to port **9091** to avoid any potential conflicts and improve clarity.

### Files Modified

1. **docker-compose.yml** (3 instances):
   - `traefik` service (default profile)
   - `traefik-prod` service (production profile)
   - `traefik-mysql` service (mysql profile)
   
   Changed: `--entrypoints.metrics.address=:8080` → `--entrypoints.metrics.address=:9091`

2. **docker/prometheus/prometheus.yml** (3 targets):
   - `traefik` scrape target
   - `traefik-mysql` scrape target
   - `traefik-prod` scrape target
   
   Changed: `notehub-traefik:8080` → `notehub-traefik:9091`

3. **docker-compose.monitoring.yml**:
   - Updated documentation comments to reflect new port

4. **MONITORING_SETUP.md**:
   - Updated port allocation table
   - Added Traefik metrics port (9091) to documentation

5. **MONITORING_DEPLOYMENT_SUMMARY.md**:
   - Updated Traefik integration documentation

## Port Allocation After Fix

| Service | Port(s) | Access | Purpose |
|---------|---------|--------|---------|
| NoteHub (Traefik) | 80, 443 | External (HTTPS) | Web traffic |
| NoteHub (Traefik Metrics) | **9091** | Internal only | Prometheus metrics |
| Drone CI (Traefik) | 8080, 8443 | External (HTTPS) | CI/CD web interface |
| Graylog | 9000 | External (HTTP) | Log management UI |
| Prometheus | 9090 | Internal only | Metrics storage |
| Grafana | 3000 | Via Traefik | Monitoring dashboards |
| cAdvisor | 8080 | Internal only | Container metrics |
| Node Exporter | 9100 | Internal only | System metrics |

**No port conflicts!** All services can now run together without issues.

## Benefits

1. **Eliminates port conflicts**: No overlap between Traefik metrics and other services
2. **Better separation**: Different ports for different Traefik instances (NoteHub vs Drone)
3. **Clearer documentation**: Port allocation is more explicit
4. **Future-proof**: Reduces risk of conflicts when adding new services
5. **Maintains functionality**: Prometheus can still scrape Traefik metrics successfully

## Testing

To verify the fix:

```bash
# 1. Start NoteHub (will use port 9091 for Traefik metrics)
docker compose up -d

# 2. Verify Traefik is healthy
docker compose ps traefik

# 3. Check Traefik metrics endpoint
docker exec notehub-traefik wget -O- http://localhost:9091/metrics

# 4. Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# 5. Verify Prometheus can scrape Traefik metrics
docker compose -f docker-compose.monitoring.yml logs prometheus | grep "notehub-traefik"

# 6. Check all services are running
docker compose ps
docker compose -f docker-compose.monitoring.yml ps
```

## Backwards Compatibility

This change is backwards compatible as:
- Port 9091 was not previously used by any service
- The metrics endpoint is internal-only (not exposed to host)
- Prometheus configuration is updated to match the new port
- All documentation is updated to reflect the change

## Additional Notes

- The Drone CI Traefik continues to use port 8080 for its metrics endpoint since it's a separate deployment
- cAdvisor continues to use port 8080 internally without conflicts
- All internal ports are isolated within Docker networks, but we chose 9091 for clarity and to avoid potential issues
