#!/bin/bash

# =============================================================================
# SSL/Certificate Configuration Validator
# =============================================================================
# This script validates SSL/certificate configuration for NoteHub, Drone CI,
# and monitoring services to help prevent "certificate not secure" warnings.
#
# Usage:
#   ./scripts/validate-ssl-config.sh
#   ./scripts/validate-ssl-config.sh --service notehub
#   ./scripts/validate-ssl-config.sh --service drone
#   ./scripts/validate-ssl-config.sh --service monitoring
# =============================================================================

set -e

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
OK=0

# Parse arguments
SERVICE="${1:-all}"
if [ "$1" = "--service" ]; then
    SERVICE="${2:-all}"
fi

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo ""
}

print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

print_ok() {
    echo -e "${GREEN}✅ OK: $1${NC}"
    OK=$((OK + 1))
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

check_file() {
    if [ -f "$1" ]; then
        print_ok "File exists: $1"
        return 0
    else
        print_error "File not found: $1"
        return 1
    fi
}

check_env_var() {
    local file="$1"
    local var="$2"
    local required="$3"
    
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    # Check if variable is set (not commented and not empty)
    if grep -q "^${var}=" "$file" && grep "^${var}=" "$file" | grep -v "^${var}=$" | grep -v "^${var}=\"\"$" > /dev/null 2>&1; then
        local value=$(grep "^${var}=" "$file" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        if [ -n "$value" ]; then
            print_ok "Variable set: ${var}=${value}"
            return 0
        fi
    fi
    
    if [ "$required" = "true" ]; then
        print_error "Required variable not set: ${var} in ${file}"
        return 1
    else
        print_warning "Optional variable not set: ${var} in ${file}"
        return 1
    fi
}

check_host_matcher() {
    local file="$1"
    local var="$2"
    
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    if grep -q "^${var}=Host(" "$file"; then
        local value=$(grep "^${var}=" "$file" | cut -d'=' -f2-)
        print_ok "Host() matcher configured: ${var}=${value}"
        return 0
    else
        print_error "Host() matcher NOT configured for ${var} in ${file}"
        print_info "Add this line to ${file}:"
        if [ "$var" = "DRONE_ROUTER_RULE" ]; then
            print_info "  ${var}=Host(\`drone-ci-notehub.duckdns.org\`)"
        elif [ "$var" = "GRAFANA_ROUTER_RULE" ]; then
            print_info "  ${var}=Host(\`monitoring-notehub.duckdns.org\`)"
        fi
        return 1
    fi
}

validate_notehub() {
    print_header "Validating NoteHub Configuration"
    
    if ! check_file ".env"; then
        print_error "NoteHub .env file not found. Copy .env.example to .env"
        print_info "  cp .env.example .env"
        return 1
    fi
    
    check_env_var ".env" "DOMAIN" "false"
    check_env_var ".env" "ACME_EMAIL" "false"
    
    if ! grep -q "^DOMAIN=" .env || grep "^DOMAIN=$" .env > /dev/null 2>&1; then
        print_warning "DOMAIN not set - using localhost (will show certificate warnings)"
        print_info "For production, add to .env:"
        print_info "  DOMAIN=notehub.duckdns.org"
        print_info "  ACME_EMAIL=your-email@example.com"
    else
        print_ok "NoteHub domain configuration appears correct"
        print_info "Certificates will be issued for:"
        grep "^DOMAIN=" .env | while read line; do
            domain=$(echo "$line" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
            print_info "  - https://${domain} (NoteHub)"
            print_info "  - https://monitoring.${domain} (Grafana, if monitoring deployed)"
        done
    fi
}

validate_drone() {
    print_header "Validating Drone CI Configuration"
    
    if ! check_file ".env.drone"; then
        print_error "Drone .env.drone file not found. Copy .env.drone.example to .env.drone"
        print_info "  cp .env.drone.example .env.drone"
        return 1
    fi
    
    local has_domain=false
    # Get the last occurrence of DRONE_DOMAIN (in case there are multiple)
    local domain_value=$(grep "^DRONE_DOMAIN=" .env.drone | tail -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [ -n "$domain_value" ]; then
        has_domain=true
        check_env_var ".env.drone" "DRONE_DOMAIN" "false"
    fi
    
    if [ "$has_domain" = "true" ]; then
        # Custom domain is configured - check for router rule
        if ! check_host_matcher ".env.drone" "DRONE_ROUTER_RULE"; then
            print_error "Custom domain configured but DRONE_ROUTER_RULE is missing!"
            print_error "This WILL cause 'certificate not secure' warnings!"
            print_info ""
            print_info "Fix: Add this to .env.drone (match your DRONE_DOMAIN):"
            local domain=$(grep "^DRONE_DOMAIN=" .env.drone | tail -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
            print_info "  DRONE_ROUTER_RULE=Host(\`${domain}\`)"
            print_info ""
        else
            # Verify domain and router rule match
            local domain=$(grep "^DRONE_DOMAIN=" .env.drone | tail -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
            local router=$(grep "^DRONE_ROUTER_RULE=" .env.drone | tail -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
            
            if echo "$router" | grep -q "$domain"; then
                print_ok "DRONE_DOMAIN and DRONE_ROUTER_RULE match"
            else
                print_error "DRONE_DOMAIN and DRONE_ROUTER_RULE do NOT match!"
                print_info "  DRONE_DOMAIN=${domain}"
                print_info "  DRONE_ROUTER_RULE=${router}"
                print_info "They should reference the same domain!"
            fi
        fi
        
        check_env_var ".env.drone" "DRONE_ACME_EMAIL" "false"
        check_env_var ".env.drone" "DRONE_SERVER_PROTO" "false"
        check_env_var ".env.drone" "DRONE_SERVER_HOST" "false"
    else
        print_info "Drone CI configured for localhost/IP access (no custom domain)"
        print_info "Certificate warnings are expected for localhost deployments"
    fi
}

validate_monitoring() {
    print_header "Validating Monitoring/Grafana Configuration"
    
    if ! check_file ".env"; then
        print_error "Main .env file not found. Copy .env.example to .env"
        return 1
    fi
    
    # Check if DOMAIN is set (use tail -1 to get last occurrence)
    local domain_value=$(grep "^DOMAIN=" .env 2>/dev/null | tail -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [ -z "$domain_value" ]; then
        print_warning "DOMAIN not set in .env - Grafana will use localhost"
        print_info "For production with monitoring subdomain (e.g., monitoring.notehub.duckdns.org):"
        print_info "  Add to .env: DOMAIN=notehub.duckdns.org"
        print_info ""
        print_info "For separate monitoring domain (e.g., monitoring-notehub.duckdns.org):"
        print_info "  Add to .env:"
        print_info "    GRAFANA_ROUTER_RULE=Host(\`monitoring-notehub.duckdns.org\`)"
        print_info "    GRAFANA_DOMAIN=monitoring-notehub.duckdns.org"
        print_info "    GRAFANA_ROOT_URL=https://monitoring-notehub.duckdns.org"
    else
        local domain="$domain_value"
        
        # Check if custom GRAFANA_ROUTER_RULE is set
        if grep -q "^GRAFANA_ROUTER_RULE=Host(" .env; then
            check_host_matcher ".env" "GRAFANA_ROUTER_RULE"
            local grafana_rule=$(grep "^GRAFANA_ROUTER_RULE=" .env | tail -1 | cut -d'=' -f2)
            print_info "Grafana will use custom routing: ${grafana_rule}"
        else
            print_ok "Grafana will use default subdomain routing"
            print_info "Grafana will be accessible at: https://monitoring.${domain}"
            print_info "This is configured automatically using DOMAIN variable"
        fi
    fi
}

validate_dns() {
    print_header "DNS Validation (Optional)"
    
    local domains=()
    
    # Collect domains to check (use tail -1 to get last occurrence)
    if [ -f ".env" ]; then
        local domain=$(grep "^DOMAIN=" .env 2>/dev/null | tail -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        if [ -n "$domain" ]; then
            domains+=("$domain")
            domains+=("monitoring.$domain")
        fi
    fi
    
    if [ -f ".env.drone" ]; then
        local domain=$(grep "^DRONE_DOMAIN=" .env.drone 2>/dev/null | tail -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        if [ -n "$domain" ]; then
            domains+=("$domain")
        fi
    fi
    
    if [ ${#domains[@]} -eq 0 ]; then
        print_info "No domains configured to validate"
        return 0
    fi
    
    print_info "Checking DNS resolution for configured domains..."
    for domain in "${domains[@]}"; do
        if command -v nslookup > /dev/null 2>&1; then
            if nslookup "$domain" > /dev/null 2>&1; then
                local ip=$(nslookup "$domain" | grep -A1 "Name:" | grep "Address:" | tail -1 | awk '{print $2}')
                print_ok "DNS resolves: $domain → $ip"
            else
                print_warning "DNS does not resolve: $domain"
                print_info "  Ensure DNS A record exists for this domain"
            fi
        else
            print_info "nslookup not available - skipping DNS validation"
            break
        fi
    done
}

print_summary() {
    print_header "Validation Summary"
    
    echo -e "Results:"
    echo -e "  ${GREEN}✅ Passed: ${OK}${NC}"
    echo -e "  ${YELLOW}⚠️  Warnings: ${WARNINGS}${NC}"
    echo -e "  ${RED}❌ Errors: ${ERRORS}${NC}"
    echo ""
    
    if [ $ERRORS -gt 0 ]; then
        echo -e "${RED}❌ Validation FAILED${NC}"
        echo ""
        echo "Critical issues found that will cause certificate problems."
        echo "Please fix the errors above before deploying."
        echo ""
        echo "For help, see:"
        echo "  - docs/guides/CERTIFICATE_TROUBLESHOOTING.md"
        echo "  - docs/guides/TROUBLESHOOTING_DRONE_SSL.md"
        echo ""
        return 1
    elif [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Validation passed with WARNINGS${NC}"
        echo ""
        echo "Configuration is functional but some optional settings are not configured."
        echo "Review warnings above to ensure this matches your deployment goals."
        echo ""
        return 0
    else
        echo -e "${GREEN}✅ Validation PASSED${NC}"
        echo ""
        echo "Configuration looks good! SSL certificates should be issued correctly."
        echo ""
        return 0
    fi
}

# Main execution
main() {
    print_header "SSL/Certificate Configuration Validator"
    
    echo "This script validates your SSL/certificate configuration to help"
    echo "prevent 'certificate not secure' warnings in production deployments."
    echo ""
    
    case "$SERVICE" in
        notehub)
            validate_notehub
            ;;
        drone)
            validate_drone
            ;;
        monitoring)
            validate_monitoring
            ;;
        all)
            validate_notehub
            validate_drone
            validate_monitoring
            validate_dns
            ;;
        *)
            echo "Usage: $0 [--service notehub|drone|monitoring|all]"
            exit 1
            ;;
    esac
    
    print_summary
}

# Run main function
main "$@"
