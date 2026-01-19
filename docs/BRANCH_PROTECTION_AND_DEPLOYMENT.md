# Branch Protection and Deployment Guide

This document describes the branch protection rules and deployment workflow for NoteHub.

## Branch Protection Rules for `main`

Configure these settings in **GitHub → Settings → Branches → Add branch protection rule**:

### Required Settings

| Setting | Value | Description |
|---------|-------|-------------|
| **Branch name pattern** | `main` | Applies to the main branch |
| **Require a pull request before merging** | ✅ Enabled | No direct pushes allowed |
| **Require approvals** | 1+ | At least one review required |
| **Dismiss stale PR approvals when new commits are pushed** | ✅ Enabled | Ensures latest changes are reviewed |
| **Require status checks to pass before merging** | ✅ Enabled | CI must pass |
| **Required status checks** | `Backend Test`, `Frontend Test`, `Code Quality` | From ci-cd.yml |
| **Require branches to be up to date before merging** | ✅ Enabled | Prevents merge conflicts |

### Recommended Settings

| Setting | Value |
|---------|-------|
| **Require conversation resolution before merging** | ✅ Enabled |
| **Do not allow bypassing the above settings** | ⚠️ Consider for strict enforcement |
| **Restrict who can push to matching branches** | Optional - limit to maintainers |

## Deployment Workflow

### Automatic Deployment (Recommended)

```
1. Create feature branch    → git checkout -b feature/your-feature
2. Make changes             → Edit files
3. Push to remote           → git push origin feature/your-feature
4. Create Pull Request      → GitHub UI or `npm run pr`
5. CI runs tests            → Automatic
6. Code review              → Team reviews
7. Merge to main            → Triggers deploy.yml
8. Auto-deploy to VPS       → SSH → deploy.sh
```

### Manual Deployment (Emergency Only)

Use the "Run workflow" button in GitHub Actions → Deploy to Production.

```bash
# Or via GitHub CLI
gh workflow run deploy.yml
```

## Deployment Secrets Required

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address (e.g., `135.181.96.141`) |
| `VPS_USER` | SSH user (e.g., `root`) |
| `VPS_SSH_PRIVATE_KEY` | Private SSH key content |
| `VPS_KNOWN_HOSTS` | Output of `ssh-keyscan -H <VPS_HOST>` |
| `DEPLOYMENT_PATH` | Deployment directory (e.g., `/opt/note-hub`) |

## Quick Commands

```bash
# Create and push feature branch
git checkout -b feature/my-feature
git add .
git commit -m "feat: description"
git push origin feature/my-feature

# Create PR (uses scripts/create-pr.sh)
npm run pr

# Check deployment status
gh run list --workflow=deploy.yml
```
