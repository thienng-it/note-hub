# 🔐 Security Policy

## Overview

The Note Hub application takes security very seriously. This document outlines the security features, best practices, and guidelines for using and deploying the application securely.

---

## 🛡️ Security Features

### 1. **Authentication & Authorization**

- **Secure Password Hashing**

  - Passwords are hashed using Werkzeug's `generate_password_hash()`
  - Uses PBKDF2 with SHA256 by default
  - Passwords are salted and never stored in plaintext

- **Session Management**

  - Secure server-side session handling
  - HTTPS-only cookies (in production)
  - HttpOnly flag prevents JavaScript access
  - SameSite cookie attribute prevents CSRF attacks

- **CSRF Protection**
  - All forms protected with Flask-WTF CSRF tokens
  - Token validation on all state-changing requests
  - Regenerated on each login

### 2. **Two-Factor Authentication (2FA)**

- **TOTP-Based 2FA**

  - Time-based One-Time Password (TOTP) implementation
  - Uses industry-standard pyotp library
  - Compatible with Google Authenticator, Authy, Microsoft Authenticator, etc.

- **QR Code Setup**

  - QR codes generated for easy authenticator setup
  - Base64 encoded for safe transmission
  - Secret keys stored encrypted in database

- **2FA Bypass for Account Recovery**
  - Password reset flow allows bypassing 2FA
  - Identity verified through security questions or email
  - Re-enable 2FA after recovering access

### 3. **Input Validation & Sanitization**

- **Server-Side Validation**

  - All user inputs validated on the server
  - WTForms validators for form fields
  - Length, format, and type checking

- **HTML Sanitization**

  - User-generated markdown content sanitized with bleach
  - Prevents XSS (Cross-Site Scripting) attacks
  - Safe subset of HTML allowed

- **SQL Injection Prevention**
  - SQLAlchemy ORM parameterized queries
  - No raw SQL with string concatenation
  - Prepared statements for all database operations

### 4. **Database Security**

- **SQLite Encryption (Optional)**

  - Consider using encrypted SQLite in production
  - Or migrate to PostgreSQL with encrypted connections

- **Database Access**

  - Only admin user has direct database access
  - All queries go through authenticated sessions
  - Row-level security through session checks

- **Sensitive Data**
  - No plaintext storage of secrets
  - TOTP secrets stored in database
  - Database file should be backed up securely

### 5. **HTTPS/TLS**

- **Production Deployment**

  - Always use HTTPS in production
  - Netlify (deployment platform) provisions SSL/TLS automatically via Let's Encrypt
  - Redirect HTTP to HTTPS

- **Certificates**
  - Let's Encrypt for free SSL certificates
  - Auto-renewal configured
  - HSTS headers recommended

### 6. **Content Security Policy (CSP)**

- **Recommended Headers**
  - Content-Security-Policy for XSS protection
  - X-Frame-Options to prevent clickjacking
  - X-Content-Type-Options to prevent MIME sniffing

---

## 🔑 Security Best Practices

### For Users

1. **Password Security**

   - Use strong, unique passwords (12+ characters)
   - Change default password immediately
   - Never share your password

2. **2FA Setup**

   - Enable 2FA for all accounts
   - Save backup codes in a secure location
   - Keep your authenticator app synchronized

3. **Session Security**

   - Log out when finished using the app
   - Use HTTPS connections only
   - Don't share session links or cookies

4. **Data Backup**
   - Regularly backup your notes database
   - Store backups in secure location
   - Test restores periodically

### For Administrators

1. **Environment Variables**

   - Never commit `.env` files to version control
   - Use strong, random secret keys
   - Rotate secrets periodically

2. **Database Management**

   - Regular backups (daily recommended)
   - Backup stored in separate secure location
   - Document backup and restore procedures

3. **Access Control**

   - Limit admin access to authorized personnel only
   - Monitor access logs
   - Review user accounts regularly

4. **Updates & Patches**
   - Keep Flask and dependencies updated
   - Monitor security advisories
   - Test updates in staging environment first

### For Developers

1. **Code Security**

   - Use security linters (bandit)
   - Follow OWASP guidelines
   - Perform code reviews before deployment

2. **Dependency Management**

   - Keep dependencies up-to-date
   - Use tools like Safety to check for vulnerabilities
   - Pin versions in requirements.txt

3. **Error Handling**

   - Don't expose sensitive information in errors
   - Log errors securely
   - Use generic error messages for users

4. **Testing**
   - Write security-focused tests
   - Test input validation thoroughly
   - Test authentication flows

---

## 🚨 Security Considerations

### Known Limitations

1. **Development Mode**

   - Debug mode disabled in production
   - Don't enable debug in live environments
   - Exposes sensitive information

2. **Single-User Design**

   - Built for personal/small team use
   - Not suitable for large multi-user deployments
   - No built-in multi-tenant isolation

3. **Local Database**
   - SQLite not ideal for concurrent access
   - Consider PostgreSQL for production
   - Backup strategy crucial

### Threat Model

This application protects against:

- ✅ Brute force password attacks
- ✅ Session hijacking
- ✅ CSRF attacks
- ✅ XSS attacks
- ✅ SQL injection

This application does NOT protect against:

- ❌ Physical access to server
- ❌ Compromised hosting environment
- ❌ Weak user passwords
- ❌ Phishing attacks
- ❌ Malware on user device

---

## 🔍 Security Scanning

### GitHub Actions CI/CD

The project includes automated security scanning:

1. **CodeQL Analysis**

   - Scans for known vulnerability patterns
   - SARIF report generation
   - Integrated with GitHub Security tab

2. **Trivy Scanning**

   - Filesystem vulnerability scanning
   - Dependency vulnerability detection
   - Regular security updates

3. **Safety Checks**

   - Python package vulnerability scanning
   - Identifies known CVEs
   - Reports on deprecated packages

4. **Code Quality**
   - Bandit security linting
   - SAST (Static Application Security Testing)
   - Code formatting and style checks

### Running Security Scans Locally

```bash
# Install security tools
pip install bandit safety pylint

# Run bandit security scan
bandit -r scripts/dev_server.py

# Check dependencies for vulnerabilities
safety check

# Run full code analysis
pylint scripts/dev_server.py
```

---

## 🔐 Environment Variables

### Required in Production

```bash
# Flask Configuration
FLASK_SECRET=<strong-random-secret-key>
FLASK_ENV=production

# Admin Credentials
NOTES_ADMIN_USERNAME=admin
NOTES_ADMIN_PASSWORD=<strong-random-password>

# Database
NOTES_DB_PATH=/var/lib/note-hub/notes.db

# Optional: Email Service (for password reset)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

### Generating Secrets

```bash
# Generate strong secret key
python -c "import secrets; print(secrets.token_hex(32))"

# Generate strong password
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 📋 Security Checklist

### Before Deployment

- [ ] Change default admin password
- [ ] Generate strong `FLASK_SECRET`
- [ ] Enable HTTPS/SSL
- [ ] Configure HSTS headers
- [ ] Set secure cookie flags
- [ ] Enable 2FA for admin
- [ ] Set up regular backups
- [ ] Configure firewall rules
- [ ] Review .gitignore for sensitive files
- [ ] Enable security scanning in CI/CD

### Regular Maintenance

- [ ] Weekly: Review access logs
- [ ] Weekly: Check for security updates
- [ ] Monthly: Audit user accounts
- [ ] Monthly: Test backup restoration
- [ ] Quarterly: Update dependencies
- [ ] Quarterly: Security audit
- [ ] Annually: Penetration testing

---

## 🚨 Reporting Security Issues

If you discover a security vulnerability, please **DO NOT** open a public GitHub issue.

Instead:

1. Email: [your-security-email@example.com]
2. Include detailed information about the vulnerability
3. Allow time for fix before public disclosure
4. Follow responsible disclosure practices

### Security Response Timeline

- **Critical**: Response within 24 hours
- **High**: Response within 72 hours
- **Medium**: Response within 1 week
- **Low**: Response within 2 weeks

---

## 📚 Additional Resources

### Security Standards & Guidelines

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Common web vulnerabilities
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/) - Most Dangerous Software Weaknesses

### Tools & Services

- [OWASP ZAP](https://www.zaproxy.org/) - Security scanning
- [Burp Suite](https://portswigger.net/burp) - Web security testing
- [Bandit](https://bandit.readthedocs.io/) - Python security linting
- [Safety](https://pyup.io/safety/) - Dependency vulnerability scanning

### Flask Security

- [Flask Security](https://flask-security-too.readthedocs.io/) - Authentication/authorization
- [Flask-HTTPAuth](https://flask-httpauthx-docs.readthedocs.io/) - HTTP authentication
- [Flask-Limiter](https://flask-limiter.readthedocs.io/) - Rate limiting

---

## 📝 Change Log

### Version 1.1.0 (Current)

- ✅ Added 2FA with TOTP support
- ✅ Enhanced input validation
- ✅ Security scanning in CI/CD
- ✅ Updated dependencies

### Version 1.0.0

- ✅ Initial release
- ✅ CSRF protection
- ✅ Secure password hashing
- ✅ Session management

---

**Last Updated:** November 22, 2025
**Status:** Active & Maintained
**Contact:** Security team

---

For questions or concerns about security, please refer to the documentation or contact the security team.
