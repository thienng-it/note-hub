# Docker Compose Quick Start

Quick reference for getting NoteHub running with Docker Compose.

## 🚀 Quick Start (Recommended)

```bash
# 1. Copy environment file
cp .env.example .env
nano .env  # Set NOTES_ADMIN_PASSWORD

# 2. Start services
docker compose -f docker-compose.dev.yml up -d

# 3. Seed database
docker compose -f docker-compose.dev.yml exec backend node scripts/seed_db.js

# 4. Open application
open http://localhost  # or https://localhost
```

## 📁 Which Compose File to Use?

| File | Purpose | When to Use |
|------|---------|-------------|
| **docker-compose.dev.yml** | Local development | ✅ Recommended for local dev |
| docker-compose.yml | Production deployment | CI/CD and production |
| docker-compose.local.yml | Override for yml | Advanced use cases |

## 🔧 Common Commands

### Start/Stop Services

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Stop all services
docker compose -f docker-compose.dev.yml down

# Restart a service
docker compose -f docker-compose.dev.yml restart backend

# View logs
docker compose -f docker-compose.dev.yml logs -f backend
```

### Database Management

```bash
# Seed database
docker compose -f docker-compose.dev.yml exec backend node scripts/seed_db.js

# Access SQLite database
docker compose -f docker-compose.dev.yml exec backend sh
sqlite3 /app/data/notes.db

# Reset database
docker compose -f docker-compose.dev.yml exec backend rm -f /app/data/notes.db
docker compose -f docker-compose.dev.yml restart backend
docker compose -f docker-compose.dev.yml exec backend node scripts/seed_db.js
```

### Development Workflow

```bash
# Build and start
docker compose -f docker-compose.dev.yml up -d --build

# Rebuild specific service
docker compose -f docker-compose.dev.yml up -d --build backend

# View container status
docker compose -f docker-compose.dev.yml ps

# Execute commands in container
docker compose -f docker-compose.dev.yml exec backend sh
```

## ⚡ Faster Development Option

For active development, run directly with npm (faster than Docker):

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend  
cd frontend
npm install
npm run dev
```

## 🔍 Troubleshooting

### Cache Registry Errors (403 Forbidden)

```bash
# Use docker-compose.dev.yml (already does this)
docker compose -f docker-compose.dev.yml up -d
```

### Port Already in Use

```bash
# Change ports in docker-compose.dev.yml
# Edit "80:80" to "8080:80"
# Edit "443:443" to "8443:443"
```

### Container Won't Start

```bash
# Check logs
docker compose -f docker-compose.dev.yml logs backend

# Check environment variables
docker compose -f docker-compose.dev.yml exec backend env | grep NOTES
```

## 📚 Full Documentation

- **[Complete Guide](docs/guides/DOCKER_COMPOSE_LOCAL_DEV.md)** - Detailed guide with troubleshooting
- **[Fix Summary](docs/DOCKER_COMPOSE_FIX_SUMMARY.md)** - Technical details of fixes
- **[Main README](README.md)** - Full project documentation

## 🎯 Default Credentials

After seeding:
- **Admin**: `admin` / (your NOTES_ADMIN_PASSWORD)
- **Demo**: `demo` / `Demo12345678!`

## 🌐 Access URLs

- **Frontend**: http://localhost (redirects to https://localhost)
- **Backend API**: http://localhost/api
- **Health Check**: http://localhost/health

**Note:** Browser will show security warning for self-signed cert in development. This is expected and safe for local development.

## 💡 Tips

1. **Use docker-compose.dev.yml** for local development (no auth issues)
2. **Run with npm** for active development (hot reload)
3. **Use Docker** for production-like testing
4. **Check logs** if something doesn't work
5. **Read the full guide** for advanced use cases
