#!/bin/bash
###############################################################################
# Docker Compose Integration Tests
# Tests the complete Docker Compose setup for file upload functionality
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test results array
declare -a FAILED_TESTS

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
    FAILED_TESTS+=("$test_name: $message")
  fi
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to cleanup
cleanup() {
  echo ""
  echo "Cleaning up..."
  docker compose down -v 2>/dev/null || true
  rm -f test-image.png test-upload-*.json
}

# Trap cleanup on exit
trap cleanup EXIT

echo "======================================================================"
echo "Docker Compose Integration Tests - File Upload Functionality"
echo "======================================================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists docker; then
  echo -e "${RED}Error: docker is not installed${NC}"
  exit 1
fi

if ! command_exists curl; then
  echo -e "${RED}Error: curl is not installed${NC}"
  exit 1
fi

echo -e "${GREEN}All prerequisites satisfied${NC}"
echo ""

echo "======================================================================"
echo "Test Suite 1: Docker Compose Configuration Validation"
echo "======================================================================"
echo ""

# Test 1: Validate docker-compose.yml syntax
echo "Test 1: Validate docker-compose.yml syntax..."
if docker compose config --quiet 2>/dev/null; then
  print_result "docker-compose.yml syntax validation" 0
else
  print_result "docker-compose.yml syntax validation" 1 "Invalid YAML syntax"
fi

# Test 2: Check uploads volume is defined
echo "Test 2: Check uploads volume is defined..."
if docker compose config 2>/dev/null | grep -q "notehub-uploads"; then
  print_result "Uploads volume defined" 0
else
  print_result "Uploads volume defined" 1 "Volume not found in configuration"
fi

# Test 3: Check backend service has uploads volume mounted
echo "Test 3: Check backend service has uploads volume mounted..."
VOLUME_COUNT=$(docker compose config 2>/dev/null | grep -c "notehub-uploads" || true)
if [ "$VOLUME_COUNT" -ge 2 ]; then
  print_result "Backend services have uploads volume" 0
else
  print_result "Backend services have uploads volume" 1 "Volume not mounted on backend services"
fi

# Test 4: Check frontend has BACKEND_HOST environment variable
echo "Test 4: Check frontend has BACKEND_HOST environment variable..."
if docker compose config 2>/dev/null | grep -A 20 "frontend:" | grep -q "BACKEND_HOST"; then
  print_result "Frontend has BACKEND_HOST configured" 0
else
  print_result "Frontend has BACKEND_HOST configured" 1 "Environment variable not found"
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
  echo ""
  echo "Failed tests:"
  for test in "${FAILED_TESTS[@]}"; do
    echo -e "${RED}  - $test${NC}"
  done
else
  echo -e "${GREEN}All tests passed!${NC}"
fi

echo ""
echo "======================================================================"

# Exit with appropriate code
if [ $TESTS_FAILED -gt 0 ]; then
  exit 1
else
  exit 0
fi
