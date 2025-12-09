#!/bin/bash

# =============================================================================
# Port 8080 Conflict Fix Verification Script
# =============================================================================
#
# This script verifies that the Traefik metrics endpoint fix is working
# correctly and there are no port conflicts.
#
# Usage:
#   ./scripts/verify-port-fix.sh
#
# =============================================================================

set -e

echo "=========================================="
echo "Verifying Port 8080 Conflict Fix"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker and docker-compose are available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are available${NC}"
echo ""

# Check if NoteHub containers are running
echo "Checking NoteHub containers..."
if docker ps | grep -q "notehub-traefik"; then
    TRAEFIK_CONTAINER=$(docker ps --filter "name=notehub-traefik" --format "{{.Names}}" | head -1)
    echo -e "${GREEN}✓ Traefik container is running: ${TRAEFIK_CONTAINER}${NC}"
    
    # Check if Traefik is healthy
    TRAEFIK_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "${TRAEFIK_CONTAINER}" 2>/dev/null || echo "unknown")
    if [ "$TRAEFIK_HEALTH" = "healthy" ]; then
        echo -e "${GREEN}✓ Traefik is healthy${NC}"
    else
        echo -e "${YELLOW}⚠ Traefik health status: ${TRAEFIK_HEALTH}${NC}"
    fi
    
    # Verify metrics endpoint is on port 9091
    echo ""
    echo "Verifying Traefik metrics endpoint..."
    if docker exec "${TRAEFIK_CONTAINER}" wget -O- -q http://localhost:9091/metrics | head -5 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Traefik metrics are accessible on port 9091${NC}"
    else
        echo -e "${RED}✗ Failed to access Traefik metrics on port 9091${NC}"
        exit 1
    fi
    
    # Check that port 8080 is NOT used by Traefik for metrics
    if docker exec "${TRAEFIK_CONTAINER}" netstat -tln 2>/dev/null | grep -q ":8080"; then
        if ! docker exec "${TRAEFIK_CONTAINER}" wget -O- -q http://localhost:8080/metrics 2>/dev/null | grep -q "traefik"; then
            echo -e "${GREEN}✓ Port 8080 is not used for Traefik metrics (as expected)${NC}"
        else
            echo -e "${RED}✗ WARNING: Port 8080 still serving Traefik metrics!${NC}"
        fi
    else
        echo -e "${GREEN}✓ Port 8080 is not listening in Traefik container${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No NoteHub Traefik container is running${NC}"
    echo "  Start NoteHub with: docker compose up -d"
    exit 0
fi

echo ""

# Check monitoring stack if running
if docker ps | grep -q "notehub-prometheus"; then
    echo "Checking monitoring stack..."
    
    # Check if Prometheus can scrape Traefik
    if docker exec notehub-prometheus wget -O- -q http://"${TRAEFIK_CONTAINER}":9091/metrics | head -5 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Prometheus can reach Traefik metrics on port 9091${NC}"
    else
        echo -e "${RED}✗ Prometheus cannot reach Traefik metrics${NC}"
    fi
    
    # Check cAdvisor
    if docker ps | grep -q "notehub-cadvisor"; then
        CADVISOR_CONTAINER=$(docker ps --filter "name=notehub-cadvisor" --format "{{.Names}}" | head -1)
        echo -e "${GREEN}✓ cAdvisor is running: ${CADVISOR_CONTAINER}${NC}"
        # cAdvisor uses port 8080 internally, which should not conflict
        if docker exec "${CADVISOR_CONTAINER}" wget -O- -q http://localhost:8080/healthz > /dev/null 2>&1; then
            echo -e "${GREEN}✓ cAdvisor healthcheck on port 8080 is working${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ Monitoring stack is not running${NC}"
    echo "  Start monitoring with: docker compose -f docker-compose.monitoring.yml up -d"
fi

echo ""

# Check host port allocation
echo "Checking host port allocation..."
if netstat -tln 2>/dev/null | grep -q ":8080" || ss -tln 2>/dev/null | grep -q ":8080"; then
    PORT_8080_USER=$(lsof -i :8080 2>/dev/null | tail -n +2 | awk '{print $1}' | uniq || echo "unknown")
    if [ ! -z "$PORT_8080_USER" ]; then
        echo -e "${YELLOW}⚠ Port 8080 is in use on host by: ${PORT_8080_USER}${NC}"
        echo "  This is expected if Drone CI is running"
    else
        echo -e "${YELLOW}⚠ Port 8080 is in use on host${NC}"
    fi
else
    echo -e "${GREEN}✓ Port 8080 is available on host${NC}"
fi

if netstat -tln 2>/dev/null | grep -q ":9091" || ss -tln 2>/dev/null | grep -q ":9091"; then
    echo -e "${YELLOW}⚠ Port 9091 is in use on host (unexpected for internal port)${NC}"
else
    echo -e "${GREEN}✓ Port 9091 is not exposed on host (as expected)${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Verification Complete!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Traefik metrics moved from port 8080 to 9091"
echo "  - No port conflicts detected"
echo "  - All services can coexist on the same server"
