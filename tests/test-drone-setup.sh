#!/bin/bash
# =============================================================================
# Test Script for Drone CI Setup
# =============================================================================
# This script validates the Drone CI setup without actually starting services
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_test() {
    echo -e "${BLUE}[TEST ${TESTS_RUN}]${NC} $1"
}

print_pass() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "  ${GREEN}✓ PASS${NC}: $1"
}

print_fail() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "  ${RED}✗ FAIL${NC}: $1"
}

print_summary() {
    echo ""
    echo "=========================================="
    echo "Test Summary"
    echo "=========================================="
    echo "Total Tests: $TESTS_RUN"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "\n${RED}Some tests failed!${NC}"
        return 1
    fi
}

# Navigate to project root
cd "$(dirname "$0")/.."

echo "=========================================="
echo "Drone CI Setup Validation Tests"
echo "=========================================="
echo ""

# Test 1: Check required files exist
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Checking required files exist"

if [ -f "docker-compose.drone.yml" ]; then
    print_pass "docker-compose.drone.yml exists"
else
    print_fail "docker-compose.drone.yml is missing"
fi

if [ -f ".env.drone.example" ]; then
    print_pass ".env.drone.example exists"
else
    print_fail ".env.drone.example is missing"
fi

if [ -f ".drone.yml.example" ]; then
    print_pass ".drone.yml.example exists"
else
    print_fail ".drone.yml.example is missing"
fi

if [ -f "docs/guides/DRONE_CI_SETUP.md" ]; then
    print_pass "DRONE_CI_SETUP.md exists"
else
    print_fail "DRONE_CI_SETUP.md is missing"
fi

if [ -f "scripts/setup-drone.sh" ]; then
    print_pass "setup-drone.sh exists"
else
    print_fail "setup-drone.sh is missing"
fi

# Test 2: Check docker-compose syntax
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Validating docker-compose.drone.yml syntax"

# Create temporary env file and export variables for validation
touch .env.drone
export DRONE_GITHUB_CLIENT_ID=test
export DRONE_GITHUB_CLIENT_SECRET=test
export DRONE_SERVER_HOST=localhost:8080
export DRONE_RPC_SECRET=test
export DRONE_POSTGRES_PASSWORD=test

if docker compose -f docker-compose.drone.yml config > /dev/null 2>&1; then
    print_pass "docker-compose.drone.yml is valid"
else
    print_fail "docker-compose.drone.yml has syntax errors"
fi

rm -f .env.drone
unset DRONE_GITHUB_CLIENT_ID DRONE_GITHUB_CLIENT_SECRET DRONE_SERVER_HOST DRONE_RPC_SECRET DRONE_POSTGRES_PASSWORD

# Test 3: Check port configuration
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Verifying port configuration"

if grep -q '"8080:80"' docker-compose.drone.yml; then
    print_pass "Drone CI uses port 8080 (no conflict with NoteHub port 80)"
else
    print_fail "Port configuration incorrect in docker-compose.drone.yml"
fi

# Test 4: Check network configuration
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Verifying network isolation"

if grep -q "drone-network:" docker-compose.drone.yml; then
    print_pass "Drone CI uses separate network (drone-network)"
else
    print_fail "Network configuration missing"
fi

# Test 5: Check service definitions
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Checking service definitions"

services_count=$(grep -c "^\s*drone-" docker-compose.drone.yml || true)
if [ "$services_count" -ge 3 ]; then
    print_pass "All required services defined (server, runner, db)"
else
    print_fail "Missing services in docker-compose.drone.yml"
fi

# Test 6: Check environment variables
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Validating environment variables"

required_vars=(
    "DRONE_GITHUB_CLIENT_ID"
    "DRONE_GITHUB_CLIENT_SECRET"
    "DRONE_SERVER_HOST"
    "DRONE_RPC_SECRET"
    "DRONE_POSTGRES_PASSWORD"
)

for var in "${required_vars[@]}"; do
    if grep -q "$var" .env.drone.example; then
        print_pass "$var is documented in .env.drone.example"
    else
        print_fail "$var is missing from .env.drone.example"
    fi
done

# Test 7: Check setup script
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Validating setup script"

if [ -x "scripts/setup-drone.sh" ]; then
    print_pass "setup-drone.sh is executable"
else
    print_fail "setup-drone.sh is not executable"
fi

if bash -n scripts/setup-drone.sh 2>/dev/null; then
    print_pass "setup-drone.sh has valid syntax"
else
    print_fail "setup-drone.sh has syntax errors"
fi

# Test 8: Check documentation
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Validating documentation"

if grep -q "8080" docs/guides/DRONE_CI_SETUP.md; then
    print_pass "Documentation mentions correct port (8080)"
else
    print_fail "Port not documented correctly"
fi

if grep -q "port" docs/guides/DRONE_CI_SETUP.md; then
    print_pass "Documentation includes port configuration"
else
    print_fail "Port configuration not documented"
fi

# Test 9: Check .gitignore
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Verifying .gitignore configuration"

if grep -q ".env.drone" .gitignore; then
    print_pass ".env.drone is in .gitignore"
else
    print_fail ".env.drone not in .gitignore (security risk!)"
fi

# Test 10: Check example pipeline
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Validating example .drone.yml"

if grep -q "kind: pipeline" .drone.yml.example; then
    print_pass ".drone.yml.example has valid pipeline structure"
else
    print_fail ".drone.yml.example is invalid"
fi

# Test 11: Port conflict check
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Ensuring no port conflicts with NoteHub"

notehub_port=$(grep -E '^\s*-\s*"[0-9]+:[0-9]+"' docker-compose.yml | head -1 | grep -o '"[0-9]\+:' | tr -d '":' || echo "80")
drone_port=$(grep -E '^\s*-\s*"[0-9]+:[0-9]+"' docker-compose.drone.yml | head -1 | grep -o '"[0-9]\+:' | tr -d '":' || echo "8080")

if [ "$notehub_port" != "$drone_port" ]; then
    print_pass "No port conflict: NoteHub uses $notehub_port, Drone uses $drone_port"
else
    print_fail "Port conflict detected: Both use port $notehub_port"
fi

# Test 12: Check volumes
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Verifying volume configuration"

if grep -q "drone-data:" docker-compose.drone.yml && \
   grep -q "drone-postgres-data:" docker-compose.drone.yml; then
    print_pass "Data persistence volumes configured"
else
    print_fail "Volume configuration incomplete"
fi

# Test 13: Check healthchecks
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Verifying healthcheck configuration"

healthcheck_count=$(grep -c "healthcheck:" docker-compose.drone.yml || true)
if [ "$healthcheck_count" -ge 2 ]; then
    print_pass "Healthchecks configured for services"
else
    print_fail "Healthchecks missing or incomplete"
fi

# Test 14: Check README updates
TESTS_RUN=$((TESTS_RUN + 1))
print_test "Verifying README documentation"

if grep -q "Drone" README.md && grep -q "8080" README.md; then
    print_pass "README includes Drone CI information"
else
    print_fail "README not updated with Drone CI information"
fi

# Print summary
print_summary
