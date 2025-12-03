#!/bin/bash
# =============================================================================
# NoteHub - Hetzner VPS Setup Script
# =============================================================================
# This script helps you set up NoteHub on a Hetzner VPS with Cloudflare Tunnel
#
# Usage: ./scripts/setup-cloudflare-tunnel.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print with color
print_status() { echo -e "${BLUE}[*]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

# Header
echo ""
echo "============================================================"
echo "       🚀 NoteHub - Hetzner VPS Setup"
echo "============================================================"
echo ""

# Check prerequisites
print_status "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    print_success "Docker installed"
fi
print_success "Docker is installed"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed."
    apt install -y docker-compose-plugin
    print_success "Docker Compose installed"
fi
print_success "Docker Compose is installed"

# Check if .env exists
if [ -f ".env" ]; then
    print_warning ".env file already exists. Do you want to overwrite it? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_status "Keeping existing .env file"
    else
        cp .env.example .env
        print_success "Created new .env file from template"
    fi
else
    cp .env.example .env
    print_success "Created .env file from template"
fi

echo ""
print_status "Let's configure your NoteHub deployment!"
echo ""

# Generate secrets automatically
FLASK_SECRET=$(openssl rand -hex 32)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
MYSQL_PASSWORD=$(openssl rand -hex 16)
print_success "Generated secure secrets"

# Get admin credentials
echo ""
print_status "Admin Account Configuration"
read -p "Admin username [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

while true; do
    read -s -p "Admin password (min 8 chars): " ADMIN_PASS
    echo ""
    if [ ${#ADMIN_PASS} -ge 8 ]; then
        break
    fi
    print_warning "Password must be at least 8 characters"
done

# Get Cloudflare Tunnel token
echo ""
print_status "Cloudflare Tunnel Configuration"
echo ""
echo "  To get your tunnel token:"
echo "  1. Go to https://one.dash.cloudflare.com"
echo "  2. Navigate to Networks → Tunnels"
echo "  3. Create a tunnel named 'notehub'"
echo "  4. Copy the token shown"
echo ""
read -p "Cloudflare Tunnel Token: " CF_TUNNEL_TOKEN

# Write to .env file
print_status "Writing configuration to .env..."

cat > .env << EOF
# =============================================================================
# NoteHub Configuration - Hetzner VPS
# Generated on: $(date)
# =============================================================================

# Flask Configuration
FLASK_SECRET=${FLASK_SECRET}

# Admin Credentials
NOTES_ADMIN_USERNAME=${ADMIN_USER}
NOTES_ADMIN_PASSWORD=${ADMIN_PASS}

# MySQL Database (local container)
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_USER=notehub
MYSQL_PASSWORD=${MYSQL_PASSWORD}
MYSQL_DATABASE=notehub

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=${CF_TUNNEL_TOKEN}

# CAPTCHA
CAPTCHA_TYPE=simple
EOF

print_success "Configuration saved to .env"

# Build and start
echo ""
print_status "Building and starting NoteHub..."
echo ""

docker compose up -d --build

echo ""
print_status "Waiting for services to start..."
sleep 15

# Check status
if docker compose ps | grep -q "healthy\|running"; then
    echo ""
    echo "============================================================"
    print_success "NoteHub is now running!"
    echo "============================================================"
    echo ""
    echo "  Your app will be available at your Cloudflare domain"
    echo "  (the one you configured in the tunnel settings)"
    echo ""
    echo "  Useful commands:"
    echo "    View logs:     docker compose logs -f"
    echo "    Stop:          docker compose stop"
    echo "    Restart:       docker compose restart"
    echo "    Update:        git pull && docker compose up -d --build"
    echo ""
    echo "  Admin login:"
    echo "    Username: ${ADMIN_USER}"
    echo "    Password: (the one you entered)"
    echo ""
    echo "  Database credentials saved in .env (keep this file safe!)"
    echo ""
else
    print_error "Something went wrong. Check the logs:"
    echo "  docker compose logs"
fi
