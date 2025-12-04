# Google OAuth Troubleshooting Guide

Complete guide to resolving common Google OAuth SSO issues in NoteHub.

## Table of Contents

1. [Common Errors](#common-errors)
2. [Docker Deployment Issues](#docker-deployment-issues)
3. [Development Environment Issues](#development-environment-issues)
4. [Production Deployment Issues](#production-deployment-issues)
5. [Testing and Verification](#testing-and-verification)

---

## Common Errors

### Error: "Google Sign-In is temporarily unavailable"

**Symptom:**
- Clicking "Sign in with Google" button shows error message
- Browser console shows API error

**Causes and Solutions:**

#### 1. Google OAuth Not Configured

**Check:**
```bash
# Verify environment variables are set
docker exec notehub-backend printenv | grep GOOGLE
```

**Solution:**
Add these to your `.env` file:
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost/auth/google/callback  # For Docker
```

Then restart:
```bash
docker compose down
docker compose up -d
```

#### 2. Incorrect Redirect URI

**Check backend logs:**
```bash
docker logs notehub-backend | grep OAuth
```

Look for:
```
⚠️  Google OAuth not configured - SSO disabled
```

**Solution:**
The `GOOGLE_REDIRECT_URI` must match your deployment environment:

| Environment | Port | Redirect URI |
|-------------|------|--------------|
| Docker | 80 | `http://localhost/auth/google/callback` |
| Dev (npm) | 3000 | `http://localhost:3000/auth/google/callback` |
| Production | 443 | `https://yourdomain.com/auth/google/callback` |

---

### Error: "redirect_uri_mismatch"

**Symptom:**
- Google OAuth page shows: "Error 400: redirect_uri_mismatch"

**Cause:**
The redirect URI in your `.env` file doesn't match what's configured in Google Cloud Console.

**Solution:**

1. **Check your current redirect URI:**
   ```bash
   # In Docker
   docker exec notehub-backend printenv GOOGLE_REDIRECT_URI
   
   # Should output: http://localhost/auth/google/callback
   ```

2. **Add to Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to: APIs & Services > Credentials
   - Click your OAuth 2.0 Client ID
   - Under "Authorized redirect URIs", click "ADD URI"
   - Add: `http://localhost/auth/google/callback`
   - Click "SAVE"

3. **Add ALL environments you'll use:**
   ```
   http://localhost/auth/google/callback           (Docker)
   http://localhost:3000/auth/google/callback      (Development)
   https://yourdomain.com/auth/google/callback     (Production)
   ```

---

## Docker Deployment Issues

### Issue: OAuth works in development but not in Docker

**Problem:**
- Development uses port 3000
- Docker uses port 80
- Redirect URIs are different

**Solution:**

1. **Update `.env` for Docker:**
   ```bash
   # Docker deployment (port 80)
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost/auth/google/callback
   ```

2. **Add Docker redirect URI to Google Cloud Console:**
   - Add: `http://localhost/auth/google/callback`

3. **Restart Docker containers:**
   ```bash
   docker compose down
   docker compose up -d
   ```

4. **Verify configuration:**
   ```bash
   # Check backend logs for OAuth status
   docker logs notehub-backend | tail -20
   
   # Should see: "🔐 Google OAuth configured - SSO enabled"
   ```

### Issue: Cannot access http://localhost:3000/auth/google/callback

**Problem:**
Google is redirecting to port 3000, but Docker runs on port 80.

**Cause:**
Your `GOOGLE_REDIRECT_URI` is still set to development port.

**Solution:**
Update `.env`:
```bash
# Change from:
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# To:
GOOGLE_REDIRECT_URI=http://localhost/auth/google/callback
```

Restart:
```bash
docker compose restart backend
```

---

## Development Environment Issues

### Issue: OAuth not working with npm run dev

**Problem:**
Development server runs on port 3000, not port 80.

**Solution:**

1. **Use development redirect URI:**
   ```bash
   # .env for development
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```

2. **Add to Google Cloud Console:**
   - Add: `http://localhost:3000/auth/google/callback`

3. **Restart development server:**
   ```bash
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

---

## Production Deployment Issues

### Issue: OAuth not working in production

**Problem:**
Using HTTP redirect URI in production (HTTPS required).

**Solution:**

1. **Update `.env` for production:**
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
   ```

2. **Add to Google Cloud Console:**
   - Add: `https://yourdomain.com/auth/google/callback`
   - Note: Must use HTTPS in production

3. **Verify SSL certificate:**
   ```bash
   curl -I https://yourdomain.com
   # Should return 200 OK with valid certificate
   ```

### Issue: "The request is missing a required parameter: redirect_uri"

**Problem:**
`GOOGLE_REDIRECT_URI` environment variable is not set.

**Solution:**
```bash
# Add to .env
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

# Restart
docker compose restart backend
```

---

## Testing and Verification

### 1. Check Backend Status

```bash
# Check if Google OAuth is enabled
curl http://localhost/api/auth/google/status

# Should return: {"enabled": true}
```

### 2. Test Authorization URL

```bash
# Get Google OAuth URL
curl http://localhost/api/auth/google

# Should return: {"auth_url": "https://accounts.google.com/o/oauth2/..."}
```

### 3. Check Backend Logs

```bash
# Docker
docker logs notehub-backend --tail 50

# Look for:
# ✅ "🔐 Google OAuth configured - SSO enabled"
# ❌ "⚠️  Google OAuth not configured - SSO disabled"
```

### 4. Test Full OAuth Flow

1. **Click "Sign in with Google"** on login page
2. **Check browser Network tab** (F12)
   - Look for `/api/auth/google` request
   - Should return `auth_url`
3. **After Google login**:
   - Browser should redirect to `/auth/google/callback?code=...`
   - Should then redirect to `/` (home page)
   - You should be logged in

### 5. Verify Environment Variables

```bash
# Docker
docker exec notehub-backend env | grep GOOGLE

# Should show:
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# GOOGLE_REDIRECT_URI=http://localhost/auth/google/callback
```

---

## Quick Reference

### Configuration Matrix

| Environment | Port | URL | Redirect URI | Google Console URI |
|-------------|------|-----|--------------|-------------------|
| Docker | 80 | `http://localhost` | `http://localhost/auth/google/callback` | ✅ Add this |
| Dev (npm) | 3000 | `http://localhost:3000` | `http://localhost:3000/auth/google/callback` | ✅ Add this |
| Production | 443 | `https://yourdomain.com` | `https://yourdomain.com/auth/google/callback` | ✅ Add this |

### Environment Variables Quick Check

```bash
# Docker deployment
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost/auth/google/callback

# Development (npm run dev)
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Production
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
```

### Restart Commands

```bash
# Docker
docker compose restart backend

# Full restart
docker compose down && docker compose up -d

# Development
cd backend && npm run dev
```

---

## Still Having Issues?

1. **Check Google Cloud Console:**
   - Verify OAuth credentials are created
   - Verify redirect URIs are added
   - Verify Google+ API is enabled

2. **Check backend logs:**
   ```bash
   docker logs notehub-backend -f
   ```

3. **Check browser console:**
   - Open DevTools (F12)
   - Check Network tab for API errors
   - Check Console tab for JavaScript errors

4. **Verify port accessibility:**
   ```bash
   # Docker should be on port 80
   curl http://localhost/api/health
   
   # Dev should be on port 3000
   curl http://localhost:3000/api/health
   ```

5. **Review the setup guide:**
   - See `docs/guides/GOOGLE_SSO_SETUP.md` for detailed instructions

---

## Summary

**Most common issues:**

1. ❌ **Wrong redirect URI for your environment**
   - ✅ Docker: `http://localhost/auth/google/callback`
   - ✅ Dev: `http://localhost:3000/auth/google/callback`
   - ✅ Prod: `https://yourdomain.com/auth/google/callback`

2. ❌ **Redirect URI not added to Google Cloud Console**
   - ✅ Add ALL redirect URIs you'll use

3. ❌ **Environment variables not set**
   - ✅ Check `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

4. ❌ **Backend not restarted after changing `.env`**
   - ✅ Run `docker compose restart backend`

---

**Created:** December 2024  
**Last Updated:** December 2024
