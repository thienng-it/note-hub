# Required Files for Docker Deployment

This document outlines the minimal files needed for each application to build and run successfully.

## Frontend (React SPA)

### Build Requirements
Files needed in build context:
```
frontend/
├── package.json         # Dependencies and build scripts
├── package-lock.json    # Locked dependency versions
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite build configuration
├── tailwind.config.ts   # TailwindCSS configuration (if used)
├── index.html           # Entry HTML file
└── src/                 # Source code
    ├── main.tsx         # Application entry point
    ├── App.tsx          # Root component
    ├── components/      # React components
    ├── pages/           # Page components
    ├── api/             # API client
    ├── types/           # TypeScript types
    └── assets/          # Static assets
```

### Production Runtime Requirements
After build, only these are needed in the image:
```
/usr/share/nginx/html/   # Built dist/ folder contents
/etc/nginx/conf.d/       # nginx configuration
```

**Image Size**: ~50MB (nginx:1.27-alpine + built assets)

### Build Process
1. Install dependencies: `npm ci --include=dev`
2. Build for production: `npm run build`
3. Copy `dist/` folder to nginx
4. No Node.js runtime needed in final image

## Backend (Node.js/Express API)

### Build Requirements
Files needed in build context:
```
backend/
├── package.json         # Dependencies and scripts
├── package-lock.json    # Locked dependency versions
├── src/                 # Source code (JavaScript)
│   ├── index.js         # Application entry point
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models
│   ├── config/          # Configuration files
│   └── utils/           # Utility functions
└── scripts/             # Utility scripts (e.g., seed_db.js)
```

### Production Runtime Requirements
In the final image:
```
/app/
├── node_modules/        # Production dependencies only
├── src/                 # Source code
├── scripts/             # Utility scripts
├── data/                # SQLite database (volume mount)
└── uploads/             # File uploads (volume mount)
```

**Image Size**: ~180MB (node:20.18.1-alpine + prod dependencies)

### Build Process
1. Install dependencies: `npm ci --omit=dev`
2. Copy source code
3. No compilation step (pure JavaScript)
4. Node.js runtime needed in final image

## Traefik Reverse Proxy

### Configuration Requirements
```
docker/traefik/
└── dynamic.yml          # Dynamic configuration for middleware
```

### Runtime Requirements
```
/var/run/docker.sock     # Docker socket (read-only)
/letsencrypt/            # SSL certificates (volume)
/etc/traefik/dynamic/    # Dynamic config (read-only mount)
```

**Image Size**: ~125MB (official traefik:v3.2 image)

### Configuration
- All routing via Docker labels
- Middleware (compression, security headers) in dynamic.yml
- SSL certificates via ACME/Let's Encrypt

## Drone CI

### Server Requirements
```
# No build context needed - uses official image
drone/drone:2.25

Runtime volumes:
/data/                   # Build data and metadata
```

**Image Size**: ~80MB (official drone image)

### Runner Requirements
```
# No build context needed - uses official image
drone/drone-runner-docker:1.8

Runtime volumes:
/var/run/docker.sock     # Docker socket for pipeline execution
```

**Image Size**: ~25MB (official drone-runner image)

### Database
```
postgres:15-alpine       # PostgreSQL for Drone metadata

Runtime volumes:
/var/lib/postgresql/data # Database files
```

**Image Size**: ~230MB (official postgres image)

## Prometheus Monitoring

### Server Requirements
```
prom/prometheus:v3.0.1

Configuration:
docker/prometheus/
└── prometheus.yml       # Scrape configuration

Runtime volumes:
/prometheus/             # Time-series data
```

**Image Size**: ~220MB (official prometheus image)

## Grafana Dashboards

### Requirements
```
grafana/grafana:11.4.0

Configuration:
docker/grafana/
├── provisioning/        # Datasource provisioning
│   └── datasources/
│       └── datasources.yml
└── dashboards/          # Dashboard JSON files

Runtime volumes:
/var/lib/grafana/        # Grafana database and settings
```

**Image Size**: ~390MB (official grafana image)

## Loki Log Aggregation

### Loki Server
```
grafana/loki:3.3.2

Configuration:
docker/loki/
└── loki-config.yml      # Loki configuration

Runtime volumes:
/loki/                   # Log storage
```

**Image Size**: ~75MB (official loki image)

### Promtail Agent
```
grafana/promtail:3.3.2

Configuration:
docker/loki/
└── promtail-config.yml  # Log collection config

Runtime volumes:
/var/log/                # System logs (read-only)
/var/lib/docker/         # Container logs (read-only)
/var/run/docker.sock     # Docker socket (read-only)
```

**Image Size**: ~50MB (official promtail image)

## MySQL Database (Optional)

### Requirements
```
mysql:8.4

Runtime volumes:
/var/lib/mysql/          # Database files
```

**Image Size**: ~580MB (official mysql image)

### Configuration
All configuration via environment variables:
- MYSQL_ROOT_PASSWORD
- MYSQL_DATABASE
- MYSQL_USER
- MYSQL_PASSWORD

## Docker Compose Files Overview

### Main Application (docker-compose.yml)
Services: traefik, frontend, backend, mysql (optional)
Profiles: default, production, mysql

### Monitoring (docker-compose.monitoring.yml)
Services: prometheus, grafana, cadvisor, node-exporter
No profiles (standalone)

### Logs (docker-compose.loki.yml)
Services: loki, promtail, grafana-loki
No profiles (standalone)

### CI/CD (docker-compose.drone.yml)
Services: drone-traefik, drone-server, drone-runner, drone-db
No profiles (standalone)

## Minimal Deployment

### Smallest Possible Deployment
Only NoteHub core:
```
docker compose up -d
```

Services running:
- traefik (125MB)
- frontend (50MB)
- backend (180MB)

**Total**: ~355MB RAM usage, ~300MB disk for images

### Full Stack Deployment
Everything enabled:
```
docker compose up -d
docker compose -f docker-compose.monitoring.yml up -d
docker compose -f docker-compose.loki.yml up -d
docker compose -f docker-compose.drone.yml up -d
```

**Total**: ~2.5GB RAM usage, ~2GB disk for images

## Build Context Sizes

With optimized .dockerignore:

| Application | Build Context | Notes |
|-------------|---------------|-------|
| Frontend | ~5MB | Source + package files |
| Backend | ~3MB | Source + package files |
| Full Stack | ~10MB | Both apps combined |

Without .dockerignore (before optimization):
- Build Context: ~50MB (includes node_modules, tests, docs, etc.)

## Environment Variables Required

### Frontend
```
VITE_API_URL=           # Optional: API endpoint override
```

### Backend
```
# Required
NOTES_ADMIN_PASSWORD=   # Admin account password
JWT_SECRET=             # JWT signing secret

# Optional
GOOGLE_CLIENT_ID=       # Google OAuth
GOOGLE_CLIENT_SECRET=   # Google OAuth
GOOGLE_REDIRECT_URI=    # Google OAuth callback
REDIS_URL=              # Redis cache
ELASTICSEARCH_NODE=     # Elasticsearch search
DATABASE_URL=           # MySQL connection string
```

### Drone CI
```
# Required
DRONE_POSTGRES_PASSWORD=    # Database password
DRONE_RPC_SECRET=           # Shared secret
DRONE_GITHUB_CLIENT_ID=     # GitHub OAuth
DRONE_GITHUB_CLIENT_SECRET= # GitHub OAuth
DRONE_SERVER_HOST=          # Server hostname
DRONE_SERVER_PROTO=         # http or https
```

### Monitoring
```
# Optional
GRAFANA_ADMIN_USER=     # Default: admin
GRAFANA_ADMIN_PASSWORD= # Default: admin
ACME_EMAIL=             # For Let's Encrypt SSL
DOMAIN=                 # Your domain name
```

## Volumes Explained

### Application Data
- `notehub-data`: SQLite database file
- `notehub-uploads`: User uploaded files
- `mysql-data`: MySQL database files (if using MySQL profile)

### SSL Certificates
- `letsencrypt`: SSL certificates for NoteHub
- `letsencrypt-drone`: SSL certificates for Drone CI

### Monitoring & Logs
- `prometheus-data`: Metrics time-series data
- `grafana-data`: Grafana dashboards and settings
- `loki-data`: Log storage
- `grafana-loki-data`: Loki Grafana instance

### CI/CD
- `drone-data`: Build metadata and artifacts
- `drone-postgres-data`: Drone database

## Network Architecture

### notehub-network
All NoteHub services communicate here:
- traefik
- frontend
- backend
- mysql (optional)
- grafana (monitoring)
- grafana-loki (logs)

### monitoring-network
Internal monitoring communication:
- prometheus
- grafana
- cadvisor
- node-exporter

### loki-network
Internal log aggregation:
- loki
- promtail
- grafana-loki

### drone-network
Completely isolated CI/CD:
- drone-traefik
- drone-server
- drone-runner
- drone-db

## Summary

### Most Efficient Setup
For minimal resource usage:
- Use default profile (SQLite, no MySQL)
- Skip monitoring if not needed
- Skip Loki logs if not needed
- Skip Drone CI if not needed

Absolute minimum: **~500MB RAM, ~300MB disk**

### Recommended Production Setup
- NoteHub with MySQL
- Monitoring stack
- Loki logs (optional)
- Drone CI on separate server (recommended)

Total: **~2GB RAM, ~1.5GB disk**
