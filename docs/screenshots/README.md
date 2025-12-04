# Screenshots Guide for NoteHub

This guide explains what screenshots are needed and how to capture them for the README.

## Required Screenshots

### Core Features (Existing)

1. **login.png** - Login page showing:
   - Username/password fields
   - Google Sign-In button (if OAuth configured)
   - Clean UI with glassmorphism design

2. **notes.png** - Notes dashboard showing:
   - List of notes with tags
   - Search bar
   - Filter options (favorites, pinned)
   - Sidebar navigation

3. **editor.png** - Note editor showing:
   - Markdown editor with toolbar
   - Live preview
   - Tag management
   - Save/cancel buttons

4. **tasks.png** - Tasks page showing:
   - Task list with priorities
   - Due dates
   - Completion status
   - Task creation form

5. **dark-mode.png** - Dark mode view showing:
   - Dark theme applied to notes page
   - Contrast and readability

### New Features (December 2024)

6. **google-oauth.png** - Google OAuth flow showing:
   - Google Sign-In button on login page
   - OAuth consent screen (if possible)
   - Successful login redirect

7. **2fa-disable.png** - Simplified 2FA disable showing:
   - Disable 2FA page with confirmation buttons
   - Info message: "No OTP Required - You're already authenticated"
   - Success notification

8. **admin-dashboard.png** - Admin dashboard showing:
   - User management table
   - "Disable 2FA" button in Actions column
   - User details (ID, username, role, 2FA status)

9. **admin-2fa-disable.png** - Admin 2FA recovery showing:
   - Confirmation dialog for disabling user's 2FA
   - Success notification
   - Updated user list

10. **performance-benchmark.png** (Optional) - Performance comparison showing:
    - Browser DevTools Network tab
    - Response times before/after Redis caching
    - Or a chart comparing performance metrics

## How to Capture Screenshots

### Prerequisites
- Run NoteHub locally (see Quick Start in main README)
- Optionally set up Redis, Elasticsearch, and Google OAuth for full feature showcase
- Use a clean browser window (preferably Chrome/Firefox)
- Recommended resolution: 1920x1080 or 1440x900

### Capture Steps

1. **Open the application** at http://localhost:3000
2. **Navigate to the feature** you want to screenshot
3. **Take the screenshot**:
   - macOS: `Cmd + Shift + 4` (select area) or `Cmd + Shift + 3` (full screen)
   - Windows: `Windows + Shift + S` or use Snipping Tool
   - Linux: `Shift + PrtScn` or use Screenshot utility

4. **Crop and optimize**:
   - Crop to show only relevant UI elements
   - Remove personal data (real names, emails, private notes)
   - Optimize file size: PNG for UI, JPEG for photos
   - Recommended width: 1200px - 1600px max

5. **Save the file**:
   - Use the exact filename from the list above
   - Save to `/docs/screenshots/` directory
   - Commit and push to repository

### Tips for Great Screenshots

- **Clean Data**: Use sample/demo data, not real personal information
- **Good Lighting**: Use light mode for primary screenshots (better contrast)
- **Focus**: Highlight the key feature, remove distractions
- **Consistency**: Use the same browser and zoom level for all screenshots
- **Annotations**: Consider adding arrows or highlights for complex features
- **Accessibility**: Ensure good contrast and readable text

## Alternative: Add Links to Live Demo

If you deploy NoteHub to a public instance, you can also:
1. Replace screenshot PNG files with links to the live demo
2. Or keep screenshots but add "Try it live" links below them

Example:
```markdown
### Login Page
![Login Page](docs/screenshots/login.png)
[Try it live →](https://your-demo.example.com)
```

## Screenshot Checklist

Use this checklist when capturing screenshots:

- [ ] login.png - Login page with Google OAuth button
- [ ] notes.png - Notes dashboard with sample notes
- [ ] editor.png - Note editor with markdown content
- [ ] tasks.png - Tasks page with sample tasks
- [ ] dark-mode.png - Dark theme applied
- [ ] google-oauth.png - Google Sign-In flow
- [ ] 2fa-disable.png - Simplified 2FA disable page
- [ ] admin-dashboard.png - Admin user management
- [ ] admin-2fa-disable.png - Admin 2FA recovery action
- [ ] performance-benchmark.png (optional) - Performance comparison

## After Adding Screenshots

1. Verify all images load correctly in the README
2. Check file sizes (optimize if > 500KB each)
3. Commit with descriptive message:
   ```bash
   git add docs/screenshots/*.png
   git commit -m "docs: add screenshots for v2.0 features"
   git push
   ```

4. Test README rendering on GitHub to ensure images display properly
