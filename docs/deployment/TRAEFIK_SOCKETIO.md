# Traefik Configuration for Socket.io

## Overview

Socket.io requires proper reverse proxy configuration to work correctly in production. This document explains the Traefik configuration needed for the NoteHub chat feature.

## Problem

When deploying NoteHub with Traefik as a reverse proxy, Socket.io connections may fail with "Connection error. Trying to reconnect..." even though HTTP requests to the API work fine. This happens because:

1. Traefik needs explicit routes for the `/socket.io/` path
2. WebSocket upgrade requires proper HTTP header handling
3. Socket.io falls back to long-polling if WebSocket upgrade fails

## Solution

### Required Traefik Labels

The backend service needs Traefik labels to route Socket.io traffic:

```yaml
# Socket.io routing (HTTP)
- "traefik.http.routers.backend-socketio-http.rule=PathPrefix(`/socket.io`)"
- "traefik.http.routers.backend-socketio-http.entrypoints=web"
- "traefik.http.routers.backend-socketio-http.priority=10"

# Socket.io routing (HTTPS with WebSocket support)
- "traefik.http.routers.backend-socketio.rule=PathPrefix(`/socket.io`)"
- "traefik.http.routers.backend-socketio.entrypoints=websecure"
- "traefik.http.routers.backend-socketio.priority=10"
- "traefik.http.routers.backend-socketio.tls=true"
- "traefik.http.routers.backend-socketio.tls.certresolver=letsencrypt"
```

### For Custom Domains

When using a custom domain, add host matching:

```yaml
# Socket.io routing (HTTP)
- "traefik.http.routers.backend-socketio-http.rule=(Host(`${DOMAIN}`) || Host(`www.${DOMAIN}`)) && PathPrefix(`/socket.io`)"
- "traefik.http.routers.backend-socketio-http.entrypoints=web"
- "traefik.http.routers.backend-socketio-http.priority=10"

# Socket.io routing (HTTPS)
- "traefik.http.routers.backend-socketio.rule=(Host(`${DOMAIN}`) || Host(`www.${DOMAIN}`)) && PathPrefix(`/socket.io`)"
- "traefik.http.routers.backend-socketio.entrypoints=websecure"
- "traefik.http.routers.backend-socketio.priority=10"
- "traefik.http.routers.backend-socketio.tls=true"
- "traefik.http.routers.backend-socketio.tls.certresolver=letsencrypt"
```

## Implementation

These labels have been added to:
- `docker-compose.yml` - Base configuration
- `docker-compose.domain.yml` - Custom domain configuration

## How It Works

1. **Path Routing**: Traefik routes all requests to `/socket.io/*` to the backend service
2. **WebSocket Upgrade**: Traefik automatically handles WebSocket upgrade headers
3. **Sticky Sessions**: Not required for Socket.io with single backend instance
4. **TLS/SSL**: HTTPS routes include proper certificate handling

## Deployment

After updating the docker-compose files:

```bash
# Restart the services to apply new Traefik configuration
docker compose down
docker compose up -d

# Or for custom domain
docker compose -f docker-compose.yml -f docker-compose.domain.yml down
docker compose -f docker-compose.yml -f docker-compose.domain.yml up -d
```

## Verification

1. **Check Traefik Logs**:
   ```bash
   docker logs notehub-traefik
   ```

2. **Test Socket.io Connection**:
   - Open browser DevTools → Network tab
   - Look for `/socket.io/?EIO=4&transport=polling` requests
   - Should see `101 Switching Protocols` for WebSocket upgrade
   - If only seeing `200 OK`, WebSocket upgrade is failing

3. **Test in Browser Console**:
   ```javascript
   // Should show "Socket.io connected"
   // If showing "Connection error", check Traefik configuration
   ```

## Troubleshooting

### Still Getting Connection Errors

1. **Verify routes are loaded**:
   ```bash
   docker exec notehub-traefik traefik healthcheck
   ```

2. **Check backend logs**:
   ```bash
   docker logs notehub-backend | grep -i socket
   ```

3. **Verify JWT authentication**:
   - Socket.io requires valid JWT token in handshake
   - Check browser localStorage for `notehub_access_token`
   - Expired tokens will cause authentication failure

4. **Check firewall/security groups**:
   - Ensure WebSocket traffic is allowed
   - Check if any security middleware blocks upgrade requests

### WebSocket vs Long-Polling

Socket.io will work with both transports, but WebSocket is preferred:
- **WebSocket**: Real-time bidirectional communication, lower latency
- **Long-Polling**: Fallback mode, higher latency, more overhead

If you see only long-polling requests (`transport=polling`), WebSocket upgrade is failing.

## References

- [Socket.io Behind a Reverse Proxy](https://socket.io/docs/v4/reverse-proxy/)
- [Traefik WebSocket Documentation](https://doc.traefik.io/traefik/routing/routers/#websocket)
- [Socket.io Transports](https://socket.io/docs/v4/how-it-works/#transports)
