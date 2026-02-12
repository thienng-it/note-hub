# Deploy NoteHub to Firebase (Frontend) + Fly.io (Backend)

This guide walks you through deploying the full stack:
- **Frontend**: Firebase Hosting (Free tier)
- **Backend**: Fly.io (Free tier) ✅ Already deployed!

## 🎯 Current Setup

✅ **Backend**: https://notehub-backend.fly.dev (Fly.io - Live)
🔄 **Frontend**: Firebase Hosting (Next step)

## Step 1: Update Frontend Configuration ✅ DONE

The frontend `.env.production` has been updated to use Fly.io backend:

```env
VITE_API_URL=https://notehub-backend.fly.dev
```

CORS has been configured on backend to allow Firebase domains.

## Step 2: Build Frontend for Production

```bash
cd frontend

# Install dependencies (if not already)
npm install

# Build for production
npm run build

# Verify build output
ls -lh dist/
```

## Step 3: Deploy to Firebase

### Option A: Using Firebase CLI (Recommended)

```bash
# Make sure you're in project root
cd /Users/josephnguyen/Desktop/note-hub

# Login to Firebase (if not already)
firebase login

# Initialize project (if not already)
# firebase init hosting
# - Select existing project: note-hub-80f76
# - Public directory: frontend/dist
# - Single-page app: Yes
# - Overwrite index.html: No

# Deploy
firebase deploy --only hosting
```

### Option B: Using the Deploy Script

```bash
cd /Users/josephnguyen/Desktop/note-hub

# Make script executable
chmod +x scripts/deploy-firebase.sh

# Deploy
./scripts/deploy-firebase.sh
```

## Step 4: Verify Deployment

After deployment, your app will be live at:
- **Primary URL**: https://note-hub-80f76.web.app
- **Alternative**: https://note-hub-80f76.firebaseapp.com

### Test the Connection

1. Open: https://note-hub-80f76.web.app
2. Try logging in with admin credentials:
   - Username: `admin`
   - Password: `NoteHub2026Admin!`
3. Check browser console for any CORS errors

## Troubleshooting

### CORS Errors

If you see CORS errors in browser console:

```bash
# Update CORS to include your custom domain
flyctl secrets set CORS_ORIGIN='https://note-hub-80f76.web.app,https://note-hub-80f76.firebaseapp.com,https://yourdomain.com'
```

### Backend Not Responding

```bash
# Check backend status
flyctl status

# View logs
flyctl logs

# Restart if needed
flyctl apps restart
```

### Frontend Build Issues

```bash
cd frontend

# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## Environment Variables Reference

### Frontend (.env.production)

```env
VITE_API_URL=https://notehub-backend.fly.dev
NODE_ENV=production
```

### Backend (Fly.io Secrets)

Already configured:
- ✅ `JWT_SECRET`
- ✅ `REFRESH_TOKEN_SECRET`
- ✅ `NOTES_ADMIN_PASSWORD`
- ✅ `CORS_ORIGIN`

## Cost Breakdown

**Total Cost: $0/month** 🎉

| Service | Plan | Cost |
|---------|------|------|
| Fly.io Backend | Free Tier (256MB, 1GB storage) | $0 |
| Firebase Hosting | Spark Plan (10GB storage, 360MB/day) | $0 |
| **Total** | | **$0** |

## Custom Domain (Optional)

### Add Custom Domain to Firebase

```bash
# Add custom domain
firebase hosting:channel:deploy production

# Follow instructions at:
# https://console.firebase.google.com/project/note-hub-80f76/hosting/sites
```

### Add Custom Domain to Fly.io (Optional)

```bash
# Add custom domain for API
flyctl certs create api.yourdomain.com

# Update frontend .env.production
VITE_API_URL=https://api.yourdomain.com
```

## Monitoring & Maintenance

### View Backend Logs

```bash
flyctl logs
```

### View Firebase Hosting Stats

```bash
firebase hosting:channel:list
```

### Backend Dashboard

https://fly.io/apps/notehub-backend/monitoring

### Firebase Console

https://console.firebase.google.com/project/note-hub-80f76

## Next Steps

1. ✅ Backend deployed to Fly.io
2. 🔄 **Build frontend**: `cd frontend && npm run build`
3. 🚀 **Deploy to Firebase**: `firebase deploy --only hosting`
4. 🎉 Access your app: https://note-hub-80f76.web.app

---

**Quick Deploy Command:**

```bash
# From project root
cd frontend && npm run build && cd .. && firebase deploy --only hosting
```
