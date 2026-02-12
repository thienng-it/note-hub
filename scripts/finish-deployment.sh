#!/bin/bash

# Quick deployment helper script
# Run this once you have your Render backend URL

echo "🔥 Firebase Deployment Helper"
echo "=============================="
echo ""

# Check if user has backend URL
echo "📝 Do you have your Render backend URL?"
echo "   (Example: https://notehub-backend-xxxx.onrender.com)"
echo ""
read -p "Enter your backend URL (or press Enter to skip): " BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
  echo ""
  echo "⚠️  No URL provided. Please complete these steps first:"
  echo ""
  echo "1. Go to Render.com dashboard: https://dashboard.render.com"
  echo "2. Check if 'notehub-backend' service is deployed"
  echo "3. Copy the URL shown in the service details"
  echo "4. Run this script again with the URL"
  echo ""
  exit 0
fi

# Validate URL format
if [[ ! $BACKEND_URL =~ ^https?:// ]]; then
  echo "⚠️  URL should start with http:// or https://"
  echo "   Example: https://notehub-backend-xxxx.onrender.com"
  exit 1
fi

echo ""
echo "✅ Backend URL received: $BACKEND_URL"
echo ""

# Update frontend .env.production
echo "📝 Updating frontend/.env.production..."
cat > frontend/.env.production << EOF
# Firebase Production Environment Configuration
# Backend API URL - Deployed on Render.com (FREE)

# Backend API URL
VITE_API_URL=$BACKEND_URL

# Environment
NODE_ENV=production

# Firebase Configuration (automatically loaded from src/config/firebase.ts)
# Analytics is enabled by default - data will be sent to Firebase Analytics
# Project: note-hub-80f76
# Measurement ID: G-EDSV8Y84BY
EOF

echo "✅ Frontend configuration updated!"
echo ""

# Show what was configured
echo "📋 Configuration Summary:"
echo "   Backend:  $BACKEND_URL"
echo "   Frontend: https://note-hub-80f76.web.app"
echo ""

# Ask to deploy
read -p "🚀 Ready to deploy frontend to Firebase? (y/n): " DEPLOY

if [ "$DEPLOY" = "y" ] || [ "$DEPLOY" = "Y" ]; then
  echo ""
  echo "🏗️  Building frontend..."
  cd frontend
  npm run build:prod
  
  if [ $? -eq 0 ]; then
    cd ..
    echo ""
    echo "🚀 Deploying to Firebase Hosting..."
    firebase deploy --only hosting
    
    if [ $? -eq 0 ]; then
      echo ""
      echo "✅ DEPLOYMENT COMPLETE! 🎉"
      echo ""
      echo "🌐 Your app is live at:"
      echo "   Frontend: https://note-hub-80f76.web.app"
      echo "   Backend:  $BACKEND_URL"
      echo ""
      echo "📊 Firebase Console: https://console.firebase.google.com/project/note-hub-80f76"
      echo "📊 Render Dashboard: https://dashboard.render.com"
      echo ""
      echo "🎉 Congratulations! Your full-stack app is now live for FREE!"
    else
      echo ""
      echo "❌ Firebase deployment failed. Check the error above."
    fi
  else
    echo ""
    echo "❌ Frontend build failed. Check the error above."
  fi
else
  echo ""
  echo "📋 When ready to deploy, run:"
  echo "   ./scripts/deploy-firebase.sh"
  echo ""
  echo "   Or manually:"
  echo "   cd frontend && npm run build:prod"
  echo "   firebase deploy --only hosting"
fi
