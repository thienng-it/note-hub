# Prometheus Alert Rules

This directory contains Prometheus alerting rules for NoteHub monitoring.

## Available Alert Files

### notehub-alerts.yml

Comprehensive alerting rules covering:

- **Application Health**: Error rates, traffic monitoring
- **Performance**: Response times, database query performance
- **Resource Utilization**: Memory, CPU, connection pools
- **Security**: Failed logins, brute force detection, unauthorized access
- **Database**: Query errors, cache performance
- **Business Metrics**: Note operations, user activity
- **Availability**: Service health, server errors

## Enabling Alerts

### Step 1: Update Prometheus Configuration

Edit `docker/prometheus/prometheus.yml` and uncomment the `rule_files` section:

```yaml
# Load rules once and periodically evaluate them
rule_files:
  - "alerts/*.yml"
```

### Step 2: Mount Alert Files in Docker Compose

Ensure the alerts directory is mounted in `docker-compose.monitoring.yml`:

```yaml
prometheus:
  volumes:
    - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    - ./docker/prometheus/alerts:/etc/prometheus/alerts:ro
    - prometheus-data:/prometheus
```

### Step 3: Restart Prometheus

```bash
docker compose -f docker-compose.monitoring.yml restart prometheus
```

### Step 4: Verify Rules are Loaded

1. Open Prometheus UI: http://localhost:9090
2. Go to Status → Rules
3. Verify that alert rules are listed

## Configuring Alertmanager (Optional)

To receive notifications when alerts fire, configure Alertmanager:

### Step 1: Create Alertmanager Configuration

Create `docker/prometheus/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://localhost:5001/webhook'
    # Or use email:
    # email_configs:
    #   - to: 'alerts@example.com'
    #     from: 'prometheus@example.com'
    #     smarthost: 'smtp.gmail.com:587'
    #     auth_username: 'your-email@gmail.com'
    #     auth_password: 'your-app-password'
```

### Step 2: Add Alertmanager to Docker Compose

Add to `docker-compose.monitoring.yml`:

```yaml
alertmanager:
  image: prom/alertmanager:latest
  container_name: notehub-alertmanager
  restart: unless-stopped
  volumes:
    - ./docker/prometheus/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
  ports:
    - "9093:9093"
  networks:
    - monitoring-network
```

### Step 3: Update Prometheus Configuration

In `docker/prometheus/prometheus.yml`, uncomment and configure:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Step 4: Start Alertmanager

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

## Alert Severity Levels

### Critical
- Immediate action required
- Service down or data loss risk
- Examples: Backend down, very high error rate
- **Response Time**: Immediate (< 5 minutes)

### High
- Service degraded with user impact
- Examples: High error rate, slow response times
- **Response Time**: Within 1 hour

### Warning
- Potential issues developing
- No immediate user impact
- Examples: Slow queries, low cache hit rate
- **Response Time**: Within business hours

### Info
- Informational alerts
- Anomalies detected
- Examples: Unusual traffic patterns
- **Response Time**: Review during regular maintenance

## Customizing Alerts

### Adjusting Thresholds

Edit alert expressions in `notehub-alerts.yml`. For example, to change the high error rate threshold:

```yaml
- alert: HighErrorRate
  expr: |
    (
      sum(rate(notehub_api_errors_total[5m]))
      /
      sum(rate(http_requests_total[5m]))
    ) > 0.10  # Change this threshold
  for: 5m     # Adjust evaluation duration
```

### Testing Alerts

1. **Lower thresholds temporarily**:
   ```yaml
   expr: ... > 0.01  # Very low threshold for testing
   for: 1m           # Short duration
   ```

2. **Generate test load**:
   ```bash
   # Generate errors
   for i in {1..100}; do
     curl http://localhost:5000/api/nonexistent
   done
   ```

3. **Check alert status** in Prometheus UI (Status → Rules)

4. **Restore original thresholds** after testing

### Adding New Alerts

1. Add new alert rule to appropriate group in `notehub-alerts.yml`
2. Follow the existing format
3. Include clear summary and description
4. Add runbook instructions
5. Test the alert
6. Document any new metrics used

## Common Alert Scenarios

### Investigating High Error Rate

1. Check Grafana dashboards for error distribution
2. Query Loki logs:
   ```logql
   {container="notehub-backend"} | json | level="error"
   ```
3. Review recent deployments
4. Check external dependencies (database, cache)

### Investigating Performance Issues

1. Check Database Performance dashboard
2. Look for slow queries in logs
3. Review cache hit rate
4. Check resource utilization (CPU, memory)

### Investigating Security Alerts

1. Check Authentication & Security dashboard
2. Review failed login patterns
3. Check source IP addresses in logs:
   ```logql
   {container="notehub-backend"} | json | event="login" | status="failure"
   ```
4. Verify rate limiting is working

## Alert Notification Channels

Alertmanager supports multiple notification channels:

- **Email**: SMTP configuration
- **Slack**: Webhook integration
- **PagerDuty**: API integration
- **Webhook**: Custom HTTP endpoints
- **Discord**: Webhook integration

See [Alertmanager documentation](https://prometheus.io/docs/alerting/latest/configuration/) for configuration details.

## Best Practices

1. **Start conservative**: Begin with higher thresholds, adjust based on experience
2. **Avoid alert fatigue**: Too many alerts = ignored alerts
3. **Group related alerts**: Prevent notification spam
4. **Include runbooks**: Make alerts actionable
5. **Test regularly**: Ensure alerts fire as expected
6. **Review and tune**: Adjust based on false positives/negatives
7. **Document changes**: Track why thresholds were adjusted

## Troubleshooting

### Alerts Not Firing

1. Check rules are loaded: Prometheus UI → Status → Rules
2. Verify expressions return data: Prometheus UI → Graph
3. Check evaluation interval: Default is 30s-60s
4. Review alert state: inactive → pending → firing

### Too Many Alerts

1. Increase thresholds or 'for' duration
2. Review and disable noisy alerts
3. Use alert grouping in Alertmanager
4. Adjust repeat_interval

### Missing Metrics

1. Verify backend is exposing metrics: http://localhost:5000/metrics
2. Check Prometheus is scraping: Prometheus UI → Status → Targets
3. Review metric names match alert expressions
4. Check time range in alert expressions

## Resources

- [Prometheus Alerting Documentation](https://prometheus.io/docs/alerting/latest/overview/)
- [Alerting Best Practices](https://prometheus.io/docs/practices/alerting/)
- [PromQL Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
- [Alertmanager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
