# Environment Configuration Guide

This guide explains how environment variables are managed in NoteHub for both development and production deployments.

## Overview

NoteHub uses a centralized `.env` file for configuration, loaded efficiently through Docker Compose's `env_file` directive. This approach ensures:

- **No missing variables**: All environment variables are automatically loaded
- **Single source of truth**: One `.env` file for all services
- **Validation**: Critical variables have required checks
- **Easy setup**: Simple copy-paste configuration

## Quick Start

### 1. Create .env file

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Configure Required Variables

At minimum, set these required variables:

```bash
# Admin password (REQUIRED)
NOTES_ADMIN_PASSWORD=YourSecurePassword123!

# Google OAuth (REQUIRED for SSO)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost/auth/google/callback

# AI Configuration (REQUIRED for AI features)
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### 3. Start Services

```bash
# Development mode (SQLite)
docker compose up -d

# Production mode (Cloud DB)
docker compose --profile production up -d

# Development with MySQL
docker compose --profile mysql up -d
```

## Environment Loading Architecture

### Docker Compose Approach

NoteHub uses the `env_file` directive in `docker-compose.yml`:

```yaml
services:
  backend:
    env_file:
      - .env
    environment:
      # Override specific variables
      - NODE_ENV=development
      - PORT=5000
```

### How It Works

1. **File Loading**: Docker Compose reads `.env` and loads ALL variables
2. **Override**: Variables in `environment` section override those from `.env`
3. **Validation**: Required variables use `${VAR:?error message}` syntax
4. **Defaults**: Optional variables use `${VAR:-default}` syntax

### Benefits

✅ **Efficient**: Single file read, all variables available  
✅ **No duplication**: Don't repeat variables in docker-compose.yml  
✅ **Validation**: Docker fails fast if required variables are missing  
✅ **Defaults**: Sensible defaults for optional variables  
✅ **Documentation**: .env.example documents all variables  

## Environment Variables Reference

### Required Variables (All Modes)

```bash
# Admin Credentials
NOTES_ADMIN_USERNAME=admin                    # Admin username (default: admin)
NOTES_ADMIN_PASSWORD=YourSecurePassword123!   # REQUIRED: Strong password

# JWT Secret (generate with: openssl rand -hex 32)
SECRET_KEY=your-super-secret-key-change-this  # REQUIRED in production

# Google OAuth (REQUIRED for SSO)
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost/auth/google/callback

# AI Provider (REQUIRED for AI features)
AI_PROVIDER=ollama                            # Options: ollama, openai, gemini
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### Development Mode Variables

```bash
# SQLite database path (default mode)
NOTES_DB_PATH=/app/data/notes.db              # Default: /app/data/notes.db
```

### Production Mode Variables

```bash
# Cloud Database URL
DATABASE_URL=mysql://user:password@host:3306/database

# OR separate MySQL config
MYSQL_HOST=db.example.com
MYSQL_PORT=3306
MYSQL_USER=notehub
MYSQL_PASSWORD=secure-password
MYSQL_DATABASE=notehub

# Frontend API URL (if backend on different domain)
VITE_API_URL=https://api.example.com
```

### MySQL Development Variables

```bash
# MySQL container configuration
MYSQL_ROOT_PASSWORD=change-this-root-password
MYSQL_USER=notehub
MYSQL_PASSWORD=change-this-password
MYSQL_DATABASE=notehub
```

### Optional Performance Variables

```bash
# Redis Caching (10x performance boost)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Elasticsearch (5x faster search)
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
```

### Logging Variables

```bash
# Backend logging
LOG_LEVEL=info                                # debug, info, warn, error, silent
LOG_FORMAT=simple                             # json, simple, detailed
LOG_FILE_PATH=/var/log/notehub/app.log        # Optional: file logging

# Frontend logging
VITE_LOG_LEVEL=info                           # debug, info, warn, error, silent
```

## Deployment Modes

### Development Mode (Default)

**Use case**: Local development and testing

```bash
# Setup
cp .env.example .env
nano .env  # Set required variables

# Run
docker compose up -d
docker compose exec backend node scripts/seed_db.js

# Access
http://localhost
```

**Features**:
- SQLite database (no external DB needed)
- Database seeding enabled
- Verbose logging
- Auto-reload on code changes

### Production Mode

**Use case**: Cloud deployment with external database

```bash
# Setup
cp .env.example .env
nano .env  # Configure production variables

# Required production variables
SECRET_KEY=<strong-random-key>
DATABASE_URL=mysql://user:password@cloud-db:3306/notehub
NOTES_ADMIN_PASSWORD=<secure-password>
LOG_LEVEL=error
LOG_FORMAT=json

# Run
docker compose --profile production up -d

# Note: Do NOT run seed script in production
```

**Features**:
- Cloud database (PlanetScale, AWS RDS, etc.)
- Seeding blocked (safety)
- Error-only logging
- Production optimizations

### MySQL Development Mode

**Use case**: Local development with MySQL

```bash
# Setup
cp .env.example .env
nano .env  # Set MySQL variables

# Required MySQL variables
MYSQL_ROOT_PASSWORD=secure-root-password
MYSQL_USER=notehub
MYSQL_PASSWORD=secure-password

# Run
docker compose --profile mysql up -d
docker compose exec backend-mysql node scripts/seed_db.js
```

**Features**:
- Local MySQL container
- Similar to production DB setup
- Database seeding enabled
- Development logging

## Variable Validation

### Required Variables

Docker Compose validates required variables using the `:?` syntax:

```yaml
${NOTES_ADMIN_PASSWORD:?Set NOTES_ADMIN_PASSWORD in .env file}
```

If the variable is not set, Docker Compose will fail with an error message:

```
Error: Set NOTES_ADMIN_PASSWORD in .env file
```

### Optional Variables with Defaults

Optional variables use the `:-` syntax:

```yaml
${NOTES_ADMIN_USERNAME:-admin}
```

If not set, defaults to `admin`.

## Security Best Practices

### 1. Never Commit .env

The `.env` file is in `.gitignore` and should NEVER be committed:

```bash
# In .gitignore
.env
.env.local
.env.*.local
```

### 2. Use Strong Secrets

Generate strong secrets:

```bash
# JWT Secret
openssl rand -hex 32

# MySQL Root Password
openssl rand -base64 32

# Admin Password (manual)
# Use password manager to generate
```

### 3. Rotate Secrets Regularly

In production:
- Rotate JWT secrets every 90 days
- Rotate database passwords every 6 months
- Use different secrets per environment

### 4. Restrict File Permissions

```bash
# On VPS
chmod 600 .env
chown root:root .env
```

### 5. Environment-Specific Files

Use separate files for different environments:

```bash
.env.development
.env.production
.env.staging
```

Link the appropriate one:
```bash
ln -sf .env.production .env
```

## Troubleshooting

### Error: Variable not set

```
Error: Set NOTES_ADMIN_PASSWORD in .env file
```

**Solution**: Add the missing variable to `.env`:
```bash
NOTES_ADMIN_PASSWORD=YourSecurePassword123!
```

### Services not seeing variables

1. **Check .env location**: Must be in project root
2. **Check env_file directive**: Verify in docker-compose.yml
3. **Recreate containers**: `docker compose up -d --force-recreate`

### Variables not updating

Docker Compose caches environment variables. To update:

```bash
# Stop services
docker compose down

# Update .env
nano .env

# Recreate containers
docker compose up -d --force-recreate
```

### Debugging environment variables

Check what variables a container sees:

```bash
# View all environment variables
docker compose exec backend env

# View specific variable
docker compose exec backend env | grep JWT_SECRET
```

## Migration from Old Configuration

### Before: Inline Variables

```yaml
environment:
  - SECRET_KEY=${SECRET_KEY}
  - ADMIN_PASSWORD=${ADMIN_PASSWORD}
  - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
  # ... 20+ more variables
```

**Problems**:
- Verbose and repetitive
- Easy to miss variables
- Hard to maintain

### After: env_file Directive

```yaml
env_file:
  - .env
environment:
  # Only override what's needed
  - NODE_ENV=production
  - PORT=5000
```

**Benefits**:
- Clean and concise
- All variables automatically loaded
- Easy to add new variables

## Advanced Configuration

### Multiple Environment Files

Load multiple .env files:

```yaml
env_file:
  - .env
  - .env.local
  - .env.production
```

Later files override earlier ones.

### Service-Specific Variables

Create service-specific files:

```yaml
backend:
  env_file:
    - .env
    - .env.backend
    
frontend:
  env_file:
    - .env
    - .env.frontend
```

### Build-Time vs Runtime Variables

**Build-time** (Vite frontend):
```yaml
build:
  args:
    - VITE_API_URL=${VITE_API_URL}
```

**Runtime** (backend):
```yaml
environment:
  - DATABASE_URL=${DATABASE_URL}
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Setup environment
  run: |
    echo "SECRET_KEY=${{ secrets.SECRET_KEY }}" >> .env
    echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> .env
    
- name: Deploy
  run: docker compose --profile production up -d
```

### Environment Secrets

Store sensitive values in CI/CD secrets:
- GitHub Secrets
- GitLab CI/CD Variables
- AWS Secrets Manager
- HashiCorp Vault

## References

- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [12-Factor App: Config](https://12factor.net/config)
- [Environment Variable Best Practices](https://blog.gitguardian.com/secrets-api-management/)
