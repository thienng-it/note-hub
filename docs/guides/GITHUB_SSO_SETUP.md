# GitHub OAuth Setup Guide

This guide explains how to enable GitHub Single Sign-On (SSO) in NoteHub, allowing users to log in with their GitHub accounts.

## Overview

GitHub OAuth provides:
- ✅ **One-Click Sign-In** - Users can log in without creating passwords
- ✅ **Automatic Account Creation** - New users are created automatically
- ✅ **Secure Authentication** - Leverages GitHub's security infrastructure
- ✅ **No 2FA Required** - OAuth users bypass 2FA requirements
- ✅ **Optional Feature** - Works alongside traditional username/password authentication

## Prerequisites

- A GitHub account
- Access to GitHub OAuth Apps settings
- Your NoteHub deployment URL

## Setup Instructions

### Step 1: Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
   - Direct link: https://github.com/settings/developers

2. Click **"New OAuth App"** (or use an existing app)

3. Fill in the application details:
   - **Application name**: NoteHub (or your preferred name)
   - **Homepage URL**: Your NoteHub URL (e.g., `https://your-domain.com` or `http://localhost` for development)
   - **Application description**: (Optional) "Personal notes application with markdown support"
   - **Authorization callback URL**: See Step 2 below

4. Click **"Register application"**

5. **Copy the Client ID** (shown immediately)

6. Click **"Generate a new client secret"**

7. **Copy the Client Secret** (shown only once - save it securely)

### Step 2: Configure Callback URL

The Authorization callback URL must match your deployment environment **exactly**:

#### Development (Local)
```
http://localhost:3000/auth/github/callback
```

#### Docker (Local)
```
http://localhost/auth/github/callback
```

#### Production
```
https://your-domain.com/auth/github/callback
```

**Important:** 
- Include the protocol (`http://` or `https://`)
- Match the port exactly (if using a port)
- The path must be `/auth/github/callback`
- For production, use `https://` (required for OAuth security)

### Step 3: Configure Environment Variables

Edit your `.env` file and add the GitHub OAuth credentials:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your-github-client-id-here
GITHUB_CLIENT_SECRET=your-github-client-secret-here
GITHUB_REDIRECT_URI=http://localhost/auth/github/callback
```

**Examples for Different Environments:**

#### Local Development (Vite dev server on port 3000)
```bash
GITHUB_CLIENT_ID=Iv1.a1b2c3d4e5f6g7h8
GITHUB_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr678stu901
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
```

#### Docker Deployment (port 80)
```bash
GITHUB_CLIENT_ID=Iv1.a1b2c3d4e5f6g7h8
GITHUB_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr678stu901
GITHUB_REDIRECT_URI=http://localhost/auth/github/callback
```

#### Production (HTTPS)
```bash
GITHUB_CLIENT_ID=Iv1.a1b2c3d4e5f6g7h8
GITHUB_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr678stu901
GITHUB_REDIRECT_URI=https://notehub.yourdomain.com/auth/github/callback
```

### Step 4: Restart the Application

Restart your NoteHub backend to apply the new configuration:

```bash
# Docker deployment
docker compose restart backend

# Or restart all services
docker compose down
docker compose up -d

# Local development
# Stop the backend server (Ctrl+C) and restart:
cd backend
npm run dev
```

## Verification

### 1. Check Backend Status

Verify that GitHub OAuth is enabled:

```bash
curl http://localhost:5000/api/v1/auth/github/status
```

Expected response:
```json
{
  "enabled": true
}
```

### 2. Check Frontend

1. Open the NoteHub login page
2. Look for the "Sign in with GitHub" button (black button with GitHub logo)
3. If the button is visible, GitHub OAuth is properly configured

### 3. Test Authentication

1. Click "Sign in with GitHub"
2. You should be redirected to GitHub's authorization page
3. Click "Authorize" to grant access
4. You should be redirected back to NoteHub and logged in

## How It Works

### OAuth Flow

```
1. User clicks "Sign in with GitHub"
   ↓
2. Frontend requests OAuth URL from backend
   ↓
3. User is redirected to GitHub
   ↓
4. User authorizes the application
   ↓
5. GitHub redirects to callback URL with authorization code
   ↓
6. Frontend sends code to backend
   ↓
7. Backend exchanges code for access token
   ↓
8. Backend fetches user profile from GitHub
   ↓
9. Backend creates or finds user account
   ↓
10. Backend generates JWT tokens
    ↓
11. User is logged in
```

### User Account Creation

When a user signs in with GitHub for the first time:

1. **Username**: Taken from GitHub username
   - If username exists, a random suffix is added (e.g., `username_a1b2c3d4`)

2. **Email**: Taken from primary verified GitHub email
   - Email verification is required by GitHub

3. **Password**: Random password is generated
   - Users cannot log in with password (GitHub OAuth only)
   - Users can set a password later if they want to use both methods

4. **Profile**: Bio from GitHub (if available)

## Troubleshooting

### "GitHub OAuth not configured" Error

**Problem**: The GitHub Sign-In button doesn't appear on the login page.

**Solution**: 
1. Check that all three environment variables are set:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `GITHUB_REDIRECT_URI`
2. Restart the backend service
3. Verify status endpoint returns `{ "enabled": true }`

### "redirect_uri_mismatch" Error

**Problem**: GitHub shows error "The redirect_uri MUST match the registered callback URL for this application"

**Solution**:
1. Go to your GitHub OAuth App settings
2. Check the "Authorization callback URL" matches your `GITHUB_REDIRECT_URI` **exactly**
3. Common issues:
   - Missing `http://` or `https://`
   - Wrong port number
   - Trailing slash (don't include it)
   - Wrong domain

**Example Fix:**
- ❌ Wrong: `localhost/auth/github/callback`
- ✅ Correct: `http://localhost/auth/github/callback`

### "Failed to exchange authorization code" Error

**Problem**: Authentication fails after GitHub redirects back.

**Solution**:
1. Check that `GITHUB_CLIENT_SECRET` is correct
2. Ensure the secret hasn't expired
3. Generate a new client secret in GitHub if needed
4. Update `.env` with new secret and restart

### "Failed to fetch user profile from GitHub" Error

**Problem**: Can't get user information from GitHub.

**Solution**:
1. Check your GitHub API rate limits: https://github.com/settings/applications
2. Ensure the OAuth app has the correct scopes (`read:user`, `user:email`)
3. Check backend logs for detailed error messages

### Users Can't Find Their Account

**Problem**: User signed in with GitHub but can't log in with username/password.

**Solution**: This is expected behavior. GitHub OAuth users:
- Are created with a random password they don't know
- Must use "Sign in with GitHub" to log in
- Can optionally set a password later in Profile → Change Password

### Multiple OAuth Providers

If you have both Google OAuth and GitHub OAuth configured:

- Users can sign in with either provider
- Each OAuth method creates a separate account (by email)
- If a user signs up with email `user@example.com` via Google, and the same email via GitHub, two separate accounts are created
- Users should use the same OAuth provider consistently

## Security Considerations

### OAuth Security

- GitHub OAuth uses the standard OAuth 2.0 protocol
- HTTPS is required for production deployments
- Authorization codes are single-use and expire quickly
- Access tokens are used only for initial profile fetch, not stored

### Token Management

- JWT tokens are generated after successful OAuth
- Refresh token rotation is used for enhanced security
- Standard JWT expiration rules apply (15 minutes for access, 7 days for refresh)

### Account Linking

Currently, OAuth accounts are **not automatically linked** to existing username/password accounts:
- Signing in with GitHub creates a new account (if email doesn't exist)
- Signing in with Google creates a new account (if email doesn't exist)
- Future enhancement: Allow users to link OAuth to existing accounts

## Advanced Configuration

### Custom Scopes

The default scopes are:
- `read:user` - Read user profile information
- `user:email` - Read user email addresses

To add more scopes, edit `backend/src/services/githubOAuthService.js`:

```javascript
static getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_REDIRECT_URI,
    scope: 'read:user user:email repo', // Add more scopes here
    state: state,
  });
  // ...
}
```

### State Parameter for CSRF Protection

The GitHub OAuth implementation uses a state parameter for CSRF protection:
- A random state token is generated before redirecting to GitHub
- Currently, state validation is minimal (future enhancement)
- For production use, store state in session/database for validation

### User Profile Mapping

Customize how GitHub profile data maps to NoteHub users in `backend/src/services/githubOAuthService.js`:

```javascript
static async findOrCreateUser(githubProfile) {
  const { github_id, username, email, name, bio } = githubProfile;
  
  // Customize username generation
  let finalUsername = username;
  
  // Customize bio field
  let userBio = bio || `GitHub user: ${name}`;
  
  // ...
}
```

## Additional Resources

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [NoteHub API Documentation](../api/JWT_API.md)

## Support

If you encounter issues:
1. Check backend logs: `docker compose logs backend`
2. Verify environment variables: `docker compose exec backend env | grep GITHUB`
3. Test the status endpoint: `curl http://localhost:5000/api/v1/auth/github/status`
4. Review this guide's Troubleshooting section
5. Open an issue on GitHub with error details

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Compatibility:** NoteHub v1.2.0+
