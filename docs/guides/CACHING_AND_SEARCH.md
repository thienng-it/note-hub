# Caching and Search Enhancement Guide

## Overview

NoteHub supports optional Redis caching and Elasticsearch full-text search to enhance performance. Both are **optional** - the application works without them using SQL-only mode.

---

## Performance Comparison

| Feature | SQL Only | With Redis | With Elasticsearch | With Both |
|---------|----------|------------|-------------------|-----------|
| **List Notes** | 50-100ms | 5-10ms (10x faster) | 50-100ms | 5-10ms |
| **Search Notes** | 100-200ms | 100-200ms | 20-40ms (5x faster) | 20-40ms |
| **Get Tags** | 30-50ms | 2-5ms (10x faster) | 30-50ms | 2-5ms |
| **Overall UX** | Good | Excellent | Good | Excellent |

---

## Redis Caching

### Benefits
- **10x faster** queries for frequently accessed data
- Reduces database load
- Improves response times for list and filter operations
- Minimal configuration required

### What Gets Cached
- User's notes list (by view type, search, tags)
- User's tags list
- Cache TTL: 10 minutes for notes, 30 minutes for tags
- Auto-invalidation on create/update/delete

### Setup

#### 1. Local Redis (Development)

**Install Redis:**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

**Configure NoteHub:**
```bash
# .env file
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Start Application:**
```bash
cd backend
npm install
npm start
```

You should see:
```
🔴 Connected to Redis: localhost
✅ Redis ready
```

#### 2. Redis Cloud (Production)

**Free Options:**
- [Redis Cloud](https://redis.com/try-free/) - 30MB free
- [Upstash](https://upstash.com/) - 10,000 requests/day free

**Configure:**
```bash
# .env file
REDIS_URL=redis://user:password@your-redis-host:port
```

#### 3. Docker Compose (Development)

Add to `docker-compose.yml`:
```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: notehub-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - notehub-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  backend:
    environment:
      - REDIS_HOST=redis  # Use container name
      - REDIS_PORT=6379
    depends_on:
      redis:
        condition: service_healthy
```

### Verification

Check if caching is working:
```bash
# 1. Make a request
curl http://localhost:5000/api/notes

# 2. Check Redis
redis-cli
> KEYS notes:*
> GET "notes:user:1:all::"
```

### Monitoring

Monitor cache hit rate:
```bash
redis-cli INFO stats | grep hit
```

Ideal hit rate: >80% for production

---

## Elasticsearch Full-Text Search

### Benefits
- **5x faster** full-text search
- Better search relevance (fuzzy matching, stemming)
- Search ranking and scoring
- Supports complex queries

### What Gets Indexed
- Note title (boosted 2x in relevance)
- Note body
- Tags
- Metadata (owner, flags, timestamps)

### Setup

#### 1. Local Elasticsearch (Development)

**Install Elasticsearch:**
```bash
# Docker (recommended)
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0

# Wait for startup (30-60 seconds)
curl http://localhost:9200
```

**Configure NoteHub:**
```bash
# .env file
ELASTICSEARCH_NODE=http://localhost:9200
```

**Start Application:**
```bash
cd backend
npm install
npm start
```

You should see:
```
🔍 Connected to Elasticsearch: http://localhost:9200
✅ Created Elasticsearch index: notehub-notes
```

#### 2. Elasticsearch Cloud (Production)

**Options:**
- [Elastic Cloud](https://cloud.elastic.co/) - 14-day trial
- [AWS OpenSearch](https://aws.amazon.com/opensearch-service/) - Free tier

**Configure:**
```bash
# .env file
ELASTICSEARCH_NODE=https://your-cloud-id.es.io:9243
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-password

# OR use API key (recommended)
ELASTICSEARCH_API_KEY=your-api-key
```

#### 3. Docker Compose (Development)

Add to `docker-compose.yml`:
```yaml
services:
  elasticsearch:
    image: elasticsearch:8.11.0
    container_name: notehub-elasticsearch
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - es-data:/usr/share/elasticsearch/data
    networks:
      - notehub-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9200"]
      interval: 30s
      timeout: 10s
      retries: 5

  backend:
    environment:
      - ELASTICSEARCH_NODE=http://elasticsearch:9200
    depends_on:
      elasticsearch:
        condition: service_healthy

volumes:
  es-data:
    driver: local
```

### Initial Data Sync

After setting up Elasticsearch, existing notes need to be indexed:

**Option 1: Automatic (on first search)**
- Elasticsearch auto-indexes as notes are created/updated
- Existing notes indexed on first search

**Option 2: Manual Bulk Index (recommended)**
```javascript
// Create script: scripts/index_notes.js
const db = require('../src/config/database');
const elasticsearch = require('../src/config/elasticsearch');

async function indexAllNotes() {
  await db.connect();
  await elasticsearch.connect();

  const notes = await db.query('SELECT * FROM notes');
  console.log(`Indexing ${notes.length} notes...`);

  await elasticsearch.bulkIndexNotes(notes);
  console.log('✅ All notes indexed');

  await db.close();
  await elasticsearch.close();
}

indexAllNotes();
```

Run it:
```bash
node scripts/index_notes.js
```

### Verification

Check if search is working:
```bash
# 1. Check index exists
curl http://localhost:9200/notehub-notes

# 2. Test search
curl -X POST http://localhost:9200/notehub-notes/_search \
  -H 'Content-Type: application/json' \
  -d '{"query": {"match": {"title": "test"}}}'

# 3. Use API endpoint
curl "http://localhost:5000/api/notes?search=meeting"
```

---

## Complete Setup: Both Redis + Elasticsearch

### Docker Compose (Recommended)

```yaml
version: '3.8'

services:
  # Backend with caching and search
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend.node
    environment:
      - REDIS_HOST=redis
      - ELASTICSEARCH_NODE=http://elasticsearch:9200
    depends_on:
      redis:
        condition: service_healthy
      elasticsearch:
        condition: service_healthy

  # Redis cache
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

  # Elasticsearch search
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9200"]
```

Start everything:
```bash
docker compose up -d
```

---

## Configuration Options

### Redis

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `REDIS_URL` | Complete Redis URL | - | `redis://localhost:6379` |
| `REDIS_HOST` | Redis hostname | `localhost` | `redis` |
| `REDIS_PORT` | Redis port | `6379` | `6379` |
| `REDIS_PASSWORD` | Redis password | - | `secret` |
| `REDIS_DB` | Redis database number | `0` | `0` |

### Elasticsearch

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ELASTICSEARCH_NODE` | ES endpoint | - | `http://localhost:9200` |
| `ELASTICSEARCH_USERNAME` | Basic auth username | - | `elastic` |
| `ELASTICSEARCH_PASSWORD` | Basic auth password | - | `changeme` |
| `ELASTICSEARCH_API_KEY` | API key (preferred) | - | `base64-key` |

---

## Troubleshooting

### Redis Connection Issues

**Problem:** `Redis connection failed`
```bash
# Check if Redis is running
redis-cli ping
# Should respond: PONG

# Check port
netstat -an | grep 6379

# Check logs
docker logs notehub-redis
```

**Solution:**
- Verify `REDIS_HOST` and `REDIS_PORT` are correct
- Check if Redis requires password
- App continues without cache if Redis unavailable

### Elasticsearch Connection Issues

**Problem:** `Elasticsearch connection failed`
```bash
# Check if ES is running
curl http://localhost:9200
# Should return JSON with cluster info

# Check logs
docker logs notehub-elasticsearch
```

**Solution:**
- Wait 30-60 seconds for ES startup
- Verify `ELASTICSEARCH_NODE` is correct
- Check ES version compatibility (8.x recommended)
- App uses SQL LIKE search if ES unavailable

### Cache Invalidation Issues

**Problem:** Stale data in cache

**Solution:**
```bash
# Manual cache clear
redis-cli FLUSHDB

# Or delete specific keys
redis-cli DEL "notes:user:1:all::"
```

### Search Not Working

**Problem:** Search returns no results

**Check index:**
```bash
curl http://localhost:9200/notehub-notes/_search
```

**Re-index all notes:**
```bash
node scripts/index_notes.js
```

---

## Performance Tuning

### Redis Memory

```redis
# Check memory usage
redis-cli INFO memory

# Set max memory (in docker-compose.yml)
command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Elasticsearch Heap

```yaml
# In docker-compose.yml
environment:
  - "ES_JAVA_OPTS=-Xms1g -Xmx1g"  # 1GB heap
```

### Cache TTL Tuning

Edit `backend/src/services/noteService.js`:
```javascript
// Short TTL for frequently changing data
await cache.set(cacheKey, notes, 300); // 5 minutes

// Long TTL for static data
await cache.set(cacheKey, tags, 3600); // 1 hour
```

---

## Monitoring

### Redis Monitoring

```bash
# Real-time stats
redis-cli --stat

# Slow log
redis-cli SLOWLOG GET 10

# Key space analysis
redis-cli --bigkeys
```

### Elasticsearch Monitoring

```bash
# Cluster health
curl http://localhost:9200/_cluster/health?pretty

# Index stats
curl http://localhost:9200/notehub-notes/_stats?pretty

# Search performance
curl http://localhost:9200/notehub-notes/_search?pretty
```

---

## Cost Estimation

### Free Tier Options

| Service | Provider | Free Tier |
|---------|----------|-----------|
| Redis | Redis Cloud | 30MB |
| Redis | Upstash | 10K requests/day |
| Elasticsearch | Elastic Cloud | 14-day trial |
| Elasticsearch | AWS OpenSearch | 750 hours/month (1 year) |

### Self-Hosted (VPS)

| Resources | Redis | Elasticsearch | Both |
|-----------|-------|---------------|------|
| **RAM** | 256MB | 1GB | 1.5GB |
| **Disk** | 100MB | 2GB | 2.5GB |
| **CPU** | 0.1 core | 0.5 core | 0.5 core |

**Recommended VPS:**
- Hetzner CX21: €4.5/month (2GB RAM)
- DigitalOcean Basic: $6/month (1GB RAM)
- Linode Nanode: $5/month (1GB RAM)

---

## Production Checklist

- [ ] Redis configured with password
- [ ] Elasticsearch secured (enable xpack.security)
- [ ] Firewall rules (Redis: 6379, ES: 9200)
- [ ] Backups configured
- [ ] Monitoring alerts set up
- [ ] SSL/TLS enabled for external connections
- [ ] Resource limits set (memory, CPU)
- [ ] Log rotation configured

---

## Summary

| Scenario | Recommendation |
|----------|---------------|
| **Development** | Local Docker (Redis + ES) |
| **Small Production (<100 users)** | Skip both, SQL-only is fine |
| **Medium Production (100-1K users)** | Add Redis caching only |
| **Large Production (>1K users)** | Add both Redis + Elasticsearch |
| **Cost-Conscious** | Redis only (bigger impact, lower cost) |
| **Search-Heavy** | Elasticsearch only |

---

**Last Updated:** 2025-12-04  
**Version:** 1.0
