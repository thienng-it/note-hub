# Monitoring Quick Start Guide

## TL;DR

```bash
# Start NoteHub
docker compose up -d

# Start Monitoring
docker compose -f docker-compose.monitoring.yml up -d

# (Optional) Start Loki log aggregation
docker compose -f docker-compose.loki.yml up -d

# Access Grafana
http://localhost:3000
# Login: admin / admin
```

## What You Get

- 📊 **Grafana Dashboard**: Beautiful visualizations of your NoteHub metrics
- 🔍 **Prometheus**: Collects metrics every 30 seconds
- 📈 **Pre-built Dashboard**: HTTP requests, latency, memory, CPU, users, notes, tasks
- 🐳 **Container Metrics**: Docker resource usage via cAdvisor
- 💻 **System Metrics**: CPU, memory, disk, network via Node Exporter
- 🚨 **Alerting**: Prometheus alert rules + Alertmanager for routing notifications
- 🌐 **Endpoint Probing**: HTTP health checks + latency via Blackbox Exporter
- 🧾 **Logs (Loki)**: Query Docker/system logs from the same Grafana UI via Loki datasource
- 🖥️ **VPS Dashboard**: Host CPU/RAM/disk/network overview dashboard for capacity and health

## Port Allocation (No Conflicts!)

| Service | Ports | Access |
|---------|-------|--------|
| NoteHub | 80, 443 | External HTTPS |
| Drone CI | 8080, 8443 | External HTTPS |
| Grafana | 3000 | Via Traefik (subdomain) |
| Prometheus | 9090 | Internal only |
| Alertmanager | 9093 | Internal only |

## Memory Usage (2GB RAM VPS)

- Prometheus: ~512 MB
- Grafana: ~256 MB  
- cAdvisor: ~128 MB
- Node Exporter: ~64 MB
- **Total: ~1 GB** (leaves 1GB for NoteHub + Drone CI)

## Production Setup

### Option 1: Subdomain (Recommended)

```bash
# 1. Configure DNS: monitoring.yourdomain.com → your-server-ip

# 2. Update .env
cat >> .env << EOF
GRAFANA_ADMIN_PASSWORD=YourSecurePassword123!
GRAFANA_ROOT_URL=https://monitoring.yourdomain.com
GRAFANA_ROUTER_RULE=Host(\`monitoring.\${DOMAIN}\`)
EOF

# 3. Deploy
docker compose -f docker-compose.monitoring.yml up -d

# 4. Access at https://monitoring.yourdomain.com
```

### Option 2: Path-based

```bash
# 1. Update .env
cat >> .env << EOF
GRAFANA_ADMIN_PASSWORD=YourSecurePassword123!
GRAFANA_ROOT_URL=https://yourdomain.com/grafana
GRAFANA_ROUTER_RULE=PathPrefix(\`/grafana\`)
EOF

# 2. Deploy
docker compose -f docker-compose.monitoring.yml up -d

# 3. Access at https://yourdomain.com/grafana
```

## Available Metrics

### Application Metrics
- HTTP request rate and latency (p95, p99)
- Active connections
- Total users, notes, and tasks
- Database query performance
- Cache hit/miss rates

### System Metrics
- CPU usage per core
- Memory usage (used/free/cached)
- Disk I/O
- Network traffic

### Uptime / Endpoint Probes
- Backend health endpoint availability and latency
- Frontend root availability and latency
- Monitoring stack self-health checks (Grafana, Prometheus)

### Container Metrics
- Per-container CPU/memory
- Container network I/O
- Container restarts

## View Metrics

1. Open Grafana (see deployment method above)
2. Login with credentials
3. Go to: **Dashboards** → **NoteHub** → **NoteHub Overview**

## View Logs (Loki)

1. Start Loki stack (optional): `docker compose -f docker-compose.loki.yml up -d`
2. Open Grafana (monitoring)
3. Go to **Explore**
4. Select datasource **Loki**
5. Try a query like: `{job="containers"}` or `{container="notehub-backend"}`

## Troubleshooting

### Grafana not accessible?

```bash
# Check status
docker compose -f docker-compose.monitoring.yml ps

# Check logs
docker compose -f docker-compose.monitoring.yml logs grafana

# Restart
docker compose -f docker-compose.monitoring.yml restart grafana
```

### No metrics in dashboard?

```bash
# Check Prometheus targets
# Access Prometheus at http://localhost:9090 (or via SSH tunnel)
# Go to Status → Targets

# Check backend metrics endpoint
curl http://localhost:5000/metrics

# Check Prometheus targets
# (Prometheus is internal by default; expose port 9090 or use an SSH tunnel)
# Status → Targets should include: notehub-backend, cadvisor, node-exporter, blackbox-http

# Check alert rules
# Status → Rules should list NoteHub alerts (if rules are loaded)
```

### High memory usage?

```bash
# Check current usage
docker stats

# Reduce retention in docker/prometheus/prometheus.yml:
storage:
  tsdb:
    retention.time: 7d  # Reduce from 15d
    retention.size: 3GB  # Reduce from 5GB
```

## Full Documentation

See [MONITORING_SETUP.md](MONITORING_SETUP.md) for:
- Detailed configuration options
- Custom metrics and dashboards
- Alert rules setup
- Advanced troubleshooting
- Performance optimization
- Security best practices

## Commands Cheat Sheet

```bash
# Start monitoring
docker compose -f docker-compose.monitoring.yml up -d

# Stop monitoring
docker compose -f docker-compose.monitoring.yml down

# View logs
docker compose -f docker-compose.monitoring.yml logs -f

# Restart services
docker compose -f docker-compose.monitoring.yml restart

# Update monitoring stack
docker compose -f docker-compose.monitoring.yml pull
docker compose -f docker-compose.monitoring.yml up -d

# Remove all data (fresh start)
docker compose -f docker-compose.monitoring.yml down -v
```

## Next Steps

- [ ] Change default Grafana password
- [ ] Set up subdomain routing for production
- [ ] Create custom dashboards
- [ ] Set up alert rules
- [ ] Integrate with Alertmanager (optional)
