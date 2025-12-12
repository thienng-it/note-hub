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

- **Password Policy**

  - Minimum 12 characters required
  - Must contain: lowercase, uppercase, numbers, and special characters
  - No whitespace allowed
  - Real-time validation feedback during registration and password reset
  - Password complexity checked on both client and server side

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

- **2FA for Password Reset**
  - Users with 2FA enabled MUST verify their identity with 2FA code before resetting password
  - Password reset flow requires 2FA verification if enabled
  - CAPTCHA protection on forgot password form (when enabled)
  - Re-enable 2FA after recovering access

### 3. **CAPTCHA Protection (reCAPTCHA)**

- **Bot Prevention**

  - Google reCAPTCHA v2 integration
  - Enabled on login, registration, and password reset forms
  - Prevents automated attacks, credential stuffing, and bot registrations
  - Configure via `RECAPTCHA_ENABLED`, `RECAPTCHA_SITE_KEY`, and `RECAPTCHA_SECRET_KEY` environment variables

- **Rate Limiting**
  - Login: 10 attempts per minute
  - Registration: 5 attempts per hour
  - Password Reset: 5 attempts per hour
  - 2FA verification: 5 attempts per minute

### 4. **Input Validation & Sanitization**

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

### 5. **Database Security**

- **Encryption at Rest (Recommended)**

  - SQLite: Filesystem encryption or SQLCipher
  - MySQL: InnoDB transparent encryption
  - See [Database Encryption at Rest Guide](DATABASE_ENCRYPTION_AT_REST.md) for implementation
  - Protects against disk theft and unauthorized file access

- **Database Access**

  - Only admin user has direct database access
  - All queries go through authenticated sessions
  - Row-level security through session checks

- **Sensitive Data Protection**
  - ✅ Passwords: Hashed with bcrypt (14 rounds)
  - ✅ TOTP Secrets: Stored for 2FA functionality
  - ⚠️ User Content: Stored in plaintext (encrypted at rest recommended)
  - ⚠️ Email Addresses: Stored in plaintext (required for functionality)
  - 📖 See [Data Compliance Investigation](../investigation/DATA_COMPLIANCE_INVESTIGATION.md) for analysis

- **Data Compliance**
  - GDPR: Encryption recommended for personal data
  - HIPAA: N/A (not a healthcare application)
  - Note: User content is NOT hashed (would make it unreadable)
  - Database file should be backed up securely with encryption

### 6. **HTTPS/TLS**

- **Production Deployment**

  - Always use HTTPS in production
  - Netlify (deployment platform) provisions SSL/TLS automatically via Let's Encrypt
  - Redirect HTTP to HTTPS

- **Certificates**
  - Let's Encrypt for free SSL certificates
  - Auto-renewal configured
  - HSTS headers recommended

### 7. **Content Security Policy (CSP)**

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

### Internal Documentation

- [Database Encryption at Rest Guide](DATABASE_ENCRYPTION_AT_REST.md) - Implementation guide for SQLite and MySQL encryption
- [Data Compliance Investigation](../investigation/DATA_COMPLIANCE_INVESTIGATION.md) - Analysis of data hashing vs encryption requirements
- [Password Security Improvements](PASSWORD_SECURITY_IMPROVEMENTS.md) - Bcrypt implementation and hash upgrades
- [2FA Improvements](2FA_IMPROVEMENTS.md) - Two-factor authentication guide

### Security Standards & Guidelines

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Common web vulnerabilities
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/) - Most Dangerous Software Weaknesses
- [GDPR Official Text](https://gdpr-info.eu/) - European data protection regulation

### Tools & Services

- [OWASP ZAP](https://www.zaproxy.org/) - Security scanning
- [Burp Suite](https://portswigger.net/burp) - Web security testing
- [Biome](https://biomejs.dev/) - Fast linter and formatter
- [CodeQL](https://codeql.github.com/) - Semantic code analysis

### Node.js Security

- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Helmet.js](https://helmetjs.github.io/) - Security headers for Express

---

## 📝 Change Log

### Version 1.6.0 (December 2024)

- ✅ Data compliance investigation completed
- ✅ Database encryption at rest guide added
- ✅ Security documentation enhanced
- ✅ Clarified hashing vs encryption for user content
- ✅ Added GDPR compliance guidance

### Version 1.5.0 (December 2024)

- ✅ Migrated to Node.js/Express backend
- ✅ JWT authentication with refresh tokens
- ✅ Bcrypt password hashing (14 rounds)
- ✅ Google OAuth integration
- ✅ Enhanced security middleware

### Version 1.1.0

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

**Last Updated:** December 12, 2024
**Status:** Active & Maintained
**Contact:** Security team

---

For questions or concerns about security, please refer to the documentation or contact the security team.
