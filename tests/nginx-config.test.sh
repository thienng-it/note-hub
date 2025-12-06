#!/bin/bash
###############################################################################
# Nginx Configuration Unit Tests
# Tests the nginx configuration template and variable substitution
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
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
echo "Nginx Configuration Template Unit Tests"
echo "======================================================================"
echo ""

# Test 1: Check template file exists
echo "Test 1: Check nginx template file exists..."
if [ -f docker/nginx.conf.template ]; then
  print_result "Template file exists" 0
else
  print_result "Template file exists" 1 "File not found"
  exit 1
fi

# Test 2: Check template has BACKEND_HOST variable
echo "Test 2: Check template has BACKEND_HOST variable..."
if grep -q '\${BACKEND_HOST}' docker/nginx.conf.template; then
  print_result "Template has BACKEND_HOST variable" 0
else
  print_result "Template has BACKEND_HOST variable" 1 "Variable not found"
fi

# Test 3: Check template has BACKEND_PORT variable
echo "Test 3: Check template has BACKEND_PORT variable..."
if grep -q '\${BACKEND_PORT}' docker/nginx.conf.template; then
  print_result "Template has BACKEND_PORT variable" 0
else
  print_result "Template has BACKEND_PORT variable" 1 "Variable not found"
fi

# Test 4: Check template has /api/ location block
echo "Test 4: Check template has /api/ location block..."
if grep -q 'location /api/' docker/nginx.conf.template; then
  print_result "Template has /api/ location" 0
else
  print_result "Template has /api/ location" 1 "Location block not found"
fi

# Test 5: Check template has /uploads/ location block
echo "Test 5: Check template has /uploads/ location block..."
if grep -q 'location /uploads/' docker/nginx.conf.template; then
  print_result "Template has /uploads/ location" 0
else
  print_result "Template has /uploads/ location" 1 "Location block not found"
fi

# Test 6: Check template has /health location block
echo "Test 6: Check template has /health location block..."
if grep -q 'location /health' docker/nginx.conf.template; then
  print_result "Template has /health location" 0
else
  print_result "Template has /health location" 1 "Location block not found"
fi

# Test 7: Count proxy_pass directives
echo "Test 7: Count proxy_pass directives (should be 3)..."
PROXY_COUNT=$(grep -c 'proxy_pass' docker/nginx.conf.template)
if [ "$PROXY_COUNT" -eq 3 ]; then
  print_result "Correct number of proxy_pass directives" 0
else
  print_result "Correct number of proxy_pass directives" 1 "Expected 3, found $PROXY_COUNT"
fi

# Test 8: Verify all proxy_pass use variables
echo "Test 8: Verify all proxy_pass use variables..."
PROXIES_WITH_VARS=$(grep 'proxy_pass' docker/nginx.conf.template | grep -c '\${BACKEND_HOST}:\${BACKEND_PORT}')
if [ "$PROXIES_WITH_VARS" -eq 3 ]; then
  print_result "All proxy_pass use variables" 0
else
  print_result "All proxy_pass use variables" 1 "Expected 3, found $PROXIES_WITH_VARS"
fi

# Test 9: Test variable substitution with default values
echo "Test 9: Test variable substitution with default values..."
export BACKEND_HOST=backend
export BACKEND_PORT=5000
SUBSTITUTED=$(envsubst '${BACKEND_HOST} ${BACKEND_PORT}' < docker/nginx.conf.template)
if echo "$SUBSTITUTED" | grep -q 'proxy_pass http://backend:5000'; then
  print_result "Variable substitution with defaults" 0
else
  print_result "Variable substitution with defaults" 1 "Substitution failed"
fi

# Test 10: Test variable substitution with custom values
echo "Test 10: Test variable substitution with custom values..."
export BACKEND_HOST=backend-prod
export BACKEND_PORT=8080
SUBSTITUTED=$(envsubst '${BACKEND_HOST} ${BACKEND_PORT}' < docker/nginx.conf.template)
if echo "$SUBSTITUTED" | grep -q 'proxy_pass http://backend-prod:8080'; then
  print_result "Variable substitution with custom values" 0
else
  print_result "Variable substitution with custom values" 1 "Substitution failed"
fi

# Test 11: Check template has security headers
echo "Test 11: Check template has security headers..."
if grep -q 'X-Frame-Options' docker/nginx.conf.template; then
  print_result "Template has security headers" 0
else
  print_result "Template has security headers" 1 "Security headers not found"
fi

# Test 12: Check template has gzip compression
echo "Test 12: Check template has gzip compression..."
if grep -q 'gzip on' docker/nginx.conf.template; then
  print_result "Template has gzip compression" 0
else
  print_result "Template has gzip compression" 1 "Gzip configuration not found"
fi

# Test 13: Check static file caching configuration
echo "Test 13: Check static file caching configuration..."
if grep -q 'location ~\*.*\\\.(js\|css\|png' docker/nginx.conf.template; then
  print_result "Template has static file caching" 0
else
  print_result "Template has static file caching" 1 "Cache configuration not found"
fi

# Test 14: Verify no hardcoded backend references
echo "Test 14: Verify no hardcoded backend references..."
HARDCODED=$(grep 'proxy_pass' docker/nginx.conf.template | grep -c 'http://backend:' || true)
if [ "$HARDCODED" -eq 0 ]; then
  print_result "No hardcoded backend references" 0
else
  print_result "No hardcoded backend references" 1 "Found $HARDCODED hardcoded references"
fi

echo ""
echo "======================================================================"
echo "Test Results Summary"
echo "======================================================================"
echo ""
echo "Total tests run: $TESTS_RUN"
echo -e "${GREEN}Tests passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Tests failed: $TESTS_FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
