#!/bin/bash
# =============================================================================
# Drone CI Setup Script for NoteHub
# =============================================================================
# This script helps you set up Drone CI alongside NoteHub
#
# Usage:
#   chmod +x scripts/setup-drone.sh
#   ./scripts/setup-drone.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_warning "Please do not run this script as root"
    exit 1
fi

print_header "Drone CI Setup for NoteHub"

# Check Docker
print_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi
print_success "Docker is installed"

# Check Docker Compose
print_info "Checking Docker Compose installation..."
if ! command -v docker compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi
print_success "Docker Compose is installed"

# Check if .env.drone exists
if [ -f ".env.drone" ]; then
    print_warning ".env.drone already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Keeping existing .env.drone"
        SKIP_ENV_CREATION=true
    fi
fi

if [ "$SKIP_ENV_CREATION" != "true" ]; then
    print_header "Creating .env.drone configuration"
    
    # Copy example file
    cp .env.drone.example .env.drone
    print_success "Created .env.drone from example"
    
    # Generate RPC secret
    print_info "Generating RPC secret..."
    RPC_SECRET=$(openssl rand -hex 16)
    sed -i.bak "s/DRONE_RPC_SECRET=.*/DRONE_RPC_SECRET=$RPC_SECRET/" .env.drone
    print_success "Generated RPC secret"
    
    # Generate PostgreSQL password
    print_info "Generating PostgreSQL password..."
    POSTGRES_PASSWORD=$(openssl rand -base64 24)
    sed -i.bak "s/DRONE_POSTGRES_PASSWORD=.*/DRONE_POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env.drone
    print_success "Generated PostgreSQL password"
    
    # Clean up backup files
    rm -f .env.drone.bak
    
    print_warning "\nYou need to configure the following in .env.drone:"
    echo "1. DRONE_GITHUB_CLIENT_ID - Get from GitHub OAuth App"
    echo "2. DRONE_GITHUB_CLIENT_SECRET - Get from GitHub OAuth App"
    echo "3. DRONE_SERVER_HOST - Your server's hostname or IP"
    echo ""
    echo "To create a GitHub OAuth App:"
    echo "1. Go to: https://github.com/settings/developers"
    echo "2. Click 'New OAuth App'"
    echo "3. Set 'Authorization callback URL' to: http://YOUR_SERVER:8080/login"
    echo ""
    
    read -p "Press Enter to open .env.drone for editing..."
    
    # Try to open with user's preferred editor
    if [ -n "$EDITOR" ]; then
        $EDITOR .env.drone
    elif command -v nano &> /dev/null; then
        nano .env.drone
    elif command -v vim &> /dev/null; then
        vim .env.drone
    else
        print_warning "Please edit .env.drone manually with your preferred editor"
    fi
fi

# Verify required variables are set
print_header "Verifying configuration"

if grep -q "your-github-oauth-client-id" .env.drone; then
    print_error "Please set DRONE_GITHUB_CLIENT_ID in .env.drone"
    exit 1
fi

if grep -q "your-github-oauth-client-secret" .env.drone; then
    print_error "Please set DRONE_GITHUB_CLIENT_SECRET in .env.drone"
    exit 1
fi

if grep -q "localhost:8080" .env.drone; then
    print_warning "DRONE_SERVER_HOST is still set to localhost:8080"
    print_info "This is OK for testing, but update it for production use"
fi

print_success "Configuration looks good!"

# Check if port 8080 is available
print_info "Checking if port 8080 is available..."
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_error "Port 8080 is already in use"
    print_info "Please stop the service using port 8080 or change the port in docker-compose.drone.yml"
    exit 1
fi
print_success "Port 8080 is available"

# Ask if user wants to start Drone CI now
print_header "Ready to deploy Drone CI"
echo "This will:"
echo "  - Pull Docker images for Drone CI"
echo "  - Start Drone Server (port 8080)"
echo "  - Start Drone Runner"
echo "  - Start PostgreSQL database"
echo ""
read -p "Do you want to start Drone CI now? (Y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    print_info "Starting Drone CI..."
    docker compose -f docker-compose.drone.yml up -d
    
    print_success "Drone CI is starting!"
    
    # Wait a bit for services to start
    print_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check status
    print_info "Checking service status..."
    docker compose -f docker-compose.drone.yml ps
    
    print_success "\n${GREEN}========================================${NC}"
    print_success "Drone CI Setup Complete!"
    print_success "${GREEN}========================================${NC}"
    echo ""
    print_info "Access Drone CI at: http://localhost:8080"
    print_info "Or: http://YOUR_SERVER_IP:8080"
    echo ""
    print_info "To view logs:"
    echo "  docker compose -f docker-compose.drone.yml logs -f"
    echo ""
    print_info "To stop Drone CI:"
    echo "  docker compose -f docker-compose.drone.yml down"
    echo ""
    print_info "For more information, see:"
    echo "  docs/guides/DRONE_CI_SETUP.md"
else
    print_info "Skipping deployment. You can start Drone CI later with:"
    echo "  docker compose -f docker-compose.drone.yml up -d"
fi

print_success "\nSetup script completed!"
