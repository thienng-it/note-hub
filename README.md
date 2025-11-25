# NoteHub 📝

A secure, feature-rich personal notes application with modern architecture.

![CI/CD Pipeline](https://github.com/thienng-it/note-hub/actions/workflows/ci-cd.yml/badge.svg?branch=main)
![Deploy to Fly.io](https://github.com/thienng-it/note-hub/actions/workflows/fly-deploy.yml/badge.svg)

## 🏗️ Tech Stack

| Layer          | Technology                     |
| -------------- | ------------------------------ |
| **Frontend**   | Vite + React + TypeScript      |
| **Backend**    | Python Flask 3.x               |
| **Database**   | MySQL 8.0+ with SQLAlchemy ORM |
| **Deployment** | Fly.io (Docker-based)          |
| **CI/CD**      | GitHub Actions                 |

## ✨ Features

- 📝 **Rich Markdown Editor** - Full markdown support with live preview
- 🏷️ **Smart Organization** - Tags, favorites, pinning, and powerful search
- ✅ **Task Management** - Create and track tasks with priorities and due dates
- 🔐 **Two-Factor Authentication** - TOTP-based 2FA with QR code setup
- 🔒 **Security First** - CSRF protection, password policy, HTML sanitization
- 🤖 **CAPTCHA Protection** - Built-in math CAPTCHA or Google reCAPTCHA options
- 👥 **Collaboration** - Share notes with other users with view/edit permissions
- 🎨 **Customizable UI** - Light/dark mode, responsive design
- 📱 **Mobile-Friendly** - Works seamlessly on all devices
- 🔍 **Advanced Search** - Search by title, content, or tags
- 👤 **User Profiles** - Customizable profiles with themes and bio
- 🛡️ **Admin Dashboard** - User management and analytics

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- MySQL 8.0+
- Git

### Local Development

#### 1. Clone the Repository

```bash
git clone https://github.com/thienng-it/note-hub.git
cd note-hub
```

#### 2. Backend Setup (Python Flask)

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
export MYSQL_HOST="localhost"
export MYSQL_PORT="3306"
export MYSQL_USER="root"
export MYSQL_PASSWORD="your_password"
export MYSQL_DATABASE="notehub"
export FLASK_SECRET="your-secret-key-here"
export NOTES_ADMIN_PASSWORD="your-secure-password"

# Run the backend
python wsgi.py
# Backend runs at http://localhost:5000
```

#### 3. Frontend Setup (Vite + React)

```bash
cd frontend

# Install dependencies
npm install

# Run development server (proxies API to Flask)
npm run dev
# Frontend runs at http://localhost:3000
```

### 🐳 Docker Development

```bash
# Build and run with Docker Compose (optional)
docker build -t notehub .
docker run -p 8080:8080 \
  -e MYSQL_HOST="your-db-host" \
  -e MYSQL_PASSWORD="your-password" \
  notehub
```

## 📦 Project Structure

```
note-hub/
├── frontend/                  # Vite + React frontend
│   ├── src/                   # React components and logic
│   ├── public/                # Static assets
│   ├── vite.config.ts         # Vite configuration
│   └── package.json           # Frontend dependencies
├── src/
│   ├── notehub/               # Flask application
│   │   ├── routes_modules/    # Route handlers
│   │   ├── services/          # Business logic
│   │   ├── models.py          # Database models
│   │   └── config.py          # Configuration
│   ├── templates/             # Jinja2 HTML templates
│   └── static/                # Backend static files
├── tests/                     # Test suite
├── docs/                      # Documentation
│   └── guides/
│       └── FLY_IO_DEPLOYMENT.md  # Fly.io deployment guide
├── fly.toml                   # Fly.io configuration
├── Dockerfile                 # Multi-stage Docker build
├── requirements.txt           # Python dependencies
└── wsgi.py                    # Application entry point
```

## 🌐 Deployment to Fly.io

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh
```

### 2. Login and Launch

```bash
fly auth login
fly launch --no-deploy
```

### 3. Configure Secrets

```bash
fly secrets set MYSQL_HOST="your-mysql-host"
fly secrets set MYSQL_USER="your-username"
fly secrets set MYSQL_PASSWORD="your-password"
fly secrets set MYSQL_DATABASE="notehub"
fly secrets set FLASK_SECRET="$(openssl rand -hex 32)"
fly secrets set NOTES_ADMIN_PASSWORD="SecurePassword123!"
```

### 4. Deploy

```bash
fly deploy
fly open
```

For detailed instructions, see [Fly.io Deployment Guide](docs/guides/FLY_IO_DEPLOYMENT.md).

## 🧪 Testing

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src/notehub --cov-report=html

# Run frontend tests
cd frontend && npm run lint
```

## 📚 Documentation

| Document                                              | Description             |
| ----------------------------------------------------- | ----------------------- |
| [Fly.io Deployment](docs/guides/FLY_IO_DEPLOYMENT.md) | Deploy to Fly.io        |
| [Architecture](docs/architecture/ARCHITECTURE.md)     | System design           |
| [API Documentation](docs/api/JWT_API.md)              | REST API reference      |
| [Security Guide](docs/security/SECURITY.md)           | Security best practices |
| [Contributing](docs/guides/CONTRIBUTING.md)           | Development guidelines  |

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
