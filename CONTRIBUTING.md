# Contributing to NoteHub

Thank you for your interest in contributing to NoteHub! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## 🚀 Getting Started

### Prerequisites

- Python 3.9 or higher
- Git
- Basic knowledge of Flask and SQLAlchemy

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/note-hub.git
cd note-hub
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/thienng-it/note-hub.git
```

## 🛠️ Development Setup

### 1. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment (Optional)

Create a `.env` file in the project root:

```env
NOTES_ADMIN_USERNAME=admin
NOTES_ADMIN_PASSWORD=your-secure-password
FLASK_SECRET=your-secret-key
NOTES_DB_PATH=notes.db
FLASK_DEBUG=1
```

### 4. Initialize Database

The database will be automatically created on first run:

```bash
python wsgi.py
```

## 📁 Project Structure

```
note-hub/
├── src/
│   ├── notehub/               # Main application package
│   │   ├── __init__.py        # Application factory
│   │   ├── config.py          # Configuration management
│   │   ├── database.py        # Database utilities
│   │   ├── extensions.py      # Flask extensions (CSRF, etc.)
│   │   ├── forms.py           # WTForms definitions
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── security.py        # Security utilities (password policy, 2FA)
│   │   ├── routes/            # Route handlers
│   │   │   └── __init__.py    # All application routes
│   │   └── services/          # Business logic
│   │       ├── bootstrap.py   # Admin user creation
│   │       └── utils.py       # Helper utilities
│   └── templates/             # Jinja2 HTML templates
├── scripts/                   # Utility scripts
│   ├── monitoring/            # Database monitoring tools
│   │   ├── demo_realtime_user_creation.py
│   │   ├── monitor_db_realtime.py
│   │   ├── user_dashboard.py
│   │   ├── cleanup_test_users.py
│   │   └── test_create_user.py
│   ├── verify_password_policy.py
│   ├── quick_test.sh
│   └── README.md
├── tests/                     # Test suite
│   ├── test_app.py            # Application tests
│   └── test_password_policy.py # Password policy tests
├── requirements.txt           # Python dependencies
├── wsgi.py                    # WSGI entry point
├── Procfile                   # Deployment configuration
├── render.yaml                # Render.com deployment
├── runtime.txt                # Python version specification
├── .gitignore                 # Git ignore rules
├── LICENSE                    # MIT License
├── README.md                  # Main documentation
├── SECURITY.md                # Security policy
└── CONTRIBUTING.md            # This file
```

## 🔄 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style and patterns
- Add comments for complex logic
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run the application
python wsgi.py

# Test specific functionality
python -m pytest tests/

# Check password policy
python scripts/verify_password_policy.py

# Monitor database changes
python scripts/monitoring/user_dashboard.py
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

### 5. Keep Your Fork Updated

```bash
git fetch upstream
git rebase upstream/main
```

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

## 🧪 Testing

### Manual Testing

1. **Registration Flow:**

   - Test user registration with valid/invalid passwords
   - Verify password policy enforcement
   - Check duplicate username handling

2. **Authentication:**

   - Test login/logout functionality
   - Verify 2FA setup and verification
   - Test password reset flow

3. **Note Management:**

   - Create, edit, delete notes
   - Test markdown rendering
   - Verify tag functionality
   - Test search features

4. **Task Management:**
   - Create tasks with priorities
   - Test due date handling
   - Verify completion status

### Automated Testing

```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_password_policy.py -v

# Run with coverage
python -m pytest tests/ --cov=src/notehub
```

### Database Testing

Use the monitoring scripts to verify database operations:

```bash
# Watch database changes in real-time
python scripts/monitoring/monitor_db_realtime.py

# View user statistics
python scripts/monitoring/user_dashboard.py

# Create test users
python scripts/monitoring/test_create_user.py testuser "TestPassword123!@#"

# Clean up test data
python scripts/monitoring/cleanup_test_users.py
```

## 💅 Code Style

### Python Code Style

- Follow PEP 8 guidelines
- Use meaningful variable and function names
- Maximum line length: 120 characters (flexible for readability)
- Use type hints where beneficial
- Add docstrings for classes and complex functions

**Example:**

```python
def calculate_reading_time(content: str) -> int:
    """Calculate estimated reading time in minutes.

    Args:
        content: The text content to analyze

    Returns:
        Estimated reading time in minutes
    """
    words = len(content.split())
    return max(1, words // 200)
```

### HTML/Template Style

- Use semantic HTML5 elements
- Maintain consistent indentation (2 spaces)
- Use Jinja2 template inheritance
- Include CSRF tokens in all forms

### CSS Style

- Use existing Bootstrap classes when possible
- Custom CSS should follow BEM naming convention
- Maintain dark mode compatibility

### JavaScript Style

- Use modern ES6+ syntax
- Add comments for complex logic
- Maintain vanilla JS approach (avoid unnecessary dependencies)

## 📝 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no code change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(auth): add 2FA support with TOTP

Implement two-factor authentication using TOTP.
Users can now enable 2FA from their profile page.

Closes #123

---

fix(notes): resolve markdown rendering issue

Fix XSS vulnerability in markdown preview by
properly sanitizing HTML output.

---

docs(readme): update installation instructions

Add troubleshooting section and clarify
virtual environment setup steps.
```

## 🔀 Pull Request Process

### Before Submitting

1. ✅ Test your changes thoroughly
2. ✅ Update documentation if needed
3. ✅ Ensure all tests pass
4. ✅ Follow code style guidelines
5. ✅ Write clear commit messages
6. ✅ Rebase on latest main branch

### Submitting a Pull Request

1. **Push to your fork:**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request on GitHub:**

   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select your feature branch
   - Fill in the PR template

3. **PR Title Format:**

   ```
   [Type] Brief description of changes
   ```

   Example: `[Feature] Add note sharing functionality`

4. **PR Description Should Include:**
   - Summary of changes
   - Motivation and context
   - How to test the changes
   - Screenshots (if UI changes)
   - Related issues (if any)

### Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Keep the discussion focused and constructive
- Be patient and respectful

### After Approval

- Maintainer will merge your PR
- Your branch will be deleted automatically
- Celebrate your contribution! 🎉

## 🐛 Reporting Bugs

### Before Reporting

1. Check if the bug has already been reported
2. Verify it's not a configuration issue
3. Try to reproduce with a minimal example

### Bug Report Should Include

- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Python version, browser)
- Screenshots or error messages
- Possible solution (if you have one)

## 💡 Feature Requests

### Suggesting Features

- Check if feature already exists or is planned
- Explain the use case and benefits
- Provide examples of how it would work
- Be open to discussion and alternative approaches

## 📞 Getting Help

- **Documentation:** Check README.md and scripts/README.md
- **Issues:** Browse existing issues or create a new one
- **Discussions:** Use GitHub Discussions for questions

## 🔐 Security

- **Never commit secrets or credentials**
- **Report security vulnerabilities privately** (see SECURITY.md)
- **Follow password policy requirements**
- **Validate and sanitize all user inputs**
- **Use parameterized queries (SQLAlchemy ORM)**

## 📄 License

By contributing to NoteHub, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to NoteHub!** 🚀

Your contributions help make this project better for everyone.
