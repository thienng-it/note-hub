# Deployment Guide for Note Hub

## Deploy to Netlify (Recommended)

Netlify hosts the Flask backend through **Netlify Functions** using `serverless-wsgi`. Every HTTP request is proxied to the serverless function described in `infra/netlify/functions/app.py` and orchestrated by `netlify.toml`.

### Step 1: Create Netlify Site

1. Install the CLI (optional but handy): `npm install -g netlify-cli`
2. Run `netlify init` inside the repo or connect the GitHub repo directly from the Netlify dashboard
3. When prompted for build settings, simply accept the defaults (the CLI/dashboard will read `netlify.toml`)

### Step 2: Configure Environment Variables

In Netlify → Site settings → Environment variables, add:

```
NOTES_ADMIN_USERNAME=admin
NOTES_ADMIN_PASSWORD=your-secure-password
FLASK_SECRET=your-secret-key-here
NOTES_DB_PATH=/tmp/notes.db
```

### Step 3: Enable Deploy Hooks (optional)

If you want GitHub Actions to trigger deployments, create a Build Hook (Site settings → Build & deploy → Build hooks) and copy the URL into the `NETLIFY_DEPLOY_HOOK` secret in GitHub.

### Step 4: Deploy

- **Manual:** `netlify deploy --prod`
- **Git-integrated:** Every push to `main` automatically triggers a build on Netlify
- **Via GitHub Action:** The `deploy-netlify.yml` workflow will POST to your build hook and Netlify will perform the deploy

Your app will be available at `https://<your-site>.netlify.app` once the first deploy succeeds.

## Local Deployment Notes

- Database will be created at specified `NOTES_DB_PATH`
- For production, consider using PostgreSQL instead of SQLite
- Always change default admin password
- Use strong `FLASK_SECRET` value

## Monitoring

After deployment:

1. Test login with your credentials
2. Create a test note
3. Verify all features work (search, tags, dark mode)
4. Check logs for any errors

Need help? Check the main [README.md](README.md)
