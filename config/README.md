# Configuration Files

This directory contains all configuration files for deployment and environment setup.

## Files

### Deployment Configuration

- **`Procfile`** - Heroku/Railway deployment configuration
- **`render.yaml`** - Render.com deployment configuration
- **`netlify.toml`** - Netlify serverless deployment configuration
- **`runtime.txt`** - Python runtime version specification

### Environment Configuration

- **`.env.example`** - Example environment variables template

## Usage

1. Copy `.env.example` to `.env` in the project root:

   ```bash
   cp config/.env.example .env
   ```

2. Update the `.env` file with your actual configuration values.

3. The deployment configuration files are symlinked to the root directory as deployment platforms expect them there.

## Notes

- Never commit `.env` files with sensitive data to version control
- The `.env.example` file should be kept up-to-date with all required environment variables
- Deployment files are kept in this folder for better organization while maintaining compatibility through symlinks
