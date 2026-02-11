# Firebase Deployment Checklist

Use this checklist before deploying NoteHub to Firebase.

## ✅ Pre-Deployment Checklist

### 1. Firebase SDK Setup
- [ ] Run setup script: `chmod +x scripts/setup-firebase-sdk.sh && ./scripts/setup-firebase-sdk.sh`
- [ ] Verify Firebase installed in `frontend/package.json`
- [ ] Confirm [firebase.ts](../../frontend/src/config/firebase.ts) exists with correct config
- [ ] Firebase config imported in [main.tsx](../../frontend/src/main.tsx)

### 2. Environment Configuration
- [ ] Update `frontend/.env.production`:
  - [ ] Set `VITE_API_URL` to your backend URL
  - [ ] Verify `NODE_ENV=production`
- [ ] Backend CORS configured to allow Firebase domains:
  - [ ] `https://note-hub-80f76.web.app`
  - [ ] `https://note-hub-80f76.firebaseapp.com`

### 3. Firebase Configuration Files
- [ ] [firebase.json](../../firebase.json) configured correctly:
  - [ ] `"public": "frontend/dist"`
  - [ ] SPA rewrites enabled
  - [ ] Cache headers set
- [ ] [.firebaserc](../../.firebaserc) has correct project ID: `note-hub-80f76`

### 4. Backend Deployment
Choose one option:

**Option A: Existing Backend**
- [ ] Backend is accessible via HTTPS
- [ ] CORS configured for Firebase domains
- [ ] Environment variables set correctly
- [ ] Database is production-ready

**Option B: Google Cloud Run**
- [ ] Docker image built and pushed
- [ ] Cloud Run service deployed
- [ ] Environment variables configured
- [ ] Database connected (Cloud SQL or similar)

**Option C: Google App Engine**
- [ ] app.yaml configured
- [ ] App deployed to App Engine
- [ ] Environment variables set
- [ ] Database configured

### 5. Frontend Build Test
- [ ] Run: `cd frontend && npm run build:prod`
- [ ] No TypeScript errors
- [ ] No build warnings
- [ ] Check build output size
- [ ] Test build locally: `firebase emulators:start --only hosting`

### 6. Firebase CLI
- [ ] Firebase CLI installed: `firebase --version`
- [ ] Logged in: `firebase login`
- [ ] Correct project selected: `firebase use note-hub-80f76`

### 7. Code Quality
- [ ] All linting errors fixed: `cd frontend && npm run lint`
- [ ] All tests passing: `cd frontend && npm test`
- [ ] Snapshot tests updated if needed

### 8. Security Review
- [ ] No sensitive data in frontend code
- [ ] API keys are for Firebase SDK only (safe for client)
- [ ] Backend environment variables not committed
- [ ] .env.production not committed to git

### 9. Analytics & Monitoring
- [ ] Firebase Analytics enabled in [firebase.ts](../../frontend/src/config/firebase.ts)
- [ ] Consider adding cookie consent banner (GDPR)
- [ ] Review [Analytics Guide](./FIREBASE_ANALYTICS.md)

### 10. Documentation
- [ ] Update README with Firebase hosting URL
- [ ] Document backend deployment method
- [ ] Update API documentation with production URLs

## 🚀 Deployment Commands

### Quick Deploy
```bash
# All-in-one deployment
chmod +x scripts/deploy-firebase.sh
./scripts/deploy-firebase.sh
```

### Manual Deploy
```bash
# 1. Build frontend
cd frontend
npm run build:prod

# 2. Deploy to Firebase
cd ..
firebase deploy --only hosting

# 3. Verify deployment
open https://note-hub-80f76.web.app
```

### Deploy to Preview Channel (Testing)
```bash
firebase hosting:channel:deploy preview
```

## ✅ Post-Deployment Verification

### Functional Testing
- [ ] Visit: https://note-hub-80f76.web.app
- [ ] Login page loads correctly
- [ ] Can create account / login
- [ ] API calls to backend work
- [ ] Notes CRUD operations work
- [ ] Tasks functionality works
- [ ] Tags functionality works
- [ ] Search works
- [ ] Profile page works
- [ ] Settings persist
- [ ] Dark/Light theme toggle works
- [ ] Offline mode works (PWA)
- [ ] Responsive design on mobile

### Performance Check
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No console errors
- [ ] No console warnings

### Analytics Verification
- [ ] Visit: https://console.firebase.google.com/project/note-hub-80f76/analytics
- [ ] Check Realtime dashboard
- [ ] Verify events are being tracked
- [ ] Test page_view events

### Security Headers
Check headers at https://note-hub-80f76.web.app:
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] Strict-Transport-Security
- [ ] Content-Security-Policy

## 🔧 Troubleshooting

### Build Fails
```bash
cd frontend
rm -rf node_modules dist .vite
npm install
npm run build:prod
```

### Deployment Fails
```bash
# Re-authenticate
firebase logout
firebase login

# Verify project
firebase use note-hub-80f76

# Try deploy again
firebase deploy --only hosting
```

### 404 Errors on Refresh
- Check firebase.json has rewrites configured
- Verify `"source": "**"` is present

### API Calls Fail
- Verify VITE_API_URL in .env.production
- Check backend CORS allows Firebase domains
- Check browser Network tab for errors
- Verify backend is accessible

### Analytics Not Working
- Check browser console for errors
- Enable Debug View in Firebase Console
- Verify analytics import in main.tsx
- Check if ad blockers are interfering

## 📊 Monitoring

### Firebase Console
- Hosting: https://console.firebase.google.com/project/note-hub-80f76/hosting
- Analytics: https://console.firebase.google.com/project/note-hub-80f76/analytics
- Usage: https://console.firebase.google.com/project/note-hub-80f76/usage

### Set Up Alerts
1. Go to Firebase Console → Alerting
2. Create alerts for:
   - High error rates
   - Traffic spikes
   - Quota exceeded

## 🔄 Rollback

If deployment has issues:
```bash
# View deployment history
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:rollback
```

## 📝 Notes

- **First deployment may take 5-10 minutes** for global CDN propagation
- **Cache headers are aggressive** - may need hard refresh (Cmd+Shift+R) to see changes
- **Firebase Hosting is free tier** for up to 10GB storage and 360MB/day bandwidth
- **Analytics data** appears in dashboard within 24-48 hours

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ App loads at https://note-hub-80f76.web.app
- ✅ All features work correctly
- ✅ No console errors
- ✅ Lighthouse score > 90
- ✅ Analytics tracking events
- ✅ Mobile responsive
- ✅ PWA installable
