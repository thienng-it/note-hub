# Port Allocation Guide

This document describes the port allocation for running NoteHub and Drone CI on the same VPS server without conflicts.

## Overview

Both NoteHub and Drone CI can run simultaneously on the same server without port conflicts. This is achieved by carefully allocating different ports to each service.

## Port Allocation Table

| Service | Internal Port | External Port | Purpose | Access |
|---------|--------------|---------------|---------|--------|
| **NoteHub Frontend** | 80 | 80 | Web application | http://server:80 |
| **NoteHub Backend** | 5000 | (internal) | API server | Internal only |
| **NoteHub MySQL** | 3306 | (internal) | Database (optional) | Internal only |
| **Drone Server** | 80 | **8080** | CI/CD web UI | http://server:8080 |
| **Drone Runner** | - | (internal) | Pipeline executor | Internal only |
| **Drone PostgreSQL** | 5432 | (internal) | CI/CD database | Internal only |

## Network Isolation

Each stack uses its own Docker network to ensure isolation:

- **NoteHub**: Uses `notehub-network` bridge network
- **Drone CI**: Uses `drone-network` bridge network

This provides complete network isolation between the two applications while allowing them to coexist on the same host.

## Port Conflict Resolution

### Why Port 8080 for Drone?

1. **NoteHub uses port 80** - Standard HTTP port for the web application
2. **Port 8080** is a common alternative HTTP port
3. **No conflict** - Both services can run simultaneously

### Changing Ports

If you need to use different ports, you can modify the docker-compose files:

#### Change NoteHub Port

Edit `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "8000:80"  # Access NoteHub at http://server:8000
```

#### Change Drone CI Port

Edit `docker-compose.drone.yml`:
```yaml
drone-server:
  ports:
    - "8090:80"  # Access Drone at http://server:8090
```

**Important**: If you change Drone's port, also update:
1. `.env.drone`: Set `DRONE_SERVER_HOST=server:8090`
2. GitHub OAuth App: Update callback URL to `http://server:8090/login`

## Testing Port Availability

### Check if a port is in use

```bash
# Check if port 80 is available
sudo lsof -i :80

# Check if port 8080 is available
sudo lsof -i :8080

# Check all ports in use
sudo netstat -tulpn | grep LISTEN
```

### Start services and verify

```bash
# Start NoteHub (uses port 80)
docker compose up -d
docker compose ps

# Start Drone CI (uses port 8080)
docker compose -f docker-compose.drone.yml up -d
docker compose -f docker-compose.drone.yml ps

# Verify both are running
curl -I http://localhost:80
curl -I http://localhost:8080
```

## Firewall Configuration

If you're using a firewall (UFW, iptables), ensure the ports are open:

### UFW (Ubuntu/Debian)

```bash
# Allow NoteHub
sudo ufw allow 80/tcp

# Allow Drone CI
sudo ufw allow 8080/tcp

# Check status
sudo ufw status
```

### iptables

```bash
# Allow NoteHub
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# Allow Drone CI
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

## Production Setup with Reverse Proxy

For production deployments, use a reverse proxy (nginx, Caddy, Traefik) to:
- Handle SSL/TLS certificates
- Use standard HTTPS port 443
- Route traffic based on domain names

### Example: nginx Configuration

```nginx
# NoteHub - notehub.example.com
server {
    listen 443 ssl http2;
    server_name notehub.example.com;
    
    ssl_certificate /etc/letsencrypt/live/notehub.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/notehub.example.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Drone CI - drone.example.com
server {
    listen 443 ssl http2;
    server_name drone.example.com;
    
    ssl_certificate /etc/letsencrypt/live/drone.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drone.example.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # WebSocket support for Drone
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

With this setup:
- NoteHub: `https://notehub.example.com` → localhost:80
- Drone CI: `https://drone.example.com` → localhost:8080
- Both use standard HTTPS port 443 externally

## Troubleshooting

### Port Already in Use

**Error**: `Bind for 0.0.0.0:8080 failed: port is already allocated`

**Solutions**:
1. Find what's using the port:
   ```bash
   sudo lsof -i :8080
   ```

2. Stop the conflicting service or change the port in docker-compose

### Cannot Access Service

**Problem**: Service is running but not accessible

**Solutions**:
1. Check if Docker is binding to the correct interface:
   ```bash
   docker compose ps
   netstat -tulpn | grep :8080
   ```

2. Verify firewall rules:
   ```bash
   sudo ufw status
   ```

3. Check Docker logs:
   ```bash
   docker compose -f docker-compose.drone.yml logs drone-server
   ```

### Services Interfering with Each Other

**Problem**: One service affects the other

**Solution**: This shouldn't happen due to network isolation, but if it does:
1. Verify networks are separate:
   ```bash
   docker network ls
   docker network inspect notehub-network
   docker network inspect drone-network
   ```

2. Restart Docker:
   ```bash
   sudo systemctl restart docker
   ```

## Resource Allocation

Running both services on the same server requires adequate resources:

### Minimum Requirements
- **CPU**: 2 cores (4+ recommended)
- **RAM**: 4GB (8GB recommended)
- **Disk**: 40GB (100GB+ recommended for CI builds)

### Resource Usage (Approximate)

| Service | RAM Usage | CPU Usage |
|---------|-----------|-----------|
| NoteHub (SQLite) | ~200MB | Low |
| NoteHub (MySQL) | ~500MB | Low |
| Drone Server | ~100MB | Low |
| Drone Runner (idle) | ~50MB | Low |
| Drone Runner (building) | ~1-2GB | High |
| PostgreSQL (Drone) | ~100MB | Low |

**Note**: Drone CI can consume significant resources during builds. Monitor your server's resources and adjust `DRONE_RUNNER_CAPACITY` accordingly.

## Summary

✅ **NoteHub** runs on port **80**
✅ **Drone CI** runs on port **8080**
✅ **No conflicts** - both can run simultaneously
✅ **Network isolation** - separate Docker networks
✅ **Production ready** - use reverse proxy for HTTPS

For more information:
- [NoteHub Deployment Guide](HETZNER_DEPLOYMENT.md)
- [Drone CI Setup Guide](DRONE_CI_SETUP.md)
