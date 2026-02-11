# Firebase Deployment - Backend Configuration Guide

## Step 2: Configure Backend URL

You have **3 options** for hosting your backend with Firebase frontend:

---

## ✅ Option 1: Use Existing Backend (Recommended - Easiest)

If your backend is already deployed somewhere:

### 1. Find your backend URL:
```bash
# If using Docker on VPS
echo "https://your-domain.com" # or http://your-ip:5000

# If deployed to cloud
# - Heroku: https://your-app.herokuapp.com
# - DigitalOcean: https://your-droplet-ip:5000
# - AWS: https://your-ec2-dns:5000
```

### 2. Update backend CORS:

Edit your backend `.env` file:
```bash
CORS_ORIGIN=https://note-hub-80f76.web.app,https://note-hub-80f76.firebaseapp.com,http://localhost:5173
```

Or if you can't find `.env`, copy the template:
```bash
cp backend/.env.firebase backend/.env
# Then edit backend/.env with your actual values
```

Restart your backend:
```bash
# If using Docker
docker compose restart backend

# If using PM2
pm2 restart notehub-backend

# If using systemd
sudo systemctl restart notehub-backend
```

### 3. Update frontend environment:

```bash
# Edit: frontend/.env.production
VITE_API_URL=https://your-actual-backend-url.com
```

### 4. Deploy frontend:
```bash
./scripts/deploy-firebase.sh
```

---

## 🚀 Option 2: Deploy Backend to Google Cloud Run (Recommended - Scalable)

Best for serverless, auto-scaling backend:

### Prerequisites:
```bash
# Install Google Cloud CLI
brew install google-cloud-sdk  # macOS
# or visit: https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login
gcloud config set project note-hub-80f76
```

### Deploy Backend:

```bash
# 1. Build and push Docker image
cd backend
gcloud builds submit --tag gcr.io/note-hub-80f76/notehub-backend

# 2. Deploy to Cloud Run
gcloud run deploy notehub-backend \
  --image gcr.io/note-hub-80f76/notehub-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "JWT_SECRET=your-secret,REFRESH_TOKEN_SECRET=your-secret,NOTES_ADMIN_PASSWORD=your-password,CORS_ORIGIN=https://note-hub-80f76.web.app,NODE_ENV=production"

# 3. Get the URL (it will output something like):
# https://notehub-backend-xxxxx-uc.a.run.app
```

### Update frontend:
```bash
# Edit: frontend/.env.production
VITE_API_URL=https://notehub-backend-xxxxx-uc.a.run.app
```

### Deploy:
```bash
./scripts/deploy-firebase.sh
```

**Cost:** ~$0-5/month (2M requests free, then $0.40 per million)

---

## 🐳 Option 3: Deploy Backend to Google App Engine

Good for traditional always-on backend:

### Create app.yaml:
```bash
cat > backend/app.yaml << 'EOF'
runtime: nodejs18
env: standard
instance_class: F1

env_variables:
  JWT_SECRET: 'your-super-secret-jwt-key'
  REFRESH_TOKEN_SECRET: 'your-super-secret-refresh-token-key'
  NOTES_ADMIN_PASSWORD: 'your-admin-password'
  CORS_ORIGIN: 'https://note-hub-80f76.web.app,https://note-hub-80f76.firebaseapp.com'
  NODE_ENV: 'production'
  PORT: '8080'
EOF
```

### Deploy:
```bash
cd backend
gcloud app deploy

# Get URL (output will show):
# https://note-hub-80f76.appspot.com
```

### Update frontend:
```bash
# Edit: frontend/.env.production
VITE_API_URL=https://note-hub-80f76.appspot.com
```

### Deploy:
```bash
./scripts/deploy-firebase.sh
```

**Cost:** ~$7-20/month (always running)

---

## 🧪 Option 4: Test Locally First

Want to test without deploying backend?

### 1. Run backend locally:
```bash
cd backend
npm install
npm start
# Backend runs on http://localhost:5000
```

### 2. Use ngrok to expose locally:
```bash
# Install ngrok
brew install ngrok  # macOS

# Expose port 5000
ngrok http 5000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

### 3. Update frontend:
```bash
# Edit: frontend/.env.production
VITE_API_URL=https://abc123.ngrok.io
```

### 4. Deploy and test:
```bash
./scripts/deploy-firebase.sh
```

**Note:** ngrok URLs change each restart (paid plan for permanent URLs)

---

## 📋 Quick Decision Guide

**Choose Option 1 if:**
- ✅ You already have backend deployed
- ✅ You have a domain or static IP
- ✅ You want minimal changes

**Choose Option 2 (Cloud Run) if:**
- ✅ You want serverless (pay per use)
- ✅ You want auto-scaling
- ✅ You don't need always-on
- ✅ You want minimal cost

**Choose Option 3 (App Engine) if:**
- ✅ You want traditional hosting
- ✅ You want always-on backend
- ✅ You're okay with ~$10/month

**Choose Option 4 (ngrok) if:**
- ✅ Just testing
- ✅ Not ready for production

---

## ✅ Verification Steps

After updating `VITE_API_URL` and deploying:

### 1. Check frontend can reach backend:
```bash
# Visit your Firebase app
open https://note-hub-80f76.web.app

# Open browser console (F12) and check:
# - Network tab for API calls
# - Console for any CORS errors
```

### 2. Test login:
- Try logging in
- Create a note
- Check if data persists

### 3. Check backend logs:
```bash
# Cloud Run
gcloud run logs read --service=notehub-backend

# App Engine
gcloud app logs tail

# Your server
docker compose logs -f backend
```

---

## 🆘 Troubleshooting

### "CORS Error" in browser console
**Fix:** Update backend `CORS_ORIGIN` to include Firebase domains

### "Failed to fetch" or "Network Error"
**Fix:** Check VITE_API_URL is correct and backend is running

### "404 Not Found" on API calls
**Fix:** Ensure backend is deployed and accessible

### "Mixed Content" error (http/https)
**Fix:** Backend MUST use HTTPS (Firebase hosting is HTTPS)

---

## 📝 Summary - What You Need

1. **Backend URL** (one of):
   - Your existing backend URL
   - Cloud Run URL (after deploying)
   - App Engine URL (after deploying)
   - ngrok URL (for testing)

2. **Update these files:**
   - `frontend/.env.production` → Set VITE_API_URL
   - `backend/.env` (or environment variables) → Set CORS_ORIGIN

3. **Deploy:**
   ```bash
   ./scripts/deploy-firebase.sh
   ```

That's it! Your Firebase frontend will connect to your backend. 🎉
