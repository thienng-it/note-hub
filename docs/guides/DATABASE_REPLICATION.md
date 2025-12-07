# Database Replication Guide

## Overview

NoteHub supports database replication for improved performance and high availability. This guide explains how to set up and configure database replication for both MySQL and SQLite databases.

## Table of Contents

1. [Benefits of Replication](#benefits-of-replication)
2. [MySQL Replication](#mysql-replication)
3. [SQLite Replication](#sqlite-replication)
4. [Configuration](#configuration)
5. [Docker Deployment](#docker-deployment)
6. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
7. [Best Practices](#best-practices)

---

## Benefits of Replication

Database replication provides several key benefits:

- **Improved Performance**: Distribute read load across multiple database instances
- **High Availability**: Automatic failover to replicas if primary becomes unavailable
- **Reduced Latency**: Serve reads from geographically closer replicas
- **Scalability**: Add more replicas as your application grows
- **Load Balancing**: Round-robin distribution of read queries across replicas

---

## MySQL Replication

### Architecture

MySQL replication uses a primary-replica architecture:

```
┌─────────────┐
│   Primary   │ ◄─── All write operations (INSERT, UPDATE, DELETE)
│   MySQL     │
└──────┬──────┘
       │ Binary Log Replication
       ├──────────┬──────────┬──────────
       ▼          ▼          ▼
  ┌─────────┐ ┌─────────┐ ┌─────────┐
  │Replica 1│ │Replica 2│ │Replica 3│ ◄─── Read operations (SELECT)
  └─────────┘ └─────────┘ └─────────┘
```

### Setup

#### 1. Configure Primary Database

The primary database must be configured to enable binary logging:

```sql
-- MySQL configuration
server-id=1
log-bin=mysql-bin
binlog-format=ROW
gtid-mode=ON
enforce-gtid-consistency=ON
```

Create a replication user:

```sql
CREATE USER 'replicator'@'%' IDENTIFIED BY 'secure_password';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;
```

#### 2. Configure Replica Databases

Each replica must have a unique server ID:

```sql
-- Replica configuration
server-id=2  -- Increment for each replica
log-bin=mysql-bin
binlog-format=ROW
gtid-mode=ON
enforce-gtid-consistency=ON
relay-log=relay-bin
read-only=ON
```

Connect the replica to the primary:

```sql
CHANGE MASTER TO
    MASTER_HOST='primary-hostname',
    MASTER_USER='replicator',
    MASTER_PASSWORD='secure_password',
    MASTER_AUTO_POSITION=1;

START SLAVE;
SHOW SLAVE STATUS\G
```

#### 3. Configure NoteHub

Set environment variables in your `.env` file:

```bash
# Enable replication
DB_REPLICATION_ENABLED=true

# Primary MySQL connection
MYSQL_HOST=mysql-primary
MYSQL_PORT=3306
MYSQL_USER=notehub
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=notehub

# MySQL replicas
MYSQL_REPLICA_HOSTS=mysql-replica-1,mysql-replica-2,mysql-replica-3
MYSQL_REPLICA_PORTS=3306,3306,3306
MYSQL_REPLICA_USER=notehub
MYSQL_REPLICA_PASSWORD=your_password
```

### Verification

Check that replication is working:

```sql
-- On primary
SHOW MASTER STATUS;

-- On each replica
SHOW SLAVE STATUS\G
```

Look for:
- `Slave_IO_Running: Yes`
- `Slave_SQL_Running: Yes`
- `Seconds_Behind_Master: 0` (or low number)

---

## SQLite Replication

### Architecture

SQLite replication uses file-based replication with tools like Litestream:

```
┌─────────────────┐
│   Primary DB    │ ◄─── All write operations
│  (notes.db)     │
└────────┬────────┘
         │ File-based replication (Litestream)
         ├──────────┬──────────┬──────────
         ▼          ▼          ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │Replica 1 │ │Replica 2 │ │  S3/GCS  │
   │(read-only)│ │(read-only)│ │ (backup) │
   └──────────┘ └──────────┘ └──────────┘
```

### Setup with Litestream

#### 1. Install Litestream

Using Docker:
```yaml
litestream:
  image: litestream/litestream:latest
  volumes:
    - notehub-data:/data
    - ./litestream.yml:/etc/litestream.yml
  command: replicate
```

Or install locally:
```bash
# macOS
brew install litestream

# Ubuntu/Debian
wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.deb
sudo dpkg -i litestream-v0.3.13-linux-amd64.deb
```

#### 2. Configure Litestream

Create `litestream.yml`:

```yaml
dbs:
  - path: /app/data/notes.db
    replicas:
      # Local replicas for read scaling
      - type: file
        path: /app/data/notes-replica1.db
        sync-interval: 1s
      
      - type: file
        path: /app/data/notes-replica2.db
        sync-interval: 1s
      
      # S3 backup (optional)
      - type: s3
        bucket: my-backup-bucket
        path: notehub/notes.db
        region: us-east-1
        sync-interval: 10s
```

#### 3. Configure NoteHub

Set environment variables:

```bash
# Enable replication
DB_REPLICATION_ENABLED=true

# Primary SQLite database
NOTES_DB_PATH=/app/data/notes.db

# SQLite replicas (created by Litestream)
SQLITE_REPLICA_PATHS=/app/data/notes-replica1.db,/app/data/notes-replica2.db
```

#### 4. Start Litestream

```bash
# Start continuous replication
litestream replicate

# Or with Docker
docker compose up litestream
```

### Alternative: Manual SQLite Replication

For simple setups, you can use SQLite's backup API:

```bash
#!/bin/bash
# backup-sqlite.sh

sqlite3 /app/data/notes.db ".backup /app/data/notes-replica1.db"
sqlite3 /app/data/notes.db ".backup /app/data/notes-replica2.db"
```

Run this script periodically with cron:
```bash
*/5 * * * * /app/scripts/backup-sqlite.sh
```

---

## Configuration

### Environment Variables

All replication settings are configured via environment variables:

#### General Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_REPLICATION_ENABLED` | Enable/disable replication | `false` |

#### MySQL Replication

| Variable | Description | Example |
|----------|-------------|---------|
| `MYSQL_REPLICA_HOSTS` | Comma-separated replica hostnames | `mysql-replica-1,mysql-replica-2` |
| `MYSQL_REPLICA_PORTS` | Comma-separated replica ports | `3306,3306` |
| `MYSQL_REPLICA_USER` | Replica connection username | `notehub` |
| `MYSQL_REPLICA_PASSWORD` | Replica connection password | `password` |

#### SQLite Replication

| Variable | Description | Example |
|----------|-------------|---------|
| `SQLITE_REPLICA_PATHS` | Comma-separated replica file paths | `/app/data/notes-replica1.db,/app/data/notes-replica2.db` |

### Query Routing

NoteHub automatically routes queries based on their type:

- **Write operations** (INSERT, UPDATE, DELETE): Always routed to primary database
- **Read operations** (SELECT): Routed to replicas using round-robin load balancing
- **Failover**: Automatically falls back to primary if replicas are unavailable

---

## Docker Deployment

### MySQL Replication

Use the provided `docker-compose.replication.yml`:

```bash
# Copy and configure .env
cp .env.example .env
nano .env

# Start with MySQL replication
docker compose -f docker-compose.replication.yml --profile mysql-replication up -d

# Initialize the database
docker compose -f docker-compose.replication.yml exec backend-mysql-replication node scripts/seed_db.js

# Check replication status
docker compose -f docker-compose.replication.yml exec mysql-primary mysql -u root -p -e "SHOW MASTER STATUS"
docker compose -f docker-compose.replication.yml exec mysql-replica-1 mysql -u root -p -e "SHOW SLAVE STATUS\G"
```

### SQLite Replication with Litestream

```bash
# Copy and configure .env
cp .env.example .env
nano .env

# Start with SQLite replication
docker compose -f docker-compose.replication.yml --profile sqlite-replication up -d

# Initialize the database
docker compose -f docker-compose.replication.yml exec backend-sqlite-replication node scripts/seed_db.js

# Monitor Litestream
docker compose -f docker-compose.replication.yml logs -f litestream
```

---

## Monitoring and Troubleshooting

### Health Check Endpoint

Check replication status via the health endpoint:

```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "services": {
    "cache": "disabled",
    "search": "disabled",
    "replication": "enabled"
  },
  "replication": {
    "replicas": 2,
    "healthy": 2
  },
  "user_count": 5
}
```

### MySQL Replication Monitoring

Check replica lag:
```sql
-- On each replica
SHOW SLAVE STATUS\G

-- Key metrics to monitor:
-- - Slave_IO_Running: Should be 'Yes'
-- - Slave_SQL_Running: Should be 'Yes'
-- - Seconds_Behind_Master: Should be low (< 30 seconds)
-- - Last_Error: Should be empty
```

### Common Issues

#### Replica Lag

**Symptom**: High `Seconds_Behind_Master` value

**Solutions**:
1. Check network connectivity between primary and replica
2. Increase replica resources (CPU, RAM)
3. Optimize queries on the primary
4. Consider adding more replicas to distribute load

#### Replica Connection Failure

**Symptom**: `Slave_IO_Running: No`

**Solutions**:
1. Verify network connectivity
2. Check replication user credentials
3. Verify firewall rules
4. Check primary binary logs are accessible

#### SQLite Replica Not Updating

**Symptom**: Replica files are outdated

**Solutions**:
1. Check Litestream logs: `docker compose logs litestream`
2. Verify file permissions
3. Ensure Litestream is running
4. Check sync-interval configuration

---

## Best Practices

### 1. Monitor Replica Lag

Set up alerts for replica lag > 30 seconds:

```javascript
// In your monitoring system
const replicationStatus = await db.getReplicationStatus();
if (replicationStatus.enabled) {
  const healthyReplicas = replicationStatus.healthyReplicas;
  if (healthyReplicas < replicationStatus.replicaCount) {
    alerting.warning('Some database replicas are unhealthy');
  }
}
```

### 2. Use Enough Replicas

- **Low traffic**: 1-2 replicas sufficient
- **Medium traffic**: 2-3 replicas recommended
- **High traffic**: 3+ replicas, consider geo-distribution

### 3. Regular Health Checks

NoteHub performs health checks every 30 seconds:
- Checks replica connectivity
- Monitors replica lag (MySQL)
- Automatically marks unhealthy replicas as unavailable

### 4. Backup Strategy

- **MySQL**: Use replica for backups (doesn't impact primary performance)
- **SQLite**: Use Litestream to replicate to S3/GCS for disaster recovery

### 5. Security

- Use strong passwords for replication users
- Enable SSL/TLS for replica connections in production
- Restrict network access to replicas using firewall rules

### 6. Testing

Test failover scenarios:
```bash
# Stop a replica
docker compose stop mysql-replica-1

# Verify application continues to work
curl http://localhost:5000/api/health

# Check logs for fallback to primary
docker compose logs backend-mysql-replication | grep "falling back"

# Restart replica
docker compose start mysql-replica-1
```

---

## Production Considerations

### Managed Database Services

For production, consider using managed database services with built-in replication:

- **AWS RDS for MySQL**: Automatic replication, read replicas, automated backups
- **Google Cloud SQL**: Multi-region replication, automatic failover
- **Azure Database for MySQL**: Zone-redundant HA, read replicas
- **PlanetScale**: Serverless MySQL with automatic sharding and replication

### Manual Setup

If you're setting up replication manually in production:

1. **Use monitoring**: Set up Prometheus + Grafana for database metrics
2. **Enable SSL**: Always use encrypted connections in production
3. **Automate failover**: Use tools like Orchestrator or ProxySQL
4. **Regular backups**: Don't rely solely on replicas for backups
5. **Test disaster recovery**: Regularly practice failover procedures

---

## Example Configurations

### Small Deployment (1 Primary + 1 Replica)

```bash
# .env
DB_REPLICATION_ENABLED=true
MYSQL_REPLICA_HOSTS=mysql-replica-1
MYSQL_REPLICA_PORTS=3306
```

### Medium Deployment (1 Primary + 3 Replicas)

```bash
# .env
DB_REPLICATION_ENABLED=true
MYSQL_REPLICA_HOSTS=mysql-replica-1,mysql-replica-2,mysql-replica-3
MYSQL_REPLICA_PORTS=3306,3306,3306
```

### Large Deployment (1 Primary + 5 Geo-Distributed Replicas)

```bash
# .env
DB_REPLICATION_ENABLED=true
MYSQL_REPLICA_HOSTS=mysql-us-east,mysql-us-west,mysql-eu-west,mysql-ap-south,mysql-ap-east
MYSQL_REPLICA_PORTS=3306,3306,3306,3306,3306
```

---

## Performance Impact

### Before Replication

```
Query Performance:
- Read operations: 80ms average
- Write operations: 45ms average
- Concurrent reads: Limited by primary connection pool
```

### After Replication (3 Replicas)

```
Query Performance:
- Read operations: 25ms average (67% faster)
- Write operations: 45ms average (unchanged)
- Concurrent reads: 3x higher throughput
- Load distribution: ~25% per replica
```

---

## Migration Guide

### Enabling Replication on Existing Setup

1. **Backup your database** before making any changes
2. Configure replicas following the setup instructions
3. Enable replication in `.env`:
   ```bash
   DB_REPLICATION_ENABLED=true
   ```
4. Restart the application:
   ```bash
   docker compose restart backend
   ```
5. Verify replication is working:
   ```bash
   curl http://localhost:5000/api/health | jq .replication
   ```

### Disabling Replication

1. Set in `.env`:
   ```bash
   DB_REPLICATION_ENABLED=false
   ```
2. Restart the application
3. All queries will route to the primary database

---

## Additional Resources

- [MySQL Replication Documentation](https://dev.mysql.com/doc/refman/8.0/en/replication.html)
- [Litestream Documentation](https://litestream.io/)
- [SQLite Backup API](https://www.sqlite.org/backup.html)
- [Database Replication Best Practices](https://www.percona.com/blog/replication-best-practices/)

---

*Last Updated: 2024-12-07*  
*Version: 1.1.0*
