# 🔄 CI/CD Pipeline Documentation

## Overview

This project uses **GitHub Actions** for continuous integration and continuous deployment (CI/CD). The pipeline automatically tests, lints, scans for security vulnerabilities, and deploys your application on every push to the `main` branch.

---

## 📊 Status Badges

Add these badges to your README to show the current status:

```markdown
![CI/CD Pipeline](https://github.com/thienng-it/note-hub/actions/workflows/ci-cd.yml/badge.svg?branch=main)
![Deploy Netlify](https://github.com/thienng-it/note-hub/actions/workflows/deploy-netlify.yml/badge.svg?branch=main)
![Deploy GitHub Pages](https://github.com/thienng-it/note-hub/actions/workflows/deploy-pages.yml/badge.svg?branch=main)
```

---

## 🔧 Workflows Configuration

### 1. **CI/CD Pipeline** (`ci-cd.yml`)

**Triggers:** Push or PR to `main` or `develop` branches

**Jobs:**

#### Test Job

- **Python Versions:** 3.9, 3.10, 3.11
- **Tasks:**
  - Install dependencies from `requirements.txt`
  - Run pytest with coverage reporting
  - Upload coverage to Codecov
  - Matrix testing across multiple Python versions

```bash
# Equivalent local command:
python -m pytest tests/test_app.py -v --cov=. --cov-report=xml
```

#### Lint Job

- **Tasks:**
  - Code formatting check with `black`
  - Import sorting check with `isort`
  - Linting with `flake8`
  - Security scanning with `bandit`

```bash
# Equivalent local commands:
black --check src/notehub scripts/dev_server.py
isort --check-only src/notehub scripts/dev_server.py
flake8 src/notehub
bandit -r src/notehub -ll
```

#### Security Job

- **Tasks:**
  - Trivy filesystem vulnerability scanning
  - Results uploaded to GitHub Security tab

#### Dependency Check Job

- **Tasks:**
  - Run `safety` to check for known vulnerabilities in dependencies

---

### 2. **Deploy to Netlify** (`deploy-netlify.yml`)

**Triggers:** Push to `main` branch (excluding docs/markdown to reduce noise)

**Prerequisites:**

1. Create a [Netlify](https://www.netlify.com/) site pointing at this repo
2. Generate a **Deploy Hook** from the Netlify dashboard (Site settings → Build & deploy → Build hooks)
3. Add the hook URL as a GitHub secret named `NETLIFY_DEPLOY_HOOK`

**Steps:**

1. Workflow checks that `NETLIFY_DEPLOY_HOOK` exists
2. Issues a `curl` POST to the Netlify deploy hook
3. Netlify builds using `netlify.toml`, installs Python deps, bundles the serverless function, and publishes the result

**Setup Instructions:**

```bash
# 1. netlify init --manual  # connect repo if not already linked

# 2. In the Netlify UI:
#    Site settings → Build & deploy → Build hooks → Add build hook
#    Copy the generated URL

# 3. Add to GitHub Secrets:
#    Repo → Settings → Secrets and variables → Actions
#    Secret name: NETLIFY_DEPLOY_HOOK
#    Secret value: [paste hook URL]
```

---

### 3. **Deploy GitHub Pages** (`deploy-pages.yml`)

**Triggers:** Push to `main` branch (docs, README, or workflow changes)

**Steps:**

1. **Build**

   - Copy `docs/` folder content to `_site/`
   - Verify `index.html` exists

2. **Deploy**
   - GitHub automatically deploys `_site` as static content
   - Available at: `https://thienng-it.github.io/note-hub`

**Site Location:** `/docs` directory

---

## 🚀 Deployment Flow

```
Developer Push to main
   ↓
GitHub Actions Triggered
   ├─→ CI/CD Pipeline (test + lint + security)
   ├─→ Deploy to Netlify (if NETLIFY_DEPLOY_HOOK is set)
   └─→ Deploy GitHub Pages (if docs changed)
   ↓
All Workflows Complete ✅
```

---

## 📋 Running Workflows Locally

### Test Pipeline

```bash
# Install test dependencies
pip install pytest pytest-cov

# Run tests
python -m pytest tests/test_app.py -v --cov=. --cov-report=term
```

### Code Quality

```bash
# Install linting tools
pip install black isort flake8 bandit

# Check formatting
black --check scripts/dev_server.py

# Check import sorting
isort --check-only scripts/dev_server.py

# Run linter
flake8 scripts/dev_server.py

# Security scan
bandit -r . -ll
```

### Security Check

```bash
# Install safety
pip install safety

# Check dependencies
safety check
```

---

## 🔐 Secrets Management

**Required Secrets:**

| Secret Name           | Where to Get               | Purpose                          |
| --------------------- | -------------------------- | -------------------------------- |
| `NETLIFY_DEPLOY_HOOK` | Netlify Site → Build hooks | Auto-deploy to Netlify Functions |

**To Add Secrets:**

1. Go to GitHub repo
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Enter name and value
5. Save

---

## ✅ Best Practices

1. **Always test locally before pushing**

   ```bash
   pytest tests/test_app.py
   black --check scripts/dev_server.py
   ```

2. **Commit with conventional messages** (already set up)

   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `chore:` for maintenance

3. **Review workflow results**

   - Go to repo → Actions tab
   - Check individual workflow runs
   - Fix any failures before merging PRs

4. **Keep dependencies up to date**
   - Regularly update `requirements.txt`
   - Run `safety check` to catch vulnerabilities

---

## 🐛 Troubleshooting

### Netlify Deployment Not Triggering

**Issue:** Deploy Netlify workflow skipped and site not updated

**Solution:**

1. Confirm the `NETLIFY_DEPLOY_HOOK` secret exists and is spelled correctly
2. Verify the hook URL has not been rotated or deleted in Netlify
3. Check Netlify dashboard → Deploys for errors during the build

### Tests Failing in CI but Passing Locally

**Possible Causes:**

- Python version differences (check matrix in `ci-cd.yml`)
- Missing environment variables
- Database state issues

**Solution:**

```bash
# Test with same Python version as CI
python3.11 -m pytest tests/test_app.py -v

# Check environment
echo $FLASK_ENV
echo $NOTES_DB_PATH
```

### GitHub Pages Not Updating

**Issue:** Changes to `docs/` not showing on GitHub Pages

**Solution:**

1. Ensure changes are pushed to `main` branch
2. Check Actions tab for deploy-pages workflow status
3. Go to repo Settings → Pages → verify source is `/docs`
4. Wait 1-2 minutes for GitHub to update

---

## 📊 Monitoring

**View Workflow Status:**

1. Go to repo homepage
2. Click "Actions" tab
3. Select workflow to view details
4. Click specific run to see logs

**Coverage Reports:**

- Uploaded to Codecov on each test run
- View at: `https://codecov.io/gh/thienng-it/note-hub`

**Security Scanning:**

- Results in GitHub Security tab
- Vulnerabilities sorted by severity

---

## 🎯 Next Steps

1. ✅ Add `NETLIFY_DEPLOY_HOOK` secret for auto-deployment (or let Netlify auto-build via Git integration)
2. ✅ Push changes to trigger workflows
3. ✅ Verify all workflows pass in Actions tab
4. ✅ Add badges to README.md

---

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Netlify Build Hooks](https://docs.netlify.com/configure-builds/build-hooks/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Python Testing with pytest](https://docs.pytest.org/)
- [Code Formatting with Black](https://black.readthedocs.io/)

---

**Last Updated:** November 22, 2025
**Maintained By:** CI/CD Pipeline Documentation
