# Monitoring Best Practices for NoteHub

This guide outlines best practices for monitoring, observability, and using the Prometheus + Grafana + Loki stack effectively.

## Table of Contents

- [Overview](#overview)
- [Key Metrics to Monitor](#key-metrics-to-monitor)
- [Dashboard Organization](#dashboard-organization)
- [Alerting Strategy](#alerting-strategy)
- [Log Analysis](#log-analysis)
- [Performance Monitoring](#performance-monitoring)
- [Security Monitoring](#security-monitoring)
- [Troubleshooting Workflow](#troubleshooting-workflow)

## Overview

NoteHub uses a comprehensive monitoring stack:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation and analysis
- **Promtail**: Log collection agent

## Key Metrics to Monitor

### 1. Golden Signals (SRE Best Practices)

#### Latency
- **What**: Time to service requests
- **Metrics**:
  - `http_request_duration_seconds` - p50, p95, p99
  - `db_query_duration_seconds` - p95, p99
- **Thresholds**:
  - p95 < 500ms (good)
  - p95 < 1s (acceptable)
  - p95 > 2s (investigate)

#### Traffic
- **What**: Demand on your system
- **Metrics**:
  - `http_requests_total` - requests per second
  - `http_active_connections` - concurrent requests
- **Monitor**: Sudden spikes or drops

#### Errors
- **What**: Rate of failed requests
- **Metrics**:
  - `notehub_api_errors_total` - by route and type
  - `http_requests_total{status_code>=400}` - error rate
- **Thresholds**:
  - Error rate < 1% (good)
  - Error rate < 5% (acceptable)
  - Error rate > 10% (critical)

#### Saturation
- **What**: How "full" your service is
- **Metrics**:
  - `process_resident_memory_bytes` - memory usage
  - `process_cpu_seconds_total` - CPU usage
  - `db_connection_pool_size` - connection pool utilization
- **Thresholds**:
  - Memory < 80% (good)
  - Memory > 90% (investigate)
  - CPU < 70% (good)
  - CPU > 85% (investigate)

### 2. Application-Specific Metrics

#### Authentication & Security
- `notehub_auth_attempts_total` - login success/failure
- `notehub_auth_active_sessions` - concurrent users
- `notehub_2fa_operations_total` - 2FA usage
- Monitor for:
  - Unusual spike in failed logins
  - Brute force attempts
  - Credential stuffing patterns

#### Business Metrics
- `notehub_notes_total` - total notes in system
- `notehub_users_total` - total users
- `notehub_note_operations_total` - CRUD operations
- Monitor for:
  - Growth trends
  - Anomalies in usage patterns
  - Feature adoption rates

#### Database Performance
- `db_queries_total` - query rate
- `db_query_duration_seconds` - query performance
- `db_connection_pool_size` - connection health
- Monitor for:
  - Slow queries
  - Connection pool exhaustion
  - Query errors

#### Cache Performance
- `cache_operations_total` - cache hits/misses
- Calculate hit rate: `hit / (hit + miss) * 100`
- Monitor for:
  - Decreasing hit rate
  - Cache invalidation issues

## Dashboard Organization

### Dashboard Structure

We provide four main dashboards:

1. **NoteHub Overview** (`notehub-overview.json`)
   - High-level system health
   - Key business metrics
   - Resource utilization
   - Use for: Daily monitoring, status checks

2. **Authentication & Security** (`notehub-auth-security.json`)
   - Login attempts and failures
   - 2FA operations
   - Error rates by endpoint
   - Use for: Security audits, incident investigation

3. **Database Performance** (`notehub-database.json`)
   - Query performance and rate
   - Connection pool status
   - Cache performance
   - Use for: Performance tuning, capacity planning

4. **Business Metrics** (`notehub-business.json`)
   - User activity
   - Note operations
   - Feature usage
   - Use for: Product analytics, growth tracking

### Dashboard Best Practices

#### Layout
- Place most critical metrics at the top
- Use stat panels for key numbers
- Use time series for trends
- Use pie charts for distributions

#### Refresh Rate
- Development: 10s - 30s
- Production: 30s - 1m
- Historical analysis: No auto-refresh

#### Time Windows
- Real-time monitoring: Last 15m - 1h
- Troubleshooting: Last 3h - 6h
- Analysis: Last 24h - 7d

## Alerting Strategy

### Alert Levels

#### Critical (P1)
- System down or severely degraded
- Data loss risk
- Security breach
- Examples:
  - Error rate > 25%
  - All database connections used
  - Memory usage > 95%

#### High (P2)
- Service degraded but operational
- User impact present
- Examples:
  - Error rate > 10%
  - p95 latency > 2s
  - Failed logins > 100/min

#### Medium (P3)
- Potential issues developing
- No immediate user impact
- Examples:
  - Error rate > 5%
  - Slow queries increasing
  - Cache hit rate < 70%

#### Low (P4)
- Information only
- Anomalies detected
- Examples:
  - Unusual traffic patterns
  - Deprecated API usage

### Alert Configuration

```yaml
# Example Prometheus alerting rules
groups:
  - name: notehub-alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(notehub_api_errors_total[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Slow response time
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])
          ) > 2
        for: 10m
        labels:
          severity: high
        annotations:
          summary: "Slow response time detected"
          description: "p95 latency is {{ $value }}s"

      # Failed login spike
      - alert: FailedLoginSpike
        expr: |
          rate(notehub_auth_attempts_total{status="failure"}[5m]) > 5
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Unusual failed login attempts"
          description: "{{ $value }} failed logins per second"
```

### Alert Fatigue Prevention

1. **Set appropriate thresholds**: Based on normal behavior patterns
2. **Use 'for' duration**: Avoid alerts on transient spikes
3. **Group related alerts**: Prevent duplicate notifications
4. **Provide context**: Include useful information in alerts
5. **Regular review**: Adjust thresholds based on experience

## Log Analysis

### Structured Logging

NoteHub uses structured logging (JSON in production):

```json
{
  "timestamp": "2024-12-10T14:57:29.184Z",
  "level": "info",
  "message": "API Request",
  "method": "GET",
  "path": "/api/notes",
  "statusCode": 200,
  "duration": "45ms",
  "durationMs": 45,
  "userId": 123,
  "requestId": "abc-123-def",
  "ip": "192.168.1.100"
}
```

### Log Levels Usage

- **ERROR**: System errors, exceptions, failures
  - Use for: Incidents requiring immediate attention
  - Examples: Database connection failed, uncaught exception

- **WARN**: Potentially problematic situations
  - Use for: Issues that might cause problems
  - Examples: Slow queries, deprecated API usage, validation errors

- **INFO**: Normal operations, significant events
  - Use for: Business events, auth events, API requests
  - Examples: User login, note created, configuration loaded

- **DEBUG**: Detailed information for debugging
  - Use for: Development and troubleshooting
  - Examples: Database queries, cache operations, internal state

### Log Retention

- **Development**: 7 days
- **Production**: 30 days (configurable)
- **Compliance**: May require longer retention

### Log Analysis Workflow

1. **Start with time range**: Narrow down to incident window
2. **Filter by severity**: Focus on errors and warnings
3. **Identify patterns**: Look for repeated errors
4. **Correlate with metrics**: Match logs with metric spikes
5. **Track request flow**: Use `requestId` to follow requests
6. **Identify root cause**: Trace back to originating event

## Performance Monitoring

### Baseline Establishment

1. **Record normal behavior**: Monitor for 1-2 weeks
2. **Document patterns**: Daily/weekly cycles
3. **Set thresholds**: Based on percentiles (p95, p99)
4. **Review regularly**: Update as system evolves

### Performance Targets

```
API Response Times (p95):
- GET requests: < 200ms
- POST/PUT requests: < 500ms
- Complex queries: < 1s
- Search operations: < 2s

Database Queries (p95):
- Simple queries: < 50ms
- Complex queries: < 200ms
- Analytics queries: < 1s

Cache:
- Hit rate: > 80%
- Lookup time: < 10ms

Resource Utilization:
- CPU: < 70% average
- Memory: < 80% average
- Disk I/O: < 80% capacity
```

### Performance Optimization Workflow

1. **Identify bottleneck**: Use metrics and profiling
2. **Measure baseline**: Document current performance
3. **Make incremental changes**: One at a time
4. **Measure impact**: Compare before/after
5. **Document results**: Keep optimization log

## Security Monitoring

### Security Metrics to Track

1. **Authentication Events**
   - Failed login attempts
   - Account lockouts
   - Password resets
   - 2FA operations

2. **Access Patterns**
   - Unusual IP addresses
   - Geographic anomalies
   - Time-of-day patterns
   - Access to sensitive endpoints

3. **Error Patterns**
   - 401 Unauthorized spikes
   - 403 Forbidden attempts
   - SQL injection attempts
   - XSS attempts

### Security Alerts

```yaml
# Example security-focused alerts
- alert: BruteForceAttempt
  expr: |
    rate(notehub_auth_attempts_total{status="failure"}[1m]) > 10
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Potential brute force attack"

- alert: UnusualErrorRate401
  expr: |
    rate(http_requests_total{status_code="401"}[5m]) > 5
  for: 5m
  labels:
    severity: high
  annotations:
    summary: "High rate of unauthorized access attempts"
```

### Security Audit Log Queries

See [LOKI_QUERY_EXAMPLES.md](./LOKI_QUERY_EXAMPLES.md) for detailed Loki queries for security auditing.

## Troubleshooting Workflow

### Incident Response Process

1. **Detect**: Alert fires or user report
2. **Assess**: Check dashboard for scope/severity
3. **Investigate**: Review logs and metrics
4. **Mitigate**: Apply immediate fix if possible
5. **Resolve**: Implement permanent solution
6. **Document**: Record findings and actions
7. **Review**: Post-mortem and lessons learned

### Troubleshooting Checklist

#### Step 1: Verify the Issue
- [ ] Check relevant dashboard
- [ ] Confirm metrics show anomaly
- [ ] Check if issue is ongoing
- [ ] Determine user impact

#### Step 2: Gather Context
- [ ] What changed recently?
- [ ] When did it start?
- [ ] Is it affecting all users or specific subset?
- [ ] Are other services affected?

#### Step 3: Check Common Culprits
- [ ] Recent deployments
- [ ] Configuration changes
- [ ] Resource exhaustion (CPU, memory, disk)
- [ ] External dependencies (database, cache, APIs)
- [ ] Network issues

#### Step 4: Review Logs
- [ ] Error logs from incident window
- [ ] Look for error patterns
- [ ] Trace request flow with requestId
- [ ] Check for exceptions/stack traces

#### Step 5: Correlate Metrics
- [ ] Match log events with metric spikes
- [ ] Check related metrics
- [ ] Look for cascading failures

### Common Issues and Solutions

#### High Response Time
1. Check database query performance
2. Review cache hit rate
3. Check for memory pressure
4. Look for expensive operations in logs
5. Review recent code changes

#### High Error Rate
1. Check error types (4xx vs 5xx)
2. Identify affected endpoints
3. Review recent deployments
4. Check external dependencies
5. Look for exceptions in logs

#### Database Connection Issues
1. Check connection pool metrics
2. Review slow queries
3. Check database server health
4. Look for connection leaks
5. Review connection timeout settings

#### Authentication Failures
1. Check for brute force patterns
2. Review error reasons
3. Check token expiration issues
4. Verify OAuth provider status
5. Check 2FA service availability

## Best Practices Summary

### Do's ✅

1. **Monitor continuously**: Set up dashboards and alerts
2. **Use structured logging**: JSON format with context
3. **Correlate metrics and logs**: Use requestId for tracing
4. **Set appropriate thresholds**: Based on baseline behavior
5. **Document incidents**: Keep runbooks and post-mortems
6. **Review regularly**: Update thresholds and alerts
7. **Plan capacity**: Monitor trends for scaling decisions
8. **Test alerts**: Verify alerting works before incidents

### Don'ts ❌

1. **Don't ignore warnings**: They often precede failures
2. **Don't over-alert**: Causes alert fatigue
3. **Don't log sensitive data**: PII, passwords, tokens
4. **Don't guess**: Use data to make decisions
5. **Don't optimize prematurely**: Measure first
6. **Don't forget retention**: Plan for log/metric storage
7. **Don't neglect security**: Monitor auth and access patterns
8. **Don't skip baselines**: Know what "normal" looks like

## Resources

- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Google SRE Book - Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Grafana Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
- [Loki Best Practices](https://grafana.com/docs/loki/latest/best-practices/)

## Related Documentation

- [Loki Query Examples](./LOKI_QUERY_EXAMPLES.md)
- [Monitoring Quick Start](../MONITORING_QUICKSTART.md)
- [Monitoring Setup Guide](../MONITORING_SETUP.md)
