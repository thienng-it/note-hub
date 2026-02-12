# Auto-Fix Setup Guide

This guide explains how to automatically fix linting issues both locally and in CI/CD.

## 🤖 Auto-Fix in GitHub CI/CD

### How It Works

When you create a pull request, the **Auto Fix** workflow automatically:
1. Runs `npm run lint:fix` on both backend and frontend
2. Commits any fixes with message: `chore: auto-fix linting issues [skip ci]`
3. Adds a comment to the PR notifying you of the fixes
4. Pushes the fixes back to your branch

### Configuration

The workflow is defined in [`.github/workflows/auto-fix.yml`](.github/workflows/auto-fix.yml)

**Features:**
- ✅ Runs on every pull request
- ✅ Automatically commits fixes
- ✅ Skips CI on auto-fix commits (`[skip ci]`)
- ✅ Adds helpful PR comments
- ✅ Safe - only fixes what Biome can safely fix

### Usage

1. **Create a PR** with linting issues
2. **Wait** for the Auto Fix workflow to run (~1-2 minutes)
3. **Pull the changes** to your local branch:
   ```bash
   git pull
   ```

That's it! The linting issues are automatically fixed.

## 💻 Auto-Fix Locally

### Option 1: Manual Fix

Run lint:fix in any directory:

```bash
# Backend
cd backend && npm run lint:fix

# Frontend
cd frontend && npm run lint:fix
```

### Option 2: Pre-Commit Hook (Recommended)

Automatically fix issues before each commit.

#### Setup

Run the setup script once:

```bash
# From project root
./scripts/setup-dev.sh
```

Or manually install the hook:

```bash
# Copy the pre-commit hook
cp scripts/setup-dev.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

#### How It Works

Every time you commit:
1. Hook runs `npm run lint:fix` on backend and frontend
2. Auto-fixes issues
3. Stages the fixed files
4. Completes your commit

Example:
```bash
git add .
git commit -m "feat: add new feature"
# 🔍 Running pre-commit checks...
# 📝 Fixing backend...
# 📝 Fixing frontend...
# ✅ Pre-commit checks complete!
# [main abc1234] feat: add new feature
```

### Option 3: IDE Integration

#### VS Code

Install the [Biome extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome):

```bash
code --install-extension biomejs.biome
```

Configure auto-fix on save in `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

## 🔍 What Gets Fixed

Biome automatically fixes:

- ✅ **Import organization** - Alphabetical sorting
- ✅ **Unused variables** - Adds underscore prefix
- ✅ **Formatting** - Consistent indentation, quotes, semicolons
- ✅ **Code style** - Trailing commas, arrow functions, etc.

Issues that **cannot** be auto-fixed:
- ❌ Logical errors
- ❌ Complex refactoring (like static-only classes)
- ❌ Security vulnerabilities

## 📋 Best Practices

### During Development

1. **Enable IDE auto-fix** - Fix issues as you type
2. **Run lint:fix before committing** - Catch issues early
3. **Use pre-commit hook** - Never commit unfixed issues

### In CI/CD

1. **Let Auto Fix handle it** - Don't manually fix on GitHub
2. **Pull changes after auto-fix** - Always sync with remote
3. **Review auto-fixes** - Check the commit diff

### Example Workflow

```bash
# 1. Make changes
vim backend/src/routes/notes.js

# 2. Auto-fix (optional - pre-commit hook does this)
cd backend && npm run lint:fix

# 3. Commit (pre-commit hook runs)
git add .
git commit -m "feat: add notes endpoint"

# 4. Push to create PR
git push origin feature/notes-endpoint

# 5. Wait for Auto Fix workflow on GitHub

# 6. Pull auto-fixes
git pull

# 7. Ready to merge!
```

## 🚫 Disabling Auto-Fix

### Disable Pre-Commit Hook

Temporarily skip:
```bash
git commit --no-verify -m "message"
```

Permanently remove:
```bash
rm .git/hooks/pre-commit
```

### Disable GitHub Auto-Fix

Delete or disable the workflow:
```bash
# Delete the workflow file
rm .github/workflows/auto-fix.yml

# Or disable in GitHub UI:
# Settings → Actions → Disable workflow
```

## 🐛 Troubleshooting

### Auto-fix not working in CI

**Issue:** Workflow runs but doesn't commit fixes

**Solution:**
1. Check workflow has `permissions: contents: write`
2. Verify lint:fix scripts exist in package.json
3. Check if branch protection requires review

### Pre-commit hook not running

**Issue:** Hook doesn't execute on commit

**Solution:**
```bash
# Make hook executable
chmod +x .git/hooks/pre-commit

# Test the hook
.git/hooks/pre-commit
```

### Biome not installed

**Issue:** `biome: command not found`

**Solution:**
```bash
# Install dependencies
cd backend && npm install
cd frontend && npm install
```

## 📚 Related Documentation

- [Biome Documentation](https://biomejs.dev/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Git Hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Project Contributing Guide](guides/CONTRIBUTING.md)

## 🎯 Summary

**Locally:**
- Run `./scripts/setup-dev.sh` once
- Auto-fix happens on every commit
- Or use IDE integration for real-time fixes

**In CI/CD:**
- Auto-fix workflow runs on every PR
- Automatically commits and pushes fixes
- Just pull the changes and continue working

No more failing CI/CD because of linting! 🎉
