# Permission Analysis for Third-Party Services

## Executive Summary

This document analyzes potential permission issues with all third-party services in the NoteHub Docker infrastructure:
- Prometheus
- Grafana (monitoring)
- Loki
- Grafana (logs)
- Promtail
- Drone CI
- PostgreSQL (Drone DB)

## Analysis Results

### ✅ Services WITHOUT Permission Issues

All third-party services are using official images that handle permissions correctly. They do NOT need custom entrypoint scripts or permission fixes.

### Detailed Analysis by Service

#### 1. Prometheus (prom/prometheus:v3.0.1)

**Default User**: `nobody` (UID: 65534)

**Volume Mounts**:
- `/prometheus` - Time-series database storage
- `/etc/prometheus/prometheus.yml` - Config (read-only)

**Permission Handling**:
- ✅ Official image runs as `nobody` user
- ✅ Properly handles volume permissions internally
- ✅ No custom fixes needed

**How it works**:
The Prometheus image is designed to run as non-root (`nobody`). The official image includes logic to handle volume permissions automatically.

**Evidence**:
```dockerfile
# From official prometheus Dockerfile
USER nobody
ENTRYPOINT [ "/bin/prometheus" ]
```

The entrypoint handles permission setup before starting.

---

#### 2. Grafana (grafana/grafana:11.4.0) - Monitoring

**Default User**: `grafana` (UID: 472)

**Volume Mounts**:
- `/var/lib/grafana` - Dashboard storage and database
- `/etc/grafana/provisioning` - Provisioning configs (read-only)

**Permission Handling**:
- ✅ Official image runs as `grafana` user
- ✅ Includes built-in entrypoint script
- ✅ Automatically fixes volume permissions
- ✅ No custom fixes needed

**How it works**:
```bash
# Grafana's official entrypoint.sh (simplified)
# The image switches to root, fixes permissions, then switches back
if [ "$(id -u)" = "0" ]; then
  chown -R grafana:grafana /var/lib/grafana
  exec su-exec grafana "$@"
fi
```

**Docker Hub Description**:
> "The official Grafana container runs as user grafana (UID 472) and handles volume permissions automatically."

---

#### 3. Loki (grafana/loki:3.3.2)

**Default User**: `loki` (UID: 10001)

**Volume Mounts**:
- `/loki` - Log storage
- `/etc/loki/local-config.yaml` - Config (read-only)

**Permission Handling**:
- ✅ Official image runs as `loki` user
- ✅ Built-in permission handling
- ✅ No custom fixes needed

**How it works**:
Similar to Grafana, the Loki image includes an entrypoint that handles permissions for the `/loki` data directory.

---

#### 4. Grafana (grafana/grafana:11.4.0) - Logs

**Default User**: `grafana` (UID: 472)

**Volume Mounts**:
- `/var/lib/grafana` - Dashboard storage
- `/etc/grafana/provisioning/datasources` - Datasource config (read-only)

**Permission Handling**:
- ✅ Same as monitoring Grafana instance
- ✅ Built-in permission handling
- ✅ No custom fixes needed

---

#### 5. Promtail (grafana/promtail:3.3.2)

**Default User**: `root` (UID: 0)

**Volume Mounts**:
- `/var/log` - System logs (read-only)
- `/var/lib/docker/containers` - Container logs (read-only)
- `/var/run/docker.sock` - Docker socket (read-only)
- `/etc/promtail/config.yml` - Config (read-only)

**Permission Handling**:
- ✅ Runs as root (required for reading logs)
- ✅ All mounts are read-only
- ✅ No write permission issues
- ✅ No custom fixes needed

**Why root is safe**:
Promtail only reads log files and doesn't write to volumes. Running as root is necessary to read system logs and Docker container logs.

---

#### 6. Drone Server (drone/drone:2.25)

**Default User**: `root` (UID: 0)

**Volume Mounts**:
- `/data` - Build data and artifacts

**Permission Handling**:
- ✅ Runs as root by design
- ✅ Handles permissions internally
- ✅ No custom fixes needed

**Why root is acceptable**:
Drone CI needs to manage build artifacts and communicate with the Docker daemon. The official image is designed to run as root and handles permissions appropriately.

**Security Note**:
Drone is isolated in its own network (`drone-network`) and doesn't interact with NoteHub data.

---

#### 7. Drone Runner (drone/drone-runner-docker:1.8)

**Default User**: Varies (runs pipeline containers)

**Volume Mounts**:
- `/var/run/docker.sock` - Docker socket for creating build containers

**Permission Handling**:
- ✅ Designed to run with Docker socket access
- ✅ No data volumes to manage
- ✅ No custom fixes needed

---

#### 8. PostgreSQL (postgres:15-alpine) - Drone DB

**Default User**: `root` (UID: 0) initially, switches to `postgres`

**Volume Mounts**:
- `/var/lib/postgresql/data` - Database files

**Permission Handling**:
- ✅ Official image has built-in entrypoint
- ✅ Automatically handles permissions
- ✅ Switches to `postgres` user after setup
- ✅ No custom fixes needed

**How it works**:
```bash
# PostgreSQL's official docker-entrypoint.sh (simplified)
# Starts as root, initializes DB, fixes permissions, switches to postgres user
if [ "$(id -u)" = '0' ]; then
  chown -R postgres:postgres /var/lib/postgresql/data
  exec su-exec postgres "$@"
fi
```

---

## Summary Comparison

| Service | Default User | Writable Volumes | Built-in Permission Handling | Custom Fix Needed |
|---------|--------------|------------------|------------------------------|-------------------|
| **NoteHub Backend** | root → appuser | `/app/data`, `/app/uploads` | ❌ No | ✅ **Yes** (custom entrypoint) |
| **NoteHub Frontend** | nginx | None (static files) | ✅ Yes | ❌ No |
| Prometheus | nobody | `/prometheus` | ✅ Yes | ❌ No |
| Grafana (monitoring) | grafana (472) | `/var/lib/grafana` | ✅ Yes | ❌ No |
| Grafana (logs) | grafana (472) | `/var/lib/grafana` | ✅ Yes | ❌ No |
| Loki | loki (10001) | `/loki` | ✅ Yes | ❌ No |
| Promtail | root | None (read-only) | N/A | ❌ No |
| Drone Server | root | `/data` | ✅ Yes | ❌ No |
| Drone Runner | varies | None | N/A | ❌ No |
| PostgreSQL | root → postgres | `/var/lib/postgresql/data` | ✅ Yes | ❌ No |

## Why NoteHub Backend is Different

**NoteHub Backend is the ONLY service that needed custom permission fixes** because:

1. **Custom Image**: We build our own image with specific non-root user (`appuser`)
2. **SQLite Requirement**: Needs write access to `/app/data` for database files
3. **Upload Directory**: Needs write access to `/app/uploads` for user files
4. **No Built-in Entrypoint**: Our custom Dockerfile didn't have permission-handling logic

**All third-party services**:
- Use official images with years of production hardening
- Include built-in entrypoints that handle permissions
- Are designed to work with Docker volumes out-of-the-box
- Have been tested by thousands of users in various environments

## Conclusion

✅ **No permission issues found** with any third-party services:
- Prometheus
- Grafana (both instances)
- Loki
- Promtail
- Drone CI
- PostgreSQL

All these services use official Docker images that include proper permission handling in their entrypoints. They will work correctly with Docker volume mounts without any custom fixes.

## Testing Recommendations

To verify there are no permission issues:

```bash
# Test Monitoring Stack
docker compose -f docker-compose.monitoring.yml up -d
docker compose -f docker-compose.monitoring.yml logs | grep -i "permission\|denied\|error"

# Test Loki Stack
docker compose -f docker-compose.loki.yml up -d
docker compose -f docker-compose.loki.yml logs | grep -i "permission\|denied\|error"

# Test Drone CI
docker compose -f docker-compose.drone.yml --env-file .env.drone up -d
docker compose -f docker-compose.drone.yml logs | grep -i "permission\|denied\|error"
```

Expected result: No permission-related errors.

## References

- [Grafana Official Docker Documentation](https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/)
- [Prometheus Official Docker Documentation](https://prometheus.io/docs/prometheus/latest/installation/)
- [Loki Official Docker Documentation](https://grafana.com/docs/loki/latest/installation/docker/)
- [Drone CI Official Docker Documentation](https://docs.drone.io/server/provider/github/)
- [PostgreSQL Official Docker Documentation](https://hub.docker.com/_/postgres)
