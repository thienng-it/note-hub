# Beautiful Notes App

A modern, clean, and feature-rich personal notes application built with Flask. Perfect for personal note-taking, journaling, and idea capture.

## 🚀 Live Demo

### 🌐 Live Website
**[🎯 Click here to try the live app](https://note-hub.onrender.com)** (Deployed on Render)

Login with:
- Username: `admin`
- Password: `change-me`

---

### 💻 Run Locally

**Try it now!** The app is ready to run locally:

```bash
# Quick Start (3 steps)
pip install -r requirements.txt
python simple_app.py
# Open http://127.0.0.1:5000 in your browser
```

**Default Credentials:**

- Username: `admin`
- Password: `change-me`

⚠️ **Important:** Change the default password immediately after first login!

## ✨ Features

- **📝 Rich Markdown Editing** - Full markdown support with live preview
- **🏷️ Smart Tagging** - Organize notes with tags and filter by them
- **🔍 Powerful Search** - Search notes by title, content, or tags
- **⭐ Favorites & Pinning** - Mark important notes as favorites or pin them
- **📱 Responsive Design** - Beautiful UI that works on all devices
- **🌙 Dark Mode** - Toggle between light and dark themes
- **🔐 Secure** - CSRF protection, input validation, and HTML sanitization
- **📊 Reading Time** - Automatic reading time estimation

## 🎯 Demo Walkthrough

### Step 1: Login

1. Navigate to `http://127.0.0.1:5000`
2. Enter the default credentials above
3. Click "Login"

### Step 2: Create a Note

1. Click the "New Note" button
2. Add a title and content using markdown
3. Add tags (e.g., `demo`, `personal`)
4. Click "Save Note"

### Step 3: Explore Features

- **Search:** Use the search bar to find notes by title or content
- **Filter by Tags:** Click on tags to filter notes
- **Dark Mode:** Toggle the theme in the top right
- **Mark as Favorite:** Star your favorite notes
- **Pin Notes:** Keep important notes at the top
- **Edit/Delete:** Manage your notes from the note view

### Step 4: Change Password

1. Go to "Settings" or "Profile"
2. Change your password to something secure
3. Save your changes

## 🔧 Detailed Quick Start

1. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Run the app:**

   ```bash
   python simple_app.py
   ```

3. **Open your browser:**

   ```
   http://127.0.0.1:5000
   ```

4. **Login with default credentials:**
   - Username: `admin`
   - Password: `change-me`
5. **Stop the server:**
   - Press `Ctrl+C` in your terminal

## 📁 Project Structure

```
joseph_note/
├── simple_app.py          # Main application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── notes.db              # SQLite database (created automatically)
└── templates/            # HTML templates
    ├── base.html         # Base layout
    ├── index.html        # Notes list
    ├── login.html        # Login page
    ├── edit_note.html    # Create/edit notes
    ├── view_note.html    # View single note
    └── error.html        # Error pages
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
python simple_app.py
```

The app runs on `http://127.0.0.1:5000` by default.

## 📦 Production Deployment

For production use:

1. Set strong environment variables
2. Use a production WSGI server (e.g., Gunicorn)
3. Enable HTTPS
4. Set up proper backups
5. Consider using PostgreSQL instead of SQLite

Example with Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 "simple_app:app"
```

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
