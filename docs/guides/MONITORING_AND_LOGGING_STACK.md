# Monitoring and Logging Stack - Integration Guide

## Overview

NoteHub provides two independent but complementary stacks for observability:

1. **Monitoring Stack** (`docker-compose.monitoring.yml`) - Metrics and system monitoring
2. **Logging Stack** (`docker-compose.loki.yml`) - Log aggregation and analysis

Both stacks can run simultaneously on the same server without conflicts.

## Stack Comparison

| Feature | Monitoring Stack | Logging Stack |
|---------|-----------------|---------------|
| **Purpose** | Metrics, performance, resource monitoring | Log aggregation, search, analysis |
| **Primary Tool** | Prometheus + Grafana | Loki + Grafana |
| **Data Type** | Time-series metrics | Log lines and events |
| **Grafana Port** | 3000 (via Traefik) | 3001 (direct) |
| **Container Name** | `notehub-grafana` | `grafana-loki` |
| **Volume Name** | `grafana-data` | `grafana-loki-data` |
| **Network** | `monitoring-network` | `loki-network` |
| **RAM Usage** | ~1GB | ~600MB |

## Running Both Stacks

### Start Monitoring Stack

```bash
# Start monitoring (Prometheus + Grafana for metrics)
docker compose -f docker-compose.monitoring.yml up -d

# Access metrics Grafana
# Via Traefik: https://monitoring.your-domain.com
# Direct: http://localhost:3000 (not exposed by default)
```

### Start Logging Stack

```bash
# Start logging (Loki + Grafana for logs)
docker compose -f docker-compose.loki.yml up -d

# Access logs Grafana
http://localhost:3001
```

### Access Both

After starting both stacks:

1. **Monitoring Grafana** (Metrics):
   - URL: `https://monitoring.your-domain.com` (via Traefik)
   - Or: `http://localhost:3000` (if exposed)
   - Shows: System metrics, container stats, API performance
   - Dashboards: Pre-configured with Prometheus data sources

2. **Loki Grafana** (Logs):
   - URL: `http://localhost:3001`
   - Shows: Application logs, system logs, Docker container logs
   - Data Source: Loki (pre-configured)

## Port Allocation

| Service | Port | Purpose | Access |
|---------|------|---------|--------|
| **Monitoring Stack** |
| Prometheus | 9090 | Metrics storage | Internal only |
| Grafana (Monitoring) | 3000 | Metrics visualization | Via Traefik (no direct port) |
| cAdvisor | 8080 | Container metrics | Internal only |
| Node Exporter | 9100 | System metrics | Internal only |
| **Logging Stack** |
| Loki | 3100 | Log storage | Direct (for log shipping) |
| Promtail | 9080 | Log collector | Internal only |
| Grafana (Loki) | 3001 | Log visualization | Direct access |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        NoteHub Server                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────┐  ┌───────────────────────────┐  │
│  │  Monitoring Stack     │  │  Logging Stack            │  │
│  │  (Metrics)            │  │  (Logs)                   │  │
│  ├───────────────────────┤  ├───────────────────────────┤  │
│  │                       │  │                           │  │
│  │  Prometheus (:9090)   │  │  Loki (:3100)            │  │
│  │         ↓             │  │         ↓                 │  │
│  │  Grafana (:3000)      │  │  Grafana-Loki (:3001)    │  │
│  │    via Traefik        │  │    direct access          │  │
│  │                       │  │                           │  │
│  │  Data: metrics        │  │  Data: logs               │  │
│  │  Network: monitoring  │  │  Network: loki            │  │
│  │                       │  │                           │  │
│  └───────────────────────┘  └───────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Unified Observability (Optional)

You can configure the monitoring Grafana to also query Loki data:

### Add Loki to Monitoring Grafana

1. Access monitoring Grafana at `https://monitoring.your-domain.com`
2. Go to **Configuration → Data Sources → Add data source**
3. Select **Loki**
4. Configure:
   - URL: `http://loki:3100`
   - Access: Server (default)
5. Click **Save & Test**

Now you can:
- View metrics and logs in the same Grafana instance
- Create unified dashboards with both metrics and logs
- Correlate metrics with log events

**Note**: This requires both containers to be on the same network. Update `docker-compose.loki.yml`:

```yaml
# In loki service
networks:
  - loki-network
  - monitoring-network  # Add this

# In grafana-loki service (if you want to access it from monitoring)
networks:
  - loki-network
  - monitoring-network  # Add this

# Add external network reference
networks:
  loki-network:
    name: loki-network
  monitoring-network:
    external: true  # Connect to existing monitoring network
```

## Resource Requirements

### Combined Stack

| Component | RAM | Purpose |
|-----------|-----|---------|
| Prometheus | 512MB | Metrics storage |
| Grafana (Monitoring) | 256MB | Metrics UI |
| cAdvisor | 128MB | Container metrics |
| Node Exporter | 64MB | System metrics |
| Loki | 256MB | Log storage |
| Promtail | 64MB | Log collector |
| Grafana (Loki) | 256MB | Logs UI |
| **Total** | **~1.5GB** | **Full observability** |

**Note**: If you use unified Grafana (add Loki to monitoring Grafana), you can skip the separate Loki Grafana and save ~256MB.

## Best Practices

### For Development

- Run both stacks for full observability
- Use separate Grafana instances for clarity
- Access via direct ports (3000 for metrics, 3001 for logs)

### For Production (2GB RAM Server)

**Option 1: Full Stack**
- Run both stacks (~1.5GB RAM)
- Use unified Grafana to save RAM
- Configure alerts in Prometheus
- Configure log-based alerts in Loki

**Option 2: Selective Stack**
- Priority 1: Monitoring stack (essential for performance tracking)
- Priority 2: Loki stack (if log aggregation is needed)
- Consider: External logging service if RAM is tight

### For Production (4GB+ RAM Server)

- Run both stacks independently
- Keep separate Grafana instances for specialized dashboards
- Configure retention policies to manage disk space
- Set up alerting in both systems

## Troubleshooting

### Port Conflicts

If you get "port already in use" errors:

```bash
# Check what's using ports
lsof -i :3000  # Monitoring Grafana
lsof -i :3001  # Loki Grafana
lsof -i :3100  # Loki server

# Stop conflicting services
docker compose -f docker-compose.monitoring.yml down
docker compose -f docker-compose.loki.yml down
```

### Container Name Conflicts

If you get "container name already in use":

```bash
# List containers
docker ps -a | grep grafana

# Remove old containers
docker rm -f notehub-grafana grafana-loki
```

### Volume Conflicts

If data appears mixed between instances:

```bash
# List volumes
docker volume ls | grep grafana

# Each stack should have separate volumes:
# - grafana-data (monitoring)
# - grafana-loki-data (logging)
```

## Migration from Single Grafana

If you were previously using port 3000 for Loki Grafana:

1. Stop Loki stack:
   ```bash
   docker compose -f docker-compose.loki.yml down
   ```

2. Update configuration (already done in latest version)

3. Start with new port:
   ```bash
   docker compose -f docker-compose.loki.yml up -d
   ```

4. Access at new port: `http://localhost:3001`

5. (Optional) Backup old volume if needed:
   ```bash
   docker volume create grafana-loki-data-backup
   docker run --rm -v grafana-data:/source -v grafana-loki-data-backup:/backup alpine sh -c "cd /source && cp -a . /backup/"
   ```

## Monitoring the Monitoring

### Check Stack Health

```bash
# Monitoring stack
docker compose -f docker-compose.monitoring.yml ps
curl http://localhost:9090/-/healthy  # Prometheus
# Grafana via Traefik

# Logging stack
docker compose -f docker-compose.loki.yml ps
curl http://localhost:3100/ready  # Loki
curl http://localhost:3001/api/health  # Grafana Loki
```

### View Logs

```bash
# Monitoring stack logs
docker compose -f docker-compose.monitoring.yml logs -f prometheus
docker compose -f docker-compose.monitoring.yml logs -f grafana

# Logging stack logs
docker compose -f docker-compose.loki.yml logs -f loki
docker compose -f docker-compose.loki.yml logs -f grafana-loki
```

## See Also

- [LOKI_SETUP.md](./LOKI_SETUP.md) - Detailed Loki setup guide
- [GRAYLOG_ALTERNATIVES_2GB_RAM.md](../investigation/GRAYLOG_ALTERNATIVES_2GB_RAM.md) - Why Loki over Graylog
- Monitoring Stack Documentation - TBD

## Summary

- ✅ Both stacks can coexist without conflicts
- ✅ Separate ports (3000 vs 3001) prevent collisions
- ✅ Independent networks and volumes
- ✅ Combined RAM usage: ~1.5GB
- ✅ Can be unified for advanced use cases
- ✅ Suitable for 2GB+ RAM servers
