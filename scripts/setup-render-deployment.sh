#!/bin/bash

# Deploy NoteHub Backend to Render.com (Free Tier)
# This script prepares your backend for Render.com deployment

set -e

echo "🚀 Preparing NoteHub Backend for Render.com Deployment"
echo ""
echo "Render.com Free Tier:"
echo "  ✅ 750 hours/month (always free)"
echo "  ✅ Auto-deploy from GitHub"
echo "  ✅ Free PostgreSQL database"
echo "  ✅ Free SSL certificates"
echo "  ⚠️  Sleeps after 15 min inactivity"
echo ""

# Navigate to backend
cd "$(dirname "$0")/../backend"

# Create render.yaml for automatic deployment
cat > render.yaml << 'EOF'
services:
  - type: web
    name: notehub-backend
    env: node
    region: oregon
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: CORS_ORIGIN
        value: https://note-hub-80f76.web.app,https://note-hub-80f76.firebaseapp.com,http://localhost:5173
      - key: JWT_SECRET
        generateValue: true
      - key: REFRESH_TOKEN_SECRET
        generateValue: true
      - key: NOTES_ADMIN_PASSWORD
        generateValue: true
    autoDeploy: true
    
databases:
  - name: notehub-db
    databaseName: notehub
    user: notehub
    plan: free

EOF

echo "✅ Created render.yaml configuration"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Commit render.yaml to your repository:"
echo "   git add backend/render.yaml"
echo "   git commit -m 'feat: add Render.com deployment config'"
echo "   git push"
echo ""
echo "2. Sign up at Render.com (no credit card needed):"
echo "   👉 https://dashboard.render.com/register"
echo ""
echo "3. Create new Web Service:"
echo "   - Click 'New +' → 'Web Service'"
echo "   - Connect your GitHub repository"
echo "   - Render will auto-detect render.yaml"
echo "   - Click 'Create Web Service'"
echo ""
echo "4. Copy your Render URL (will be like):"
echo "   https://notehub-backend-xxxx.onrender.com"
echo ""
echo "5. Update frontend/.env.production:"
echo "   VITE_API_URL=https://notehub-backend-xxxx.onrender.com"
echo ""
echo "6. Deploy frontend to Firebase:"
echo "   ./scripts/deploy-firebase.sh"
echo ""
echo "🎉 Your app will be live!"
echo ""
echo "📚 Full guide: docs/guides/RENDER_DEPLOYMENT.md"
