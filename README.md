# Beautiful Notes App

A modern, clean, and feature-rich personal notes application built with Flask. Perfect for personal note-taking, journaling, and idea capture.

---

## 📊 Status

![CI/CD Pipeline](https://github.com/thienng-it/note-hub/actions/workflows/ci-cd.yml/badge.svg?branch=main)
![Deploy GitHub Pages](https://github.com/thienng-it/note-hub/actions/workflows/deploy-pages.yml/badge.svg?branch=main)

---

## 🚀 Live Demo

**[🎯 Click here to try the live app](https://note-hub.netlify.app)** (Running on Netlify Functions)

**Default Login:** `admin` / `change-me`

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
- **🔑 Two-Factor Authentication (2FA)** - TOTP-based 2FA with QR code setup for enhanced security

## 📁 Project Structure

```
note-hub/
├── src/
│   ├── notehub/               # Flask application package
│   │   ├── __init__.py        # Application factory + exports
│   │   ├── config.py          # AppConfig dataclass
│   │   ├── database.py        # SQLAlchemy engine/session helpers
│   │   ├── extensions.py      # Flask extensions (CSRF, etc.)
│   │   ├── forms.py           # WTForms definitions
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── routes/            # All route registrations
│   │   └── services/          # Helpers (migrations, utilities)
│   └── templates/             # HTML templates consumed by Flask
├── scripts/
│   └── dev_server.py          # Local entrypoint (`python scripts/dev_server.py`)
├── infra/
│   └── netlify/
│       └── functions/app.py   # serverless-wsgi bridge for Netlify Functions
├── netlify.toml               # Netlify build + routing config
├── public/                    # Publish directory for Netlify
├── requirements.txt           # Python dependencies (inc. serverless-wsgi)
├── tests/                     # HTTP-based regression test harness
├── docs/                      # GitHub Pages marketing site
└── .github/workflows/         # CI + Pages deploy pipelines
```

## ⚙️ Configuration

Set environment variables to customize:

```bash
export NOTES_DB_PATH="my_notes.db"           # Database file
export NOTES_ADMIN_USERNAME="myuser"         # Admin username
export NOTES_ADMIN_PASSWORD="mypassword"     # Admin password
export FLASK_SECRET="your-secret-key"        # Flask secret key
```

## 🎯 Usage Tips

1. **Organize with tags:** Use consistent tagging (e.g., `work`, `personal`, `ideas`)
2. **Pin important notes:** Keep frequently accessed notes at the top
3. **Use markdown:** Format your notes with headers, lists, code blocks, etc.
4. **Search efficiently:** Use the search bar to quickly find notes
5. **Backup regularly:** Copy `notes.db` to backup your notes

## 🔒 Security Features

- **CSRF Protection** - All forms protected against cross-site request forgery
- **Input Validation** - Server-side validation for all user inputs
- **HTML Sanitization** - Safe markdown rendering with bleach
- **Secure Sessions** - Proper session management
- **Password Hashing** - Passwords stored securely with Werkzeug
- **Two-Factor Authentication (2FA)** - TOTP-based authentication with QR code setup

## 🔑 Two-Factor Authentication (2FA)

The app includes optional 2FA for enhanced security:

1. **Setup 2FA**

   - Navigate to Profile → Setup 2FA
   - Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
   - Verify the 6-digit code to enable 2FA

2. **Login with 2FA**

   - Enter username and password
   - When prompted, enter the 6-digit code from your authenticator app
   - Access granted after successful verification

3. **Password Reset**

   - Can reset password via email verification
   - 2FA can be bypassed during password reset process
   - Re-enable 2FA after regaining access

4. **Disable 2FA**
   - Go to Profile page
   - Click "Disable 2FA" to turn off 2FA protection

**Supported Authenticator Apps:**

- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- Any TOTP-compatible app

## 🎨 UI/UX Highlights

- **Modern Design** - Clean, minimalist interface with Tailwind CSS
- **Responsive Layout** - Works perfectly on desktop, tablet, and mobile
- **Smooth Animations** - Subtle transitions and hover effects
- **Intuitive Navigation** - Easy-to-use sidebar and quick actions
- **Flash Messages** - Clear feedback for all actions
- **Empty States** - Helpful messages when no notes are found

## 🛠️ Technology Stack

- **Flask** - Web framework
- **SQLAlchemy** - Database ORM
- **WTForms** - Form handling and validation
- **Markdown** - Content rendering
- **Bleach** - HTML sanitization
- **PyOTP** - TOTP-based two-factor authentication
- **qrcode** - QR code generation for 2FA setup
- **Pillow** - Image processing for QR codes
- **Tailwind CSS** - Modern styling

## 📝 Markdown Support

The app supports full markdown syntax:

- Headers: `# H1`, `## H2`, `### H3`
- **Bold**: `**text**`
- _Italic_: `*text*`
- Lists: `- item` or `1. item`
- Links: `[text](url)`
- Code: `` `code` ``
- Code blocks: ` ```language ... ``` `
- Tables, blockquotes, and more!

## 🔧 Development

To run in development mode:

```bash
python scripts/dev_server.py
```

> **Tip:** The repository follows a `src/` layout. Export `PYTHONPATH=src` (or run tooling through `python -m ...`) when you need direct access to the `notehub` package outside the helper script.

The app runs on `http://127.0.0.1:5000` by default.

## 📦 Production Deployment

### Option A – Netlify Functions (serverless)

1. Install the Netlify CLI locally (`npm install -g netlify-cli`).
2. Authenticate and create a site: `netlify init`.
3. Deploy preview builds with `netlify deploy` and promote to production via `netlify deploy --prod`.
4. Netlify reads `netlify.toml`, installs `requirements.txt`, builds the Python function in `infra/netlify/functions/app.py`, and proxies every request to the Flask app via `serverless-wsgi`.

### Option B – Traditional WSGI host

If you prefer a traditional VM/container:

1. Set strong environment variables
2. Use a production WSGI server (e.g., Gunicorn or uWSGI)
3. Enable HTTPS
4. Back up `notes.db` regularly or swap to PostgreSQL/MySQL

Example with Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 "scripts.dev_server:app"
```

## 🔄 CI/CD Pipeline

This project has automated testing, security scanning, and deployment configured:

- **Automated Testing:** Python 3.9, 3.10, 3.11
- **Code Quality:** Black, isort, flake8, bandit
- **Security Scanning:** Trivy, Safety
- **Auto-Deployment:** Netlify Functions (app) + GitHub Pages (documentation)

See [CI_CD.md](CI_CD.md) for detailed pipeline documentation and updated Netlify notes.

## ⚠️ Important Notes

- This app is designed for **personal local use**
- Change the default password before use
- For multi-user scenarios, additional security measures are needed
- Regular backups of `notes.db` are recommended

## 📄 License

This project is open source and available for personal use.

---

**Perfect for:** Personal note-taking, journaling, idea capture, documentation  
**Built with:** Flask, SQLAlchemy, Tailwind CSS
