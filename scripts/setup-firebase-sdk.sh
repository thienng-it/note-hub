#!/bin/bash

# Install Firebase SDK in frontend
# Run this before deploying to Firebase

set -e

echo "📦 Installing Firebase SDK..."

cd "$(dirname "$0")/../frontend"

# Install Firebase packages
npm install firebase

echo "✅ Firebase SDK installed successfully!"
echo ""
echo "Next steps:"
echo "1. Run: npm install (to ensure lock file is updated)"
echo "2. Update VITE_API_URL in frontend/.env.production"
echo "3. Run: ../scripts/deploy-firebase.sh to deploy"
