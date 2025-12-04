# Google Single Sign-On (SSO) Setup Guide

## Overview

NoteHub supports Google OAuth 2.0 for Single Sign-On (SSO), allowing users to sign in with their Google account instead of creating a separate username/password.

**Features:**
- ✅ One-click Google Sign-In
- ✅ Automatic account creation
- ✅ Secure OAuth 2.0 flow
- ✅ Optional - app works without it
- ✅ Email verification through Google

---

## Prerequisites

- Google Cloud Console account
- Domain for production deployment (optional for development)

---

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `NoteHub` (or your app name)
4. Click "Create"
5. Wait for project creation (takes ~30 seconds)
6. Select your new project

### Step 2: Enable Google+ API

1. In the Google Cloud Console, open the menu (☰)
2. Navigate to "APIs & Services" → "Library"
3. Search for "Google+ API"
4. Click "Google+ API"
5. Click "Enable"
6. Wait for API to be enabled

**Note:** This API is required for accessing user profile information.

### Step 3: Configure OAuth Consent Screen

1. Navigate to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type
3. Click "Create"

**Fill in required information:**
- **App name:** NoteHub
- **User support email:** your-email@example.com
- **App logo:** (optional) Upload your logo
- **Application home page:** https://your-domain.com
- **Authorized domains:** your-domain.com
- **Developer contact email:** your-email@example.com

4. Click "Save and Continue"

**Scopes:**
- Click "Add or Remove Scopes"
- Add the following scopes:
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
- Click "Update"
- Click "Save and Continue"

**Test users (for development):**
- Add your Google email addresses
- Click "Save and Continue"

5. Click "Back to Dashboard"

### Step 4: Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"

**Configure:**
- **Name:** NoteHub Web Client
- **Authorized JavaScript origins:**
  - Development: `http://localhost:3000`
  - Production: `https://your-domain.com`
  
- **Authorized redirect URIs:**
  - Development: `http://localhost:3000/auth/google/callback`
  - Production: `https://your-domain.com/auth/google/callback`

4. Click "Create"
5. **Save your credentials:**
   - Client ID: `123456789-abcdef.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxxxxxxxxxx`

**Important:** Keep these credentials secure! Never commit them to version control.

### Step 5: Configure NoteHub Backend

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add Google OAuth credentials to `.env`:
   ```bash
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```

3. For production, update `GOOGLE_REDIRECT_URI`:
   ```bash
   GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
   ```

### Step 6: Update Frontend Routes

Add the Google callback route to your React Router configuration:

```typescript
// In App.tsx or main routing file
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';

// Add route
<Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
```

### Step 7: Test the Integration

**Development:**
1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to: `http://localhost:3000/login`
4. Click "Sign in with Google"
5. Select your Google account
6. Grant permissions
7. You should be redirected and logged in

**Verify:**
- Check console logs for: `🔐 Google OAuth configured - SSO enabled`
- User created in database with Google email
- JWT tokens stored in localStorage

---

## How It Works

### Authentication Flow

```
1. User clicks "Sign in with Google"
   ↓
2. Frontend requests OAuth URL from backend
   GET /api/auth/google
   ↓
3. Backend returns Google authorization URL
   ↓
4. User redirected to Google login
   ↓
5. User signs in and grants permissions
   ↓
6. Google redirects to callback URL with code
   ↓
7. Frontend sends code to backend
   POST /api/auth/google/callback
   ↓
8. Backend exchanges code for tokens
   ↓
9. Backend gets user info from Google
   ↓
10. Backend creates user (if new) or logs in
    ↓
11. Backend returns JWT tokens
    ↓
12. Frontend stores tokens and redirects to app
```

### User Creation

**For new Google users:**
1. Extract email from Google profile
2. Generate username from email (before @)
3. If username exists, append random suffix
4. Create user with random password hash
5. Store email and mark as verified
6. Return JWT tokens

**For existing users:**
1. Find user by email
2. Return JWT tokens
3. Update last login

**Security Note:** Google OAuth users have random password hashes and cannot use password login. They must use Google Sign-In.

---

## API Endpoints

### GET /api/auth/google/status

Check if Google OAuth is configured.

**Response:**
```json
{
  "enabled": true
}
```

### GET /api/auth/google

Get Google OAuth authorization URL.

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Error (503):**
```json
{
  "error": "Google OAuth not configured"
}
```

### POST /api/auth/google/callback

Complete Google OAuth flow.

**Request:**
```json
{
  "code": "4/0AXX...",  // Authorization code from Google
  "id_token": "eyJ..."   // Alternative: ID token (for frontend flow)
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "id": 123,
    "username": "john_doe",
    "email": "john@gmail.com",
    "has_2fa": false,
    "auth_method": "google"
  }
}
```

**Error (400):**
```json
{
  "error": "Authorization code or ID token required"
}
```

---

## Frontend Integration

### Login Page

The Google Sign-In button appears automatically if OAuth is configured:

```tsx
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

// Check if Google OAuth is available
const [googleEnabled, setGoogleEnabled] = useState(false);

useEffect(() => {
  const checkGoogle = async () => {
    const res = await apiClient.get('/api/auth/google/status');
    setGoogleEnabled(res.data.enabled);
  };
  checkGoogle();
}, []);

// Google Sign-In handler
const handleGoogleSignIn = async () => {
  const res = await apiClient.get('/api/auth/google');
  window.location.href = res.data.auth_url;
};

// Render button
{googleEnabled && (
  <button onClick={handleGoogleSignIn}>
    Sign in with Google
  </button>
)}
```

### Callback Page

Handles the OAuth redirect:

```tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    
    // Exchange code for tokens
    const response = await apiClient.post('/api/auth/google/callback', { code });
    
    // Store tokens
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    
    // Redirect to app
    navigate('/', { replace: true });
  }, []);

  return <div>Signing you in...</div>;
}
```

---

## Security Considerations

### Token Storage
- Access tokens stored in localStorage (24h expiry)
- Refresh tokens stored in localStorage (30d expiry)
- Alternative: Use httpOnly cookies for better security

### Email Verification
- Google provides verified emails only
- No need for separate email verification flow
- Users can only sign in with verified Google accounts

### 2FA
- Google OAuth users bypass 2FA requirement
- Google's own 2FA protects their account
- Optional: Require 2FA setup after first Google sign-in

### Account Linking
- Currently: One email = one account
- Users with existing password accounts can't link Google
- Future: Allow account linking/unlinking

---

## Troubleshooting

### "Google OAuth not configured"

**Problem:** Backend shows this message on startup

**Solution:**
1. Check `.env` file exists
2. Verify all three variables set:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
3. Restart backend server

### "Redirect URI mismatch"

**Problem:** Google shows error during sign-in

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit OAuth client ID
3. Add exact redirect URI: `http://localhost:3000/auth/google/callback`
4. Save and try again

### "Access blocked: This app's request is invalid"

**Problem:** OAuth consent screen not configured

**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Complete all required fields
3. Add test users (for development)
4. Publish app (for production)

### "Failed to get user information"

**Problem:** API not enabled or wrong scopes

**Solution:**
1. Enable Google+ API in Cloud Console
2. Check OAuth scopes include:
   - `userinfo.email`
   - `userinfo.profile`
3. Regenerate credentials if needed

### User created but email not stored

**Problem:** Database doesn't store Google email

**Solution:**
- Check backend logs for errors
- Verify `users` table has `email` column
- Check SQL INSERT statement

---

## Production Deployment

### Pre-launch Checklist

- [ ] OAuth consent screen published (not in testing mode)
- [ ] Production redirect URI added to Google credentials
- [ ] `GOOGLE_REDIRECT_URI` updated in production `.env`
- [ ] HTTPS enabled (required by Google)
- [ ] Domain verified in Google Cloud Console
- [ ] Test with multiple Google accounts
- [ ] Error handling tested
- [ ] Logging configured

### Environment Variables

**Development:**
```bash
GOOGLE_CLIENT_ID=dev-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=dev-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**Production:**
```bash
GOOGLE_CLIENT_ID=prod-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=prod-client-secret
GOOGLE_REDIRECT_URI=https://notehub.example.com/auth/google/callback
```

### Separate Credentials

**Recommended:** Use different OAuth credentials for dev and prod:
- Easier to debug
- Better security isolation
- Different redirect URIs

---

## Cost

**Google OAuth:** FREE
- No charges for OAuth API usage
- Unlimited sign-ins
- No user limits

---

## Future Improvements

### Short Term
- [ ] Account linking (connect Google to existing account)
- [ ] Sign out from Google when signing out of app
- [ ] Profile picture from Google

### Medium Term
- [ ] Multiple OAuth providers (GitHub, Microsoft)
- [ ] Account unlinking
- [ ] OAuth token refresh

### Long Term
- [ ] OpenID Connect (OIDC) support
- [ ] Enterprise SSO (SAML)
- [ ] Social login aggregation

---

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OWASP OAuth Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth_Cheat_Sheet.html)

---

**Document Version:** 1.0  
**Date:** 2025-12-04  
**Status:** Implemented
