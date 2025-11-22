# 🔐 GitHub Branch Ruleset Configuration

## Overview

This document provides the configuration for protecting the `main` branch with GitHub's Branch Ruleset feature. This ensures code quality, security, and stability before any changes are merged.

---

## 🎯 Recommended Branch Ruleset Settings

### Target Branch

- **Applies to:** `main` branch

### 1. **Enforce Status Checks**

**Required Status Checks:**

- ✅ `Test (Python 3.9)`
- ✅ `Test (Python 3.10)`
- ✅ `Test (Python 3.11)`
- ✅ `Code Quality`
- ✅ `Security Scanning`
- ✅ `Dependency Check`

**Settings:**

- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Require code reviews before merging: **1 approval**

### 2. **Dismiss Stale Pull Request Approvals**

- ✅ Enabled (dismiss previous approvals when new commits are pushed)

### 3. **Require Pull Request Review**

- ✅ Require approval: **1** (can be adjusted based on team size)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from code owners (optional, if `.github/CODEOWNERS` file exists)

### 4. **Require Conversation Resolution**

- ✅ Enabled (all conversations must be resolved before merging)

### 5. **Require a Linear History**

- ✅ Enabled (prevents merge commits, requires rebasing)

### 6. **Restrict Deletions**

- ✅ Enabled (prevent accidental deletion of the branch)

### 7. **Require Signed Commits**

- ⚪ Optional (enhanced security, requires GPG key setup)

### 8. **Require Deployments to Succeed Before Merging**

- ✅ Netlify Deployment
- ✅ GitHub Pages Deployment

### 9. **Lock Branch**

- ⚪ Disabled (keep branch unlocked for regular development)

### 10. **Allow Force Pushes**

- ✅ Enabled: **Administrators only** (for emergency fixes)

---

## 📋 Step-by-Step Setup Instructions

### Via GitHub Web Interface:

1. **Navigate to Branch Protection Rules**

   - Go to: `https://github.com/thienng-it/note-hub`
   - Click: **Settings** → **Rules** → **Rulesets**
   - Click: **New ruleset** (or **New branch ruleset**)

2. **Configure Ruleset Name**

   - Name: `Protect main branch`
   - Description: `Enforce code quality, security, and testing standards`

3. **Set Target**

   - Enforcement: **Active**
   - Target type: **Branch**
   - Include: `main`
   - Exclude: (leave empty)

4. **Add Rules**

   **a) Require Workflows to Pass**

   - Enable: ✅ "Require status checks to pass before merging"
   - Status checks:
     - `Test (Python 3.9)`
     - `Test (Python 3.10)`
     - `Test (Python 3.11)`
     - `Code Quality`
     - `Security Scanning`
     - `Dependency Check`
   - ✅ "Require branches to be up to date before merging"

   **b) Require Pull Reviews**

   - Enable: ✅ "Require pull request reviews before merging"
   - Number of reviewers: `1`
   - ✅ "Dismiss stale pull request approvals when new commits are pushed"
   - ✅ "Require review from code owners" (if using `.github/CODEOWNERS`)

   **c) Require Conversation Resolution**

   - Enable: ✅ "Require all conversations on code to be resolved before merging"

   **d) Require Linear History**

   - Enable: ✅ "Require linear history"

   **e) Restrict Deletions**

   - Enable: ✅ "Restrict deletions"

   **f) Require Deployments to Succeed**

   - Enable: ✅ "Require deployments to succeed before merging"
   - Select deployments:
     - `Netlify`
     - `GitHub Pages`

5. **Bypass List** (Optional)

   - Allow admins to bypass these rules: **Yes** (checked)

6. **Review and Save**
   - Click: **Create** button

---

## 📝 Alternative: GitHub CLI Setup

If you prefer command-line setup:

```bash
# Note: As of now, GitHub CLI has limited ruleset support
# The web interface is recommended for complete configuration
# However, you can use the REST API:

# Example using gh cli (when full support is available):
gh ruleset create --name "Protect main" \
  --target-branch main \
  --bypass-actors-list admin \
  --require-status-checks \
  --require-code-reviews --code-review-count 1
```

---

## 🔄 GitHub REST API

For automation or detailed configuration:

```bash
# Create a ruleset via REST API
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/thienng-it/note-hub/rulesets \
  -d '{
    "name": "Protect main branch",
    "description": "Enforce code quality and security",
    "type": "branch",
    "enforcement": "active",
    "target": "branch",
    "conditions": {
      "ref_name": {
        "include": ["main"],
        "exclude": []
      }
    },
    "rules": [
      {
        "type": "required_status_checks",
        "parameters": {
          "required_status_checks": [
            {
              "context": "Test (Python 3.9)",
              "integration_id": 0
            },
            {
              "context": "Test (Python 3.10)",
              "integration_id": 0
            },
            {
              "context": "Test (Python 3.11)",
              "integration_id": 0
            },
            {
              "context": "Code Quality",
              "integration_id": 0
            },
            {
              "context": "Security Scanning",
              "integration_id": 0
            },
            {
              "context": "Dependency Check",
              "integration_id": 0
            }
          ],
          "strict_required_status_checks_policy": true
        }
      },
      {
        "type": "pull_request",
        "parameters": {
          "required_approving_review_count": 1,
          "dismiss_stale_reviews_on_push": true,
          "require_code_owner_review": false
        }
      },
      {
        "type": "require_linear_history"
      }
    ],
    "bypass_actors": [
      {
        "actor_type": "RepositoryRole",
        "actor_id": 5,
        "bypass_mode": "always"
      }
    ]
  }'
```

---

## ✅ What This Ruleset Enforces

| Check                      | Purpose                             |
| -------------------------- | ----------------------------------- |
| **Status Checks**          | All CI/CD tests must pass           |
| **Code Review**            | At least 1 approval required        |
| **Resolved Conversations** | All code comments must be addressed |
| **Linear History**         | Clean, rebased commit history       |
| **Restrict Deletions**     | Prevent accidental branch deletion  |
| **Up-to-date with main**   | Prevents merge conflicts            |
| **Deployments**            | Apps must deploy successfully       |

---

## 🚀 Benefits

✅ **Code Quality**

- Prevents merging of failing code
- Requires peer review
- Maintains clean git history

✅ **Security**

- Security scanning must pass
- Dependency vulnerabilities checked
- All conversations resolved

✅ **Stability**

- Deployments verified before merge
- No stale code reviews approved
- Prevents direct pushes to main

✅ **Team Collaboration**

- Enforces code review process
- Clear merge requirements
- Protects against accidents

---

## 📖 Workflow for Contributors

With this ruleset in place, developers must:

1. **Create a feature branch** from `main`

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**

   ```bash
   git commit -m "feat: add new feature"
   ```

3. **Push branch to GitHub**

   ```bash
   git push origin feature/my-feature
   ```

4. **Create a Pull Request**

   - Go to repository on GitHub
   - Click "Compare & pull request"
   - Add description and assignee if needed

5. **Automated checks run**

   - All CI/CD jobs execute
   - Tests, linting, security scanning run
   - Results shown on PR

6. **Code review**

   - Team members review changes
   - At least 1 approval needed
   - Conversations must be resolved

7. **Merge to main**
   - Once all checks pass and approved
   - Click "Squash and merge" or "Rebase and merge"
   - Branch is automatically deleted

---

## 🔍 Monitoring & Management

**View Ruleset Status:**

1. Go to: Settings → Rules → Rulesets
2. Click on the ruleset name to see details
3. View enforcement history and bypasses

**Bypass Rules (Admins Only):**

- Only repository admins can bypass rules (if configured)
- Use for emergency hotfixes only
- Document why bypass was needed

---

## 🛠️ Troubleshooting

### "Ruleset not found"

- Ensure you're on a GitHub organization or have enterprise features
- Free GitHub accounts have limited ruleset support
- Use legacy "Branch Protection Rules" as fallback

### "Status checks not showing"

- Wait for workflows to run (can take 1-2 minutes)
- Ensure workflow names match exactly in ruleset configuration
- Check if workflows are running on push events

### "Cannot merge despite checks passing"

- Verify all required reviews are approved
- Check that all conversations are resolved
- Ensure branch is up-to-date with main

---

## 📚 Resources

- [GitHub Branch Rulesets Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [GitHub Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#about-required-status-checks)
- [GitHub Code Review Requirements](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#about-required-reviews-for-pull-requests)

---

**Last Updated:** November 22, 2025
**Configuration Status:** Ready for implementation
**Recommended Enforcement:** Active
