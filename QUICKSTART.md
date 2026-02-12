# Quick Start Guide

Get NoteHub running in under 5 minutes!

## 🚀 Live Demo (FREE)

**Frontend**: https://notehub-484714.web.app  
**Admin Login**: `admin` / `NoteHub2026Admin!`

## 💻 Local Development

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/note-hub.git
cd note-hub
```

### 2. Start Backend

```bash
cd backend
npm install
cp .env.example .env

# Edit .env - Set these required vars:
# JWT_SECRET=your-secret-here
# REFRESH_TOKEN_SECRET=your-refresh-secret
# NOTES_ADMIN_PASSWORD=your-admin-password

npm run dev
# Backend runs on http://localhost:5000
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

### 4. Login

- Navigate to http://localhost:3000
- Login: `admin` / `[your NOTES_ADMIN_PASSWORD]`

## 🐳 Docker (Even Easier!)

```bash
# Start everything
docker compose up

# Access at http://localhost
```

## 📚 Next Steps

- [Full README](README.md) - Complete documentation
- [Deploy to Production](DEPLOY_TO_FIREBASE.md) - Free deployment guide
- [API Docs](docs/api/JWT_API.md) - REST API reference
- [Configuration](docs/guides/) - Advanced setup

---

**That's it!** You're ready to start using NoteHub! 🎉
