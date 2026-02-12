# NoteHub Repository Structure

Clean and organized project structure for easy navigation.

## 📁 Directory Structure

```
note-hub/
├── 📄 Core Files
│   ├── README.md              # Main documentation
│   ├── QUICKSTART.md          # Quick start guide
│   ├── DEPLOY_TO_FIREBASE.md  # Firebase deployment
│   ├── LICENSE                # MIT License
│   ├── package.json           # Root package config
│   ├── fly.toml               # Fly.io config
│   └── firebase.json          # Firebase hosting config
│
├── 🎨 Frontend (React + TypeScript)
│   └── frontend/
│       ├── src/               # Source code
│       ├── public/            # Static assets
│       ├── dist/              # Build output
│       ├── package.json       # Dependencies
│       └── vite.config.ts     # Vite configuration
│
├── ⚙️ Backend (Node.js + Express)
│   └── backend/
│       ├── src/               # Source code
│       │   ├── routes/        # API routes
│       │   ├── services/      # Business logic
│       │   ├── models/        # Database models
│       │   ├── middleware/    # Express middleware
│       │   └── config/        # Configuration
│       ├── tests/             # Test suite
│       ├── scripts/           # Utility scripts
│       └── package.json       # Dependencies
│
├── 📚 Documentation
│   └── docs/
│       ├── INDEX.md           # Documentation index
│       ├── deployment/        # Deployment guides
│       │   ├── FLY_IO_DEPLOYMENT.md
│       │   ├── DATABASE_ON_FLYIO.md
│       │   └── DEPLOYMENT_GUIDE.md
│       ├── api/               # API documentation
│       │   └── JWT_API.md
│       ├── guides/            # How-to guides
│       │   ├── GOOGLE_SSO_SETUP.md
│       │   └── DATABASE_REPLICATION.md
│       ├── security/          # Security docs
│       │   └── SECURITY.md
│       ├── docker-configs/    # Docker configurations
│       │   ├── docker-compose.yml
│       │   ├── docker-compose.domain.yml
│       │   ├── docker-compose.monitoring.yml
│       │   └── DOCKER_COMPOSE_QUICKSTART.md
│       └── archive/           # Old/completed docs
│
├── 🐳 Docker
│   ├── Dockerfile             # Main Dockerfile
│   ├── Dockerfile.backend.node # Backend Dockerfile
│   ├── .dockerignore          # Docker ignore file
│   └── docker/                # Docker configs
│       ├── nginx/             # Nginx configs
│       ├── traefik/           # Traefik configs
│       ├── grafana/           # Grafana configs
│       └── prometheus/        # Prometheus configs
│
├── 🧪 Tests & Scripts
│   ├── e2e/                   # End-to-end tests
│   ├── tests/                 # Additional tests
│   └── scripts/               # Utility scripts
│       ├── deploy-firebase.sh
│       └── setup-firebase-sdk.sh
│
└── ⚙️ Configuration
    ├── .env.example           # Environment template
    ├── .gitignore             # Git ignore rules
    ├── .editorconfig          # Editor configuration
    ├── .firebaserc            # Firebase project
    └── .github/               # GitHub Actions
        └── workflows/
            └── ci-cd.yml
```

## 🎯 Quick Navigation

### Getting Started
- [QUICKSTART.md](../QUICKSTART.md) - Get running in 5 minutes
- [README.md](../README.md) - Full documentation
- [.env.example](../.env.example) - Environment variables template

### Development
- Frontend code: [`frontend/src/`](../frontend/src/)
- Backend code: [`backend/src/`](../backend/src/)
- Tests: [`backend/tests/`](../backend/tests/) & [`frontend/src/**/*.test.tsx`](../frontend/src/)

### Deployment
- [DEPLOY_TO_FIREBASE.md](../DEPLOY_TO_FIREBASE.md) - Firebase + Fly.io (Free)
- [docs/deployment/](deployment/) - All deployment guides
- [docs/docker-configs/](docker-configs/) - Docker configurations

### API & Documentation
- [docs/api/JWT_API.md](api/JWT_API.md) - REST API reference
- [docs/guides/](guides/) - How-to guides
- [docs/security/SECURITY.md](security/SECURITY.md) - Security practices

## 📝 File Naming Conventions

- **UPPERCASE.md** - Important root-level docs
- **lowercase/** - Directories
- **PascalCase.tsx** - React components
- **camelCase.ts** - TypeScript utilities
- **kebab-case.yml** - Configuration files

## 🧹 Maintenance

### Archived Files
Old/completed documentation is moved to [`docs/archive/`](archive/) to keep the root clean.

### Docker Configurations
All docker-compose files are in [`docs/docker-configs/`](docker-configs/) with detailed documentation.

## 🔍 Finding Things

Use this guide when you need to:

- **Deploy**: Check [`docs/deployment/`](deployment/)
- **Configure Docker**: Check [`docs/docker-configs/`](docker-configs/)
- **Learn API**: Check [`docs/api/JWT_API.md`](api/JWT_API.md)
- **Setup OAuth**: Check [`docs/guides/GOOGLE_SSO_SETUP.md`](guides/GOOGLE_SSO_SETUP.md)
- **Troubleshoot**: Check root README or specific guide in [`docs/`](.)

---

**Repository organized on**: February 12, 2026  
**Structure**: Clean, logical, easy to navigate
