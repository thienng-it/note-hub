# NoteHub

A secure, feature-rich personal notes application built with Flask. Supports markdown editing, tags, tasks, two-factor authentication, and more.

---

## 📊 Status

![CI/CD Pipeline](https://github.com/thienng-it/note-hub/actions/workflows/ci-cd.yml/badge.svg?branch=main)

---

## 🚀 Quick Start

**Default Login:** `admin` / `ChangeMeNow!42` (change immediately after first login)

---

## ✨ Features

- **📝 Rich Markdown Editing** - Full markdown support with live preview
- **🏷️ Smart Tagging** - Organize notes with tags and filter by them
- **🔍 Powerful Search** - Search notes by title, content, or tags
- **⭐ Favorites & Pinning** - Mark important notes as favorites or pin them
- **📱 Responsive Design** - Beautiful UI that works on all devices
- **🌙 Dark Mode** - Toggle between light and dark themes
- **🔐 Secure** - CSRF protection, input validation, and HTML sanitization
- **📊 Reading Time** - Automatic reading time estimation
- **🔑 Two-Factor Authentication (2FA)** - TOTP-based 2FA with QR code setup
- **✅ Task Management** - Create and track tasks with priorities and due dates
- **👥 Note Sharing** - Share notes with other users with view/edit permissions

---

## 📁 Project Structure

```
note-hub/
├── frontend/                  # Vite + React frontend
│   ├── src/                   # React components
│   └── vite.config.ts         # Vite configuration
├── backend/                   # Node.js/Express API
│   ├── src/                   # API source code
│   │   ├── config/            # Database configuration
│   │   ├── middleware/        # Authentication middleware
│   │   ├── models/            # Sequelize models
│   │   ├── routes/            # API routes
│   │   └── services/          # Business logic
│   └── tests/                 # Backend tests
├── docs/                      # Documentation
│   ├── api/                   # API documentation
│   ├── architecture/          # Architecture docs
│   ├── guides/                # User guides
│   ├── investigation/         # Technical investigations
│   └── security/              # Security documentation
├── scripts/                   # Utility scripts
├── docker-compose.yml         # Docker setup
└── package.json               # Project dependencies
```

---

## ⚙️ Installation & Setup

### Local Development

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
# Install MySQL if not already installed
# macOS: brew install mysql
# Ubuntu: sudo apt-get install mysql-server

# Start MySQL and create database
mysql -u root -p
CREATE DATABASE notehub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'notehub'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON notehub.* TO 'notehub'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

5. Configure environment variables:

```bash
export NOTES_ADMIN_USERNAME="admin"
export NOTES_ADMIN_PASSWORD="your-secure-password"
export FLASK_SECRET="your-secret-key"

# MySQL Configuration
export MYSQL_HOST="localhost"
export MYSQL_PORT="3306"
export MYSQL_USER="notehub"
export MYSQL_PASSWORD="your_secure_password"
export MYSQL_DATABASE="notehub"

# Optional: Enable CAPTCHA protection
export RECAPTCHA_SITE_KEY="your-recaptcha-site-key"
export RECAPTCHA_SECRET_KEY="your-recaptcha-secret-key"
```

6. Run the application:

```bash
python wsgi.py
```

Visit `http://127.0.0.1:5000` in your browser.

---

## 🚀 Deployment

### Deploy to Render.com

1. Set up a MySQL database (Render offers managed MySQL databases)
2. Fork this repository
3. Create a new Web Service on [Render.com](https://render.com)
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml` and configure the service
6. Set environment variables in Render dashboard:
   - `MYSQL_HOST` (your MySQL host)
   - `MYSQL_PORT` (default: 3306)
   - `MYSQL_USER` (your MySQL username)
   - `MYSQL_PASSWORD` (your MySQL password)
   - `MYSQL_DATABASE` (your database name)
   - `NOTES_ADMIN_PASSWORD` (generate a secure password)
   - `FLASK_SECRET` (generate a random secret key)

The app will be automatically deployed with MySQL database connection.

### Manual Deployment (Any Platform)

For other platforms supporting Python WSGI apps:

```bash
gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 wsgi:app
```

Ensure you set the required environment variables on your platform.

---

## 🔒 Security Features

- **CSRF Protection** - All forms protected against cross-site request forgery
- **Input Validation** - Server-side validation for all user inputs
- **HTML Sanitization** - Safe markdown rendering with bleach
- **Secure Sessions** - Proper session management
- **Password Hashing** - Passwords stored securely with Werkzeug
- **Two-Factor Authentication (2FA)** - TOTP-based authentication with QR code setup
- **CAPTCHA Protection** - Optional reCAPTCHA v2 integration to prevent bots and automated attacks

## 🤖 CAPTCHA Protection

Optional CAPTCHA integration to protect against bots and automated attacks:

1. **Setup:** Get reCAPTCHA keys from [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. **Configure:** Set environment variables:
   - `RECAPTCHA_SITE_KEY` - Public site key
   - `RECAPTCHA_SECRET_KEY` - Secret key
3. **Forms Protected:**
   - Login form (prevents brute force attacks)
   - Registration form (prevents bot registrations)
   - Forgot password form (prevents abuse)

**Note:** CAPTCHA is automatically enabled when keys are configured. Without keys, forms work normally without CAPTCHA.

For detailed setup instructions, see [docs/CAPTCHA_SETUP.md](docs/CAPTCHA_SETUP.md).

## 🔑 Two-Factor Authentication (2FA)

Optional 2FA support for enhanced security:

1. **Setup:** Navigate to Profile → Setup 2FA → Scan QR code with authenticator app
2. **Login:** Enter username, password, then 6-digit code from authenticator
3. **Disable:** Visit Profile page and click "Disable 2FA"
4. **Password Reset:** 2FA can be bypassed during password reset flow

**Supported Apps:** Google Authenticator, Microsoft Authenticator, Authy, 1Password, or any TOTP-compatible app

---

## 🛠️ Technology Stack

- **Frontend:** Vite + React 19 + TypeScript
- **Backend:** Node.js + Express
- **Database:** SQLite (dev) / MySQL (prod)
- **ORM:** Sequelize
- **Security:** JWT authentication, bcrypt, HTML sanitization
- **Deployment:** Docker + nginx

---

## 📝 Markdown Support

Full markdown syntax supported including:

- Headers (`# H1`, `## H2`)
- **Bold**, _Italic_, `Code`
- Lists, links, images
- Code blocks with syntax highlighting
- Tables and blockquotes

---

## 🧪 Testing

Run the test suite:

```bash
python tests/test_app.py
```

Or use pytest:

```bash
pytest tests/ -v
```

---

## ⚠️ Important Notes

- Designed for personal or small team use
- **Change default password immediately** after first login
- Regular backups of MySQL database are recommended (use `mysqldump`)
- MySQL provides better performance and concurrency than SQLite
- Enable HTTPS in production environments

---

## 📄 License

Open source - available for personal and commercial use.

---

**Built with ❤️ using Flask, SQLAlchemy, and Tailwind CSS**
