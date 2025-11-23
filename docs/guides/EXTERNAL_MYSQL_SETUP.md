# External MySQL Setup Guide

This guide helps you set up a free external MySQL database for your Render deployment.

## Recommended Free MySQL Providers

### Option A: PlanetScale (Recommended - Easy & Free)

**Free Tier:** 5GB storage, 1 billion row reads/month, 10 million row writes/month

1. **Sign up at [PlanetScale](https://planetscale.com/)**

   - Create account (GitHub login recommended)

2. **Create a new database:**

   - Click "Create a database"
   - Name: `notehub-db`
   - Region: Choose closest to your Render region
   - Plan: Select "Hobby" (free)

3. **Get connection details:**

   - Click "Connect" → "New password" → "Create password"
   - **IMPORTANT:** Copy the connection details immediately (password shown only once!)
   - You'll get:
     ```
     Host: aws.connect.psdb.cloud
     Username: <generated-username>
     Password: <generated-password>
     Database: notehub-db
     Port: 3306
     ```

4. **Set environment variables in Render:**

   - Go to your Render dashboard
   - Select your `joseph-note-hub` service
   - Go to "Environment" tab
   - Add these variables:
     ```
     MYSQL_HOST=aws.connect.psdb.cloud
     MYSQL_PORT=3306
     MYSQL_USER=<your-planetscale-username>
     MYSQL_PASSWORD=<your-planetscale-password>
     MYSQL_DATABASE=notehub-db
     ```

5. **Configure SSL (PlanetScale requires it):**
   - PlanetScale connections use SSL by default
   - Our app is already configured to handle this

### Option B: Railway (Good Alternative)

**Free Tier:** $5 credit (lasts ~1-2 months for small apps)

1. **Sign up at [Railway](https://railway.app/)**

2. **Create MySQL database:**

   - Click "New Project" → "Provision MySQL"
   - Railway automatically creates the database

3. **Get connection details:**

   - Click on your MySQL service
   - Go to "Connect" tab
   - Copy the connection URL or individual credentials:
     ```
     Host: containers-us-west-xxx.railway.app
     Port: 6543 (may vary)
     User: root
     Password: <generated>
     Database: railway
     ```

4. **Set environment variables in Render:** (same as PlanetScale above)

### Option C: Aiven (Generous Free Tier)

**Free Tier:** 1GB storage, 1 CPU, good for small apps

1. **Sign up at [Aiven](https://aiven.io/)**

2. **Create MySQL service:**

   - Select "MySQL"
   - Choose free tier
   - Select region close to Render

3. **Get connection details from dashboard**

4. **Set environment variables in Render**

## Setting Environment Variables in Render

1. Log into [Render Dashboard](https://dashboard.render.com/)
2. Select your `joseph-note-hub` service
3. Click "Environment" in the left sidebar
4. Click "Add Environment Variable" for each:

```
MYSQL_HOST=<your-db-host>
MYSQL_PORT=3306
MYSQL_USER=<your-db-username>
MYSQL_PASSWORD=<your-db-password>
MYSQL_DATABASE=<your-db-name>
```

5. Click "Save Changes"
6. Render will automatically redeploy your app

## Verifying the Connection

After setting the environment variables:

1. Go to your Render service logs
2. Look for:

   ```
   📊 MySQL Database configured: <user>@<host>:3306/<database>
   🗄️  Initializing database connection: <host>:3306/<database>
   ✅ Database initialized successfully
   ```

3. If you see connection errors, double-check:
   - All 5 environment variables are set
   - Password is correct (no extra spaces)
   - Database allows connections from Render's IP ranges
   - For PlanetScale: SSL is enabled (default in our config)

## Troubleshooting

### "Access denied for user"

- Double-check username and password
- Ensure password doesn't have special characters that need escaping

### "Can't connect to MySQL server"

- Verify MYSQL_HOST is correct
- Check if database service is running
- Ensure database allows external connections
- For PlanetScale: Make sure SSL isn't being blocked

### "Unknown database"

- Verify MYSQL_DATABASE name matches exactly
- Some providers auto-create the database, others require manual creation

### Tables not created

- App automatically creates tables on first run
- Check logs for migration messages
- Ensure database user has CREATE TABLE permissions

## Database Migration from SQLite (if needed)

If you have existing data in SQLite and want to migrate:

1. Export SQLite data
2. Import into MySQL using the provider's tools
3. Or use the migration scripts in `/scripts` folder

## Security Best Practices

1. ✅ Use strong, unique passwords
2. ✅ Never commit database credentials to Git
3. ✅ Use environment variables in Render
4. ✅ Enable SSL connections when available
5. ✅ Regularly backup your database (most providers have auto-backup)

## Cost Estimates

- **PlanetScale Hobby:** Free forever (with limits)
- **Railway:** ~$5/month after free credit
- **Aiven:** Free tier indefinitely
- **Render MySQL:** $7/month (if you want integrated solution)

## Support

If you encounter issues:

1. Check provider's status page
2. Review Render deployment logs
3. Test connection locally first (if possible)
4. Contact provider support (usually very responsive)
