# Metrics Documentation

This document describes the Prometheus metrics exposed by NoteHub for monitoring and observability.

## Accessing Metrics

Metrics are exposed at two endpoints:
- `http://your-server:5000/metrics`
- `http://your-server:5000/api/metrics`

Both endpoints return metrics in Prometheus format and do not require authentication.

## Metric Categories

### Default Node.js Metrics

NoteHub automatically collects standard Node.js metrics using the `prom-client` library:

- **Process Metrics**: CPU usage, memory usage, open file descriptors
- **Event Loop Metrics**: Event loop lag, latency percentiles (p50, p90, p99)
- **Heap Metrics**: Heap size, heap usage, garbage collection statistics
- **Active Resources**: Active handles, requests, and resources

These metrics are essential for monitoring the health and performance of the Node.js application.

### HTTP Request Metrics

#### `http_request_duration_seconds`
- **Type**: Histogram
- **Description**: Duration of HTTP requests in seconds
- **Labels**: `method`, `route`, `status_code`
- **Buckets**: 0.1, 0.5, 1, 2, 5, 10 seconds
- **Use Case**: Monitor API response times, identify slow endpoints

#### `http_requests_total`
- **Type**: Counter
- **Description**: Total number of HTTP requests
- **Labels**: `method`, `route`, `status_code`
- **Use Case**: Track API usage, request rates, and status code distribution

#### `http_active_connections`
- **Type**: Gauge
- **Description**: Number of currently active HTTP connections
- **Use Case**: Monitor concurrent connections, detect connection leaks

### Database Metrics

#### `db_query_duration_seconds`
- **Type**: Histogram
- **Description**: Duration of database queries in seconds
- **Labels**: `operation` (SELECT, INSERT, UPDATE, DELETE), `status` (success, error)
- **Buckets**: 0.01, 0.05, 0.1, 0.5, 1, 2 seconds
- **Use Case**: Identify slow queries, optimize database performance

#### `db_queries_total`
- **Type**: Counter
- **Description**: Total number of database queries executed
- **Labels**: `operation`, `status`
- **Use Case**: Track database load, query success/failure rates

### Application Entity Metrics

#### `notehub_notes_total`
- **Type**: Gauge
- **Description**: Total number of notes in the system
- **Use Case**: Monitor application growth, track content volume

#### `notehub_users_total`
- **Type**: Gauge
- **Description**: Total number of registered users
- **Use Case**: Monitor user base growth

#### `notehub_tags_total`
- **Type**: Gauge
- **Description**: Total number of unique tags in the system
- **Use Case**: Monitor tag usage and organization patterns

### Authentication Metrics

#### `notehub_auth_attempts_total`
- **Type**: Counter
- **Description**: Total number of authentication attempts
- **Labels**: `method` (password, google, github), `status` (success, failure), `reason` (invalid_credentials, 2fa_code_required, etc.)
- **Use Case**: Monitor authentication activity, detect brute force attacks

#### `notehub_auth_active_sessions`
- **Type**: Gauge
- **Description**: Number of currently active user sessions
- **Use Case**: Monitor concurrent users, detect session leaks

#### `notehub_2fa_operations_total`
- **Type**: Counter
- **Description**: Total 2FA operations (enable, disable, verify)
- **Labels**: `operation` (enable, disable, verify), `status` (success, failure)
- **Use Case**: Monitor 2FA adoption and usage

### Note Operations Metrics

#### `notehub_note_operations_total`
- **Type**: Counter
- **Description**: Total note operations performed
- **Labels**: `operation` (create, update, delete), `status` (success, failure)
- **Use Case**: Track note activity, identify operation patterns

#### `notehub_tag_operations_total`
- **Type**: Counter
- **Description**: Total tag operations performed
- **Labels**: `operation` (assign, update, remove)
- **Use Case**: Monitor tag usage patterns

### Error Tracking Metrics

#### `notehub_api_errors_total`
- **Type**: Counter
- **Description**: Total API errors by type and route
- **Labels**: `route`, `error_type` (client_error, server_error), `status_code`
- **Use Case**: Monitor error rates, identify problematic endpoints

### Cache Metrics (Optional - Redis Required)

#### `cache_operations_total`
- **Type**: Counter
- **Description**: Total cache operations
- **Labels**: `operation` (get, set, delete), `result` (hit, miss, error)
- **Use Case**: Monitor cache effectiveness, hit/miss ratios
- **Note**: Only active when Redis is configured

### Search Metrics (Optional - Elasticsearch Required)

#### `notehub_search_operations_total`
- **Type**: Counter
- **Description**: Total search operations
- **Labels**: `engine` (elasticsearch, sql), `status` (success, failure)
- **Use Case**: Monitor search usage, success rates

#### `notehub_search_duration_seconds`
- **Type**: Histogram
- **Description**: Duration of search operations
- **Labels**: `engine`
- **Buckets**: 0.1, 0.5, 1, 2, 5 seconds
- **Use Case**: Monitor search performance
- **Note**: Only active when Elasticsearch is configured

## Metrics Update Schedule

- **HTTP Metrics**: Updated in real-time for each request
- **Database Metrics**: Updated in real-time for each query
- **Application Entity Metrics**: Updated every 30 seconds
- **Authentication Metrics**: Updated in real-time for each auth attempt

## Route Normalization

To prevent high cardinality in metrics, routes are normalized:
- Numeric IDs are replaced with `:id` (e.g., `/api/v1/notes/123` → `/api/v1/notes/:id`)
- UUIDs are replaced with `:id`
- Static files are grouped under `/static`
- The metrics endpoint itself is not tracked

## Example Queries

### Prometheus Queries (PromQL)

**Average request duration by route:**
```promql
rate(http_request_duration_seconds_sum[5m]) 
/ 
rate(http_request_duration_seconds_count[5m])
```

**Request rate per second:**
```promql
rate(http_requests_total[1m])
```

**Error rate percentage:**
```promql
100 * (
  sum(rate(notehub_api_errors_total[5m]))
  /
  sum(rate(http_requests_total[5m]))
)
```

**Failed login attempts:**
```promql
sum(notehub_auth_attempts_total{status="failure"})
```

**Database query p95 latency:**
```promql
histogram_quantile(0.95, 
  rate(db_query_duration_seconds_bucket[5m])
)
```

**Cache hit ratio:**
```promql
sum(rate(cache_operations_total{result="hit"}[5m]))
/
sum(rate(cache_operations_total{operation="get"}[5m]))
```

## Grafana Dashboard

A sample Grafana dashboard configuration can be found in `docs/monitoring/grafana-dashboard.json` (coming soon).

## Best Practices

1. **Scrape Interval**: Set Prometheus scrape interval to 15-30 seconds
2. **Retention**: Keep metrics for at least 30 days for trend analysis
3. **Alerts**: Set up alerts for:
   - High error rates (>5%)
   - Slow response times (p95 > 2s)
   - Failed authentication attempts (potential attacks)
   - Database query errors

## Changes from Previous Version

The following metrics were removed in the recent update for being low-value or causing confusion:

- ❌ `http_request_size_bytes` - High cardinality, rarely useful
- ❌ `http_response_size_bytes` - High cardinality, rarely useful
- ❌ `db_connection_pool_size` - MySQL only, confusing for SQLite users
- ❌ `notehub_notes_by_status` - Too specific, low value
- ❌ `notehub_tasks_total` - Secondary feature

## Troubleshooting

### Metrics endpoint returns 500 error
- Check server logs for errors
- Ensure database is properly initialized
- Verify no circular dependencies in imports

### Some metrics show 0 values
- Metrics are only populated when events occur
- Application entity metrics update every 30 seconds
- Wait 30 seconds after startup for initial values

### High memory usage from metrics
- This is usually due to high cardinality labels
- Routes are automatically normalized to prevent this
- If issues persist, check for custom labels or tags

## Integration with Monitoring Tools

### Prometheus
Add this to your `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'notehub'
    scrape_interval: 30s
    static_configs:
      - targets: ['notehub:5000']
```

### Grafana
1. Add Prometheus as a data source
2. Import the NoteHub dashboard
3. Configure alerts based on your SLOs

### Other Tools
The metrics endpoint follows Prometheus format and is compatible with:
- Datadog
- New Relic
- CloudWatch (with Prometheus exporter)
- Elastic APM
