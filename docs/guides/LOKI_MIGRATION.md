# Grafana Loki Migration Guide

## Overview

This guide documents the migration from Graylog to Grafana Loki for centralized log management in NoteHub backend. Loki provides a more lightweight, cost-effective, and cloud-native solution for log aggregation and analysis.

## What Changed

### Dependencies
- **Removed**: `winston-graylog2` (v2.1.2)
- **Added**: `winston-loki` (v6.2.2)

### Configuration Files
- `backend/src/config/logger.ts` - Updated to use Loki transport
- `backend/src/config/logger.js` - Updated for consistency
- `backend/package.json` - Updated dependencies
- `.env.example` - Replaced Graylog config with Loki config

### Environment Variables

#### Old (Graylog)
```bash
GRAYLOG_ENABLED=true
GRAYLOG_HOST=localhost
GRAYLOG_PORT=12201
GRAYLOG_PROTOCOL=udp
GRAYLOG_FACILITY=notehub-backend
```

#### New (Loki)
```bash
LOKI_ENABLED=true
LOKI_HOST=http://localhost:3100
LOKI_USERNAME=           # Optional, for authenticated instances
LOKI_PASSWORD=           # Optional, for authenticated instances
LOKI_APP_LABEL=notehub-backend
```

## Why Grafana Loki?

### Advantages Over Graylog

1. **Lightweight**: Lower resource footprint (CPU and memory)
2. **Cost-Effective**: No expensive Elasticsearch backend required
3. **Cloud-Native**: Better integration with Kubernetes and container environments
4. **Query Language**: LogQL (similar to PromQL) for powerful log queries
5. **Integration**: Native integration with Grafana for visualization
6. **Scalability**: Horizontally scalable with S3-compatible object storage
7. **Label-Based Indexing**: More efficient than full-text indexing

### Key Features

- **Label-Based Indexing**: Only indexes labels, not log content (more efficient)
- **Push Model**: Logs are pushed to Loki via HTTP API
- **LogQL**: Powerful query language similar to Prometheus' PromQL
- **Grafana Integration**: Seamless integration with Grafana dashboards
- **Multi-Tenancy**: Built-in support for multiple tenants
- **Cost-Effective Storage**: Uses object storage (S3, GCS, etc.) for long-term retention

## Migration Steps

### 1. Update Dependencies

```bash
cd backend
npm uninstall winston-graylog2
npm install winston-loki
```

### 2. Update Environment Configuration

Update your `.env` file:

```bash
# Remove old Graylog config
# GRAYLOG_ENABLED=true
# GRAYLOG_HOST=localhost
# ...

# Add new Loki config
LOKI_ENABLED=true
LOKI_HOST=http://localhost:3100
LOKI_APP_LABEL=notehub-backend
```

### 3. Deploy Loki (if not already running)

#### Option 1: Using Docker Compose (Recommended)

Use the existing `.env.loki.example` configuration:

```bash
# Copy and configure Loki environment
cp .env.loki.example .env.loki

# Deploy Loki stack
docker compose -f docker-compose.loki.yml up -d
```

This will deploy:
- Loki (log aggregation)
- Grafana (log visualization)
- Accessible at `https://logs.${DOMAIN}` or `http://localhost:3001`

#### Option 2: Standalone Loki

```bash
docker run -d \
  --name loki \
  -p 3100:3100 \
  grafana/loki:latest
```

#### Option 3: Grafana Cloud

Sign up for Grafana Cloud and use their hosted Loki instance:

```bash
LOKI_ENABLED=true
LOKI_HOST=https://logs-prod-us-central1.grafana.net
LOKI_USERNAME=your-instance-id
LOKI_PASSWORD=your-api-token
LOKI_APP_LABEL=notehub-backend
```

### 4. Restart NoteHub Backend

```bash
# Docker deployment
docker compose restart backend

# Development
npm run dev
```

### 5. Verify Log Ingestion

Check that logs are being sent to Loki:

1. Access Grafana (from Loki deployment or Grafana Cloud)
2. Navigate to **Explore** → Select **Loki** data source
3. Run query: `{application="notehub-backend"}`
4. You should see recent logs from NoteHub backend

## Configuration Options

### Basic Configuration

```bash
# Minimal configuration for local Loki
LOKI_ENABLED=true
LOKI_HOST=http://localhost:3100
LOKI_APP_LABEL=notehub-backend
```

### Authenticated Loki Instance

```bash
# For secured Loki instances
LOKI_ENABLED=true
LOKI_HOST=https://loki.yourdomain.com
LOKI_USERNAME=admin
LOKI_PASSWORD=secure-password
LOKI_APP_LABEL=notehub-backend
```

### Grafana Cloud Configuration

```bash
# For Grafana Cloud Loki
LOKI_ENABLED=true
LOKI_HOST=https://logs-prod-us-central1.grafana.net
LOKI_USERNAME=123456  # Your instance ID
LOKI_PASSWORD=glc_...  # Your API token
LOKI_APP_LABEL=notehub-backend
```

### Custom Labels

The logger automatically includes these labels:
- `application`: Set via `LOKI_APP_LABEL` (default: `notehub-backend`)
- `environment`: From `NODE_ENV` (development/production)
- `hostname`: Server hostname

Additional labels can be added by modifying `backend/src/config/logger.ts`:

```typescript
const lokiLabels = {
  application: process.env.LOKI_APP_LABEL || 'notehub-backend',
  environment: process.env.NODE_ENV || 'development',
  hostname: process.env.HOSTNAME || os.hostname(),
  // Add custom labels here
  version: process.env.npm_package_version || '1.0.0',
  region: process.env.AWS_REGION || 'local',
};
```

## Querying Logs with LogQL

### Basic Queries

```logql
# All logs from notehub-backend
{application="notehub-backend"}

# Logs from production environment
{application="notehub-backend", environment="production"}

# Error logs only
{application="notehub-backend"} |= "error"

# Auth-related logs
{application="notehub-backend"} |= "Auth Event"

# API requests with status codes
{application="notehub-backend"} |= "API Request" | json | statusCode > 400
```

### Advanced Queries

```logql
# Rate of errors per minute
rate({application="notehub-backend"} |= "error" [1m])

# Count of log lines by level
sum by (level) (count_over_time({application="notehub-backend"}[5m]))

# Slow API requests (>1000ms duration)
{application="notehub-backend"} 
  |= "API Request" 
  | json 
  | duration > "1000ms"

# Failed login attempts
{application="notehub-backend"} 
  |= "Auth Event" 
  | json 
  | event = "login_failed"
```

## Grafana Dashboard Setup

### 1. Add Loki Data Source

1. Navigate to **Configuration** → **Data Sources**
2. Click **Add data source**
3. Select **Loki**
4. Configure:
   - **URL**: `http://loki:3100` (Docker) or your Loki URL
   - **Auth**: Configure if using authenticated instance
5. Click **Save & Test**

### 2. Create Dashboard

Import the pre-built dashboard or create custom panels:

#### Example Panel: Log Stream
- **Visualization**: Logs
- **Query**: `{application="notehub-backend"}`
- **Options**: 
  - Show time: Yes
  - Wrap lines: Yes
  - Dedupe: None

#### Example Panel: Error Rate
- **Visualization**: Time series
- **Query**: `rate({application="notehub-backend"} |= "error" [1m])`
- **Legend**: `Error Rate`

#### Example Panel: Log Volume
- **Visualization**: Bar chart
- **Query**: `sum by (level) (count_over_time({application="notehub-backend"}[1h]))`
- **Legend**: `{{level}}`

## Troubleshooting

### Logs Not Appearing in Loki

1. **Check Loki is running**:
   ```bash
   curl http://localhost:3100/ready
   # Should return: "ready"
   ```

2. **Check backend logs for Loki connection**:
   ```bash
   docker compose logs backend | grep -i loki
   # Should see: "Loki transport enabled"
   ```

3. **Verify environment variables**:
   ```bash
   docker compose exec backend env | grep LOKI
   ```

4. **Check Loki logs for errors**:
   ```bash
   docker compose logs loki
   ```

### Authentication Errors

If using authenticated Loki:
- Verify `LOKI_USERNAME` and `LOKI_PASSWORD` are correct
- Check Loki's authentication configuration
- Test authentication with curl:
  ```bash
  curl -u username:password http://loki-host:3100/ready
  ```

### Connection Errors

1. **Verify network connectivity**:
   ```bash
   docker compose exec backend curl http://loki:3100/ready
   ```

2. **Check Docker network**:
   ```bash
   docker network ls
   docker network inspect notehub-network
   ```

3. **Firewall rules**: Ensure port 3100 is accessible

### Performance Issues

If experiencing high memory usage or slow queries:

1. **Adjust retention period** (in Loki config):
   ```yaml
   limits_config:
     retention_period: 168h  # 7 days
   ```

2. **Optimize queries**: Use more specific label filters
3. **Enable caching**: Configure query result caching
4. **Scale horizontally**: Deploy multiple Loki instances

## Comparing with Graylog

| Feature | Graylog | Grafana Loki |
|---------|---------|--------------|
| **Backend** | Elasticsearch (heavy) | Object storage (light) |
| **Indexing** | Full-text | Label-based |
| **Query Language** | Lucene | LogQL |
| **Resource Usage** | High (4-8GB+ RAM) | Low (512MB-2GB RAM) |
| **Setup Complexity** | Complex (ES, MongoDB, Graylog) | Simple (single binary) |
| **Cloud Support** | Limited | Excellent (Cloud-native) |
| **Cost** | High | Low |
| **Grafana Integration** | Plugin required | Native |
| **Scalability** | Vertical | Horizontal |

## Best Practices

### 1. Use Structured Logging

```typescript
// Good: Structured logging with consistent fields
logger.info('API Request', {
  method: 'GET',
  path: '/api/notes',
  statusCode: 200,
  duration: '45ms'
});

// Avoid: Unstructured string concatenation
logger.info(`GET /api/notes returned 200 in 45ms`);
```

### 2. Add Meaningful Labels

Labels should be:
- Low cardinality (don't use unique IDs)
- Useful for filtering
- Consistent across logs

```typescript
// Good labels
{
  application: "notehub-backend",
  environment: "production",
  hostname: "web-01"
}

// Bad labels (too many unique values)
{
  request_id: "uuid-here",  // Don't use as label
  user_id: "12345"          // Don't use as label
}
```

### 3. Set Appropriate Log Levels

```typescript
// Use appropriate log levels
logger.error('Database connection failed');  // Errors
logger.warn('Rate limit approaching');       // Warnings
logger.info('User logged in');               // Important events
logger.debug('Processing request data');     // Debugging
```

### 4. Monitor Log Volume

- Track log ingestion rate
- Set up alerts for unusual spikes
- Use log sampling for high-volume applications

### 5. Regular Maintenance

- Review retention policies (default: 30 days)
- Clean up unused labels
- Optimize query performance
- Update Loki version regularly

## Additional Resources

- [Grafana Loki Documentation](https://grafana.com/docs/loki/latest/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Winston-Loki Transport](https://github.com/JaniAnttonen/winston-loki)
- [Loki Best Practices](https://grafana.com/docs/loki/latest/best-practices/)

## Support

For issues or questions:
1. Check this migration guide
2. Review Loki documentation
3. Check GitHub issues in NoteHub repository
4. Contact the development team

## Rollback Instructions

If you need to rollback to Graylog:

1. Reinstall winston-graylog2:
   ```bash
   npm install winston-graylog2
   ```

2. Restore old logger configuration from git history:
   ```bash
   git show HEAD~1:backend/src/config/logger.ts > backend/src/config/logger.ts
   git show HEAD~1:backend/src/config/logger.js > backend/src/config/logger.js
   ```

3. Update environment variables back to Graylog config

4. Restart backend

**Note**: Consider keeping both configurations during transition period by using different environment variable prefixes.
