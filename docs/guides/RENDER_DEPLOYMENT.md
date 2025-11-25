# 🚀 Render.com Deployment Guide for NoteHub

Deploy NoteHub to [Render.com](https://render.com) - **100% free, no credit card required!**

## 📋 Prerequisites

1. [Render.com account](https://render.com) (free)
2. [GitHub account](https://github.com) with your NoteHub repository
3. External MySQL database (see [Database Setup](#database-setup))

## 🗄️ Database Setup

Before deploying, set up a **free MySQL database** using one of these providers:

### Option 1: PlanetScale (Recommended)

1. Go to [planetscale.com](https://planetscale.com)
2. Create a free account
3. Create a new database named `notehub`
4. Get connection details from "Connect" → "Connect with MySQL CLI"
5. Note: Use `aws.connect.psdb.cloud` as host

### Option 2: Aiven

1. Go to [aiven.io](https://aiven.io)
2. Create a free account
3. Create a MySQL service (free tier)
4. Get connection details from service overview

### Option 3: Railway

1. Go to [railway.app](https://railway.app)
2. Create a MySQL database
3. Get connection string from Variables tab

## 🚀 Quick Deploy (Blueprint)

The easiest way to deploy:

1. **Fork this repository** to your GitHub account

2. **Go to Render Dashboard**: [dashboard.render.com](https://dashboard.render.com)

3. **Create New Blueprint**:

   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will auto-detect `render.yaml`

4. **Configure Environment Variables**:
   After the Blueprint is created, go to your service and set:

   ```
   MYSQL_HOST=your-database-host
   MYSQL_USER=your-username
   MYSQL_PASSWORD=your-password
   MYSQL_DATABASE=notehub
   ```

5. **Deploy!** Click "Manual Deploy" → "Deploy latest commit"

## 🔧 Manual Deploy (Alternative)

If you prefer manual setup:

1. **Create Web Service**:

   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the `main` branch

2. **Configure Build Settings**:

   - **Runtime**: Python
   - **Build Command**:
     ```bash
     pip install --upgrade pip && pip install -r requirements.txt && cd frontend && npm ci && npm run build && cd .. && mkdir -p src/static/frontend && cp -r frontend/dist/* src/static/frontend/
     ```
   - **Start Command**:
     ```bash
     gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 wsgi:app
     ```

3. **Set Environment Variables** (in Render Dashboard):
   | Variable | Value |
   |----------|-------|
   | `PYTHON_VERSION` | `3.11.4` |
   | `NODE_VERSION` | `20` |
   | `FLASK_SECRET` | (auto-generate or set manually) |
   | `NOTES_ADMIN_USERNAME` | `admin` |
   | `NOTES_ADMIN_PASSWORD` | `YourSecurePassword123!` |
   | `CAPTCHA_TYPE` | `simple` |
   | `MYSQL_HOST` | Your database host |
   | `MYSQL_PORT` | `3306` |
   | `MYSQL_USER` | Your database user |
   | `MYSQL_PASSWORD` | Your database password |
   | `MYSQL_DATABASE` | `notehub` |

4. **Deploy**: Render will automatically build and deploy

## 🌐 Access Your App

After deployment:

- Your app will be at: `https://notehub.onrender.com` (or similar)
- Default login: `admin` / (check NOTES_ADMIN_PASSWORD in env vars)
- **Change the admin password immediately!**

## ⚠️ Free Tier Limitations

Render's free tier has these limitations:

- **Auto-sleep**: Service sleeps after 15 minutes of inactivity
- **Cold start**: First request after sleep takes ~30 seconds
- **750 hours/month**: Enough for personal projects
- **Limited bandwidth**: Sufficient for development

### Tips for Free Tier:

1. Use a service like [UptimeRobot](https://uptimerobot.com) to ping your app every 14 minutes (keeps it awake)
2. Or accept the cold starts for a truly free experience

## 🔄 Continuous Deployment

Render automatically deploys when you push to `main`:

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
# Render will auto-deploy!
```

## 🐛 Troubleshooting

### Build Fails

1. Check build logs in Render Dashboard
2. Ensure `requirements.txt` is up to date
3. Verify Node.js dependencies in `frontend/package.json`

### Database Connection Error

1. Verify MySQL credentials in environment variables
2. Check if your database allows external connections
3. For PlanetScale: Ensure SSL is enabled

### App Crashes on Start

1. Check logs: Dashboard → Logs
2. Verify all environment variables are set
3. Test locally with same environment variables

## 📊 Monitoring

Render provides:

- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory, Request counts
- **Alerts**: Set up notifications for issues

## 🔗 Useful Links

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [PlanetScale Docs](https://planetscale.com/docs)
- [Project Issues](https://github.com/thienng-it/note-hub/issues)

---

**Need help?** Open an issue on GitHub!
