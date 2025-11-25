# 🚀 Fly.io Deployment Guide for NoteHub

This guide explains how to deploy NoteHub to [Fly.io](https://fly.io) with the new stack:

- **Frontend**: Vite + React + TypeScript
- **Backend**: Python Flask
- **Database**: External MySQL (PlanetScale, Aiven, or Railway)

## 📋 Prerequisites

1. [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
2. Fly.io account (free tier available)
3. External MySQL database set up (see [EXTERNAL_MYSQL_SETUP.md](./EXTERNAL_MYSQL_SETUP.md))
4. Node.js 18+ and npm (for local development)
5. Python 3.11+ (for local development)

## 🔧 Initial Setup

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Login to Fly.io

```bash
fly auth login
```

### 3. Launch the Application

From the project root directory:

```bash
# Launch the app (first time only)
fly launch --no-deploy

# This will:
# - Create a new app on Fly.io
# - Generate a fly.toml file (or use existing one)
# - NOT deploy yet (we need to set secrets first)
```

## 🔐 Configure Secrets

Set the required environment variables securely:

```bash
# Required: Database Configuration
fly secrets set MYSQL_HOST="your-mysql-host.example.com"
fly secrets set MYSQL_PORT="3306"
fly secrets set MYSQL_USER="your-username"
fly secrets set MYSQL_PASSWORD="your-secure-password"
fly secrets set MYSQL_DATABASE="notehub"

# Required: Application Secrets
fly secrets set FLASK_SECRET="$(openssl rand -hex 32)"
fly secrets set NOTES_ADMIN_USERNAME="admin"
fly secrets set NOTES_ADMIN_PASSWORD="YourSecureAdminPassword123!"

# Optional: CAPTCHA Configuration
fly secrets set CAPTCHA_TYPE="simple"  # or "recaptcha" or "none"

# Optional: ReCAPTCHA (if using Google reCAPTCHA)
fly secrets set RECAPTCHA_SITE_KEY="your-site-key"
fly secrets set RECAPTCHA_SECRET_KEY="your-secret-key"
```

## 🚀 Deploy

```bash
# Deploy the application
fly deploy

# Watch the logs
fly logs

# Open in browser
fly open
```

## 📊 Monitoring & Management

### Check Application Status

```bash
# Check status
fly status

# View logs
fly logs

# SSH into the container
fly ssh console
```

### Scaling

```bash
# Scale to 2 machines
fly scale count 2

# Scale memory
fly scale memory 1024

# Scale VM size
fly scale vm shared-cpu-2x
```

### Secrets Management

```bash
# List all secrets
fly secrets list

# Update a secret
fly secrets set MYSQL_PASSWORD="new-password"

# Unset a secret
fly secrets unset RECAPTCHA_SITE_KEY
```

## 🔄 CI/CD with GitHub Actions

Create `.github/workflows/fly-deploy.yml`:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches:
      - main

jobs:
  deploy:
    name: Deploy NoteHub
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Fly.io CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

To set up the GitHub Action:

1. Generate a Fly.io API token:

   ```bash
   fly tokens create deploy -x 999999h
   ```

2. Add the token to GitHub repository secrets as `FLY_API_TOKEN`

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Fly.io Edge (CDN)                    │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                   Fly.io Machine                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Gunicorn (Python WSGI)               │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │           Flask Application                 │  │  │
│  │  │  • API Routes (/api/*)                      │  │  │
│  │  │  • Auth Routes (/auth/*)                    │  │  │
│  │  │  • Static Files (Vite Build)                │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│              External MySQL Database                    │
│         (PlanetScale / Aiven / Railway)                 │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Local Development

### Backend (Python Flask)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export MYSQL_HOST="localhost"
export MYSQL_USER="root"
export MYSQL_PASSWORD="your-password"
export MYSQL_DATABASE="notehub"

# Run the backend
python wsgi.py
```

### Frontend (Vite + React)

```bash
cd frontend

# Install dependencies
npm install

# Run development server (proxies to Flask backend)
npm run dev

# Build for production
npm run build
```

## 🐛 Troubleshooting

### Application Won't Start

1. Check logs: `fly logs`
2. Verify secrets are set: `fly secrets list`
3. Check database connectivity:
   ```bash
   fly ssh console
   python -c "from notehub.database import test_connection; test_connection()"
   ```

### Database Connection Issues

1. Ensure MySQL host is accessible from Fly.io
2. Check SSL requirements for your MySQL provider
3. Verify credentials are correct

### Health Check Failing

1. Ensure `/health` endpoint returns 200
2. Check if application starts within the grace period (10s)
3. Increase `grace_period` in `fly.toml` if needed

## 📚 Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Fly.io Python Guide](https://fly.io/docs/languages-and-frameworks/python/)
- [PlanetScale Setup](./EXTERNAL_MYSQL_SETUP.md)
- [Vite Documentation](https://vitejs.dev/)

## 💰 Pricing

Fly.io offers a generous free tier:

- 3 shared-cpu-1x VMs (256MB each)
- 3GB persistent storage
- 160GB outbound bandwidth

For production workloads, consider upgrading to:

- dedicated-cpu-1x for better performance
- Increased memory for larger workloads
- Multiple regions for global availability

---

**Need help?** Open an issue on GitHub or check the [Fly.io Community](https://community.fly.io/).
