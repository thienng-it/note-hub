# NoteHub Scripts

This directory contains utility scripts for NoteHub development and deployment.

## Deployment Scripts

### deploy.sh

**Purpose**: Automated production deployment script for NoteHub backend and frontend.

**Usage**:
```bash
# Deploy to default path (/opt/note-hub)
./scripts/deploy.sh

# Deploy to custom path
./scripts/deploy.sh /custom/path/to/note-hub

# Or set environment variable
DEPLOYMENT_PATH=/custom/path ./scripts/deploy.sh
```

**Features**:
- Automated backup creation before deployment
- Zero-downtime Docker Compose deployment
- Health checks and verification
- Automatic cleanup of old Docker resources
- Rollback support via backups

**Used by**: Drone CI automated deployment pipeline

**Documentation**: See [DRONE_CI_DEPLOYMENT.md](../docs/guides/DRONE_CI_DEPLOYMENT.md)

### setup-drone.sh

**Purpose**: Interactive setup script for Drone CI installation.

**Usage**:
```bash
chmod +x scripts/setup-drone.sh
./scripts/setup-drone.sh
```

**Features**:
- Checks Docker and Docker Compose installation
- Creates .env.drone from example
- Generates secure RPC secret and PostgreSQL password
- Guides through GitHub OAuth configuration
- Optionally starts Drone CI services

**Documentation**: See [DRONE_CI_SETUP.md](../docs/guides/DRONE_CI_SETUP.md)

## Development Scripts

### seed_db.js

**Purpose**: Seeds the database with sample data for development and testing.

**Usage**:
```bash
# From backend directory
cd backend
node ../scripts/seed_db.js

# Or with npm script
npm run seed
```

**Features**:
- Creates sample users, notes, tags, and tasks
- Useful for development and testing
- Safe to run multiple times (clears existing data)

### bump-version.sh

**Purpose**: Bumps the version numbers in both frontend and backend package.json files.

**Usage**:
```bash
# Bump patch version (1.0.0 -> 1.0.1)
./scripts/bump-version.sh patch

# Bump minor version (1.0.0 -> 1.1.0)
./scripts/bump-version.sh minor

# Bump major version (1.0.0 -> 2.0.0)
./scripts/bump-version.sh major
```

**Features**:
- Updates both frontend and backend versions
- Creates git commit automatically
- Ensures versions stay in sync

## Testing & Validation Scripts

### test-docker-builds.sh

**Purpose**: Tests Docker builds for both backend and frontend.

**Usage**:
```bash
./scripts/test-docker-builds.sh
```

**Features**:
- Builds both Dockerfile.backend.node and Dockerfile.frontend
- Verifies images are created successfully
- Useful for CI/CD pipeline testing

### validate-ssl-config.sh

**Purpose**: Validates SSL/HTTPS configuration for Traefik deployments.

**Usage**:
```bash
./scripts/validate-ssl-config.sh
```

**Features**:
- Checks SSL certificate configuration
- Validates Traefik settings
- Ensures HTTPS is properly configured

### verify-port-fix.sh

**Purpose**: Verifies port configuration and checks for conflicts.

**Usage**:
```bash
./scripts/verify-port-fix.sh
```

**Features**:
- Checks if required ports are available
- Verifies no port conflicts between services
- Validates docker-compose.yml port mappings

## Documentation Scripts

### convert-docs-to-html.js

**Purpose**: Converts Markdown documentation to HTML for GitHub Pages.

**Usage**:
```bash
node scripts/convert-docs-to-html.js
```

**Features**:
- Converts all .md files in docs/ to .html
- Preserves directory structure
- Used for GitHub Pages documentation site

## Directory Structure

```
scripts/
├── README.md                    # This file
├── deploy.sh                    # Production deployment
├── setup-drone.sh               # Drone CI setup
├── seed_db.js                   # Database seeding
├── bump-version.sh              # Version management
├── test-docker-builds.sh        # Docker build testing
├── validate-ssl-config.sh       # SSL validation
├── verify-port-fix.sh           # Port conflict checking
└── convert-docs-to-html.js      # Documentation conversion
```

## Adding New Scripts

When adding a new script to this directory:

1. **Make it executable**: `chmod +x scripts/your-script.sh`
2. **Add a header comment** explaining what it does
3. **Update this README** with script documentation
4. **Add to .gitignore if needed** (for generated output)
5. **Test thoroughly** before committing

### Script Template (Bash)

```bash
#!/bin/bash
# =============================================================================
# Script Name
# =============================================================================
# Description: What this script does
#
# Usage:
#   ./scripts/script-name.sh [arguments]
#
# =============================================================================

set -e  # Exit on any error

# Your script code here
```

### Script Template (Node.js)

```javascript
#!/usr/bin/env node
// =============================================================================
// Script Name
// =============================================================================
// Description: What this script does
//
// Usage:
//   node scripts/script-name.js [arguments]
//
// =============================================================================

// Your script code here
```

## Best Practices

1. **Use `set -e`** in bash scripts to exit on errors
2. **Add help text** with `-h` or `--help` flags
3. **Validate inputs** before executing critical operations
4. **Provide clear error messages** when something fails
5. **Make scripts idempotent** (safe to run multiple times)
6. **Document environment variables** needed by the script
7. **Use absolute paths** or `cd` to script directory
8. **Test on different environments** before merging

## Troubleshooting

### Script Permission Denied

```bash
# Make script executable
chmod +x scripts/script-name.sh

# Verify permissions
ls -l scripts/script-name.sh
```

### Script Not Found

```bash
# Run from repository root
cd /path/to/note-hub
./scripts/script-name.sh

# Or use full path
bash /path/to/note-hub/scripts/script-name.sh
```

### Environment Variables Not Set

Many scripts use environment variables. Check the script header or documentation for required variables.

## Related Documentation

- [DRONE_CI_DEPLOYMENT.md](../docs/guides/DRONE_CI_DEPLOYMENT.md) - Deployment guide
- [DRONE_CI_SETUP.md](../docs/guides/DRONE_CI_SETUP.md) - Drone CI setup
- [CONTRIBUTING.md](../docs/guides/CONTRIBUTING.md) - Contribution guidelines
- [SCRIPTS.md](../docs/guides/SCRIPTS.md) - Additional script documentation

---

**Last Updated**: December 2024
