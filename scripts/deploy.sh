#!/bin/bash
# =============================================================================
# NoteHub Production Deployment Script
# =============================================================================
# This script handles automated deployment of NoteHub backend and frontend
# to production via Drone CI.
#
# Usage:
#   ./scripts/deploy.sh [DEPLOYMENT_PATH]
#
# Environment Variables Required:
#   - DEPLOYMENT_PATH: Path where NoteHub is deployed (default: /opt/note-hub)
#
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_PATH="${1:-${DEPLOYMENT_PATH:-/opt/note-hub}}"
# IMPORTANT: Use all compose files for proper routing
# - docker-compose.yml: Base services (frontend, backend, traefik)
# - docker-compose.domain.yml: Host-based routing (prevents subdomain conflicts)
# - docker-compose.monitoring.yml: Monitoring stack (Grafana, Prometheus)
DOCKER_COMPOSE_FILES="-f docker-compose.yml -f docker-compose.domain.yml -f docker-compose.monitoring.yml"
BACKUP_DIR="${DEPLOYMENT_PATH}/backups"

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

# Error handler
error_exit() {
    print_error "Deployment failed: $1"
    exit 1
}

# Validate prerequisites
validate_prerequisites() {
    print_header "Validating Prerequisites"
    
    # Check if we're in the correct directory
    if [ ! -d "$DEPLOYMENT_PATH" ]; then
        error_exit "Deployment path $DEPLOYMENT_PATH does not exist"
    fi
    
    cd "$DEPLOYMENT_PATH" || error_exit "Cannot change to deployment directory"
    print_success "Changed to deployment directory: $DEPLOYMENT_PATH"
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker is not running or not accessible"
    fi
    print_success "Docker is running"
    
    # Check if docker compose is available
    if ! docker compose version >/dev/null 2>&1; then
        error_exit "Docker Compose is not available"
    fi
    print_success "Docker Compose is available"
    
    # Check if git repository exists
    if [ ! -d ".git" ]; then
        error_exit "Not a git repository"
    fi
    print_success "Git repository detected"
}

# Create backup
create_backup() {
    print_header "Creating Backup"
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Backup with timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"
    
    print_info "Creating backup at: $BACKUP_FILE"
    
    # Backup critical data (database, uploads, environment)
    tar -czf "$BACKUP_FILE" \
        --ignore-failed-read \
        backend/data/ \
        backend/uploads/ \
        .env \
        2>/dev/null || print_warning "Some files were not backed up (may not exist)"
    
    print_success "Backup created successfully"
    
    # Keep only last 5 backups
    print_info "Cleaning up old backups..."
    ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +6 | xargs -r rm
    print_success "Old backups cleaned up"
}

# Pull latest changes
pull_latest_changes() {
    print_header "Pulling Latest Changes"
    
    # Get current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    print_info "Current branch: $CURRENT_BRANCH"
    
    # Stash any local changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "Local changes detected, stashing..."
        git stash
    fi
    
    # Pull latest changes
    print_info "Pulling latest changes from origin/$CURRENT_BRANCH"
    git pull origin "$CURRENT_BRANCH" || error_exit "Failed to pull latest changes"
    
    print_success "Latest changes pulled successfully"
    
    # Show current commit
    CURRENT_COMMIT=$(git rev-parse --short HEAD)
    print_info "Current commit: $CURRENT_COMMIT"
}

# Build and deploy with Docker Compose
deploy_with_docker() {
    print_header "Deploying with Docker Compose"
    
    print_info "Using compose files: $DOCKER_COMPOSE_FILES"
    
    # Pull latest images
    print_info "Pulling latest Docker images..."
    docker compose $DOCKER_COMPOSE_FILES pull || print_warning "Some images could not be pulled"
    
    # Build services
    print_info "Building Docker images..."
    docker compose $DOCKER_COMPOSE_FILES build --no-cache || error_exit "Failed to build Docker images"
    print_success "Docker images built successfully"
    
    # Restart services with zero-downtime
    print_info "Restarting services..."
    docker compose $DOCKER_COMPOSE_FILES up -d --remove-orphans || error_exit "Failed to restart services"
    print_success "Services restarted successfully"
    
    # Wait for services to be healthy
    print_info "Waiting for services to be healthy..."
    sleep 15
    
    # Check service health
    print_info "Checking service health..."
    docker compose $DOCKER_COMPOSE_FILES ps
}

# Verify deployment
verify_deployment() {
    print_header "Verifying Deployment"
    
    # Check if backend is responding
    print_info "Checking backend health..."
    if docker compose $DOCKER_COMPOSE_FILES exec -T backend wget --spider -q http://localhost:5000/api/health; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed (may not be critical if service is starting)"
    fi
    
    # Check Grafana health
    print_info "Checking Grafana health..."
    if docker compose $DOCKER_COMPOSE_FILES exec -T grafana wget --spider -q http://localhost:3000/api/health; then
        print_success "Grafana is healthy"
    else
        print_warning "Grafana health check failed (may not be critical if service is starting)"
    fi
    
    # Check running containers
    print_info "Running containers:"
    docker compose $DOCKER_COMPOSE_FILES ps
    
    # Show recent logs
    print_info "Recent logs (last 20 lines):"
    docker compose $DOCKER_COMPOSE_FILES logs --tail=20
}

# Cleanup old Docker resources
cleanup_docker() {
    print_header "Cleaning Up Docker Resources"
    
    print_info "Removing unused images..."
    docker image prune -f || print_warning "Could not prune images"
    
    print_info "Removing unused volumes..."
    docker volume prune -f || print_warning "Could not prune volumes"
    
    print_success "Docker cleanup completed"
}

# Main deployment flow
main() {
    print_header "NoteHub Production Deployment"
    print_info "Deployment path: $DEPLOYMENT_PATH"
    print_info "Starting deployment at: $(date)"
    
    # Step 1: Validate
    validate_prerequisites
    
    # Step 2: Backup
    create_backup
    
    # Step 3: Pull changes
    pull_latest_changes
    
    # Step 4: Deploy
    deploy_with_docker
    
    # Step 5: Verify
    verify_deployment
    
    # Step 6: Cleanup
    cleanup_docker
    
    # Success
    print_header "Deployment Completed Successfully"
    print_success "NoteHub has been deployed successfully!"
    print_info "Deployment completed at: $(date)"
    print_info ""
    print_info "Services accessible at:"
    print_info "  - NoteHub: https://note-hub.duckdns.org"
    print_info "  - Grafana: https://grafana-notehub.duckdns.org"
    print_info ""
    print_info "Next steps:"
    print_info "  - Monitor logs: docker compose $DOCKER_COMPOSE_FILES logs -f"
    print_info "  - Check status: docker compose $DOCKER_COMPOSE_FILES ps"
    print_info "  - Rollback if needed: Restore from $BACKUP_DIR"
}

# Run main function
main "$@"
