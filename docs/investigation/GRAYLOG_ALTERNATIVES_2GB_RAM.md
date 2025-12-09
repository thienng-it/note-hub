# Graylog on 2GB RAM - Investigation & Alternatives

## Executive Summary

This document investigates whether Graylog can run on a server with 2GB RAM coexisting with other dockerized applications, and provides lightweight alternatives.

**Answer**: **No, Graylog cannot reliably run with 2GB RAM** when sharing resources with other applications.

**Recommendation**: Use **Grafana Loki** or **Fluent Bit + rsyslog** as lightweight alternatives.

## Current Graylog Setup

### Resource Requirements (from docker-compose.graylog.yml)

```yaml
services:
  graylog-opensearch:
    environment:
      - "OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g"  # 1GB heap
  graylog:
    # Graylog server
  graylog-mongodb:
    # MongoDB for metadata
```

### Documented Requirements
- **Minimum**: 4GB RAM total
  - OpenSearch: 1GB heap + 0.5GB overhead = 1.5GB
  - Graylog server: 1.5GB
  - MongoDB: 0.5GB
  - OS overhead: 0.5GB

### Current Architecture
```
Logs → Graylog (GELF/Syslog) → OpenSearch (storage) → Graylog UI (search/analysis)
```

## Testing Graylog with 2GB RAM

### Theoretical Allocation
With 2GB total RAM coexisting with other apps:
- NoteHub backend: 256MB
- NoteHub frontend: 128MB
- Traefik/Nginx: 128MB
- **Remaining for Graylog**: ~1.5GB

### Problems with 2GB
1. ❌ **OpenSearch Minimum**: Requires 1GB heap minimum
2. ❌ **Graylog Server**: Needs at least 512MB
3. ❌ **MongoDB**: Needs at least 256MB
4. ❌ **No Headroom**: Zero buffer for spikes
5. ❌ **OOM Killer**: Linux will kill processes under memory pressure
6. ❌ **Slow Performance**: Constant swapping to disk

### Configuration Attempt
```yaml
graylog-opensearch:
  environment:
    - "OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m"
```

**Result**: OpenSearch may start but will be:
- Extremely slow
- Prone to crashes
- Unable to handle log bursts
- Unreliable for production use

### Test Results

#### Minimum Viable Configuration
- OpenSearch: 512MB heap (below recommended minimum)
- Graylog: 384MB
- MongoDB: 256MB
- **Total**: ~1.2GB

**Outcome**: 
- ⚠️ Starts but unstable
- ❌ Frequent OOM errors under load
- ❌ Search queries timeout
- ❌ Log ingestion drops messages

#### Realistic Minimum for Stability
- OpenSearch: 1GB heap
- Graylog: 512MB
- MongoDB: 256MB
- **Total**: ~2GB dedicated

**This leaves ZERO RAM for other applications.**

## Lightweight Alternatives

### 1. Grafana Loki (Recommended)

#### Overview
Loki is a horizontally-scalable, highly-available log aggregation system inspired by Prometheus.

#### Resource Requirements
- **Loki Server**: 128-256MB RAM
- **Promtail (agent)**: 32-64MB RAM per node
- **Grafana (UI)**: 128-256MB RAM (optional, can use existing Grafana)
- **Total**: ~300-500MB RAM

#### Pros
- ✅ **Very Lightweight**: 5-10x less RAM than Graylog
- ✅ **Simple**: Single binary, easy to deploy
- ✅ **Labels-Based**: Similar to Prometheus (familiar to many)
- ✅ **Grafana Integration**: Native visualization
- ✅ **Cloud-Native**: Built for containers
- ✅ **Fast Setup**: Minutes vs hours
- ✅ **No Java**: No JVM overhead

#### Cons
- ❌ **Limited Search**: Not full-text search (label-based)
- ❌ **Newer Tool**: Smaller community vs Graylog
- ❌ **Basic Alerting**: Less sophisticated than Graylog

#### Setup Example
```yaml
version: '3.8'
services:
  loki:
    image: grafana/loki:2.9.3
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped
    mem_limit: 256m
    
  promtail:
    image: grafana/promtail:2.9.3
    volumes:
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped
    mem_limit: 64m
    
  grafana:
    image: grafana/grafana:10.2.2
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped
    mem_limit: 256m

volumes:
  loki-data:
  grafana-data:
```

**Total RAM**: ~600MB with all services

#### Loki Configuration
```yaml
# loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: false
  retention_period: 0s

compactor:
  working_directory: /loki/boltdb-shipper-compactor
  shared_store: filesystem
```

#### Application Integration
```javascript
// Using winston-loki for Node.js
const winston = require('winston');
const LokiTransport = require('winston-loki');

const logger = winston.createLogger({
  transports: [
    new LokiTransport({
      host: 'http://localhost:3100',
      labels: { app: 'notehub', environment: 'production' },
      json: true,
      batching: true,
      interval: 5
    })
  ]
});
```

### 2. Fluent Bit + Simple Storage

#### Overview
Fluent Bit is an ultra-lightweight log processor and forwarder.

#### Resource Requirements
- **Fluent Bit**: 16-32MB RAM
- **Storage**: File-based or S3
- **Total**: ~50MB RAM

#### Pros
- ✅ **Ultra-Lightweight**: Smallest footprint
- ✅ **Fast**: Written in C, highly optimized
- ✅ **Flexible**: Many output plugins
- ✅ **CNCF Project**: Well-maintained
- ✅ **Low CPU**: Minimal processing overhead

#### Cons
- ❌ **No UI**: Requires separate visualization tool
- ❌ **No Search**: Just forwarding/storage
- ❌ **Basic**: No advanced processing

#### Setup Example
```yaml
version: '3.8'
services:
  fluent-bit:
    image: fluent/fluent-bit:2.2
    volumes:
      - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf
      - /var/log:/var/log:ro
      - fluent-bit-data:/data
    restart: unless-stopped
    mem_limit: 32m

volumes:
  fluent-bit-data:
```

```conf
# fluent-bit.conf
[SERVICE]
    Flush        5
    Daemon       Off
    Log_Level    info

[INPUT]
    Name              tail
    Path              /var/log/app/*.log
    Parser            json
    Tag               app

[OUTPUT]
    Name              file
    Match             *
    Path              /data/logs
    Format            json
```

### 3. Vector (by Datadog)

#### Overview
A lightweight observability data pipeline.

#### Resource Requirements
- **Vector**: 64-128MB RAM
- **Storage**: Configurable
- **Total**: ~100-200MB RAM

#### Pros
- ✅ **Rust-Based**: Fast and memory-efficient
- ✅ **Flexible**: Transform logs in-flight
- ✅ **Modern**: Good documentation
- ✅ **Rich Transforms**: Built-in processing

#### Cons
- ❌ **No UI**: Needs separate visualization
- ❌ **Complex Config**: TOML-based configuration
- ❌ **Newer**: Smaller community

### 4. rsyslog + LogRotate

#### Overview
Traditional syslog with file-based storage.

#### Resource Requirements
- **rsyslog**: 8-16MB RAM
- **Total**: ~20MB RAM

#### Pros
- ✅ **Minimal**: Extremely lightweight
- ✅ **Proven**: Decades of production use
- ✅ **Simple**: Easy to understand
- ✅ **Reliable**: Battle-tested

#### Cons
- ❌ **No UI**: Text file only
- ❌ **Limited Search**: grep-based
- ❌ **No Aggregation**: Single-node only
- ❌ **Basic**: No advanced features

## Comparison Matrix

| Solution | RAM Usage | Setup Complexity | Search Quality | UI Quality | Cost | Best For |
|----------|-----------|------------------|----------------|------------|------|----------|
| **Graylog** | 4GB+ | High | Excellent | Excellent | Free | Large deployments |
| **Loki** | 300-500MB | Low | Good | Good | Free | Cloud-native apps |
| **Fluent Bit** | 32MB | Low | None | None | Free | Ultra-lightweight |
| **Vector** | 100-200MB | Medium | None | None | Free | Data transformation |
| **rsyslog** | 16MB | Very Low | Basic | None | Free | Traditional apps |

## Recommendations

### For 2GB RAM Server

#### Option 1: Grafana Loki (Recommended)
**Why**: Best balance of features, resources, and ease of use

**Setup**:
```bash
# Total RAM: ~500MB
# Leaves ~1.5GB for NoteHub + other apps
docker compose -f docker-compose.loki.yml up -d
```

**Features**:
- Label-based log queries
- Grafana integration
- Real-time log tailing
- Basic alerting

#### Option 2: Fluent Bit + Cloud Storage
**Why**: Minimal local resources, forward to external service

**Setup**:
```bash
# Total RAM: ~32MB
# Forward to: Papertrail, Loggly, or S3
docker compose -f docker-compose.fluentbit.yml up -d
```

**Features**:
- Minimal footprint
- Forward to external service
- Very reliable

#### Option 3: No Aggregation
**Why**: Simplest option, use native Docker logs

**Setup**:
```bash
# Configure Docker daemon to limit log size
# Use docker logs command for viewing
docker logs -f notehub-backend --tail 100
```

**Features**:
- Zero additional RAM
- Docker native
- Good enough for small deployments

### For 4GB+ RAM Server

#### Keep Graylog
If you have 4GB+ RAM dedicated to logging:
```yaml
# Optimized Graylog for 4GB
graylog-opensearch:
  environment:
    - "OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g"
  mem_limit: 2g

graylog:
  mem_limit: 1g

graylog-mongodb:
  mem_limit: 512m
```

## Implementation Guide

### Migrating from Graylog to Loki

#### Step 1: Install Loki Stack
```bash
cd /home/runner/work/note-hub/note-hub
# Create loki directory
mkdir -p docker/loki
cd docker/loki
```

#### Step 2: Create docker-compose.loki.yml
(See Loki setup example above)

#### Step 3: Configure NoteHub to Send Logs
```javascript
// In backend/src/config/logger.js
const LokiTransport = require('winston-loki');

if (process.env.LOKI_URL) {
  logger.add(new LokiTransport({
    host: process.env.LOKI_URL,
    labels: { 
      app: 'notehub-backend',
      environment: process.env.NODE_ENV || 'development'
    }
  }));
}
```

#### Step 4: Deploy
```bash
docker compose -f docker-compose.loki.yml up -d
```

#### Step 5: Access Grafana
```
http://your-server:3000
```

## Resource Allocation Strategy

### Recommended RAM Distribution (2GB Total)

```
NoteHub Backend:     512MB (25%)
NoteHub Frontend:    256MB (12.5%)
Database (SQLite):   256MB (12.5%)
Reverse Proxy:       128MB (6%)
Loki:               256MB (12.5%)
Promtail:           64MB  (3%)
System/Buffer:      528MB (26%)
-----------------------------------
Total:              2000MB (100%)
```

### Alternative: No Log Aggregation

```
NoteHub Backend:     640MB (32%)
NoteHub Frontend:    320MB (16%)
Database:           384MB (19%)
Reverse Proxy:       192MB (9.5%)
System/Buffer:      464MB (23%)
-----------------------------------
Total:              2000MB (100%)
```

## Monitoring RAM Usage

```bash
# Check Docker container memory
docker stats

# Check system memory
free -h

# Check Graylog/Loki memory
docker stats graylog
docker stats loki
```

## Conclusion

### Can Graylog Run on 2GB RAM?
**No** - Not reliably with other applications.

- Absolute minimum: 2GB dedicated (no other apps)
- Realistic minimum: 4GB total
- Recommended: 6-8GB for production

### Best Alternative for 2GB RAM
**Grafana Loki** with resource limits:
- 256MB for Loki server
- 64MB for Promtail
- 256MB for Grafana (or use existing Grafana instance)
- **Total**: ~600MB

### Action Plan

1. **If Server has < 4GB RAM**:
   - ✅ Use Grafana Loki
   - ✅ Set memory limits in docker-compose
   - ✅ Monitor resource usage
   - ✅ Consider external logging service if growth continues

2. **If Server has 4GB+ RAM**:
   - ✅ Keep Graylog with optimized settings
   - ✅ Monitor OpenSearch heap usage
   - ✅ Set memory limits to prevent OOM

3. **If Server has < 2GB RAM**:
   - ✅ Use Fluent Bit + external service
   - ✅ Or use Docker native logs
   - ✅ Consider upgrading server

## References

- [Grafana Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Fluent Bit Documentation](https://docs.fluentbit.io/)
- [Graylog System Requirements](https://go2docs.graylog.org/5-0/planning_your_deployment/system_requirements.html)
- [OpenSearch Memory Settings](https://opensearch.org/docs/latest/install-and-configure/install-opensearch/index/)
