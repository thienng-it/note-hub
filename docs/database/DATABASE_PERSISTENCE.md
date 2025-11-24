# Database Persistence and Deployment

## Overview

This document explains how the Note Hub application handles database initialization and persistence across deployments.

## Database Initialization

The application uses SQLAlchemy's `create_all()` method with `checkfirst=True` to initialize the database schema:

```python
Base.metadata.create_all(_engine, checkfirst=True)
```

**Important:** This method **DOES NOT** drop existing tables or data. It only creates tables that don't already exist. Your data is safe during application restarts and deployments.

## How It Works

1. **On First Deployment**: Tables are created if they don't exist
2. **On Subsequent Deployments**: Existing tables are detected and preserved
3. **On Application Restart**: Database connection is re-established, but no data is lost

## Data Persistence

Your data persists across:
- ✅ Application restarts
- ✅ Code deployments
- ✅ Server restarts (as long as the database service is running)
- ✅ Configuration changes

Your data does NOT persist if:
- ❌ The external database service is deleted or reset
- ❌ Database credentials change (points to a different database)
- ❌ You manually drop tables using SQL commands

## External Database Configuration

For production deployments on platforms like Render, you should use an external MySQL database:

### Recommended Providers

1. **PlanetScale** (Free tier available)
   - Excellent performance
   - Built-in branching
   - See: `deployment_guides/PLANETSCALE_SETUP_CHECKLIST.txt`

2. **Aiven** (Free tier available)
   - Good reliability
   - Multiple cloud providers
   - See: `deployment_guides/AIVEN_SETUP_CHECKLIST.txt`

3. **Railway** (Pay as you go)
   - Simple setup
   - Good for small projects

4. **AWS RDS** (Enterprise)
   - Highly reliable
   - Advanced features
   - Higher cost

### Configuration Steps

1. Create an external MySQL database with your chosen provider
2. Set these environment variables in your deployment platform:
   ```bash
   MYSQL_HOST=your-database-host.com
   MYSQL_PORT=3306
   MYSQL_USER=your-username
   MYSQL_PASSWORD=your-password
   MYSQL_DATABASE=your-database-name
   ```

3. Deploy your application
4. The application will automatically:
   - Connect to the external database
   - Create tables if they don't exist
   - Preserve existing data

## Database Schema Updates

When you update the codebase and deploy new versions:

1. **New columns**: The `migrate_database()` function in `services/bootstrap.py` automatically adds new columns to existing tables
2. **New tables**: Automatically created on next deployment
3. **Existing data**: Preserved during migrations

## Troubleshooting

### Issue: Data appears to be lost after deployment

**Likely causes:**
1. Database URL changed (pointing to a different database)
2. External database service was reset or deleted
3. Database credentials were rotated without updating environment variables

**Solution:**
- Verify your environment variables are correct
- Check that MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE are set correctly
- Ensure the external database service is running

### Issue: "Table already exists" errors

**Cause:** Rare race condition during concurrent deployments

**Solution:**
- This is handled gracefully by the application
- The error is logged but doesn't affect functionality
- No action needed

### Issue: Connection timeout or "Too many connections"

**Cause:** Database connection pool exhausted

**Solution:**
- Check connection pool settings in `database.py`
- Default settings: `pool_size=10`, `max_overflow=20`
- For high-traffic applications, consider upgrading your database plan

## Best Practices

1. **Always use external database in production**: Don't rely on ephemeral storage
2. **Regular backups**: Set up automated backups with your database provider
3. **Monitor connections**: Keep an eye on database connection metrics
4. **Test deployments**: Use a staging environment to test deployments before production
5. **Database credentials**: Store in environment variables, never in code

## Migration Strategy

The application uses a lightweight migration system:

1. **Automatic column additions**: New columns are automatically added to existing tables
2. **No data loss**: Migrations preserve all existing data
3. **Backward compatible**: Old code continues to work during deployments

For complex schema changes (renaming columns, changing types), you may need to:
1. Create a custom migration script
2. Test in staging environment
3. Apply to production during low-traffic period

## Support

For issues related to database persistence:
1. Check application logs for database connection errors
2. Verify environment variables are set correctly
3. Consult your database provider's documentation
4. Open an issue on GitHub with relevant logs
