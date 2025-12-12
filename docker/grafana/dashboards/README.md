# Grafana Dashboards

This directory contains pre-built Grafana dashboards for NoteHub monitoring.

## Available Dashboards

### notehub-overview.json
- **Purpose**: Main dashboard for NoteHub application monitoring
- **Metrics**:
  - HTTP request rate and latency (p95, p99)
  - Active connections
  - Application stats (users, notes)
  - Backend CPU and memory usage
- **Best for**: Daily monitoring, quick health checks

### notehub-auth-security.json
- **Purpose**: Authentication and security monitoring
- **Metrics**:
  - Active user sessions
  - Authentication attempts (success/failure) by method
  - Failed login attempts with reasons
  - 2FA operations (enable, disable, verify)
  - Client errors (4xx) and server errors (5xx) by route
  - Authentication method distribution
- **Best for**: Security audits, investigating suspicious activity, monitoring auth system health

### notehub-database.json
- **Purpose**: Database performance and caching
- **Metrics**:
  - Database query rate and duration (p95, p99)
  - Cache hit rate and operations
  - Database query errors
- **Best for**: Performance tuning, identifying slow queries, optimizing cache usage

**Note**: Connection pool metrics are no longer available as they were MySQL-specific and caused confusion for SQLite users (the default database).

### notehub-business.json
- **Purpose**: Business metrics and user activity
- **Metrics**:
  - Total users, notes, and tags
  - Note operations rate (create, update, delete)
  - Note operations distribution
  - Tag operations
  - Search operations rate and duration
- **Best for**: Product analytics, understanding user behavior, tracking feature adoption

**Note**: Tasks total and notes by status metrics have been removed as they provided minimal observability value.

## Customizing Dashboards

### Changing Job Names
The dashboards use Prometheus job names in PromQL queries. If you change the job names in `docker/prometheus/prometheus.yml`, update the corresponding queries in the dashboards.

Default job names:
- `notehub-backend` - Main backend (default profile)
- `notehub-backend-mysql` - Backend with MySQL profile
- `notehub-backend-prod` - Backend with production profile

### Using Variables
To make dashboards work with multiple backend instances, consider adding Grafana template variables:
1. Edit dashboard in Grafana UI
2. Go to Settings → Variables
3. Add a new variable for job name: `job` with query `label_values(http_requests_total, job)`
4. Update queries to use `{job="$job"}` instead of `{job="notehub-backend"}`

## Adding New Dashboards

1. Create dashboards in Grafana UI
2. Export as JSON (Share → Export → Save to file)
3. Place JSON file in this directory
4. Dashboard will be automatically loaded on next Grafana restart

## Dashboard Provisioning

Dashboards are automatically provisioned via:
- `../provisioning/dashboards/dashboards.yml` - Dashboard provider configuration
- This directory - Dashboard JSON files

Any changes to JSON files require Grafana container restart to take effect:
```bash
docker compose -f docker-compose.monitoring.yml restart grafana
```
