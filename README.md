# Note Hub

Welcome to NoteHub! A secure, feature-rich personal notes application built with Flask.

## 🗄️ Database Setup (Required for Render Deployment)

**This app requires a MySQL database.** Render's free tier doesn't include MySQL, so you'll need to use an external provider:

### Quick Setup (5 minutes):

1. **See [QUICK_START_MYSQL.md](QUICK_START_MYSQL.md)** for fastest setup with PlanetScale (free)
2. **Or see [docs/guides/EXTERNAL_MYSQL_SETUP.md](docs/guides/EXTERNAL_MYSQL_SETUP.md)** for detailed guide with multiple providers

### Set these 5 environment variables in Render:

```
MYSQL_HOST=<your-database-host>
MYSQL_PORT=3306
MYSQL_USER=<your-username>
MYSQL_PASSWORD=<your-password>
MYSQL_DATABASE=<your-database-name>
```

## 📚 Documentation

All project documentation is organized in the `docs/` folder:

- **[Documentation Index](docs/INDEX.md)** - Complete documentation overview
- **[Main Documentation](docs/README.md)** - Features, installation, and quick start
- **[Architecture](docs/architecture/)** - System design and architecture
- **[API Documentation](docs/api/)** - API references and changelog
- **[Guides](docs/guides/)** - Deployment, migration, and contribution guides
- **[Security](docs/security/)** - Security best practices and guidelines
- **[Project Management](docs/project/)** - CI/CD, release notes, and project status

## 🚀 Quick Start

See [docs/README.md](docs/README.md) for complete installation instructions.

**Default Login:** `admin` / `ChangeMeNow!42` (change immediately after first login)
