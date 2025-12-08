#!/bin/bash
# =============================================================================
# Test Script for Drone CI Trigger Configuration
# =============================================================================
# This script validates that the .drone.yml trigger configuration includes
# support for custom events (manual triggers) to work with forked repos
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_test() {
    TESTS_RUN=$((TESTS_RUN + 1))
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

# =============================================================================
# Tests
# =============================================================================

echo "=========================================="
echo "Drone CI Trigger Configuration Tests"
echo "=========================================="
echo ""

# Test 1: Check if .drone.yml exists
print_test "Checking if .drone.yml exists"
if [ -f ".drone.yml" ]; then
    print_pass ".drone.yml file exists"
else
    print_fail ".drone.yml file not found"
fi

# Test 2: Check if .drone.yml.example exists
print_test "Checking if .drone.yml.example exists"
if [ -f ".drone.yml.example" ]; then
    print_pass ".drone.yml.example file exists"
else
    print_fail ".drone.yml.example file not found"
fi

# Test 3: Validate YAML syntax
print_test "Validating YAML syntax"
if python3 -c "import yaml; yaml.safe_load(open('.drone.yml'))" 2>/dev/null; then
    print_pass "YAML syntax is valid"
else
    print_fail "YAML syntax is invalid"
fi

# Test 4: Check if custom event is included in trigger events
print_test "Checking if 'custom' event is included in trigger configuration"
if grep -A 10 "^trigger:" .drone.yml | grep -q "\- custom"; then
    print_pass "Custom event is configured in .drone.yml"
else
    print_fail "Custom event is NOT configured in .drone.yml"
fi

# Test 5: Check if custom event is in example file
print_test "Checking if 'custom' event is included in .drone.yml.example"
if grep -A 10 "^trigger:" .drone.yml.example | grep -q "\- custom"; then
    print_pass "Custom event is configured in .drone.yml.example"
else
    print_fail "Custom event is NOT configured in .drone.yml.example"
fi

# Test 6: Check if push event is still included
print_test "Checking if 'push' event is still included"
if grep -A 10 "^trigger:" .drone.yml | grep -q "\- push"; then
    print_pass "Push event is configured"
else
    print_fail "Push event is NOT configured"
fi

# Test 7: Check if pull_request event is still included
print_test "Checking if 'pull_request' event is still included"
if grep -A 10 "^trigger:" .drone.yml | grep -q "\- pull_request"; then
    print_pass "Pull request event is configured"
else
    print_fail "Pull request event is NOT configured"
fi

# Test 8: Verify branch restrictions are commented out or removed
print_test "Checking if branch restrictions allow forked repos"
if grep -A 15 "^trigger:" .drone.yml | grep -E "^  branch:" > /dev/null 2>&1; then
    print_fail "Branch restrictions are active (may prevent forked repo builds)"
else
    print_pass "No active branch restrictions (allows forked repo builds)"
fi

# Print summary
print_summary
