# Prometheus and Grafana Monitoring Setup for NoteHub

## Overview

This guide explains how to set up Prometheus and Grafana monitoring for NoteHub on a 2GB RAM VPS. The monitoring stack is designed to work alongside NoteHub, Drone CI, and Graylog without port conflicts.

## Architecture

The monitoring stack consists of:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Metrics visualization and dashboards
- **cAdvisor**: Docker container metrics
- **Node Exporter**: System-level metrics

### Port Allocation

When deployed on the same VPS:

| Service | Port(s) | Access |
|---------|---------|--------|
| NoteHub (Traefik) | 80, 443 | External (HTTPS) |
| NoteHub (Traefik Metrics) | 9091 | Internal only |
| Drone CI (Traefik) | 8080, 8443 | External (HTTPS) |
| Graylog | 9000 | External (HTTP) |
| Prometheus | 9090 | Internal only |
| Grafana | 3000 | Via Traefik (subdomain or path) |
| cAdvisor | 8080 | Internal only |
| Node Exporter | 9100 | Internal only |

**No port conflicts!** All services can run together on a single VPS.

## Memory Usage

The monitoring stack is optimized for 2GB RAM VPS:

| Component | Memory Limit | Memory Reservation |
|-----------|--------------|-------------------|
| Prometheus | 512 MB | 256 MB |
| Grafana | 256 MB | 128 MB |
| cAdvisor | 128 MB | 64 MB |
| Node Exporter | 64 MB | 32 MB |
| **Total** | **~1 GB** | **~480 MB** |

This leaves approximately 1GB for NoteHub and other services on a 2GB RAM VPS.

## Prerequisites

1. Docker and Docker Compose installed
2. NoteHub already deployed and running
3. At least 2GB RAM available on the VPS
4. `.env` file configured with `DOMAIN` and `ACME_EMAIL`

## Quick Start

### 1. Basic Setup (Local Access)

For local development or testing without domain:

```bash
# Start NoteHub (if not already running)
docker compose up -d

# Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# Access Grafana at http://localhost:3000
# Default credentials: admin / admin
```

### 2. Production Setup (Subdomain)

For production with custom domain (recommended):

```bash
# Configure subdomain DNS
# Point monitoring.yourdomain.com to your server IP

# Update .env file
cat >> .env << EOF
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=YourSecurePassword123!
GRAFANA_ROOT_URL=https://monitoring.yourdomain.com
GRAFANA_DOMAIN=monitoring.yourdomain.com
GRAFANA_ROUTER_RULE=Host(\`monitoring.\${DOMAIN}\`)
EOF

# Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# Access Grafana at https://monitoring.yourdomain.com
```

### 3. Production Setup (Path-based)

For production using path-based routing:

```bash
# Update .env file
cat >> .env << EOF
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=YourSecurePassword123!
GRAFANA_ROOT_URL=https://yourdomain.com/grafana
GRAFANA_ROUTER_RULE=PathPrefix(\`/grafana\`)
EOF

# Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# Access Grafana at https://yourdomain.com/grafana
```

## Deployment Scenarios

### Scenario 1: NoteHub + Monitoring (Default Profile)

```bash
# Start NoteHub with SQLite
docker compose up -d

# Start monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

### Scenario 2: NoteHub + MySQL + Monitoring

```bash
# Start NoteHub with MySQL
docker compose --profile mysql up -d

# Start monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

### Scenario 3: NoteHub + Drone CI + Monitoring

```bash
# Start NoteHub
docker compose up -d

# Start Drone CI
docker compose --env-file .env.drone -f docker-compose.drone.yml up -d

# Start monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

### Scenario 4: Full Stack (NoteHub + Drone CI + Graylog + Monitoring)

```bash
# Start NoteHub
docker compose up -d

# Start Drone CI
docker compose --env-file .env.drone -f docker-compose.drone.yml up -d

# Start Graylog
docker compose --env-file .env.graylog -f docker-compose.graylog.yml up -d

# Start monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

## Accessing the Monitoring Stack

### Grafana Dashboard

1. Open Grafana in your browser (see deployment method above)
2. Login with credentials (default: admin / admin)
3. Change password on first login
4. Navigate to "Dashboards" → "NoteHub" folder
5. Open "NoteHub Overview" dashboard

### Prometheus (Internal Access Only)

Prometheus is not exposed externally by default. To access:

```bash
# Option 1: Port forward via SSH tunnel
ssh -L 9090:localhost:9090 user@your-server

# Then access at http://localhost:9090

# Option 2: Temporarily expose port (NOT RECOMMENDED for production)
# Edit docker-compose.monitoring.yml and uncomment:
# ports:
#   - "9090:9090"
```

## Metrics Available

### Application Metrics (NoteHub Backend)

- **HTTP Requests**: Rate, duration, status codes
- **Database Queries**: Duration, operation types
- **Cache Operations**: Hit/miss rates
- **Application Stats**: Users, notes, tasks counts
- **Active Connections**: Current connection count

### System Metrics (Node Exporter)

- CPU usage per core
- Memory usage (used, free, cached)
- Disk I/O
- Network traffic
- System load average

### Container Metrics (cAdvisor)

- Container CPU usage
- Container memory usage
- Container network I/O
- Container disk I/O
- Container restart count

### Proxy Metrics (Traefik)

- Request rate per service
- Response time per service
- Status code distribution
- Backend health status

## Available Dashboards

### 1. NoteHub Overview

Pre-configured dashboard showing:
- HTTP request rate by endpoint
- Request duration (p95, p99)
- Total users, notes, and tasks
- Active connections
- Backend memory and CPU usage

Location: Dashboards → NoteHub → NoteHub Overview

### 2. Custom Dashboards

You can create additional dashboards in Grafana:
1. Click "+" → "Dashboard"
2. Add panels with PromQL queries
3. Save to "NoteHub" folder

## PromQL Query Examples

### HTTP Request Rate

```promql
# Total request rate
sum(rate(http_requests_total{job="notehub-backend"}[5m]))

# Request rate by endpoint
sum by (route) (rate(http_requests_total{job="notehub-backend"}[5m]))

# Error rate (5xx status codes)
sum(rate(http_requests_total{job="notehub-backend",status_code=~"5.."}[5m]))
```

### Request Duration

```promql
# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="notehub-backend"}[5m]))

# Average latency by endpoint
avg by (route) (rate(http_request_duration_seconds_sum{job="notehub-backend"}[5m]) / rate(http_request_duration_seconds_count{job="notehub-backend"}[5m]))
```

### Resource Usage

```promql
# Backend memory usage
process_resident_memory_bytes{job="notehub-backend"}

# Backend CPU usage (percentage)
rate(process_cpu_seconds_total{job="notehub-backend"}[5m]) * 100

# Container memory usage
container_memory_usage_bytes{name="notehub-backend"}
```

### Database Queries

```promql
# Database query rate
sum(rate(db_queries_total{job="notehub-backend"}[5m]))

# Database query duration
histogram_quantile(0.95, rate(db_query_duration_seconds_bucket{job="notehub-backend"}[5m]))
```

## Performance Optimization

### For 2GB RAM VPS

The default configuration is already optimized for 2GB RAM. However, you can further optimize:

1. **Reduce Prometheus retention:**

Edit `docker/prometheus/prometheus.yml`:

```yaml
storage:
  tsdb:
    retention.time: 7d  # Reduce from 15d to 7d
    retention.size: 3GB  # Reduce from 5GB to 3GB
```

2. **Reduce scrape frequency:**

Edit `docker/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 60s  # Increase from 30s to 60s
```

3. **Disable unused exporters:**

Comment out cAdvisor or Node Exporter in `docker-compose.monitoring.yml` if not needed.

### For Larger VPS (4GB+ RAM)

Increase memory limits in `docker-compose.monitoring.yml`:

```yaml
prometheus:
  deploy:
    resources:
      limits:
        memory: 1G  # Increase from 512M
      reservations:
        memory: 512M  # Increase from 256M

grafana:
  deploy:
    resources:
      limits:
        memory: 512M  # Increase from 256M
      reservations:
        memory: 256M  # Increase from 128M
```

## Troubleshooting

### Grafana Not Accessible

1. **Check Grafana is running:**

```bash
docker compose -f docker-compose.monitoring.yml ps grafana
docker compose -f docker-compose.monitoring.yml logs grafana
```

2. **Check Traefik routing:**

```bash
docker compose logs traefik | grep grafana
```

3. **Verify DNS (for subdomain):**

```bash
nslookup monitoring.yourdomain.com
```

### Prometheus Not Collecting Metrics

1. **Check Prometheus targets:**

Access Prometheus UI and go to Status → Targets

2. **Check backend metrics endpoint:**

```bash
curl http://localhost:5000/metrics
```

3. **Check Prometheus logs:**

```bash
docker compose -f docker-compose.monitoring.yml logs prometheus
```

### High Memory Usage

1. **Check current usage:**

```bash
docker stats
```

2. **Reduce Prometheus retention:**

See "Performance Optimization" section above.

3. **Restart services:**

```bash
docker compose -f docker-compose.monitoring.yml restart
```

### No Data in Dashboards

1. **Check Prometheus data source:**

Grafana → Configuration → Data Sources → Prometheus

2. **Test connection:**

Click "Test" button in data source configuration

3. **Check time range:**

Ensure dashboard time range matches available data (default: last 1 hour)

## Maintenance

### Backup Grafana Dashboards

```bash
# Backup Grafana data
docker cp notehub-grafana:/var/lib/grafana ./grafana-backup
```

### Backup Prometheus Data

```bash
# Backup Prometheus data
docker cp notehub-prometheus:/prometheus ./prometheus-backup
```

### Update Monitoring Stack

```bash
# Pull latest images
docker compose -f docker-compose.monitoring.yml pull

# Restart services
docker compose -f docker-compose.monitoring.yml up -d
```

### Clean Up Old Data

```bash
# Remove Prometheus data
docker compose -f docker-compose.monitoring.yml down
docker volume rm note-hub_prometheus-data

# Remove Grafana data (dashboards and settings)
docker volume rm note-hub_grafana-data

# Restart monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

## Security Considerations

### Production Deployment

1. **Change default Grafana password:**

Set `GRAFANA_ADMIN_PASSWORD` in `.env` file before first deployment.

2. **Restrict Prometheus access:**

Prometheus is internal-only by default. Keep it that way unless necessary.

3. **Enable HTTPS:**

Always use HTTPS for Grafana in production (automatic with Traefik).

4. **Use subdomain routing:**

Subdomain routing (`monitoring.yourdomain.com`) is more secure than path-based routing.

5. **Set up authentication:**

Grafana has built-in authentication. Consider integrating with OAuth for production.

### Firewall Configuration

Ensure your VPS firewall allows:
- Port 80/443 (NoteHub, Grafana via Traefik)
- Port 8080/8443 (Drone CI, if deployed)
- Port 9000 (Graylog, if deployed)

Block direct access to:
- Port 9090 (Prometheus)
- Port 3000 (Grafana - use Traefik proxy instead)

## Advanced Configuration

### Adding Custom Metrics

Edit `backend/src/middleware/metrics.js` to add custom metrics:

```javascript
const myCustomMetric = new promClient.Counter({
  name: 'my_custom_metric_total',
  help: 'Description of my metric',
  labelNames: ['label1', 'label2'],
  registers: [register],
});

// Increment the metric
myCustomMetric.inc({ label1: 'value1', label2: 'value2' });
```

### Adding Alert Rules

Create `docker/prometheus/alerts/rules.yml`:

```yaml
groups:
  - name: notehub_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} requests/sec"
```

Then uncomment the `rule_files` section in `prometheus.yml`.

### Integrating with Alertmanager

Add Alertmanager service to `docker-compose.monitoring.yml` and configure Prometheus to send alerts.

## Support and Resources

- **NoteHub Documentation**: See `docs/` directory
- **Prometheus Documentation**: https://prometheus.io/docs/
- **Grafana Documentation**: https://grafana.com/docs/
- **Traefik Documentation**: https://doc.traefik.io/traefik/

## Summary

This monitoring setup provides:
- ✅ Complete observability for NoteHub
- ✅ Optimized for 2GB RAM VPS
- ✅ No port conflicts with other services
- ✅ Easy deployment and management
- ✅ Production-ready security
- ✅ Pre-configured dashboards
- ✅ Extensible architecture

Enjoy monitoring your NoteHub instance! 🎉
