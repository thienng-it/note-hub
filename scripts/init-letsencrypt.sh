#!/bin/bash

# =============================================================================
# Let's Encrypt Certificate Initialization Script
# =============================================================================
# This script sets up SSL certificates using Let's Encrypt/Certbot for NoteHub
#
# Prerequisites:
# - Domain name configured and pointing to your server
# - Docker and Docker Compose installed
# - Ports 80 and 443 accessible from the internet
#
# Usage:
#   ./scripts/init-letsencrypt.sh
#
# =============================================================================

set -e

# Load environment variables safely
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Configuration
domains="${DOMAIN:-example.com}"
email="${LETSENCRYPT_EMAIL:-}"
staging="${LETSENCRYPT_STAGING:-0}" # Set to 1 for testing
rsa_key_size=4096
data_path="./docker/certbot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "  Let's Encrypt Certificate Setup for NoteHub"
echo "=================================================="
echo ""

# Validation
if [ -z "$email" ]; then
    echo -e "${RED}Error: LETSENCRYPT_EMAIL not set in .env file${NC}"
    echo "Please add: LETSENCRYPT_EMAIL=your-email@example.com"
    exit 1
fi

if [ "$domains" = "example.com" ]; then
    echo -e "${RED}Error: DOMAIN not set in .env file${NC}"
    echo "Please add: DOMAIN=your-domain.com"
    exit 1
fi

echo "Domain: $domains"
echo "Email: $email"
echo "Staging mode: $staging"
echo ""

# Check if certificates already exist
if [ -d "$data_path/conf/live/$domains" ]; then
    echo -e "${YELLOW}Warning: Existing certificates found for $domains${NC}"
    read -p "Do you want to replace them? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing certificates. Exiting."
        exit 0
    fi
    echo "Removing old certificates..."
    rm -rf "$data_path/conf/live/$domains"
    rm -rf "$data_path/conf/archive/$domains"
    rm -rf "$data_path/conf/renewal/$domains.conf"
fi

# Create necessary directories
echo "Creating certificate directories..."
mkdir -p "$data_path/conf/live/$domains"
mkdir -p "$data_path/www"

# Download recommended TLS parameters
if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
    echo "Downloading recommended TLS parameters..."
    mkdir -p "$data_path/conf"
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
    echo -e "${GREEN}✓ TLS parameters downloaded${NC}"
fi

# Request real certificate using standalone mode
# This is more reliable as it doesn't depend on nginx configuration
echo "Requesting Let's Encrypt certificate for $domains..."
domain_args=""
for domain in $(echo $domains | tr "," "\n"); do
    domain_args="$domain_args -d $domain"
done

# Select appropriate server
if [ $staging != "0" ]; then
    staging_arg="--staging"
    echo -e "${YELLOW}Using Let's Encrypt staging server (test mode)${NC}"
else
    staging_arg=""
    echo -e "${GREEN}Using Let's Encrypt production server${NC}"
fi

# Make sure port 80 is free
echo "Stopping services that use port 80..."
docker compose stop nginx-ssl 2>/dev/null || true
docker compose stop frontend 2>/dev/null || true

# Use standalone mode - Certbot will start its own web server on port 80
echo "Starting Certbot with standalone web server..."
docker compose run --rm -p 80:80 --entrypoint "\
    certbot certonly --standalone \
    $staging_arg \
    $domain_args \
    --email $email \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    --preferred-challenges http" certbot

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=================================================="
    echo -e "  ✓ Certificate successfully obtained!"
    echo -e "==================================================${NC}"
    echo ""
    echo "Starting SSL services (nginx-ssl and certbot)..."
    # Start backend if not running
    docker compose up -d backend
    # Start only SSL profile services (nginx-ssl and certbot)
    docker compose up -d nginx-ssl certbot
    echo ""
    echo -e "${GREEN}✓ Setup complete!${NC}"
    echo ""
    echo "Your site should now be accessible via HTTPS:"
    echo "  https://$domains"
    echo ""
    echo "Certificate will auto-renew before expiration."
    echo "Check renewal with: docker compose logs certbot"
    echo ""
    echo -e "${YELLOW}Note: Using SSL services. The 'frontend' service remains stopped.${NC}"
    echo "To manage services: docker compose up -d nginx-ssl certbot backend"
else
    echo ""
    echo -e "${RED}=================================================="
    echo -e "  ✗ Certificate request failed!"
    echo -e "==================================================${NC}"
    echo ""
    echo "Possible issues:"
    echo "  - Domain not pointing to this server"
    echo "  - Firewall blocking port 80 from the internet"
    echo "  - Router/firewall not forwarding port 80 to this server"
    echo "  - DuckDNS or dynamic DNS not properly configured"
    echo "  - ISP blocking port 80 (some residential ISPs do this)"
    echo ""
    echo "Troubleshooting steps:"
    echo "  1. Check if port 80 is accessible from internet:"
    echo "     curl -I http://$domains"
    echo "  2. Test from external service: https://www.yougetsignal.com/tools/open-ports/"
    echo "  3. Check router port forwarding configuration"
    echo "  4. Try running with staging mode first:"
    echo "     LETSENCRYPT_STAGING=1 ./scripts/init-letsencrypt.sh"
    exit 1
fi
