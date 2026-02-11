#!/bin/bash

# Deploy NoteHub to Firebase Hosting
# This script builds the frontend and deploys to Firebase

set -e

echo "🔥 Deploying NoteHub to Firebase Hosting..."

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if Firebase SDK is installed
if ! grep -q '"firebase"' frontend/package.json; then
    echo "📦 Firebase SDK not found. Installing..."
    cd frontend
    npm install firebase
    cd ..
fi

# Check if logged in
echo "📝 Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Running login..."
    firebase login
fi

# Build frontend
echo "🏗️  Building frontend..."
cd frontend
npm run build:prod

# Return to root
cd ..

# Deploy to Firebase
echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo "🌐 Your app is live at: https://note-hub-80f76.web.app"
echo "📊 Analytics Dashboard: https://console.firebase.google.com/project/note-hub-80f76/analytics"
