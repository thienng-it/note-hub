# Loki Query Examples for NoteHub

This guide provides useful Loki query examples for troubleshooting and analyzing NoteHub logs.

## Overview

NoteHub uses Loki for log aggregation and Promtail for log collection. Logs are collected from:
- Docker containers (stdout/stderr)
- System logs (/var/log)
- Application-specific log files

## Basic Queries

### View All Backend Logs

```logql
{container="notehub-backend"}
```

### View Logs from Specific Service

```logql
{compose_service="notehub-backend"}
```

### Filter by Log Level

```logql
{container="notehub-backend"} |~ "ERROR|WARN"
```

```logql
{container="notehub-backend"} |= "error" != "test"
```

## Authentication and Security Queries

### Failed Login Attempts

```logql
{container="notehub-backend"} |= "Auth Event" |= "status" |= "failure"
```

### Failed Login Attempts with JSON Parsing

```logql
{container="notehub-backend"} 
  | json 
  | level="warn" 
  | event="login" 
  | status="failure"
```

### 2FA Operations

```logql
{container="notehub-backend"} |= "2FA" or |= "two-factor"
```

### Security Events

```logql
{container="notehub-backend"} |= "Security Event"
```

### Authentication Events by User

```logql
{container="notehub-backend"} 
  | json 
  | userId="123"
  | event=~"login|logout|register"
```

## API Request Queries

### All API Errors (4xx and 5xx)

```logql
{container="notehub-backend"} 
  | json 
  | statusCode >= 400
```

### Server Errors (5xx)

```logql
{container="notehub-backend"} 
  | json 
  | statusCode >= 500
  | level="error"
```

### Slow Requests (> 1 second)

```logql
{container="notehub-backend"} 
  | json 
  | durationMs > 1000
```

### Requests to Specific Endpoint

```logql
{container="notehub-backend"} 
  | json 
  | path="/api/notes"
```

### HTTP Methods Distribution

```logql
sum by(method) (count_over_time({container="notehub-backend"} | json | method != "" [5m]))
```

## Business Operations Queries

### Note Operations

```logql
{container="notehub-backend"} |= "Business Operation" |= "entity" |= "note"
```

### Note Creation Events

```logql
{container="notehub-backend"} 
  | json 
  | operation="create" 
  | entity="note"
```

### Failed Operations

```logql
{container="notehub-backend"} 
  | json 
  | operation!="" 
  | success="false"
```

## Database Queries

### All Database Operations

```logql
{container="notehub-backend"} |= "DB Operation"
```

### Slow Database Queries (> 500ms)

```logql
{container="notehub-backend"} 
  | json 
  | durationMs > 500 
  | operation!=""
```

### Database Errors

```logql
{container="notehub-backend"} 
  | json 
  | level="error" 
  | operation!="" 
  | table!=""
```

## Performance Queries

### Request Duration Percentiles

```logql
quantile_over_time(0.95, {container="notehub-backend"} | json | durationMs > 0 | unwrap durationMs [5m])
```

### Average Response Time per Path

```logql
avg by(path) (
  rate({container="notehub-backend"} | json | durationMs > 0 | unwrap durationMs [5m])
)
```

### Request Rate Over Time

```logql
rate({container="notehub-backend"} | json | path!="" [5m])
```

## Cache Operations

### Cache Hit/Miss Analysis

```logql
{container="notehub-backend"} 
  | json 
  | operation="get" 
  | hit=~"true|false"
```

### Cache Performance

```logql
{container="notehub-backend"} |= "Cache Operation"
```

## Error Analysis

### Top 10 Error Messages

```logql
topk(10, 
  sum by(error) (
    count_over_time({container="notehub-backend"} | json | error!="" [1h])
  )
)
```

### Errors by Route

```logql
sum by(path) (
  count_over_time({container="notehub-backend"} | json | level="error" | path!="" [1h])
)
```

### Error Rate Over Time

```logql
sum(rate({container="notehub-backend"} | json | level="error" [5m]))
```

## User Activity Queries

### Active Users in Time Window

```logql
count(
  count by(userId) (
    {container="notehub-backend"} | json | userId!="" | userId!="null" [1h]
  )
)
```

### User Actions Timeline

```logql
{container="notehub-backend"} 
  | json 
  | userId="123" 
  | line_format "{{.timestamp}} {{.method}} {{.path}} - {{.statusCode}}"
```

### Most Active Users

```logql
topk(10, 
  sum by(userId) (
    count_over_time({container="notehub-backend"} | json | userId!="" | userId!="null" [24h])
  )
)
```

## System and Container Queries

### Container Restart Events

```logql
{job="varlogs"} |= "docker" |= "restart"
```

### Out of Memory Errors

```logql
{container="notehub-backend"} |~ "out of memory|OOM|heap"
```

### Application Startup/Shutdown

```logql
{container="notehub-backend"} |~ "Starting|Stopping|Shutting down"
```

## Aggregation Examples

### Request Count by Status Code

```logql
sum by(statusCode) (
  count_over_time({container="notehub-backend"} | json | statusCode > 0 [1h])
)
```

### Error Rate Percentage

```logql
100 * (
  sum(rate({container="notehub-backend"} | json | statusCode >= 400 [5m])) /
  sum(rate({container="notehub-backend"} | json | statusCode > 0 [5m]))
)
```

### Average Request Duration by Path

```logql
avg by(path) (
  avg_over_time({container="notehub-backend"} | json | durationMs > 0 | unwrap durationMs [5m])
)
```

## Troubleshooting Scenarios

### Investigate Recent Outage

```logql
{container="notehub-backend"} 
  | json 
  | level=~"error|warn"
  | line_format "{{.timestamp}} [{{.level}}] {{.path}} - {{.error}}"
```

### Find Cause of Slow Performance

```logql
{container="notehub-backend"} 
  | json 
  | durationMs > 2000 
  | line_format "{{.path}} took {{.durationMs}}ms - {{.method}}"
```

### Security Audit - Failed Auth Attempts

```logql
{container="notehub-backend"} 
  | json 
  | event=~"login|register" 
  | status="failure" 
  | line_format "{{.timestamp}} Failed {{.event}} from {{.ip}} - Reason: {{.reason}}"
```

### Database Connection Issues

```logql
{container="notehub-backend"} 
  |~ "database|connection|pool" 
  |~ "error|timeout|refused"
```

## Tips for Effective Querying

### 1. Use JSON Parsing for Structured Logs

Our logs are in JSON format in production. Always use `| json` after the label matcher:

```logql
{container="notehub-backend"} | json | level="error"
```

### 2. Filter Early for Better Performance

Apply filters as early as possible in the query:

```logql
# Good - filters early
{container="notehub-backend"} |= "error" | json | level="error"

# Bad - filters after parsing everything
{container="notehub-backend"} | json | level="error"
```

### 3. Use Label Matchers Efficiently

Label matchers are indexed and fast:

```logql
{container="notehub-backend", compose_service="notehub-backend"}
```

### 4. Limit Time Range for Heavy Queries

For complex aggregations, limit the time range:

```logql
{container="notehub-backend"} | json [1h]
```

### 5. Use Line Format for Readable Output

Format logs for better readability:

```logql
{container="notehub-backend"} 
  | json 
  | line_format "{{.timestamp}} {{.level}} {{.message}}"
```

## Common Patterns

### Pattern: Find Requests from Specific IP

```logql
{container="notehub-backend"} | json | ip="192.168.1.100"
```

### Pattern: Track User Journey

```logql
{container="notehub-backend"} 
  | json 
  | userId="123" 
  | line_format "{{.timestamp}} {{.path}}"
```

### Pattern: Monitor Rate of Specific Operation

```logql
rate({container="notehub-backend"} | json | operation="create" [5m])
```

### Pattern: Find Correlated Errors

```logql
{container="notehub-backend"} 
  | json 
  | requestId="abc-123-def"
```

## Alerting Queries

These queries can be used to create alerts in Grafana:

### High Error Rate

```logql
sum(rate({container="notehub-backend"} | json | level="error" [5m])) > 10
```

### Slow Response Time

```logql
avg(avg_over_time({container="notehub-backend"} | json | durationMs > 0 | unwrap durationMs [5m])) > 1000
```

### Failed Login Attempts Spike

```logql
sum(rate({container="notehub-backend"} | json | event="login" | status="failure" [5m])) > 5
```

## References

- [Loki Query Language (LogQL)](https://grafana.com/docs/loki/latest/logql/)
- [LogQL Metric Queries](https://grafana.com/docs/loki/latest/logql/metric_queries/)
- [Log Query Examples](https://grafana.com/docs/loki/latest/logql/log_queries/)
