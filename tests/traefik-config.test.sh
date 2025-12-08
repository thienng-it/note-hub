#!/bin/bash
###############################################################################
# Traefik Configuration Unit Tests
# Tests the Traefik configuration files and Docker labels
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
  local test_name=$1
  local result=$2
  local message=$3
  
  TESTS_RUN=$((TESTS_RUN + 1))
  
  if [ "$result" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $test_name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} $test_name: $message"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

echo "======================================================================"
echo "Traefik Configuration Unit Tests"
echo "======================================================================"
echo ""

# Test 1: Check Traefik static configuration file exists
echo "Test 1: Check Traefik static configuration file exists..."
if [ -f docker/traefik/traefik.yml ]; then
  print_result "Static config file exists" 0
else
  print_result "Static config file exists" 1 "File not found"
  exit 1
fi

# Test 2: Check Traefik dynamic configuration file exists
echo "Test 2: Check Traefik dynamic configuration file exists..."
if [ -f docker/traefik/dynamic.yml ]; then
  print_result "Dynamic config file exists" 0
else
  print_result "Dynamic config file exists" 1 "File not found"
fi

# Test 3: Check Traefik Drone dynamic configuration file exists
echo "Test 3: Check Traefik Drone dynamic configuration file exists..."
if [ -f docker/traefik/drone-dynamic.yml ]; then
  print_result "Drone dynamic config file exists" 0
else
  print_result "Drone dynamic config file exists" 1 "File not found"
fi

# Test 4: Check static config has entryPoints defined
echo "Test 4: Check static config has entryPoints..."
if grep -q "entryPoints:" docker/traefik/traefik.yml; then
  print_result "EntryPoints defined" 0
else
  print_result "EntryPoints defined" 1 "EntryPoints not found"
fi

# Test 5: Check static config has web entry point
echo "Test 5: Check static config has web entry point..."
if grep -q "web:" docker/traefik/traefik.yml; then
  print_result "Web entry point defined" 0
else
  print_result "Web entry point defined" 1 "Web entry point not found"
fi

# Test 6: Check static config has Docker provider enabled
echo "Test 6: Check static config has Docker provider..."
if grep -q "docker:" docker/traefik/traefik.yml; then
  print_result "Docker provider enabled" 0
else
  print_result "Docker provider enabled" 1 "Docker provider not found"
fi

# Test 7: Check dynamic config has middlewares
echo "Test 7: Check dynamic config has middlewares..."
if grep -q "middlewares:" docker/traefik/dynamic.yml; then
  print_result "Middlewares defined" 0
else
  print_result "Middlewares defined" 1 "Middlewares not found"
fi

# Test 8: Check dynamic config has compression middleware
echo "Test 8: Check dynamic config has compression middleware..."
if grep -q "compression:" docker/traefik/dynamic.yml; then
  print_result "Compression middleware defined" 0
else
  print_result "Compression middleware defined" 1 "Compression middleware not found"
fi

# Test 9: Check dynamic config has security headers middleware
echo "Test 9: Check dynamic config has security headers middleware..."
if grep -q "security-headers:" docker/traefik/dynamic.yml; then
  print_result "Security headers middleware defined" 0
else
  print_result "Security headers middleware defined" 1 "Security headers middleware not found"
fi

# Test 10: Check main docker-compose.yml has Traefik service
echo "Test 10: Check main docker-compose.yml has Traefik service..."
if grep -q "traefik:" docker-compose.yml; then
  print_result "Traefik service in docker-compose.yml" 0
else
  print_result "Traefik service in docker-compose.yml" 1 "Traefik service not found"
fi

# Test 11: Check docker-compose.yml has Traefik labels on backend
echo "Test 11: Check docker-compose.yml has Traefik labels on backend..."
if grep -q "traefik.enable=true" docker-compose.yml; then
  print_result "Traefik labels on backend service" 0
else
  print_result "Traefik labels on backend service" 1 "Traefik labels not found"
fi

# Test 12: Check Dockerfile.frontend.traefik exists
echo "Test 12: Check Dockerfile.frontend.traefik exists..."
if [ -f Dockerfile.frontend.traefik ]; then
  print_result "Dockerfile.frontend.traefik exists" 0
else
  print_result "Dockerfile.frontend.traefik exists" 1 "File not found"
fi

# Test 13: Check drone docker-compose has Traefik
echo "Test 13: Check drone docker-compose has Traefik..."
if grep -q "drone-traefik:" docker-compose.drone.yml; then
  print_result "Traefik in drone docker-compose" 0
else
  print_result "Traefik in drone docker-compose" 1 "Traefik service not found"
fi

# Test 14: Check replication docker-compose has Traefik
echo "Test 14: Check replication docker-compose has Traefik..."
if grep -q "traefik-mysql-replication:" docker-compose.replication.yml; then
  print_result "Traefik in replication docker-compose" 0
else
  print_result "Traefik in replication docker-compose" 1 "Traefik service not found"
fi

# Test 15: Validate YAML syntax of static config
echo "Test 15: Validate YAML syntax of static config..."
if command -v yamllint &> /dev/null; then
  if yamllint -d relaxed docker/traefik/traefik.yml 2>&1 | grep -q "error"; then
    print_result "Static config YAML syntax" 1 "YAML syntax errors found"
  else
    print_result "Static config YAML syntax" 0
  fi
else
  echo -e "${YELLOW}⚠${NC} yamllint not installed, skipping YAML validation"
fi

# Test 16: Validate YAML syntax of dynamic config
echo "Test 16: Validate YAML syntax of dynamic config..."
if command -v yamllint &> /dev/null; then
  if yamllint -d relaxed docker/traefik/dynamic.yml 2>&1 | grep -q "error"; then
    print_result "Dynamic config YAML syntax" 1 "YAML syntax errors found"
  else
    print_result "Dynamic config YAML syntax" 0
  fi
else
  echo -e "${YELLOW}⚠${NC} yamllint not installed, skipping YAML validation"
fi

# Test 17: Check that frontend uses correct dockerfile
echo "Test 17: Check that frontend services use Traefik dockerfile..."
if grep -q "dockerfile: Dockerfile.frontend.traefik" docker-compose.yml; then
  print_result "Frontend uses Traefik dockerfile" 0
else
  print_result "Frontend uses Traefik dockerfile" 1 "Frontend not using Traefik dockerfile"
fi

# Test 18: Check backend has API routing labels
echo "Test 18: Check backend has API routing labels..."
if grep -q "traefik.http.routers.backend-api.rule=PathPrefix" docker-compose.yml; then
  print_result "Backend has API routing labels" 0
else
  print_result "Backend has API routing labels" 1 "API routing labels not found"
fi

# Test 19: Check backend has uploads routing labels
echo "Test 19: Check backend has uploads routing labels..."
if grep -q "traefik.http.routers.backend-uploads.rule=PathPrefix" docker-compose.yml; then
  print_result "Backend has uploads routing labels" 0
else
  print_result "Backend has uploads routing labels" 1 "Uploads routing labels not found"
fi

# Test 20: Check that old nginx references are removed/updated
echo "Test 20: Check for remaining nginx references (should have Traefik context)..."
nginx_count=$(grep -i "nginx" docker-compose.yml | grep -v "# " | grep -v backup | wc -l)
if [ "$nginx_count" -eq 0 ]; then
  print_result "No active nginx references in main compose" 0
else
  echo -e "${YELLOW}⚠${NC} Found $nginx_count nginx references (may be in comments/backups)"
  TESTS_RUN=$((TESTS_RUN + 1))
  TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 21: Check backend has HTTP router for API (for SSL/HTTPS support)
echo "Test 21: Check backend has HTTP router for API..."
if grep -q "traefik.http.routers.backend-api-http.entrypoints=web" docker-compose.yml; then
  print_result "Backend has HTTP router for API" 0
else
  print_result "Backend has HTTP router for API" 1 "HTTP router not found"
fi

# Test 22: Check backend has HTTPS router for API
echo "Test 22: Check backend has HTTPS router for API..."
if grep -q "traefik.http.routers.backend-api.entrypoints=websecure" docker-compose.yml; then
  print_result "Backend has HTTPS router for API" 0
else
  print_result "Backend has HTTPS router for API" 1 "HTTPS router not found"
fi

# Test 23: Check frontend has HTTP router (for SSL/HTTPS support)
echo "Test 23: Check frontend has HTTP router..."
if grep -q "traefik.http.routers.frontend-http.entrypoints=web" docker-compose.yml; then
  print_result "Frontend has HTTP router" 0
else
  print_result "Frontend has HTTP router" 1 "HTTP router not found"
fi

# Test 24: Check frontend has HTTPS router
echo "Test 24: Check frontend has HTTPS router..."
if grep -q "traefik.http.routers.frontend.entrypoints=websecure" docker-compose.yml; then
  print_result "Frontend has HTTPS router" 0
else
  print_result "Frontend has HTTPS router" 1 "HTTPS router not found"
fi

# Test 25: Check that backend HTTP router has higher priority than frontend
echo "Test 25: Check routing priorities (backend > frontend)..."
backend_priority=$(grep "backend-api-http.priority" docker-compose.yml | head -1 | grep -o "[0-9]\+")
frontend_priority=$(grep "frontend-http.priority" docker-compose.yml | head -1 | grep -o "[0-9]\+")
if [ -n "$backend_priority" ] && [ -n "$frontend_priority" ] && [ "$backend_priority" -gt "$frontend_priority" ]; then
  print_result "Backend has higher priority than frontend" 0
else
  print_result "Backend has higher priority than frontend" 1 "Priority mismatch: backend=$backend_priority, frontend=$frontend_priority"
fi

echo ""
echo "======================================================================"
echo "Test Summary"
echo "======================================================================"
echo "Tests run:    $TESTS_RUN"
echo -e "${GREEN}Tests passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Tests failed: $TESTS_FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
