# NoteHub 📝

A modern, secure, and feature-rich personal notes application with a React SPA frontend and Flask API backend.

![CI/CD Pipeline](https://github.com/thienng-it/note-hub/actions/workflows/ci-cd.yml/badge.svg?branch=main)

## 🖼️ Screenshots

<details>
<summary>Click to view screenshots</summary>

### Login Page
![Login Page](docs/screenshots/login.png)

### Notes Dashboard
![Notes Dashboard](docs/screenshots/notes.png)

### Note Editor
![Note Editor](docs/screenshots/editor.png)

### Tasks Page
![Tasks Page](docs/screenshots/tasks.png)

### Dark Mode
![Dark Mode](docs/screenshots/dark-mode.png)

</details>

## 🏗️ Tech Stack

| Layer          | Technology                      |
| -------------- | ------------------------------- |
| **Frontend**   | Vite + React 19 + TypeScript    |
| **Backend**    | Python Flask 3.x + Gunicorn     |
| **Database**   | SQLite (dev) / MySQL (prod)     |
| **API**        | RESTful with JWT authentication |
| **Deployment** | Docker + nginx + Hetzner VPS    |
| **CI/CD**      | GitHub Actions + GitHub Pages   |

## ✨ Features

- 📝 **Rich Markdown Editor** - Full markdown support with live preview
- 🏷️ **Smart Organization** - Tags, favorites, pinning, and powerful search
- ✅ **Task Management** - Create and track tasks with priorities and due dates
- 🔐 **Two-Factor Authentication** - TOTP-based 2FA with QR code setup
- 🔒 **Security First** - JWT auth, CSRF protection, password policy, HTML sanitization
- 🤖 **CAPTCHA Protection** - Built-in math CAPTCHA or Google reCAPTCHA options
- 👥 **Collaboration** - Share notes with other users with view/edit permissions
- 🎨 **Customizable UI** - Light/dark mode, responsive glassmorphism design
- 📱 **Mobile-Friendly** - Works seamlessly on all devices
- 🔍 **Advanced Search** - Search by title, content, or tags
- 👤 **User Profiles** - Customizable profiles with themes and bio
- 🛡️ **Admin Dashboard** - User management and analytics

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Git

### Local Development

#### 1. Clone the Repository

```bash
git clone https://github.com/thienng-it/note-hub.git
cd note-hub
```

#### 2. Backend Setup (Python Flask API)

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment (optional - uses SQLite by default)
export SECRET_KEY="your-secret-key-here"
export NOTES_ADMIN_PASSWORD="your-secure-password"

# Run the backend API
python wsgi.py
# Backend API runs at http://localhost:5000
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

### 🐳 Docker Deployment

Deploy the full stack with Docker Compose:

```bash
# Copy and configure environment
cp .env.example .env
nano .env  # Edit with your values

# Build and run
docker compose up -d

# Access at http://localhost
```

Or build individual images:

```bash
# Build backend
docker build -f Dockerfile.backend -t notehub-backend .

# Build frontend
docker build -f Dockerfile.frontend -t notehub-frontend .
```

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
├── src/
│   └── notehub/               # Flask API application
│       ├── routes_modules/    # API route handlers
│       │   └── api_routes.py  # JWT-authenticated REST API
│       ├── services/          # Business logic
│       ├── models.py          # SQLAlchemy models
│       └── config.py          # Configuration
├── tests/                     # Backend test suite
├── docker/                    # Docker configuration
│   └── nginx.conf             # nginx config for frontend
├── docker-compose.yml         # Full stack deployment
├── Dockerfile.backend         # Backend Docker image
├── Dockerfile.frontend        # Frontend Docker image
├── requirements.txt           # Python dependencies
└── wsgi.py                    # Application entry point
```

## 🧪 Testing

```bash
# Backend tests
cd /path/to/note-hub
PYTHONPATH=src pytest tests/ -v

# Frontend tests
cd frontend
npm run test

# Frontend with coverage
npm run test:coverage

# Lint frontend
npm run lint
```

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

## 📚 API Documentation

The API uses JWT authentication. Key endpoints:

| Method | Endpoint            | Description          |
| ------ | ------------------- | -------------------- |
| POST   | `/api/auth/login`   | Login, get JWT token |
| POST   | `/api/auth/refresh` | Refresh access token |
| GET    | `/api/notes`        | List user's notes    |
| POST   | `/api/notes`        | Create new note      |
| GET    | `/api/notes/:id`    | Get note by ID       |
| PATCH  | `/api/notes/:id`    | Update note          |
| DELETE | `/api/notes/:id`    | Delete note          |
| GET    | `/api/tasks`        | List user's tasks    |
| POST   | `/api/tasks`        | Create new task      |

See [API Documentation](docs/api/JWT_API.md) for full reference.

## 📖 Documentation

| Document                                                | Description             |
| ------------------------------------------------------- | ----------------------- |
| [Hetzner Deployment](docs/guides/HETZNER_DEPLOYMENT.md) | Deploy to Hetzner VPS   |
| [Architecture](docs/architecture/ARCHITECTURE.md)       | System design           |
| [API Documentation](docs/api/JWT_API.md)                | REST API reference      |
| [Security Guide](docs/security/SECURITY.md)             | Security best practices |
| [Contributing](docs/guides/CONTRIBUTING.md)             | Development guidelines  |

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
