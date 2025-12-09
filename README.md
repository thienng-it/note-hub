# NoteHub 📝

A modern, secure, and feature-rich personal notes application with a React SPA frontend and Node.js/Express API backend.

![CI/CD Pipeline](https://github.com/thienng-it/note-hub/actions/workflows/ci-cd.yml/badge.svg?branch=main)

## 🖼️ Screenshots

<details>
<summary>Click to view screenshots</summary>

### Core Features

#### Login Page with Google OAuth
![Login Page](docs/screenshots/login.png)
*Login with username/password or one-click Google Sign-In*

#### Notes Dashboard
![Notes Dashboard](docs/screenshots/notes.png)
*Organize notes with tags, search, favorites, and pinning*

#### Note Editor
![Note Editor](docs/screenshots/editor.png)
*Rich markdown editor with live preview*

#### Tasks Management
![Tasks Page](docs/screenshots/tasks.png)
*Track tasks with priorities and due dates*

#### Dark Mode
![Dark Mode](docs/screenshots/dark-mode.png)
*Beautiful dark theme with glassmorphism design*

### New Features (December 2024)

#### Google OAuth Single Sign-On
![Google OAuth](docs/screenshots/google-oauth.png)
*One-click sign-in with automatic account creation*

#### Simplified 2FA Management
![2FA Disable](docs/screenshots/2fa-disable.png)
*Disable 2FA without entering OTP code (already authenticated via JWT)*

#### Admin Dashboard
![Admin Dashboard](docs/screenshots/admin-dashboard.png)
*User management with 2FA recovery tools*

#### Admin 2FA Recovery
![Admin 2FA Disable](docs/screenshots/admin-2fa-disable.png)
*Admins can disable user 2FA for account recovery (lost devices, emergencies)*

> **Note**: To add actual screenshots, see [Screenshot Capture Guide](docs/screenshots/README.md)

</details>

## 🏗️ Tech Stack

| Layer            | Technology                          |
| ---------------- | ----------------------------------- |
| **Frontend**     | Vite + React 19 + TypeScript        |
| **Backend**      | Node.js + Express                   |
| **ORM**          | Sequelize                           |
| **Database**     | SQLite (dev) / MySQL (prod)         |
| **Replication**  | Read replicas (MySQL + SQLite)      |
| **Caching**      | Redis (optional)                    |
| **Search**       | Elasticsearch (optional)            |
| **Authentication** | JWT + Google OAuth 2.0 (optional) |
| **API**          | RESTful with JWT authentication     |
| **Reverse Proxy** | Traefik v2.11 (automatic routing)   |
| **Deployment**   | Docker + Traefik + Hetzner VPS      |
| **CI/CD**        | GitHub Actions + GitHub Pages       |

## 🚀 Recent Improvements

### Architecture Improvements (December 2024)
- 🔄 **Traefik Integration** - Migrated from nginx to Traefik for better container-native routing
  - Automatic service discovery via Docker labels
  - Dynamic configuration without restarts
  - **SSL/HTTPS enabled by default** with automatic Let's Encrypt certificates
  - HTTP to HTTPS redirect with HSTS security headers
  - Modern dashboard and monitoring
  - ⚠️ **Using a custom domain?** See [TROUBLESHOOTING_SSL.md](TROUBLESHOOTING_SSL.md) to fix certificate warnings

### Performance Enhancements (December 2024)
- ⚡ **10x Faster Queries** - Redis caching reduces note list operations from 80ms to 8ms
- 🔍 **5x Faster Search** - Elasticsearch integration improves search from 150ms to 30ms
- 🗄️ **SQL Optimization** - Added 4 composite indexes for complex query patterns
- 🔄 **Database Replication** - Read replicas for improved performance and high availability
- 📊 **Performance Benchmarks**:
  | Operation | Before | After | Improvement |
  |-----------|--------|-------|-------------|
  | List notes | 80ms | 8ms | **10x** |
  | Search notes | 150ms | 30ms | **5x** |
  | Get tags | 40ms | 4ms | **10x** |
  | Read operations (with replicas) | 80ms | 25ms | **3x** |

### Security Improvements (December 2024)
- 🔑 **Strengthened Password Hashing** - Upgraded from bcrypt 12 to 14 rounds (4x more secure)
- 🔄 **Automatic Hash Upgrades** - Opportunistic rehashing on login (transparent to users)
- 🔐 **Simplified 2FA Management** - Remove 2FA without entering OTP code
- 👨‍💼 **Admin 2FA Recovery** - Admins can disable user 2FA for account recovery
- 📝 **Privacy-Compliant Logging** - GDPR/CCPA compliant audit trails

### New Features (December 2024)
- 🔑 **Google OAuth SSO** - One-click sign-in with automatic account creation
- 🧪 **Comprehensive Test Suite** - 94+ tests covering all features and security
- 📚 **Extensive Documentation** - 50K+ words of guides and technical docs
- ⚙️ **Configuration Management** - Centralized, environment-tunable settings

All new features are **optional** and designed for graceful degradation. NoteHub continues to work perfectly in SQL-only mode.

## ✨ Features

### Core Features
- 📝 **Rich Markdown Editor** - Full markdown support with live preview
- 🏷️ **Smart Organization** - Tags, favorites, pinning, and powerful search
- ✅ **Task Management** - Create and track tasks with priorities and due dates
- 👥 **Collaboration** - Share notes with other users with view/edit permissions
- 🎨 **Customizable UI** - Light/dark mode, responsive glassmorphism design
- 🌍 **Internationalization (i18n)** - Multi-language support (English, German, Vietnamese, Japanese)
- 📱 **Mobile-Friendly** - Works seamlessly on all devices
- 👤 **User Profiles** - Customizable profiles with themes and bio

### Security & Authentication
- 🔐 **Two-Factor Authentication** - TOTP-based 2FA with QR code setup and simplified management
- 🔑 **Google OAuth Single Sign-On** - One-click sign-in with automatic account creation
- 🔒 **Strengthened Password Security** - bcrypt with 14 rounds (4x more secure) and automatic hash upgrades
- 🛡️ **Admin Controls** - Admin dashboard with user management and 2FA recovery tools
- 📋 **Audit Logging** - Comprehensive security event logging (GDPR/CCPA compliant)

### Performance & Scalability
- ⚡ **Redis Caching** - Optional 10x performance boost for frequently accessed data
- 🔍 **Elasticsearch Integration** - Optional full-text search with fuzzy matching (5x faster)
- 🗄️ **SQL Query Optimization** - Composite indexes for complex query patterns
- 📊 **Performance Monitoring** - Built-in query performance tracking

### Developer Experience
- 🧪 **Comprehensive Test Suite** - 34 frontend tests with snapshot testing, 60+ backend integration tests
- 🔧 **TypeScript Support** - Full type safety across the frontend
- 📦 **Modular Architecture** - Clean separation of concerns with service layers
- 📚 **Extensive Documentation** - 50K+ words covering all features and setup

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- Redis (optional, for caching)
- Elasticsearch (optional, for full-text search)
- Google OAuth credentials (optional, for SSO)

### Local Development

#### 1. Clone the Repository

```bash
git clone https://github.com/thienng-it/note-hub.git
cd note-hub
```

#### 2. Backend Setup (Node.js/Express API)

```bash
cd backend

# Install dependencies
npm install

# Configure environment (copy from example)
cp .env.example .env
nano .env  # Edit with your values

# Required settings:
export JWT_SECRET="your-secret-key-here"
export NOTES_ADMIN_PASSWORD="your-secure-password"

# Optional performance enhancements:
export REDIS_URL="redis://localhost:6379"                  # 10x faster queries
export ELASTICSEARCH_NODE="http://localhost:9200"          # 5x faster search

# Optional Google OAuth SSO:
export GOOGLE_CLIENT_ID="your-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-secret"
export GOOGLE_REDIRECT_URI="http://localhost:3000/auth/google/callback"

# Run the backend API
npm run dev
# Backend API runs at http://localhost:5000
```

**Note**: All optional services (Redis, Elasticsearch, Google OAuth) are designed for graceful degradation. The app works perfectly without them, falling back to SQL-only mode.

#### 3. Frontend Setup (Vite + React)

```bash
cd frontend

# Install dependencies
npm install

# Run development server (proxies API to backend)
npm run dev
# Frontend runs at http://localhost:3000
```

### 🐳 Docker Deployment

NoteHub supports multiple deployment modes:

#### Development Mode (SQLite, local testing)

```bash
# Copy and configure environment (REQUIRED)
cp .env.example .env
nano .env  # Set NOTES_ADMIN_PASSWORD and other values

# Build and run (uses SQLite by default)
docker compose up -d

# Seed the database with sample data
docker compose exec backend node scripts/seed_db.js

# Access at http://localhost (redirects to https://localhost)
# Note: Browser will show security warning for self-signed cert in dev
```

#### Development with MySQL

```bash
# Set required MySQL credentials in .env first
# MYSQL_ROOT_PASSWORD, MYSQL_USER, MYSQL_PASSWORD

# Run with MySQL profile
docker compose --profile mysql up -d

# Seed the MySQL database
docker compose exec backend-mysql node scripts/seed_db.js

# Access at http://localhost (redirects to https://localhost)
```

#### Production Mode (Cloud Database)

For production deployments connecting to external databases (PlanetScale, AWS RDS, etc.):

```bash
# Configure production environment
cp .env.example .env
nano .env

# Set these variables for production:
# SECRET_KEY=<strong-random-key>
# DATABASE_URL=mysql://user:password@your-cloud-db:3306/notehub
# NOTES_ADMIN_PASSWORD=<secure-admin-password>
# ACME_EMAIL=admin@yourdomain.com  # For Let's Encrypt SSL certificates

# Run with production profile
docker compose --profile production up -d

# NOTE: Do NOT run seed script in production!
# Database should be pre-configured via cloud provider's management console.

# Access at https://yourdomain.com (automatic SSL via Let's Encrypt)
# Ensure your domain points to your server and ports 80/443 are open
```

**Important**: The seed script is blocked in production mode to prevent accidental data modification. Use your cloud database provider's tools to manage production data.

Or build individual images:

```bash
# Build backend
docker build -f Dockerfile.backend.node -t notehub-backend .

# Build frontend
docker build -f Dockerfile.frontend -t notehub-frontend .
```

### Default Credentials

After running the seed script, use these credentials to login:
- **Admin**: `admin` / (password set in `NOTES_ADMIN_PASSWORD` env var)
- **Demo**: `demo` / `Demo12345678!`

## 📦 Project Structure

```
note-hub/
├── frontend/                  # Vite + React frontend (SPA)
│   ├── src/
│   │   ├── api/               # API client with JWT handling
│   │   ├── components/        # React components
│   │   ├── context/           # Auth and Theme contexts
│   │   ├── pages/             # Page components
│   │   ├── types/             # TypeScript types
│   │   └── test/              # Test setup
│   ├── public/                # Static assets
│   ├── vite.config.ts         # Vite + Vitest configuration
│   └── package.json           # Frontend dependencies
├── backend/                   # Node.js/Express API
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Authentication middleware
│   │   ├── config/            # Database configuration
│   │   └── index.js           # Application entry point
│   ├── tests/                 # Backend test suite
│   └── package.json           # Backend dependencies
├── scripts/                   # Utility scripts
│   └── seed_db.js             # Database seeding script
├── docker/                    # Docker configuration
│   └── nginx.conf             # nginx config for frontend
├── docker-compose.yml         # Full stack deployment
├── Dockerfile.backend.node    # Backend Docker image
└── Dockerfile.frontend        # Frontend Docker image
```

## 🧪 Testing

NoteHub includes a comprehensive test suite with 94+ tests covering frontend UI, backend integration, and security features.

```bash
# Frontend tests (34 tests)
cd frontend
npm test                     # Run all tests
npm run test:coverage        # With coverage report

# Backend tests (60+ tests)
cd backend
npm test                     # Run all tests
npm test -- --coverage       # With coverage report

# Lint and type-check
cd frontend
npm run lint                 # ESLint
npm run type-check           # TypeScript compilation

cd backend
npm run lint                 # ESLint
```

### Test Coverage
- ✅ **Frontend**: Snapshot tests, user interactions, OAuth flows, error handling
- ✅ **Backend**: Authentication, 2FA management, Google OAuth, Redis caching, Elasticsearch search
- ✅ **Security**: Password hash upgrades, audit logging, admin controls
- ✅ **Integration**: E2E flows for all major features

See [Test Suite Summary](docs/testing/TEST_SUITE_SUMMARY.md) for complete details.

## 🌐 Deployment Options

### Option 1: GitHub Pages (Frontend Only)

The frontend is automatically deployed to GitHub Pages on push to main.
Configure the API URL via `VITE_API_URL` environment variable.

### Option 2: Hetzner VPS + Docker (Full Stack)

**~€3.50/month with unlimited bandwidth!**

| Component             | Cost     | Benefits                                  |
| --------------------- | -------- | ----------------------------------------- |
| **Hetzner VPS**       | €3.29/mo | 2 vCPU, 2GB RAM, 40GB SSD                 |
| **Cloudflare Tunnel** | Free     | Unlimited bandwidth, DDoS protection, CDN |

```bash
# On your VPS
git clone https://github.com/thienng-it/note-hub.git
cd note-hub

# Configure
cp .env.example .env
nano .env

# Deploy
docker compose up -d
```

See [Hetzner Deployment Guide](docs/guides/HETZNER_DEPLOYMENT.md) for complete setup.

### Option 3: Drone CI for Continuous Integration (Independent)

Deploy Drone CI as a **standalone, independent CI/CD platform**. Drone CI does not depend on NoteHub and can be deployed on the same server, a different server, or completely independently.

> 📘 **Note**: Drone CI is a **completely independent application** with its own services, configuration, network, and data storage. It can be deployed anywhere, with or without NoteHub.

**Key Features:**
- 🐳 Container-native CI/CD platform
- 🔗 Automatic GitHub integration
- 🚀 Parallel pipeline execution
- 📊 Beautiful web UI on port 8080
- ✅ **Completely independent** from NoteHub

```bash
# Setup Drone CI (independent deployment)
cp .env.drone.example .env.drone
nano .env.drone  # Configure GitHub OAuth and secrets (separate from NoteHub)

# Deploy Drone CI
docker compose -f docker-compose.drone.yml up -d

# Access Drone CI at http://your-server:8080
# Works with or without NoteHub running
```

**Documentation:**
- **[DRONE_CI_README.md](DRONE_CI_README.md)** - Quick start and overview
- **[DRONE_CI_UI_IMPLEMENTATION.md](DRONE_CI_UI_IMPLEMENTATION.md)** - UI features and verification
- **[DRONE_CI_STANDALONE.md](docs/guides/DRONE_CI_STANDALONE.md)** - Complete independence documentation
- **[DRONE_CI_SETUP.md](docs/guides/DRONE_CI_SETUP.md)** - Detailed setup guide

## 📚 API Documentation

The API uses JWT authentication with optional Google OAuth 2.0 SSO. Key endpoints:

### Authentication
| Method | Endpoint                              | Description                    |
| ------ | ------------------------------------- | ------------------------------ |
| POST   | `/api/auth/login`                     | Login, get JWT token           |
| POST   | `/api/auth/refresh`                   | Refresh access token           |
| GET    | `/api/auth/google/status`             | Check if Google OAuth enabled  |
| GET    | `/api/auth/google`                    | Get Google OAuth URL           |
| POST   | `/api/auth/google/callback`           | Complete Google OAuth flow     |
| POST   | `/api/auth/2fa/disable`               | Disable 2FA (no OTP required)  |

### Notes & Tasks
| Method | Endpoint            | Description              |
| ------ | ------------------- | ------------------------ |
| GET    | `/api/notes`        | List user's notes (cached if Redis enabled) |
| POST   | `/api/notes`        | Create new note          |
| GET    | `/api/notes/search` | Full-text search (uses Elasticsearch if enabled) |
| GET    | `/api/notes/:id`    | Get note by ID           |
| PATCH  | `/api/notes/:id`    | Update note              |
| DELETE | `/api/notes/:id`    | Delete note              |
| GET    | `/api/tasks`        | List user's tasks        |
| POST   | `/api/tasks`        | Create new task          |

### Admin
| Method | Endpoint                                  | Description                  |
| ------ | ----------------------------------------- | ---------------------------- |
| POST   | `/api/admin/users/:userId/disable-2fa`    | Admin disable user 2FA       |

See [API Documentation](docs/api/JWT_API.md) for full reference.

## 📖 Documentation

### Guides
| Document                                                       | Description                    |
| -------------------------------------------------------------- | ------------------------------ |
| [Hetzner Deployment](docs/guides/HETZNER_DEPLOYMENT.md)        | Deploy to Hetzner VPS          |
| **[Custom Domain SSL Setup](docs/guides/CUSTOM_DOMAIN_SSL_SETUP.md)** | **Fix "not secure" certificate warnings** |
| [SSL/HTTPS Setup](docs/guides/SSL_HTTPS_SETUP.md)             | SSL certificate configuration  |
| **[Drone CI README](DRONE_CI_README.md)** | **Quick start for independent Drone CI** |
| **[Drone CI UI Implementation](DRONE_CI_UI_IMPLEMENTATION.md)** | **UI features, architecture, and verification** |
| **[Drone CI Standalone](docs/guides/DRONE_CI_STANDALONE.md)** | **Complete independence documentation** |
| [Drone CI Setup](docs/guides/DRONE_CI_SETUP.md)               | Detailed Drone CI setup guide |
| [Environment Configuration](docs/guides/ENVIRONMENT_CONFIGURATION.md) | .env setup and management |
| [Logging Configuration](docs/guides/LOGGING_CONFIGURATION.md) | Structured logging setup       |
| **[Graylog Setup](GRAYLOG_SETUP.md)** | **Centralized log aggregation and search** |
| **[Database Replication](docs/guides/DATABASE_REPLICATION.md)** | **Read replicas for MySQL & SQLite** |
| [Caching & Search Setup](docs/guides/CACHING_AND_SEARCH.md)   | Redis & Elasticsearch setup    |
| [Google OAuth Setup](docs/guides/GOOGLE_SSO_SETUP.md)         | Configure Google Single Sign-On|
| [Internationalization (i18n)](docs/guides/I18N_GUIDE.md)      | Multi-language support guide   |
| [Contributing](docs/guides/CONTRIBUTING.md)                    | Development guidelines         |

### Architecture & Security
| Document                                                       | Description                    |
| -------------------------------------------------------------- | ------------------------------ |
| [Architecture](docs/architecture/ARCHITECTURE.md)              | System design                  |
| [API Documentation](docs/api/JWT_API.md)                       | REST API reference             |
| [Security Guide](docs/security/SECURITY.md)                    | Security best practices        |
| [Password Security](docs/security/PASSWORD_SECURITY_IMPROVEMENTS.md) | Password hashing improvements |
| [2FA Improvements](docs/security/2FA_IMPROVEMENTS.md)          | 2FA management changes         |

### Investigation & Testing
| Document                                                       | Description                    |
| -------------------------------------------------------------- | ------------------------------ |
| [NoSQL Investigation](docs/investigation/NOSQL_INVESTIGATION.md) | SQL vs NoSQL analysis         |
| [SQL vs NoSQL Comparison](docs/investigation/SQL_VS_NOSQL_COMPARISON.md) | Detailed comparison   |
| [Implementation Summary](docs/investigation/IMPLEMENTATION_SUMMARY.md) | Performance enhancements |
| [Test Suite Summary](docs/testing/TEST_SUITE_SUMMARY.md)      | Complete test documentation    |

## 📚 Documentation

All documentation is available in both Markdown and HTML formats for better readability:

- **[Documentation Portal](docs/documentation.html)** - Beautiful web interface with search functionality
- **[Complete Index](docs/INDEX.md)** - Full list of all documentation files
- **[Getting Started](docs/README.md)** - Project overview and quick start

### Building Documentation HTML

The documentation is automatically converted from Markdown to HTML during deployment. To build locally:

```bash
# Install dependencies
npm install

# Convert all markdown files to HTML
npm run build:docs
```

This generates HTML files with consistent styling, syntax highlighting, and easy navigation between documents.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/thienng-it/note-hub)
- [Report Issues](https://github.com/thienng-it/note-hub/issues)
- [Documentation](docs/)
