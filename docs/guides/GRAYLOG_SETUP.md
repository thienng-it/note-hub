# Graylog Setup and Integration Guide

## Overview

This guide explains how to set up Graylog log aggregation system alongside NoteHub and Drone CI on the same VPS server. Graylog provides centralized log management, powerful search capabilities, and real-time monitoring.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        VPS Server                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   NoteHub    │  │   Drone CI   │  │   Graylog    │    │
│  │  Port 80/443 │  │ Port 8080/8443│  │  Port 9000   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │             │
│         │    GELF Logs     │    GELF Logs    │             │
│         └──────────────────┴─────────────────►             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                Graylog Components                    │ │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────────────┐  │ │
│  │  │ Graylog │  │ MongoDB  │  │   OpenSearch     │  │ │
│  │  │ Server  │  │ Metadata │  │   Log Storage    │  │ │
│  │  └─────────┘  └──────────┘  └──────────────────┘  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Port Allocation

All three applications can run on the same VPS without port conflicts:

- **NoteHub**: Ports 80/443 (HTTP/HTTPS)
- **Drone CI**: Ports 8080/8443 (HTTP/HTTPS)
- **Graylog**: 
  - Port 9000 (Web UI)
  - Port 12201 (GELF UDP/TCP for log input)
  - Internal: MongoDB (27017), OpenSearch (9200)

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available for Graylog stack
- (Recommended) 8GB+ total RAM for running all three applications

## Quick Start

### 1. Configuration

Copy the example environment file and configure it:

```bash
cp .env.graylog.example .env.graylog
```

Edit `.env.graylog` and configure the following required variables:

#### Generate Password Secret (96 characters)

```bash
# Option 1: Using pwgen (if installed)
pwgen -N 1 -s 96

# Option 2: Using openssl
openssl rand -base64 96 | tr -d '\n'
```

Copy the output and set it as `GRAYLOG_PASSWORD_SECRET` in `.env.graylog`.

#### Generate Root Password Hash

Choose a strong admin password and generate its SHA2 hash:

```bash
# Replace "your-admin-password" with your actual password
echo -n "your-admin-password" | shasum -a 256
```

Copy the hash (first part of the output) and set it as `GRAYLOG_ROOT_PASSWORD_SHA2`.

#### Set MongoDB and OpenSearch Passwords

Update these variables with strong passwords:
- `GRAYLOG_MONGODB_PASSWORD`
- `GRAYLOG_OPENSEARCH_PASSWORD`

#### Configure External URI

Set the external URI for accessing Graylog:

```bash
# For localhost testing
GRAYLOG_HTTP_EXTERNAL_URI=http://localhost:9000/

# For production with IP
GRAYLOG_HTTP_EXTERNAL_URI=http://your-server-ip:9000/

# For production with domain
GRAYLOG_HTTP_EXTERNAL_URI=http://logs.yourdomain.com:9000/
```

### 2. Deploy Graylog

Start the Graylog stack:

```bash
docker compose --env-file .env.graylog -f docker-compose.graylog.yml up -d
```

Check the status:

```bash
docker compose --env-file .env.graylog -f docker-compose.graylog.yml ps
```

View logs:

```bash
docker compose --env-file .env.graylog -f docker-compose.graylog.yml logs -f
```

### 3. Access Graylog UI

1. Open your browser and navigate to: `http://your-server:9000`
2. Log in with:
   - Username: `admin` (or the value you set in `GRAYLOG_ROOT_USERNAME`)
   - Password: The password you used to generate the SHA2 hash

### 4. Configure GELF Input

To receive logs from NoteHub and other applications:

1. In Graylog UI, go to **System → Inputs**
2. Select **GELF UDP** or **GELF TCP** from the dropdown
3. Click **Launch new input**
4. Configure the input:
   - **Title**: `NoteHub Logs` (or any descriptive name)
   - **Bind address**: `0.0.0.0`
   - **Port**: `12201`
   - Leave other settings as default
5. Click **Save**

The input should now show as "RUNNING" with a green indicator.

## Integrating NoteHub with Graylog

### Backend Integration

NoteHub backend is already configured to support Graylog integration. To enable it:

1. Edit your NoteHub `.env` file:

```bash
# Enable Graylog integration
GRAYLOG_ENABLED=true
GRAYLOG_HOST=localhost
GRAYLOG_PORT=12201
GRAYLOG_PROTOCOL=udp
GRAYLOG_FACILITY=notehub-backend
```

2. Restart NoteHub backend:

```bash
docker compose restart backend
```

3. Verify logs are being sent:
   - Go to Graylog UI → **Search**
   - You should see logs from NoteHub appearing
   - Use filters like `application:notehub-backend` to search

### Log Format

NoteHub sends structured logs to Graylog with the following fields:

- **timestamp**: When the log was created
- **level**: Log level (info, warn, error, debug)
- **message**: Log message
- **application**: `notehub-backend`
- **environment**: `development` or `production`
- **version**: Application version
- **method**: HTTP method (for API requests)
- **path**: Request path
- **statusCode**: HTTP status code
- **duration**: Request duration
- **userId**: User ID (when authenticated)

### Example Graylog Searches

```
# All NoteHub logs
application:notehub-backend

# All errors
application:notehub-backend AND level:error

# All API requests
application:notehub-backend AND method:*

# Slow requests (over 1 second)
application:notehub-backend AND duration:>1000

# Failed API requests
application:notehub-backend AND statusCode:>=400

# Authentication events
application:notehub-backend AND message:*Auth*
```

## Integrating Drone CI with Graylog

Drone CI logs can also be sent to Graylog using Docker logging drivers or by configuring the Drone server to use a GELF logging driver.

### Option 1: Docker GELF Logging Driver

Update your `docker-compose.drone.yml` to add GELF logging:

```yaml
services:
  drone-server:
    # ... existing configuration ...
    logging:
      driver: gelf
      options:
        gelf-address: "udp://localhost:12201"
        tag: "drone-server"
```

### Option 2: View Docker Container Logs in Graylog

You can configure Docker daemon to send all container logs to Graylog by editing `/etc/docker/daemon.json`:

```json
{
  "log-driver": "gelf",
  "log-opts": {
    "gelf-address": "udp://localhost:12201",
    "tag": "{{.Name}}"
  }
}
```

Restart Docker daemon:
```bash
sudo systemctl restart docker
```

## Management Operations

### Start Graylog

```bash
docker compose --env-file .env.graylog -f docker-compose.graylog.yml up -d
```

### Stop Graylog

```bash
docker compose --env-file .env.graylog -f docker-compose.graylog.yml down
```

### Restart Graylog

```bash
docker compose --env-file .env.graylog -f docker-compose.graylog.yml restart
```

### View Logs

```bash
# All services
docker compose --env-file .env.graylog -f docker-compose.graylog.yml logs -f

# Specific service
docker compose --env-file .env.graylog -f docker-compose.graylog.yml logs -f graylog
```

### Remove Graylog (with data cleanup)

```bash
docker compose --env-file .env.graylog -f docker-compose.graylog.yml down -v
```

⚠️ **Warning**: The `-v` flag removes all volumes including stored logs!

### Backup Graylog Data

```bash
# Create backup directory
mkdir -p graylog-backup

# Backup MongoDB (metadata)
docker compose --env-file .env.graylog -f docker-compose.graylog.yml exec graylog-mongodb \
  mongodump --out=/tmp/backup --authenticationDatabase=admin \
  --username=graylog --password=${GRAYLOG_MONGODB_PASSWORD}

docker cp graylog-mongodb:/tmp/backup ./graylog-backup/mongodb

# Backup Graylog configuration
docker compose --env-file .env.graylog -f docker-compose.graylog.yml exec graylog \
  tar czf /tmp/graylog-data.tar.gz /usr/share/graylog/data

docker cp graylog:/tmp/graylog-data.tar.gz ./graylog-backup/
```

## Resource Management

### Recommended Resources

Minimum for Graylog stack:
- **RAM**: 4GB
- **CPU**: 2 cores
- **Disk**: 20GB (more for log storage)

Recommended for full stack (NoteHub + Drone + Graylog):
- **RAM**: 8GB
- **CPU**: 4 cores
- **Disk**: 50GB+

### Optimize Performance

1. **Limit log retention**: Configure index rotation in Graylog
   - System → Indices → Configure rotation strategy
   - Recommend: 30 days retention for general logs

2. **Adjust processing threads**: In `.env.graylog`
   ```bash
   GRAYLOG_PROCESSBUFFER_PROCESSORS=5
   GRAYLOG_OUTPUTBUFFER_PROCESSORS=3
   ```

3. **Monitor OpenSearch disk usage**:
   ```bash
   docker compose --env-file .env.graylog -f docker-compose.graylog.yml exec graylog-opensearch \
     curl -X GET "localhost:9200/_cat/indices?v"
   ```

## Troubleshooting

### Graylog Won't Start

**Check logs**:
```bash
docker compose --env-file .env.graylog -f docker-compose.graylog.yml logs graylog
```

**Common issues**:
1. **Password secret too short**: Must be at least 96 characters
2. **Invalid root password hash**: Regenerate SHA2 hash correctly
3. **MongoDB connection failed**: Check MongoDB is healthy
4. **OpenSearch not ready**: Wait 1-2 minutes for OpenSearch to start

### Cannot Connect to Graylog UI

1. **Check service is running**:
   ```bash
   docker compose --env-file .env.graylog -f docker-compose.graylog.yml ps
   ```

2. **Check health status**:
   ```bash
   docker compose --env-file .env.graylog -f docker-compose.graylog.yml exec graylog \
     curl -f http://localhost:9000/api/system/lbstatus
   ```

3. **Verify external URI**: Must match how you access Graylog
   ```bash
   # Check configured URI
   docker compose --env-file .env.graylog -f docker-compose.graylog.yml exec graylog \
     env | grep GRAYLOG_HTTP_EXTERNAL_URI
   ```

### Logs Not Appearing

1. **Verify input is running**: System → Inputs (should show green "RUNNING")

2. **Check NoteHub backend logs**:
   ```bash
   docker compose logs backend | grep -i graylog
   ```

3. **Test GELF input manually**:
   ```bash
   # Install gelf-logger
   npm install -g gelf-logger

   # Send test message
   echo '{"short_message":"Test message","host":"test","level":1}' | \
     gelf-logger --host localhost --port 12201
   ```

4. **Check Graylog system logs**: System → Overview → System → Logs

### High Resource Usage

1. **Check OpenSearch heap size**: Default is 1GB
   ```bash
   # Edit docker-compose.graylog.yml
   # Increase: OPENSEARCH_JAVA_OPTS=-Xms2g -Xmx2g
   ```

2. **Enable index optimization**: System → Indices
   - Set up rotation (daily/weekly)
   - Configure retention (delete old indices)

3. **Monitor resource usage**:
   ```bash
   docker stats graylog graylog-opensearch graylog-mongodb
   ```

## Security Considerations

1. **Use strong passwords**: All passwords should be strong and unique
2. **Enable HTTPS**: Use reverse proxy (nginx/Traefik) for production
3. **Firewall rules**: Restrict access to Graylog ports
4. **Regular updates**: Keep Graylog stack updated
5. **Backup regularly**: Backup MongoDB and Graylog configuration
6. **Monitor access**: Review user access logs regularly

## Advanced Configuration

### Custom Inputs

Graylog supports many input types:
- **GELF** (Graylog Extended Log Format) - Recommended for structured logs
- **Syslog** - For traditional syslog messages
- **Raw/Plaintext** - For unstructured text logs
- **JSON** - For JSON formatted logs
- **AWS Logs** - For AWS CloudWatch logs

### Alerts and Notifications

1. Go to **Alerts → Event Definitions**
2. Click **Create Event Definition**
3. Configure conditions (e.g., error rate threshold)
4. Add notifications (email, Slack, PagerDuty)

### Dashboards

1. Go to **Dashboards**
2. Click **Create dashboard**
3. Add widgets:
   - **Search result count**: Show log volume
   - **Quick values**: Show top values for fields
   - **Field histogram**: Visualize numeric fields
   - **Statistics**: Show aggregations

### Extractors

Create extractors to parse unstructured logs:
1. Go to **System → Inputs**
2. Select your input
3. Click **Manage extractors**
4. Create extractors using regex or Grok patterns

## Integration Examples

### Example 1: Custom Application Logging

For any Node.js application using Winston:

```javascript
const winston = require('winston');
const WinstonGraylog2 = require('winston-graylog2');

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    new WinstonGraylog2({
      graylog: {
        servers: [{ host: 'localhost', port: 12201 }],
        facility: 'my-app',
      },
      staticMeta: { environment: 'production' },
    }),
  ],
});

logger.info('Application started');
```

### Example 2: Docker Container Logs

For individual containers:

```yaml
services:
  my-app:
    image: my-app:latest
    logging:
      driver: gelf
      options:
        gelf-address: "udp://localhost:12201"
        tag: "my-app"
```

## Additional Resources

- [Graylog Documentation](https://docs.graylog.org/)
- [GELF Specification](https://docs.graylog.org/docs/gelf)
- [Winston Graylog2 Transport](https://github.com/Buzut/winston-graylog2)
- [OpenSearch Documentation](https://opensearch.org/docs/)

## Support

For issues specific to:
- **Graylog configuration**: Check Graylog documentation
- **NoteHub integration**: Check this repository's issues
- **Resource constraints**: Review resource management section above

## Summary

Graylog provides powerful centralized logging capabilities for NoteHub and other applications running on your VPS. With proper configuration, it enables:

- **Centralized log management**: All logs in one place
- **Powerful search**: Full-text search with filters
- **Real-time monitoring**: Live log streams and dashboards
- **Alerting**: Get notified of critical events
- **Log retention**: Configurable storage and rotation

The setup is designed to coexist peacefully with NoteHub (port 80/443) and Drone CI (port 8080/8443) on the same VPS server.
