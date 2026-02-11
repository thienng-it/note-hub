# Firebase Hosting Deployment Guide

## Overview

This guide covers deploying NoteHub's frontend to Firebase Hosting. The backend can remain on your current infrastructure or be migrated to Google Cloud Run.

## Project Information

- **Project ID:** note-hub-80f76
- **Project Number:** 990819462432
- **Frontend Hosting:** Firebase Hosting
- **Backend Options:** Cloud Run, App Engine, or existing server

## Prerequisites

1. **Firebase CLI installed:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase SDK installed in frontend:**
   ```bash
   chmod +x scripts/setup-firebase-sdk.sh
   ./scripts/setup-firebase-sdk.sh
   ```

3. **Firebase account with project created** ✅ (already done)
   - Project ID: note-hub-80f76
   - Project Number: 990819462432
   - Firebase configuration integrated in `frontend/src/config/firebase.ts`

4. **Backend deployed and accessible** (update VITE_API_URL)

## Deployment Steps

### Option 1: Manual Deployment (Quick Start)

1. **Install Firebase SDK:**
   ```bash
   chmod +x scripts/setup-firebase-sdk.sh
   ./scripts/setup-firebase-sdk.sh
   ```

2. **Update Frontend Environment Variables:**
   Edit `frontend/.env.production` and set your backend URL:
   ```bash
   VITE_API_URL=https://your-backend-url.com
   ```

3. **Login to Firebase:**
   ```bash
   firebase login
   ```

4. **Build and Deploy:**
   ```bash
   # Use the deployment script
   chmod +x scripts/deploy-firebase.sh
   ./scripts/deploy-firebase.sh
   ```

   Or manually:
   ```bash
   cd frontend
   npm run build:prod
   cd ..
   firebase deploy --only hosting
   ```

5. **Access Your App:**
   - Live URL: https://note-hub-80f76.web.app
   - Alternative: https://note-hub-80f76.firebaseapp.com

### Option 2: Automated GitHub Actions Deployment

1. **Set up Firebase Service Account:**
   ```bash
   # Generate service account key
   firebase login:ci
   # Copy the token
   ```

2. **Add GitHub Secrets:**
   Go to GitHub Repository → Settings → Secrets → Actions:
   - `FIREBASE_SERVICE_ACCOUNT`: Paste the token from step 1
   - `VITE_API_URL`: Your backend API URL

3. **Push to Main Branch:**
   ```bash
   git add .
   git commit -m "feat: add Firebase deployment"
   git push origin main
   ```
   
   GitHub Actions will automatically build and deploy.

## Backend Deployment Options

### Option A: Keep Current Backend (Simplest)

If your backend is already deployed somewhere:
1. Update `frontend/.env.production` with backend URL
2. Ensure CORS is configured to allow Firebase hosting domain
3. Deploy frontend only

**Backend CORS Update:**
```javascript
// backend/src/index.js
const allowedOrigins = [
  'http://localhost:5173',
  'https://note-hub-80f76.web.app',
  'https://note-hub-80f76.firebaseapp.com'
];
```

### Option B: Deploy Backend to Google Cloud Run

1. **Build and push Docker image:**
   ```bash
   cd backend
   
   # Build image
   gcloud builds submit --tag gcr.io/note-hub-80f76/notehub-backend
   
   # Deploy to Cloud Run
   gcloud run deploy notehub-backend \
     --image gcr.io/note-hub-80f76/notehub-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars JWT_SECRET=your-secret,REFRESH_TOKEN_SECRET=your-secret
   ```

2. **Update frontend .env.production:**
   ```bash
   VITE_API_URL=https://notehub-backend-xxxx-uc.a.run.app
   ```

### Option C: Deploy Backend to App Engine

1. **Create `app.yaml`:**
   ```yaml
   runtime: nodejs18
   env: standard
   instance_class: F1
   
   env_variables:
     JWT_SECRET: 'your-secret'
     REFRESH_TOKEN_SECRET: 'your-secret'
     NOTES_ADMIN_PASSWORD: 'your-admin-password'
   ```

2. **Deploy:**
   ```bash
   cd backend
   gcloud app deploy
   ```

## Database Options

### SQLite (Development Only)
Not recommended for production on Cloud Run/App Engine due to ephemeral storage.

### Cloud SQL (Recommended for Production)

1. **Create Cloud SQL instance:**
   ```bash
   gcloud sql instances create notehub-db \
     --database-version=MYSQL_8_0 \
     --tier=db-f1-micro \
     --region=us-central1 \
     --root-password=your-secure-password
   
   # Create database
   gcloud sql databases create notehub --instance=notehub-db
   ```

2. **Update backend environment:**
   ```bash
   DATABASE_URL=mysql://user:password@/notehub?host=/cloudsql/note-hub-80f76:us-central1:notehub-db
   ```

3. **Connect Cloud Run to Cloud SQL:**
   ```bash
   gcloud run services update notehub-backend \
     --add-cloudsql-instances note-hub-80f76:us-central1:notehub-db
   ```

## Configuration Files

### firebase.json (Updated)
```json
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [...]
  }
}
```

### .firebaserc (Updated)
```json
{
  "projects": {
    "default": "note-hub-80f76"
  }
}
```

## Testing

1. **Test production build locally:**
   ```bash
   cd frontend
   npm run build:prod
   firebase emulators:start --only hosting
   ```
   Visit: http://localhost:5000

2. **Deploy to preview channel:**
   ```bash
   firebase hosting:channel:deploy preview
   ```

## Monitoring

1. **Firebase Console:** https://console.firebase.google.com/project/note-hub-80f76
2. **Hosting Metrics:** Check traffic, bandwidth, and errors
3. **Cloud Run Logs:** `gcloud run logs read --service=notehub-backend`

## Cost Estimates

### Firebase Hosting (Free Tier)
- 10 GB storage
- 360 MB/day bandwidth
- Should be sufficient for personal/small team use

### Cloud Run (Pay-as-you-go)
- First 2 million requests/month: FREE
- CPU only charged during request handling
- Estimated: $0-10/month for low traffic

### Cloud SQL (db-f1-micro)
- ~$7-10/month for small instance
- Includes automatic backups

## Troubleshooting

### 404 on page refresh
- ✅ Already configured with rewrites in firebase.json

### API calls failing
- Check CORS configuration in backend
- Verify VITE_API_URL is correct
- Check browser console for errors

### Build failures
- Ensure all dependencies installed: `cd frontend && npm install`
- Check Node.js version: v18+
- Clear build cache: `npm run clean`

## Rollback

```bash
# List deployment history
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:rollback
```

## Next Steps

1. ✅ Frontend configured for Firebase Hosting
2. 🔲 Deploy backend (choose option A, B, or C above)
3. 🔲 Update VITE_API_URL in frontend/.env.production
4. 🔲 Run deployment script: `./scripts/deploy-firebase.sh`
5. 🔲 Test at: https://note-hub-80f76.web.app
6. 🔲 Configure custom domain (optional)

## Resources

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL for MySQL](https://cloud.google.com/sql/docs/mysql)
