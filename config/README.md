# Configuration Directory

This directory contains configuration files and environment examples for NoteHub.

## Files

- `.env.example` - Example environment variables for local development

## Deployment

NoteHub now uses **Fly.io** for deployment. Configuration files:

- `fly.toml` - Fly.io configuration (in project root)
- `Dockerfile` - Multi-stage Docker build (in project root)

See the deployment guide: [Fly.io Deployment Guide](../docs/guides/FLY_IO_DEPLOYMENT.md)

## Usage

1. Copy `.env.example` to `.env` in the project root:

   ```bash
   cp config/.env.example .env
   ```

2. Update the `.env` file with your actual configuration values.

## Legacy Configurations

Previous deployment configurations (Netlify, Render, Heroku) have been deprecated in favor of Fly.io. If you need to use these platforms, refer to the git history.

- Never commit `.env` files with sensitive data to version control
- The `.env.example` file should be kept up-to-date with all required environment variables
- Deployment files are kept in this folder for better organization while maintaining compatibility through symlinks
