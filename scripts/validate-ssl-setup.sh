#!/bin/bash

# =============================================================================
# SSL/TLS Setup Validation Script
# =============================================================================
# This script validates your SSL/TLS configuration before deployment
#
# Usage:
#   ./scripts/validate-ssl-setup.sh
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=================================================="
echo "  SSL/TLS Configuration Validation"
echo "=================================================="
echo ""

ERRORS=0
WARNINGS=0

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
    ERRORS=$((ERRORS + 1))
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# Function to print info
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if .env exists
echo "Checking configuration files..."
if [ -f .env ]; then
    success ".env file exists"
    # Load .env file safely (avoids command injection)
    set -a
    source .env
    set +a
else
    error ".env file not found"
    info "Create one with: cp .env.example .env"
    exit 1
fi

# Check required variables
echo ""
echo "Checking required environment variables..."

if [ -z "$DOMAIN" ]; then
    error "DOMAIN not set in .env"
    info "Add: DOMAIN=your-domain.com"
else
    success "DOMAIN set: $DOMAIN"
fi

if [ -z "$LETSENCRYPT_EMAIL" ]; then
    error "LETSENCRYPT_EMAIL not set in .env"
    info "Add: LETSENCRYPT_EMAIL=your-email@example.com"
else
    success "LETSENCRYPT_EMAIL set: $LETSENCRYPT_EMAIL"
fi

if [ -z "$NOTES_ADMIN_PASSWORD" ]; then
    error "NOTES_ADMIN_PASSWORD not set in .env"
else
    success "NOTES_ADMIN_PASSWORD is set"
fi

if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "your-super-secret-key-change-this" ]; then
    warning "SECRET_KEY not changed from default"
    info "Generate one with: openssl rand -hex 32"
else
    success "SECRET_KEY is configured"
fi

# Check DNS configuration
if [ ! -z "$DOMAIN" ] && [ "$DOMAIN" != "example.com" ]; then
    echo ""
    echo "Checking DNS configuration..."
    
    if command -v dig &> /dev/null; then
        DNS_IP=$(dig +short "$DOMAIN" | tail -n1)
        if [ -z "$DNS_IP" ]; then
            error "DNS not configured for $DOMAIN"
            info "Configure your domain's A record to point to your server IP"
        else
            success "DNS resolves to: $DNS_IP"
            
            # Check if it resolves to localhost (development)
            if [ "$DNS_IP" = "127.0.0.1" ] || [ "$DNS_IP" = "::1" ]; then
                warning "Domain resolves to localhost (development only)"
            # Check if it's a private IP (LAN)
            elif echo "$DNS_IP" | grep -qE "^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)"; then
                warning "Domain resolves to private IP: $DNS_IP"
                info "Let's Encrypt needs public IP. Check router port forwarding."
            fi
        fi
    else
        warning "dig command not available, skipping DNS check"
        info "Install dnsutils: apt install dnsutils"
    fi
    
    # Additional check: warn about port 80 accessibility
    echo ""
    info "IMPORTANT: For Let's Encrypt to work, port 80 must be accessible from the internet"
    info "Common issues:"
    info "  - Router not forwarding port 80 to this server"
    info "  - ISP blocking port 80 (common on residential connections)"
    info "  - Firewall blocking port 80"
    info "Test externally: https://www.yougetsignal.com/tools/open-ports/"
fi

# Check Docker and Docker Compose
echo ""
echo "Checking Docker installation..."

if command -v docker &> /dev/null; then
    success "Docker is installed: $(docker --version | head -1)"
else
    error "Docker is not installed"
    info "Install Docker: curl -fsSL https://get.docker.com | sh"
fi

if docker compose version &> /dev/null; then
    success "Docker Compose is available"
else
    error "Docker Compose is not available"
    info "Install Docker Compose plugin"
fi

# Validate docker-compose.yml
echo ""
echo "Validating docker-compose configuration..."

if docker compose config > /dev/null 2>&1; then
    success "docker-compose.yml is valid"
else
    error "docker-compose.yml has syntax errors"
    docker compose config 2>&1 | head -5
fi

# Check if SSL profile is available
if docker compose --profile ssl config --services 2>&1 | grep -q "nginx-ssl"; then
    success "SSL profile is configured"
else
    error "SSL profile is not available"
fi

# Check init script
echo ""
echo "Checking initialization script..."

if [ -f scripts/init-letsencrypt.sh ]; then
    success "init-letsencrypt.sh exists"
    
    if [ -x scripts/init-letsencrypt.sh ]; then
        success "init-letsencrypt.sh is executable"
    else
        warning "init-letsencrypt.sh is not executable"
        info "Fix with: chmod +x scripts/init-letsencrypt.sh"
    fi
else
    error "init-letsencrypt.sh not found"
fi

# Check required directories
echo ""
echo "Checking directory structure..."

if [ -d docker ]; then
    success "docker/ directory exists"
else
    error "docker/ directory not found"
fi

if [ -f docker/nginx-ssl.conf ]; then
    success "nginx-ssl.conf exists"
else
    error "nginx-ssl.conf not found"
fi

if [ -f Dockerfile.frontend.ssl ]; then
    success "Dockerfile.frontend.ssl exists"
else
    error "Dockerfile.frontend.ssl not found"
fi

# Check for port conflicts
echo ""
echo "Checking for port conflicts..."

if command -v netstat &> /dev/null; then
    PORT_80=$(netstat -tlnp 2>/dev/null | grep ":80 " || true)
    PORT_443=$(netstat -tlnp 2>/dev/null | grep ":443 " || true)
    
    if [ ! -z "$PORT_80" ]; then
        warning "Port 80 is already in use"
        echo "   $PORT_80"
        info "Stop the service using port 80 before deployment"
    else
        success "Port 80 is available"
    fi
    
    if [ ! -z "$PORT_443" ]; then
        warning "Port 443 is already in use"
        echo "   $PORT_443"
        info "Stop the service using port 443 before deployment"
    else
        success "Port 443 is available"
    fi
else
    warning "netstat not available, skipping port check"
    info "Install net-tools: apt install net-tools"
fi

# Check if certbot directory exists
echo ""
echo "Checking certificate directories..."

if [ -d docker/certbot ]; then
    success "docker/certbot directory exists"
    
    if [ -d docker/certbot/conf ]; then
        if [ -d docker/certbot/conf/live ] && [ "$(ls -A docker/certbot/conf/live 2>/dev/null)" ]; then
            success "Certificates already exist"
            info "Run ./scripts/init-letsencrypt.sh to replace them"
        else
            info "No certificates yet (will be created during initialization)"
        fi
    fi
else
    info "docker/certbot directory will be created during initialization"
fi

# Summary
echo ""
echo "=================================================="
echo "  Validation Summary"
echo "=================================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You're ready to deploy with SSL/TLS:"
    echo "  1. Run: ./scripts/init-letsencrypt.sh"
    echo "  2. Run: docker compose --profile ssl up -d"
    echo "  3. Access: https://$DOMAIN"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation completed with $WARNINGS warning(s)${NC}"
    echo ""
    echo "You can proceed with deployment, but review warnings above."
    echo "  1. Run: ./scripts/init-letsencrypt.sh"
    echo "  2. Run: docker compose --profile ssl up -d"
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before deploying."
    exit 1
fi

echo ""
echo "For detailed setup instructions, see:"
echo "  docs/guides/CERTBOT_SETUP.md"
echo ""
