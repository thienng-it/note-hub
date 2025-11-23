# Note Hub

A secure, feature-rich personal notes application built with Flask and MySQL.

![CI/CD Pipeline](https://github.com/thienng-it/note-hub/actions/workflows/ci-cd.yml/badge.svg?branch=main)

## Features

- 📝 **Rich Markdown Editor** - Full markdown support with live preview
- 🏷️ **Smart Organization** - Tags, favorites, pinning, and powerful search
- ✅ **Task Management** - Create and track tasks with priorities and due dates
- 🔐 **Two-Factor Authentication** - TOTP-based 2FA with QR code setup
- 🔒 **Security First** - CSRF protection, password policy, HTML sanitization
- 👥 **Collaboration** - Share notes with other users with view/edit permissions
- 🎨 **Customizable UI** - Light/dark mode, responsive design
- 📱 **Mobile-Friendly** - Works seamlessly on all devices
- 🔍 **Advanced Search** - Search by title, content, or tags
- 👤 **User Profiles** - Customizable profiles with themes and bio
- 🛡️ **Admin Dashboard** - User management and analytics

## Tech Stack

- **Backend**: Flask 3.x, Python 3.11+
- **Database**: MySQL 8.0+ with SQLAlchemy ORM
- **Authentication**: Flask-Login, PyOTP (2FA)
- **Frontend**: Jinja2, Bootstrap 5, JavaScript
- **Security**: WTForms, CSRF protection, Bleach (HTML sanitization)
- **API**: RESTful endpoints with JWT authentication
- **Deployment**: Gunicorn, Render, Netlify

## Quick Start

### Prerequisites

- Python 3.11 or higher
- MySQL 8.0 or higher
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/thienng-it/note-hub.git
cd note-hub
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up MySQL database:
```bash
mysql -u root -p -e "CREATE DATABASE notehub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

5. Configure environment variables:
```bash
export MYSQL_HOST="localhost"
export MYSQL_PORT="3306"
export MYSQL_USER="root"
export MYSQL_PASSWORD="your_password"
export MYSQL_DATABASE="notehub"
export FLASK_SECRET="your-secret-key-here"
export NOTES_ADMIN_PASSWORD="your-secure-password"
```

6. Run the application:
```bash
python wsgi.py
```

7. Open your browser and navigate to `http://127.0.0.1:5000`

**Default Login**: `admin` / `ChangeMeNow!42` (⚠️ change immediately after first login)

## Project Structure

```
note-hub/
├── src/
│   ├── notehub/               # Main application package
│   │   ├── routes_modules/    # Route handlers
│   │   ├── services/          # Business logic
│   │   ├── models.py          # Database models
│   │   ├── config.py          # Configuration
│   │   └── ...
│   └── templates/             # HTML templates
├── tests/                     # Test suite
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
├── requirements.txt           # Python dependencies
└── wsgi.py                    # Application entry point
```

## Deployment

### Render (Recommended)

1. Fork this repository
2. Create a [Render](https://render.com) account
3. Set up a MySQL database (PlanetScale or Aiven free tier)
4. Create a new Web Service and connect your GitHub repository
5. Render will automatically detect the `render.yaml` configuration
6. Add environment variables in the Render dashboard
7. Deploy!

See [QUICK_START_MYSQL.md](QUICK_START_MYSQL.md) for detailed deployment instructions.

### Other Platforms

- **Netlify**: See deployment guides in `docs/guides/DEPLOYMENT.md`
- **Heroku**: Use with ClearDB or JawsDB MySQL add-on
- **AWS**: Deploy with EC2 + RDS MySQL

## Documentation

All documentation is available in the `docs/` folder:

- [Complete Documentation](docs/README.md) - Full feature documentation
- [Architecture](docs/architecture/ARCHITECTURE.md) - System design and architecture
- [API Documentation](docs/api/JWT_API.md) - REST API reference
- [Deployment Guide](docs/guides/DEPLOYMENT.md) - Production deployment
- [Security Guide](docs/security/SECURITY.md) - Security best practices
- [Contributing](docs/guides/CONTRIBUTING.md) - Development guidelines

## Testing

Run the test suite:
```bash
pytest tests/ -v
```

Run with coverage:
```bash
pytest tests/ --cov=src/notehub --cov-report=html
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](docs/guides/CONTRIBUTING.md) for more details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [GitHub Repository](https://github.com/thienng-it/note-hub)
- [Report Issues](https://github.com/thienng-it/note-hub/issues)
- [Documentation](docs/)
