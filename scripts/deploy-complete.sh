#!/bin/bash

# Complete Firebase + Render.com Deployment Guide
# Follow these steps to deploy your full-stack app

set -e

echo "🚀 NoteHub Full Deployment Guide"
echo "=================================="
echo ""

# Step 1: GitHub Authentication
echo "📝 Step 1: GitHub Authentication"
echo "--------------------------------"
echo "Your commit is ready but push failed due to authentication."
echo ""
echo "Fix this by running ONE of these:"
echo ""
echo "Option A - Use GitHub CLI (Recommended):"
echo "  1. Install: brew install gh"
echo "  2. Login: gh auth login"
echo "  3. Push: git push origin main"
echo ""
echo "Option B - Use Personal Access Token:"
echo "  1. Go to: https://github.com/settings/tokens"
echo "  2. Generate new token (classic)"
echo "  3. Select 'repo' scope"
echo "  4. Run: git remote set-url origin https://YOUR_TOKEN@github.com/thienng-it/note-hub.git"
echo "  5. Push: git push origin main"
echo ""
echo "Option C - Use SSH:"
echo "  1. Check: ls ~/.ssh/id_*.pub"
echo "  2. If no keys: ssh-keygen -t ed25519 -C 'your_email@example.com'"
echo "  3. Copy key: cat ~/.ssh/id_ed25519.pub | pbcopy"
echo "  4. Add to GitHub: https://github.com/settings/keys"
echo "  5. Run: git remote set-url origin git@github.com:thienng-it/note-hub.git"
echo "  6. Push: git push origin main"
echo ""
read -p "Press Enter when you've pushed to GitHub..."
echo ""

# Step 2: Render.com Setup
echo "📝 Step 2: Deploy Backend to Render.com (FREE)"
echo "-----------------------------------------------"
echo "Opening Render.com in your browser..."
open "https://dashboard.render.com/register" 2>/dev/null || echo "Visit: https://dashboard.render.com/register"
echo ""
echo "In Render.com dashboard:"
echo "  1. Sign up with GitHub (no credit card needed)"
echo "  2. Click 'New +' → 'Web Service'"
echo "  3. Connect repository: thienng-it/note-hub"
echo "  4. Render will auto-detect 'backend/render.yaml'"
echo "  5. Click 'Create Web Service'"
echo "  6. Wait 2-5 minutes for deployment..."
echo ""
echo "Your backend URL will be like:"
echo "  https://notehub-backend-XXXX.onrender.com"
echo ""
read -p "Enter your Render backend URL (or press Enter to skip for now): " BACKEND_URL
echo ""

# Step 3: Update Frontend Config
if [ ! -z "$BACKEND_URL" ]; then
  echo "📝 Step 3: Updating Frontend Configuration"
  echo "-------------------------------------------"
  
  # Update .env.production
  if [ -f "frontend/.env.production" ]; then
    sed -i.bak "s|VITE_API_URL=.*|VITE_API_URL=$BACKEND_URL|g" frontend/.env.production
    rm frontend/.env.production.bak 2>/dev/null || true
    echo "✅ Updated frontend/.env.production"
  fi
  echo ""
else
  echo "⚠️  Skipping frontend config - you can update it manually later"
  echo ""
fi

# Step 4: Deploy Frontend to Firebase
echo "📝 Step 4: Deploy Frontend to Firebase"
echo "---------------------------------------"
echo ""
read -p "Ready to deploy frontend to Firebase? (y/n): " DEPLOY_FRONTEND

if [ "$DEPLOY_FRONTEND" = "y" ]; then
  echo "🏗️  Building frontend..."
  cd frontend
  npm run build:prod
  cd ..
  
  echo "🚀 Deploying to Firebase..."
  firebase deploy --only hosting
  
  echo ""
  echo "✅ Deployment Complete!"
  echo ""
  echo "🌐 Your app is live at:"
  echo "   Frontend: https://note-hub-80f76.web.app"
  if [ ! -z "$BACKEND_URL" ]; then
    echo "   Backend: $BACKEND_URL"
  fi
  echo ""
  echo "📊 Firebase Analytics: https://console.firebase.google.com/project/note-hub-80f76/analytics"
  echo ""
else
  echo ""
  echo "📋 When ready to deploy, run:"
  echo "   ./scripts/deploy-firebase.sh"
  echo ""
fi

echo "🎉 Setup Complete!"
echo ""
echo "📚 Documentation:"
echo "   - Render Guide: docs/guides/FREE_HOSTING_OPTIONS.md"
echo "   - Firebase Guide: docs/guides/FIREBASE_SETUP_COMPLETE.md"
