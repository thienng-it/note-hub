#!/bin/bash
# =============================================================================
# Test Script: Domain Configuration for SSL Certificates
# =============================================================================
# This script demonstrates and validates the custom domain SSL configuration
# for NoteHub deployments.
#
# Usage:
#   ./tests/test_domain_configuration.sh [domain]
#
# Examples:
#   ./tests/test_domain_configuration.sh note-hub.duckdns.org
#   ./tests/test_domain_configuration.sh yourdomain.com
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - Domain configured and pointing to server
#   - Ports 80 and 443 open
# =============================================================================

set -e

DOMAIN="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "\n${BLUE}===================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Test 1: Validate required files exist
test_required_files() {
    print_header "Test 1: Validating Required Files"
    
    local files=(
        "docker-compose.yml"
        "docker-compose.domain.yml"
        ".env.example"
        "docs/guides/CUSTOM_DOMAIN_SSL_SETUP.md"
        "TROUBLESHOOTING_SSL.md"
    )
    
    for file in "${files[@]}"; do
        if [ -f "$PROJECT_DIR/$file" ]; then
            print_success "$file exists"
        else
            print_error "$file is missing"
            exit 1
        fi
    done
}

# Test 2: Validate docker-compose.domain.yml syntax
test_domain_compose_syntax() {
    print_header "Test 2: Validating docker-compose.domain.yml Syntax"
    
    cd "$PROJECT_DIR"
    # Test with main compose file + domain override (as it would be used)
    # Set all required env vars for validation
    if DOMAIN=test.example.com \
       NOTES_ADMIN_PASSWORD=testpass123 \
       SECRET_KEY=test-secret-key \
       MYSQL_ROOT_PASSWORD=testroot \
       MYSQL_USER=testuser \
       MYSQL_PASSWORD=testpass \
       MYSQL_DATABASE=testdb \
       docker compose -f docker-compose.yml -f docker-compose.domain.yml config > /dev/null 2>&1; then
        print_success "docker-compose.domain.yml syntax is valid (with base file)"
    else
        print_warning "docker-compose.domain.yml validation requires .env file with all variables"
        print_info "Checking YAML structure only..."
        # At minimum, check that the file is valid YAML
        if python3 -c "import yaml; yaml.safe_load(open('docker-compose.domain.yml'))" 2>/dev/null; then
            print_success "docker-compose.domain.yml is valid YAML"
        else
            print_error "docker-compose.domain.yml has YAML syntax errors"
            exit 1
        fi
    fi
}

# Test 3: Check DOMAIN variable in .env.example
test_env_example() {
    print_header "Test 3: Checking .env.example Configuration"
    
    if grep -q "^# DOMAIN=" "$PROJECT_DIR/.env.example" || grep -q "^DOMAIN=" "$PROJECT_DIR/.env.example"; then
        print_success "DOMAIN variable documented in .env.example"
    else
        print_error "DOMAIN variable not found in .env.example"
        exit 1
    fi
    
    if grep -q "ACME_EMAIL" "$PROJECT_DIR/.env.example"; then
        print_success "ACME_EMAIL variable documented in .env.example"
    else
        print_error "ACME_EMAIL variable not found in .env.example"
        exit 1
    fi
}

# Test 4: Verify docker-compose.override.yml is gitignored
test_gitignore() {
    print_header "Test 4: Verifying .gitignore Configuration"
    
    if grep -q "docker-compose.override.yml" "$PROJECT_DIR/.gitignore"; then
        print_success "docker-compose.override.yml is in .gitignore"
    else
        print_error "docker-compose.override.yml not found in .gitignore"
        exit 1
    fi
}

# Test 5: Validate Host rules in domain configuration
test_host_rules() {
    print_header "Test 5: Validating Host Rules in Domain Configuration"
    
    # Check for Host() rules in docker-compose.domain.yml
    if grep -q 'Host(`${DOMAIN}`)' "$PROJECT_DIR/docker-compose.domain.yml"; then
        print_success "Host rules found in docker-compose.domain.yml"
    else
        print_error "Host rules not found in docker-compose.domain.yml"
        exit 1
    fi
    
    # Count services with Host rules
    local count=$(grep -c 'Host(`${DOMAIN}`)' "$PROJECT_DIR/docker-compose.domain.yml" || echo "0")
    print_info "Found $count Host rule configurations"
    
    if [ "$count" -lt 5 ]; then
        print_warning "Expected at least 5 Host rule configurations (frontend, backend, prod, mysql)"
    fi
}

# Test 6: Verify TLS certresolver configuration
test_certresolver() {
    print_header "Test 6: Verifying TLS Certificate Resolver"
    
    if grep -q "tls.certresolver=letsencrypt" "$PROJECT_DIR/docker-compose.domain.yml"; then
        print_success "TLS certresolver configured in domain file"
    else
        print_error "TLS certresolver not found in domain file"
        exit 1
    fi
}

# Test 7: Documentation completeness
test_documentation() {
    print_header "Test 7: Checking Documentation Completeness"
    
    # Check CUSTOM_DOMAIN_SSL_SETUP.md
    local doc="$PROJECT_DIR/docs/guides/CUSTOM_DOMAIN_SSL_SETUP.md"
    local required_sections=(
        "Quick Fix"
        "DuckDNS"
        "Troubleshooting"
        "docker-compose.override.yml"
    )
    
    for section in "${required_sections[@]}"; do
        if grep -qi "$section" "$doc"; then
            print_success "Documentation includes: $section"
        else
            print_warning "Documentation missing section: $section"
        fi
    done
}

# Test 8: Validate with actual domain (optional)
test_with_domain() {
    if [ -z "$DOMAIN" ]; then
        print_info "Skipping domain validation (no domain provided)"
        return 0
    fi
    
    print_header "Test 8: Validating Domain Configuration"
    
    # Check if domain resolves
    print_info "Checking DNS resolution for $DOMAIN..."
    if host "$DOMAIN" > /dev/null 2>&1; then
        print_success "Domain $DOMAIN resolves"
        local ip=$(host "$DOMAIN" | grep "has address" | awk '{print $4}' | head -1)
        print_info "Domain points to: $ip"
    else
        print_warning "Domain $DOMAIN does not resolve (may be normal if not configured yet)"
    fi
    
    # Check if .env exists and has DOMAIN set
    if [ -f "$PROJECT_DIR/.env" ]; then
        if grep -q "^DOMAIN=" "$PROJECT_DIR/.env"; then
            local env_domain=$(grep "^DOMAIN=" "$PROJECT_DIR/.env" | cut -d'=' -f2)
            if [ "$env_domain" = "$DOMAIN" ]; then
                print_success "DOMAIN=$DOMAIN is set in .env"
            else
                print_warning ".env has DOMAIN=$env_domain (different from test domain)"
            fi
        else
            print_info "DOMAIN not set in .env (this is normal for localhost)"
        fi
    else
        print_info ".env file not found (expected for fresh installs)"
    fi
    
    # Check if override file exists
    if [ -f "$PROJECT_DIR/docker-compose.override.yml" ]; then
        print_success "docker-compose.override.yml exists"
        
        # Verify it has Host rules
        if grep -q "Host(" "$PROJECT_DIR/docker-compose.override.yml"; then
            print_success "Override file contains Host rules"
        else
            print_warning "Override file exists but may not have Host rules"
        fi
    else
        print_info "docker-compose.override.yml not found (run: cp docker-compose.domain.yml docker-compose.override.yml)"
    fi
}

# Main test execution
main() {
    print_header "NoteHub Custom Domain SSL Configuration Test Suite"
    
    if [ -n "$DOMAIN" ]; then
        print_info "Testing with domain: $DOMAIN"
    else
        print_info "Testing configuration files only (no domain provided)"
    fi
    
    test_required_files
    test_domain_compose_syntax
    test_env_example
    test_gitignore
    test_host_rules
    test_certresolver
    test_documentation
    test_with_domain
    
    print_header "Test Suite Complete"
    print_success "All tests passed!"
    
    if [ -z "$DOMAIN" ]; then
        echo ""
        print_info "To test with a specific domain, run:"
        echo "  $0 your-domain.com"
        echo ""
    fi
    
    if [ ! -f "$PROJECT_DIR/docker-compose.override.yml" ]; then
        echo ""
        print_info "To configure custom domain SSL:"
        echo "  1. Set DOMAIN in .env: echo 'DOMAIN=your-domain.com' >> .env"
        echo "  2. Copy override file: cp docker-compose.domain.yml docker-compose.override.yml"
        echo "  3. Restart services: docker compose up -d"
        echo ""
    fi
}

# Run tests
cd "$PROJECT_DIR"
main "$@"
