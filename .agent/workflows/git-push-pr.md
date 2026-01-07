---
description: How to push code and create PRs with proper naming conventions
---

# Git Push and PR Workflow

When the user wants to push code to GitHub, follow these steps:

## 1. Run Lint and Fix Issues
```bash
cd frontend && npm run lint
```
If there are lint errors, fix them before proceeding.

## 2. Create Feature Branch
Use the following naming conventions:
- **Features**: `feat/<short-description>` (e.g., `feat/user-authentication`)
- **Bug fixes**: `fix/<short-description>` (e.g., `fix/profile-page-ui-ux`)
- **Refactoring**: `refactor/<short-description>` (e.g., `refactor/api-client`)
- **Documentation**: `docs/<short-description>` (e.g., `docs/readme-update`)
- **Chores**: `chore/<short-description>` (e.g., `chore/update-dependencies`)

```bash
git checkout -b <type>/<short-description>
```

## 3. Stage and Commit Changes
Use conventional commit messages:
```bash
git add <files>
git commit -m "<type>(<scope>): <description>

- Detail 1
- Detail 2"
```

Commit types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

## 4. Push Branch
```bash
git push -u origin <branch-name>
```

## 5. Create PR with GitHub CLI
// turbo
```bash
gh pr create --title "<type>(<scope>): <description>" --body "## Summary
<Brief description of changes>

## Changes
- Change 1
- Change 2

## Testing
- Test details"
```

Always use `gh pr create` to create the PR automatically.
