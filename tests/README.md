# NoteHub Docker Upload Tests

This directory contains comprehensive tests for the Docker Compose file upload functionality.

## Test Suites

### 1. Unit Tests - Backend Upload Routes
**File:** `../backend/tests/upload.test.js`

Tests the backend upload API endpoints:
- Single image upload (`POST /api/upload/image`)
- Multiple image upload (`POST /api/upload/images`)
- Image deletion (`DELETE /api/upload/:filename`)
- Static file serving (`GET /uploads/:filename`)
- File validation (type, size, etc.)
- Error handling

**Run:**
```bash
cd backend
npm test -- tests/upload.test.js
```

### 2. Unit Tests - Traefik Configuration
**File:** `traefik-config.test.sh`

Tests the Traefik reverse proxy configuration:
- Static and dynamic configuration files
- Entry points and routing rules
- Docker provider and labels
- Middleware definitions (compression, security headers)
- Service configurations for all profiles
- YAML syntax validation
- API, uploads, and health routing labels

**Run:**
```bash
./tests/traefik-config.test.sh
```

### 2a. Legacy Unit Tests - Nginx Configuration
**File:** `nginx-config.test.sh` *(deprecated - nginx has been replaced by Traefik)*

Tests the nginx configuration template (kept for reference):
- Template file existence and structure
- Environment variable placeholders
- Location blocks for `/api/`, `/uploads/`, `/health`

**Run:**
```bash
./tests/nginx-config.test.sh
```

### 3. Integration Tests - Docker Compose
**File:** `docker-compose-integration.test.sh`

Tests the complete Docker Compose setup:
- Docker Compose configuration validation
- Volume definitions and mounts
- Environment variable configuration
- Docker image builds (backend & frontend)
- Directory creation in containers
- Service health checks
- Runtime file operations
- Nginx proxy functionality
- Upload persistence across restarts

**Run:**
```bash
./tests/docker-compose-integration.test.sh
```

## Running All Tests

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for backend tests)
- curl (for integration tests)
- jq (for JSON parsing in integration tests)

### Run Complete Test Suite

```bash
# 1. Run backend unit tests
cd backend
npm test

# 2. Run Traefik configuration tests
cd ..
./tests/traefik-config.test.sh

# 3. Run Docker Compose integration tests (requires .env file)
./tests/docker-compose-integration.test.sh
```

## Test Coverage

### What's Tested

#### Backend API
- ✅ Single image upload
- ✅ Multiple image upload (up to 10)
- ✅ File type validation (JPEG, PNG, GIF, WebP)
- ✅ File size validation (5MB limit)
- ✅ File deletion
- ✅ Static file serving
- ✅ Error handling
- ✅ Path traversal prevention

#### Docker Configuration
- ✅ `docker-compose.yml` syntax validation
- ✅ Volume definitions (`notehub-uploads`)
- ✅ Traefik routing and labels
- ✅ Service dependencies and health checks
- ✅ Volume mounts on all backend services
- ✅ Environment variables for frontend services
- ✅ Traefik configuration files and middlewares
- ✅ Uploads directory creation in backend image

#### Runtime Behavior
- ✅ Backend and frontend service health
- ✅ API accessibility through Traefik proxy
- ✅ File upload and retrieval through proxy
- ✅ Upload persistence across container restarts
- ✅ Correct Traefik routing configuration
- ✅ Docker label-based service discovery

### Test Metrics

- **Backend Unit Tests:** 23 test cases
- **Traefik Config Tests:** 20 test cases
- **Nginx Config Tests (Legacy):** 14 test cases
- **Integration Tests:** 20 test cases (when Docker is available)
- **Total:** 77 test cases

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Backend Tests
  run: |
    cd backend
    npm install
    npm test

- name: Run Traefik Config Tests
  run: ./tests/traefik-config.test.sh

- name: Run Docker Integration Tests
  run: ./tests/docker-compose-integration.test.sh
```

## Troubleshooting

### Backend Tests Fail
- Ensure Node.js dependencies are installed: `cd backend && npm install`
- Check that port 5000 is not in use
- Verify test fixtures directory is created

### Nginx Tests Fail
- Ensure `envsubst` is available (usually part of gettext package)
- Check template file exists: `ls docker/nginx.conf.template`

### Integration Tests Fail
- Ensure Docker and Docker Compose are running
- Check `.env` file exists and has required variables
- Verify ports 80 and 5000 are available
- Check Docker has enough resources (CPU, memory)

## Contributing

When adding new upload-related features:
1. Add unit tests in `backend/tests/upload.test.js`
2. Update integration tests if Docker configuration changes
3. Run all tests before submitting PR
4. Update this README with new test cases
