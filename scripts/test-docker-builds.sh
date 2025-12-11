#!/bin/bash
# Docker Build Validation Script
# Tests all optimized Dockerfiles to ensure they build successfully

set -e

echo "==================================================================="
echo "Docker Build Validation - Testing Optimized Dockerfiles"
echo "==================================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Enable BuildKit
export DOCKER_BUILDKIT=1

# Check if required files exist
echo "📋 Checking prerequisites..."
if [ ! -f "frontend/package.json" ]; then
    echo -e "${RED}❌ frontend/package.json not found${NC}"
    exit 1
fi

if [ ! -f "backend/package.json" ]; then
    echo -e "${RED}❌ backend/package.json not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"
echo ""

# Test 1: Main Dockerfile (Multi-stage: Frontend + Backend)
echo "==================================================================="
echo "Test 1: Building Main Dockerfile (Full Stack)"
echo "==================================================================="
echo "This tests the optimized multi-stage build with:"
echo "  - Frontend build with npm ci and cache mount"
echo "  - Backend build with production dependencies only"
echo "  - Final image with nginx + Node.js"
echo ""

if docker build -f Dockerfile -t notehub-test:full-stack . 2>&1 | tee /tmp/docker-build-main.log; then
    echo -e "${GREEN}✅ Main Dockerfile built successfully${NC}"
    IMAGE_SIZE=$(docker images notehub-test:full-stack --format "{{.Size}}")
    echo "📦 Image size: $IMAGE_SIZE"
else
    echo -e "${RED}❌ Main Dockerfile build failed${NC}"
    exit 1
fi
echo ""

# Test 2: Backend Dockerfile
echo "==================================================================="
echo "Test 2: Building Backend Dockerfile"
echo "==================================================================="
echo "This tests the optimized backend build with:"
echo "  - BuildKit cache mounts"
echo "  - Production dependencies only (npm ci --omit=dev)"
echo "  - dumb-init for signal handling"
echo "  - Non-root user"
echo ""

if docker build -f Dockerfile.backend.node -t notehub-test:backend . 2>&1 | tee /tmp/docker-build-backend.log; then
    echo -e "${GREEN}✅ Backend Dockerfile built successfully${NC}"
    IMAGE_SIZE=$(docker images notehub-test:backend --format "{{.Size}}")
    echo "📦 Image size: $IMAGE_SIZE"
else
    echo -e "${RED}❌ Backend Dockerfile build failed${NC}"
    exit 1
fi
echo ""

# Test 3: Frontend Dockerfile (nginx)
echo "==================================================================="
echo "Test 3: Building Frontend Dockerfile (nginx)"
echo "==================================================================="
echo "This tests the optimized frontend build with:"
echo "  - Multi-stage build (Node.js builder + nginx runtime)"
echo "  - BuildKit cache mounts"
echo "  - nginx instead of Node.js serve package"
echo "  - Minimal production image"
echo ""

if docker build -f Dockerfile.frontend -t notehub-test:frontend-nginx . 2>&1 | tee /tmp/docker-build-frontend.log; then
    echo -e "${GREEN}✅ Frontend Dockerfile (nginx) built successfully${NC}"
    IMAGE_SIZE=$(docker images notehub-test:frontend-nginx --format "{{.Size}}")
    echo "📦 Image size: $IMAGE_SIZE"
else
    echo -e "${RED}❌ Frontend Dockerfile (nginx) build failed${NC}"
    exit 1
fi
echo ""

# Test 4: Frontend Traefik Dockerfile
echo "==================================================================="
echo "Test 4: Building Frontend Traefik Dockerfile"
echo "==================================================================="
echo "This tests the Traefik-optimized frontend with:"
echo "  - Inline nginx configuration"
echo "  - SPA routing configuration"
echo "  - Static asset caching"
echo ""

if docker build -f Dockerfile.frontend.traefik -t notehub-test:frontend-traefik . 2>&1 | tee /tmp/docker-build-frontend-traefik.log; then
    echo -e "${GREEN}✅ Frontend Traefik Dockerfile built successfully${NC}"
    IMAGE_SIZE=$(docker images notehub-test:frontend-traefik --format "{{.Size}}")
    echo "📦 Image size: $IMAGE_SIZE"
else
    echo -e "${RED}❌ Frontend Traefik Dockerfile build failed${NC}"
    exit 1
fi
echo ""

# Summary
echo "==================================================================="
echo "Build Summary"
echo "==================================================================="
echo ""
docker images notehub-test:* --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
echo ""

# Check for BuildKit cache
echo "==================================================================="
echo "BuildKit Cache Information"
echo "==================================================================="
docker buildx du 2>/dev/null || echo "BuildKit cache info not available"
echo ""

echo -e "${GREEN}✅ All Docker builds completed successfully!${NC}"
echo ""
echo "To clean up test images, run:"
echo "  docker rmi notehub-test:full-stack notehub-test:backend notehub-test:frontend-nginx notehub-test:frontend-traefik"
echo ""
