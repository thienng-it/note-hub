# Grafana Loki Setup Guide

## Overview

This guide explains how to set up Grafana Loki for log aggregation in NoteHub. Loki is a lightweight alternative to Graylog that uses only 300-500MB RAM compared to Graylog's 4GB+ requirement.

## Why Loki Instead of Graylog?

Based on our investigation ([GRAYLOG_ALTERNATIVES_2GB_RAM.md](../investigation/GRAYLOG_ALTERNATIVES_2GB_RAM.md)), we replaced Graylog with Loki for the following reasons:

| Feature | Graylog | Loki | Winner |
|---------|---------|------|--------|
| RAM Usage | 4GB+ | 300-500MB | Loki |
| Setup Complexity | High | Low | Loki |
| Maintenance | Complex | Simple | Loki |
| Search Quality | Excellent | Good | Graylog |
| Best For | Large deployments | Cloud-native apps | Loki (for NoteHub) |

## Architecture

```
Applications → Promtail (collector) → Loki (storage) → Grafana (visualization)
```

### Components

1. **Loki**: Log aggregation server (port 3100)
2. **Promtail**: Log collector agent (collects from /var/log and Docker containers)
3. **Grafana**: Web UI for log visualization (port 3000)

## Prerequisites

- Docker and Docker Compose installed
- At least 512MB RAM available for Loki stack
- Ports 3000 (Grafana) and 3100 (Loki) available

## Quick Start

### 1. Copy Environment Configuration

```bash
cp .env.loki.example .env.loki
```

### 2. (Optional) Customize Configuration

Edit `.env.loki` and change the default admin password:

```bash
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-password
```

### 3. Start Loki Stack

```bash
docker compose -f docker-compose.loki.yml up -d
```

### 4. Access Grafana

Open your browser and navigate to:
```
http://your-server:3000
```

Default credentials:
- Username: `admin`
- Password: `admin` (or what you set in `.env.loki`)

### 5. Verify Loki Data Source

1. Log in to Grafana
2. Go to **Configuration → Data Sources**
3. You should see **Loki** already configured
4. Click **Test** to verify the connection

## Viewing Logs

### Using Grafana Explore

1. In Grafana, click **Explore** (compass icon in left sidebar)
2. Select **Loki** as the data source
3. Use the log browser to build queries:
   - Filter by job: `{job="containers"}`
   - Filter by container: `{container="notehub-backend"}`
   - Filter by compose service: `{compose_service="backend"}`

### Example Queries

**View all container logs:**
```logql
{job="containers"}
```

**View NoteHub backend logs:**
```logql
{container=~"notehub-backend.*"}
```

**View logs with errors:**
```logql
{job="containers"} |= "error"
```

**Count errors in last 5 minutes:**
```logql
count_over_time({job="containers"} |= "error" [5m])
```

## Integration with NoteHub

### Option 1: Docker Container Logs (Automatic)

Promtail automatically collects logs from all Docker containers. No configuration needed for NoteHub.

### Option 2: Winston Logger Integration (Node.js)

If you want to send logs directly from NoteHub backend to Loki:

1. Install winston-loki:
```bash
cd backend
npm install winston-loki
```

2. Update `backend/src/config/logger.js`:
```javascript
const winston = require('winston');
const LokiTransport = require('winston-loki');

const transports = [
  new winston.transports.Console({
    format: winston.format.simple(),
  }),
];

// Add Loki transport if configured
if (process.env.LOKI_URL) {
  transports.push(
    new LokiTransport({
      host: process.env.LOKI_URL,
      labels: { 
        app: 'notehub-backend',
        environment: process.env.NODE_ENV || 'development'
      },
      json: true,
      batching: true,
      interval: 5,
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports,
});

module.exports = logger;
```

3. Add to `.env`:
```bash
LOKI_URL=http://localhost:3100
```

## Configuration

### Loki Configuration

The Loki configuration is in `docker/loki/loki-config.yml`. Key settings:

- **Retention period**: 30 days (configurable in `table_manager.retention_period`)
- **Max query length**: 30 days
- **Ingestion rate**: 10MB/s

To change retention:
```yaml
table_manager:
  retention_period: 720h # 30 days (change as needed)
```

### Promtail Configuration

The Promtail configuration is in `docker/loki/promtail-config.yml`. It collects logs from:

1. `/var/log/*log` - System logs
2. Docker containers - All container logs
3. `/var/log/notehub/` - NoteHub specific logs (if file logging is configured)

## Resource Limits

The docker-compose file sets memory limits:

- **Loki**: 256MB limit, 128MB reservation
- **Promtail**: 64MB limit, 32MB reservation
- **Grafana**: 256MB limit, 128MB reservation

**Total**: ~600MB maximum

## Monitoring

### Check Status

```bash
# View running containers
docker compose -f docker-compose.loki.yml ps

# View logs
docker compose -f docker-compose.loki.yml logs -f loki
docker compose -f docker-compose.loki.yml logs -f promtail
docker compose -f docker-compose.loki.yml logs -f grafana
```

### Health Checks

```bash
# Check Loki health
curl http://localhost:3100/ready

# Check Grafana health
curl http://localhost:3000/api/health
```

### View Metrics

```bash
# Loki metrics
curl http://localhost:3100/metrics

# Promtail metrics
curl http://localhost:9080/metrics
```

## Troubleshooting

### Logs Not Appearing

1. Check Promtail is running:
```bash
docker compose -f docker-compose.loki.yml ps promtail
```

2. Check Promtail logs:
```bash
docker compose -f docker-compose.loki.yml logs promtail
```

3. Verify Loki connection:
```bash
curl http://localhost:3100/ready
```

### High Memory Usage

1. Reduce retention period in `loki-config.yml`
2. Reduce log volume by filtering in `promtail-config.yml`
3. Decrease query cache size in `loki-config.yml`

### Cannot Access Grafana

1. Check if port 3000 is already in use:
```bash
lsof -i :3000
```

2. Change port in `docker-compose.loki.yml` if needed:
```yaml
ports:
  - "3001:3000"  # Use 3001 instead
```

## Backup and Restore

### Backup

```bash
# Stop Loki
docker compose -f docker-compose.loki.yml stop loki

# Backup data
tar -czf loki-backup-$(date +%Y%m%d).tar.gz \
  -C /var/lib/docker/volumes \
  loki-data grafana-data

# Start Loki
docker compose -f docker-compose.loki.yml start loki
```

### Restore

```bash
# Stop services
docker compose -f docker-compose.loki.yml down

# Remove old volumes
docker volume rm loki-data grafana-data

# Extract backup
tar -xzf loki-backup-YYYYMMDD.tar.gz \
  -C /var/lib/docker/volumes

# Start services
docker compose -f docker-compose.loki.yml up -d
```

## Upgrading

### Upgrade Loki

1. Update version in `docker-compose.loki.yml`:
```yaml
loki:
  image: grafana/loki:2.10.0  # New version
```

2. Pull new image:
```bash
docker compose -f docker-compose.loki.yml pull loki
```

3. Restart:
```bash
docker compose -f docker-compose.loki.yml up -d loki
```

## Performance Tuning

### For High-Volume Logging

Edit `docker/loki/loki-config.yml`:

```yaml
ingester:
  chunk_target_size: 2097152  # Increase from 1MB to 2MB
  max_chunk_age: 2h            # Increase from 1h to 2h

limits_config:
  ingestion_rate_mb: 20        # Increase from 10MB to 20MB
  ingestion_burst_size_mb: 40  # Increase from 20MB to 40MB
```

### For Low-Memory Environments

Edit `docker/loki/loki-config.yml`:

```yaml
query_range:
  results_cache:
    cache:
      embedded_cache:
        max_size_mb: 50        # Decrease from 100MB to 50MB

limits_config:
  max_query_parallelism: 8     # Decrease from 16 to 8
```

## Comparison with Graylog

For detailed comparison, see [GRAYLOG_ALTERNATIVES_2GB_RAM.md](../investigation/GRAYLOG_ALTERNATIVES_2GB_RAM.md).

**Summary:**
- Loki uses 5-10x less RAM than Graylog
- Loki is simpler to set up and maintain
- Graylog has better full-text search capabilities
- Loki is better for cloud-native applications
- Loki is recommended for NoteHub due to resource constraints

## Additional Resources

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Promtail Documentation](https://grafana.com/docs/loki/latest/clients/promtail/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Grafana Dashboard Examples](https://grafana.com/grafana/dashboards/)

## Support

For issues or questions:
1. Check the [troubleshooting section](#troubleshooting)
2. View Loki logs: `docker compose -f docker-compose.loki.yml logs loki`
3. Consult the [official Loki documentation](https://grafana.com/docs/loki/latest/)
