#!/bin/bash
# =============================================================================
# Test Suite for Drone CI Custom Domain Configuration
# =============================================================================
# This script validates that the Drone CI custom domain configuration is
# properly set up for SSL/HTTPS with Let's Encrypt.
#
# Usage:
#   ./tests/test_drone_domain_configuration.sh [optional-domain]
#
# Example:
#   ./tests/test_drone_domain_configuration.sh drone.yourdomain.com
#
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Optional domain parameter
TEST_DOMAIN="${1:-drone.example.com}"

# Print header
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Drone CI Domain Configuration Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Test $TESTS_RUN: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} Test $TESTS_RUN: $test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Function to run a test with output
run_test_with_output() {
    local test_name="$1"
    local test_command="$2"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if eval "$test_command" 2>&1; then
        echo -e "${GREEN}✓${NC} Test $TESTS_RUN: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} Test $TESTS_RUN: $test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo -e "${BLUE}Running File Existence Tests...${NC}"
echo ""

# Test 1: Check if docker-compose.drone.domain.yml exists
run_test "docker-compose.drone.domain.yml exists" \
    "[ -f docker-compose.drone.domain.yml ]"

# Test 2: Check if .env.drone.example exists
run_test ".env.drone.example exists" \
    "[ -f .env.drone.example ]"

# Test 3: Check if docker-compose.drone.yml exists
run_test "docker-compose.drone.yml exists" \
    "[ -f docker-compose.drone.yml ]"

# Test 4: Check if Traefik dynamic config exists
run_test "docker/traefik/drone-dynamic.yml exists" \
    "[ -f docker/traefik/drone-dynamic.yml ]"

# Test 5: Check if troubleshooting guide exists
run_test "TROUBLESHOOTING_DRONE_SSL.md exists" \
    "[ -f TROUBLESHOOTING_DRONE_SSL.md ]"

# Test 6: Check if custom domain setup guide exists
run_test "docs/guides/DRONE_CI_CUSTOM_DOMAIN_SSL_SETUP.md exists" \
    "[ -f docs/guides/DRONE_CI_CUSTOM_DOMAIN_SSL_SETUP.md ]"

echo ""
echo -e "${BLUE}Running Environment Variable Tests...${NC}"
echo ""

# Test 7: Check if DRONE_DOMAIN is documented in .env.drone.example
run_test "DRONE_DOMAIN variable documented in .env.drone.example" \
    "grep -q 'DRONE_DOMAIN=' .env.drone.example"

# Test 8: Check if DRONE_ACME_EMAIL is documented in .env.drone.example
run_test "DRONE_ACME_EMAIL variable documented in .env.drone.example" \
    "grep -q 'DRONE_ACME_EMAIL=' .env.drone.example"

echo ""
echo -e "${BLUE}Running YAML Validation Tests...${NC}"
echo ""

# Test 9: Validate docker-compose.drone.yml YAML syntax
# Note: This will fail if required env vars are not set, which is expected
if docker compose -f docker-compose.drone.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Test 9: docker-compose.drone.yml has valid YAML syntax"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    # Check if it's just missing env vars (expected) vs actual YAML errors
    if docker compose -f docker-compose.drone.yml config 2>&1 | grep -q "required variable.*is missing"; then
        echo -e "${GREEN}✓${NC} Test 9: docker-compose.drone.yml has valid YAML syntax (env vars not set, expected)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} Test 9: docker-compose.drone.yml has YAML syntax errors"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi
TESTS_RUN=$((TESTS_RUN + 1))

# Test 10: Validate docker-compose.drone.domain.yml YAML syntax
# Just validate YAML structure, not variable interpolation
if command -v yamllint &> /dev/null; then
    run_test "docker-compose.drone.domain.yml has valid YAML syntax" \
        "yamllint -d relaxed docker-compose.drone.domain.yml"
else
    # Fallback: Check if Python can parse it as YAML
    if command -v python3 &> /dev/null; then
        run_test "docker-compose.drone.domain.yml has valid YAML syntax" \
            "python3 -c 'import yaml; yaml.safe_load(open(\"docker-compose.drone.domain.yml\"))'"
    else
        echo -e "${YELLOW}⊘${NC} Test $((TESTS_RUN + 1)): yamllint/python3 not available, skipping YAML validation"
        TESTS_RUN=$((TESTS_RUN + 1))
    fi
fi

# Test 11: Validate drone-dynamic.yml YAML syntax
if command -v yamllint &> /dev/null; then
    run_test "docker/traefik/drone-dynamic.yml has valid YAML syntax" \
        "yamllint -d relaxed docker/traefik/drone-dynamic.yml"
else
    echo -e "${YELLOW}⊘${NC} Test $((TESTS_RUN + 1)): yamllint not installed, skipping YAML syntax validation"
    TESTS_RUN=$((TESTS_RUN + 1))
fi

echo ""
echo -e "${BLUE}Running Configuration Tests...${NC}"
echo ""

# Test 12: Check if domain override has Host() matcher
run_test "docker-compose.drone.domain.yml contains Host() matcher" \
    "grep -q 'Host(\`\${DRONE_DOMAIN}\`)' docker-compose.drone.domain.yml"

# Test 13: Check if drone-server service is defined in override
run_test "docker-compose.drone.domain.yml defines drone-server service" \
    "grep -q 'drone-server:' docker-compose.drone.domain.yml"

# Test 14: Check if TLS is configured in override
run_test "docker-compose.drone.domain.yml configures TLS" \
    "grep -q 'tls=true' docker-compose.drone.domain.yml"

# Test 15: Check if certresolver is configured in override
run_test "docker-compose.drone.domain.yml configures certresolver" \
    "grep -q 'certresolver=letsencrypt' docker-compose.drone.domain.yml"

echo ""
echo -e "${BLUE}Running Traefik Configuration Tests...${NC}"
echo ""

# Test 16: Check if compression middleware is defined
run_test "drone-dynamic.yml defines compression middleware" \
    "grep -q 'compression-drone:' docker/traefik/drone-dynamic.yml"

# Test 17: Check if security headers middleware is defined
run_test "drone-dynamic.yml defines security headers middleware" \
    "grep -q 'security-headers-drone:' docker/traefik/drone-dynamic.yml"

# Test 18: Check if body size middleware is defined
run_test "drone-dynamic.yml defines body size middleware" \
    "grep -q 'body-size-drone:' docker/traefik/drone-dynamic.yml"

echo ""
echo -e "${BLUE}Running Docker Compose Override Tests...${NC}"
echo ""

# Test 19: Check if .gitignore includes drone override file
run_test ".gitignore includes docker-compose.drone.override.yml" \
    "grep -q 'docker-compose.drone.override.yml' .gitignore"

# Test 20: Check if override file instructions are in documentation
run_test "TROUBLESHOOTING_DRONE_SSL.md mentions override file" \
    "grep -q 'docker-compose.drone.override.yml' TROUBLESHOOTING_DRONE_SSL.md"

echo ""
echo -e "${BLUE}Running Label Tests...${NC}"
echo ""

# Test 21: Check if drone-traefik has Let's Encrypt configuration
run_test "docker-compose.drone.yml configures Let's Encrypt" \
    "grep -q 'certificatesresolvers.letsencrypt.acme' docker-compose.drone.yml"

# Test 22: Check if drone-server has Traefik labels
run_test "docker-compose.drone.yml has Traefik labels on drone-server" \
    "sed -n '/^  drone-server:/,/^  [a-z]/p' docker-compose.drone.yml | grep -q 'traefik.enable=true'"

# Test 23: Check if HTTP to HTTPS redirect is configured
run_test "docker-compose.drone.yml configures HTTP to HTTPS redirect" \
    "grep -q 'redirections.entrypoint.to=websecure' docker-compose.drone.yml"

# Test 24: Check if websecure entrypoint is configured
run_test "docker-compose.drone.yml configures websecure entrypoint" \
    "grep -q 'entrypoints.websecure.address=:443' docker-compose.drone.yml"

echo ""
echo -e "${BLUE}Running Documentation Tests...${NC}"
echo ""

# Test 25: Check if DRONE_CI_README.md mentions custom domains
run_test "DRONE_CI_README.md mentions custom domain setup" \
    "grep -q 'Custom Domain' DRONE_CI_README.md"

# Test 26: Check if custom domain setup guide has prerequisites section
run_test "Custom domain guide has prerequisites section" \
    "grep -q '## Prerequisites' docs/guides/DRONE_CI_CUSTOM_DOMAIN_SSL_SETUP.md"

# Test 27: Check if troubleshooting guide has common issues section
run_test "Troubleshooting guide has common issues section" \
    "grep -q '## Common Issues' TROUBLESHOOTING_DRONE_SSL.md"

echo ""
echo -e "${BLUE}Running Optional Domain-Specific Tests...${NC}"
echo ""

if [ "$TEST_DOMAIN" != "drone.example.com" ]; then
    echo -e "${YELLOW}Testing with domain: $TEST_DOMAIN${NC}"
    
    # Test 28: Validate complete configuration with provided domain
    run_test "Configuration validates with domain $TEST_DOMAIN" \
        "DRONE_DOMAIN=$TEST_DOMAIN DRONE_ACME_EMAIL=test@$TEST_DOMAIN docker compose -f docker-compose.drone.yml -f docker-compose.drone.domain.yml config > /dev/null 2>&1"
    
    # Test 29: Check if Host rule includes the domain
    if [ -f docker-compose.drone.override.yml ]; then
        run_test "Override file contains correct domain" \
            "grep -q \"Host(\\\`$TEST_DOMAIN\\\`)\" docker-compose.drone.override.yml"
    else
        echo -e "${YELLOW}⊘${NC} Test $((TESTS_RUN + 1)): docker-compose.drone.override.yml not found (expected for fresh setup)"
        TESTS_RUN=$((TESTS_RUN + 1))
    fi
else
    echo -e "${YELLOW}⊘${NC} Skipping domain-specific tests (no domain provided)"
    echo -e "${YELLOW}  Run with: ./tests/test_drone_domain_configuration.sh your-domain.com${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests:  ${TESTS_RUN}"
echo -e "${GREEN}Passed:       ${TESTS_PASSED}${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed:       ${TESTS_FAILED}${NC}"
else
    echo -e "Failed:       ${TESTS_FAILED}"
fi
echo ""

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Set DRONE_DOMAIN and DRONE_ACME_EMAIL in .env.drone"
    echo "2. Copy docker-compose.drone.domain.yml to docker-compose.drone.override.yml"
    echo "3. Deploy: docker compose -f docker-compose.drone.yml up -d"
    echo "4. Monitor: docker compose -f docker-compose.drone.yml logs -f drone-traefik"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the errors above.${NC}"
    echo ""
    exit 1
fi
