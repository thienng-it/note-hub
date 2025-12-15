#!/bin/bash
# =============================================================================
# Localhost 404 Diagnostic Script
# =============================================================================
# This script helps diagnose why http://localhost returns 404
# Run with: bash scripts/diagnose-localhost-404.sh
# =============================================================================

echo "======================================================================"
echo "NoteHub Localhost 404 Diagnostic"
echo "======================================================================"
echo ""

# Check Docker socket access
echo "0. Checking Docker socket access..."
if [ -S /var/run/docker.sock ]; then
    echo "✅ Docker socket exists at /var/run/docker.sock"
    ls -la /var/run/docker.sock
    
    # Check if socket is accessible
    if docker info > /dev/null 2>&1; then
        echo "✅ Docker socket is accessible"
    else
        echo "❌ Docker socket exists but cannot be accessed"
        echo "   Run: sudo usermod -aG docker $USER"
        echo "   Then logout and login again"
    fi
else
    echo "❌ Docker socket not found at /var/run/docker.sock"
    echo "   Checking for Podman socket..."
    if [ -S /run/podman/podman.sock ]; then
        echo "✅ Found Podman socket at /run/podman/podman.sock"
        echo "   Update docker-compose.dev.yml to use Podman socket"
    else
        echo "❌ No Docker or Podman socket found"
        exit 1
    fi
fi
echo ""

# Check if docker compose is running
echo "1. Checking Docker Compose services..."
docker compose -f docker-compose.dev.yml ps
echo ""

# Check Traefik container
echo "2. Checking Traefik container..."
if docker ps | grep -q "notehub-traefik"; then
    echo "✅ Traefik container is running"
    docker inspect notehub-traefik --format='{{range .NetworkSettings.Networks}}Network: {{.NetworkID}}{{end}}'
else
    echo "❌ Traefik container is NOT running"
    exit 1
fi
echo ""

# Check Backend container
echo "3. Checking Backend container..."
if docker ps | grep -q "notehub-backend"; then
    echo "✅ Backend container is running"
    docker inspect notehub-backend --format='{{range .NetworkSettings.Networks}}Network: {{.NetworkID}}{{end}}'
    
    # Test backend health
    echo "Testing backend health endpoint..."
    docker exec notehub-backend wget -q -O- http://localhost:5000/api/health 2>/dev/null || echo "❌ Backend health check failed"
else
    echo "❌ Backend container is NOT running"
fi
echo ""

# Check Frontend container
echo "4. Checking Frontend container..."
if docker ps | grep -q "notehub-frontend"; then
    echo "✅ Frontend container is running"
    docker inspect notehub-frontend --format='{{range .NetworkSettings.Networks}}Network: {{.NetworkID}}{{end}}'
    
    # Test frontend internally
    echo "Testing frontend internally (inside container)..."
    docker exec notehub-frontend wget -q -O- http://localhost:80/ 2>/dev/null | head -1 || echo "❌ Frontend not serving content"
    
    # Check if nginx is running
    echo "Checking if nginx is running in frontend container..."
    docker exec notehub-frontend ps aux | grep nginx || echo "❌ nginx not running"
    
    # Check nginx configuration
    echo "Checking nginx configuration..."
    docker exec notehub-frontend cat /etc/nginx/conf.d/default.conf
    
    # Check if files exist
    echo "Checking if built files exist..."
    docker exec notehub-frontend ls -la /usr/share/nginx/html/ | head -10
    
else
    echo "❌ Frontend container is NOT running"
    exit 1
fi
echo ""

# Check Traefik configuration
echo "5. Checking Traefik configuration..."
echo "Traefik routers:"
docker exec notehub-traefik wget -q -O- http://localhost:8080/api/http/routers 2>/dev/null || echo "Cannot access Traefik API (this is normal if dashboard is disabled)"
echo ""

# Check Traefik labels on frontend
echo "6. Checking Traefik labels on frontend container..."
docker inspect notehub-frontend --format='{{range $key, $value := .Config.Labels}}{{if eq (index (split $key ".") 0) "traefik"}}{{$key}}: {{$value}}{{"\n"}}{{end}}{{end}}'
echo ""

# Check network connectivity
echo "7. Testing network connectivity..."
echo "From Traefik to Frontend:"
docker exec notehub-traefik wget -q -O- http://notehub-frontend:80/ 2>/dev/null | head -1 || echo "❌ Cannot reach frontend from traefik"
echo ""

# Test actual localhost access
echo "8. Testing actual http://localhost access..."
curl -I http://localhost/ 2>/dev/null || echo "❌ Cannot access http://localhost"
echo ""

# Check Traefik logs
echo "9. Recent Traefik logs..."
docker compose -f docker-compose.dev.yml logs --tail=20 traefik
echo ""

# Check for Traefik Docker socket errors
echo "9a. Checking for Traefik Docker socket errors..."
if docker compose -f docker-compose.dev.yml logs traefik 2>&1 | grep -q "Error response from daemon"; then
    echo "❌ CRITICAL: Traefik cannot access Docker socket!"
    echo ""
    echo "This is the root cause of the 404 error."
    echo "Traefik needs Docker socket access to discover containers."
    echo ""
    echo "Common fixes:"
    echo "1. Ensure user in docker group: sudo usermod -aG docker \$USER"
    echo "2. For SELinux: Change volume mount to /var/run/docker.sock:/var/run/docker.sock:z"
    echo "3. For Podman: Use /run/podman/podman.sock:/var/run/docker.sock:ro"
    echo "4. Restart Docker: sudo systemctl restart docker"
    echo ""
    echo "See complete guide: docs/TRAEFIK_DOCKER_SOCKET_ERROR.md"
    echo ""
else
    echo "✅ No Traefik Docker socket errors found"
fi
echo ""

# Check Frontend logs
echo "10. Recent Frontend logs..."
docker compose -f docker-compose.dev.yml logs --tail=20 frontend
echo ""

echo "======================================================================"
echo "Diagnostic complete"
echo "======================================================================"
echo ""
echo "Common issues and fixes:"
echo "1. If frontend container not running: Check build logs with 'docker compose -f docker-compose.dev.yml logs frontend'"
echo "2. If nginx not serving content: Rebuild with 'docker compose -f docker-compose.dev.yml up -d --build frontend'"
echo "3. If Traefik can't reach frontend: Check network with 'docker network inspect notehub-network'"
echo "4. If frontend files missing: Check build process in Dockerfile.frontend.traefik"
echo ""
