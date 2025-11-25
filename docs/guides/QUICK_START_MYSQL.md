# Quick Start: External MySQL Setup

## 🚀 Fast Track (5 minutes)

### 1. Create PlanetScale Database (Recommended)

1. Go to [planetscale.com](https://planetscale.com/) and sign up
2. Click "Create a database" → Name: `notehub-db` → Region: US East → Plan: Hobby (Free)
3. Click "Connect" → "Create password" → **Copy all details immediately!**

### 2. Set Environment Variables in Render

1. Open [Render Dashboard](https://dashboard.render.com/)
2. Select your `joseph-note-hub` service
3. Click "Environment" in sidebar
4. Add these 5 variables (click "Add Environment Variable" for each):

```
MYSQL_HOST = aws.connect.psdb.cloud
MYSQL_PORT = 3306
MYSQL_USER = <your-planetscale-username>
MYSQL_PASSWORD = <your-planetscale-password>
MYSQL_DATABASE = notehub-db
```

5. Click "Save Changes" at the bottom
6. Render will automatically redeploy (takes ~2 minutes)

### 3. Verify It Works

After deployment completes:

1. Click "Logs" in Render dashboard
2. Look for these success messages:

   ```
   📊 Database configured: <user>@aws.connect.psdb.cloud:3306/notehub-db
   🗄️  Initializing database connection: aws.connect.psdb.cloud:3306/notehub-db
   🔒 SSL enabled for MySQL connection
   ✅ Database initialized successfully
   ✅ Created admin user: admin / <password>
   ```

3. Your app is now live with MySQL! 🎉

## 📋 Checklist

- [ ] PlanetScale account created
- [ ] Database `notehub-db` created
- [ ] Password generated and copied
- [ ] All 5 environment variables set in Render
- [ ] Changes saved in Render
- [ ] App redeployed successfully
- [ ] Logs show successful database connection

## ⚠️ Common Issues

**"Can't connect to MySQL server"**

- Double-check MYSQL_HOST doesn't have `https://` prefix
- Verify all 5 variables are set correctly
- Make sure there are no trailing spaces in values

**"Access denied"**

- Regenerate password in PlanetScale and update MYSQL_PASSWORD
- Ensure username is copied exactly (case-sensitive)

**"Unknown database"**

- MYSQL_DATABASE must match your PlanetScale database name exactly
- Check for typos

## 🔗 Resources

- Full setup guide: `docs/guides/EXTERNAL_MYSQL_SETUP.md`
- Alternative providers: Railway, Aiven (see full guide)
- Need help? Check Render logs first!

## 💰 Cost

- **PlanetScale Hobby:** FREE forever
- **Render Web Service:** FREE tier
- **Total:** $0/month 🎊
