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
├── src/
│   ├── notehub/               # Flask application package
│   │   ├── __init__.py        # Application factory
│   │   ├── config.py          # Configuration
│   │   ├── database.py        # Database helpers
│   │   ├── extensions.py      # Flask extensions
│   │   ├── forms.py           # WTForms definitions
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── routes/            # Route handlers
│   │   └── services/          # Business logic
│   └── templates/             # HTML templates
├── tests/                     # Test suite
├── requirements.txt           # Python dependencies
├── wsgi.py                    # WSGI entry point
├── render.yaml                # Render.com configuration
└── Procfile                   # Process file for deployment
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

4. Configure environment variables (optional):

```bash
export NOTES_ADMIN_USERNAME="admin"
export NOTES_ADMIN_PASSWORD="your-secure-password"
export FLASK_SECRET="your-secret-key"
export NOTES_DB_PATH="notes.db"
```

5. Run the application:

```bash
python wsgi.py
```

Visit `http://127.0.0.1:5000` in your browser.

---

## 🚀 Deployment

### Deploy to Render.com

1. Fork this repository
2. Create a new Web Service on [Render.com](https://render.com)
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and configure the service
5. Set environment variables in Render dashboard:
   - `NOTES_ADMIN_PASSWORD` (generate a secure password)
   - `FLASK_SECRET` (generate a random secret key)

The app will be automatically deployed with persistent storage for your notes database.

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

## 🔑 Two-Factor Authentication (2FA)

Optional 2FA support for enhanced security:

1. **Setup:** Navigate to Profile → Setup 2FA → Scan QR code with authenticator app
2. **Login:** Enter username, password, then 6-digit code from authenticator
3. **Disable:** Visit Profile page and click "Disable 2FA"
4. **Password Reset:** 2FA can be bypassed during password reset flow

**Supported Apps:** Google Authenticator, Microsoft Authenticator, Authy, 1Password, or any TOTP-compatible app

---

## 🛠️ Technology Stack

- **Backend:** Flask, SQLAlchemy, WTForms, Werkzeug
- **Security:** PyOTP (2FA), Bleach (HTML sanitization)
- **Frontend:** Tailwind CSS
- **Content:** Markdown, Pillow, qrcode
- **Deployment:** Gunicorn (WSGI server)

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
- Regular backups of `notes.db` are recommended
- For production use, consider PostgreSQL instead of SQLite
- Enable HTTPS in production environments

---

## 📄 License

Open source - available for personal and commercial use.

---

**Built with ❤️ using Flask, SQLAlchemy, and Tailwind CSS**
