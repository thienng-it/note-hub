# Grafana Dashboards

This directory contains pre-built Grafana dashboards for NoteHub monitoring.

## Available Dashboards

### notehub-overview.json
- **Purpose**: Main dashboard for NoteHub application monitoring
- **Metrics**:
  - HTTP request rate and latency
  - Active connections
  - Application stats (users, notes, tasks)
  - Backend CPU and memory usage

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
