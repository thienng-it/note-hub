# Setting Up Drone CI Deployment Secrets

This guide explains how to configure the required secrets for automated deployment.

## Overview

The automated deployment requires three secrets to be configured in Drone CI:

1. **production_host** - The IP address or domain of your production server
2. **production_username** - The SSH username for connecting to the server
3. **production_ssh_key** - The private SSH key for authentication

## Step-by-Step Setup

### Step 1: Access Drone CI

1. Open your browser and navigate to your Drone CI instance:
   ```
   http://your-server:8080
   ```

2. Sign in with your GitHub account

3. Navigate to the NoteHub repository

### Step 2: Generate SSH Key (If You Don't Have One)

On your local machine or a secure machine:

```bash
# Generate a new SSH key specifically for deployment
ssh-keygen -t ed25519 -C "drone-deploy" -f ~/.ssh/drone-deploy

# This creates two files:
# - ~/.ssh/drone-deploy (private key - keep this secure!)
# - ~/.ssh/drone-deploy.pub (public key)
```

### Step 3: Add Public Key to Production Server

Copy the public key to your production server:

```bash
# Option 1: Using ssh-copy-id (easiest)
ssh-copy-id -i ~/.ssh/drone-deploy.pub user@your-server

# Option 2: Manual copy
cat ~/.ssh/drone-deploy.pub
# Copy the output

# Then on your production server:
ssh user@your-server
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste the public key, save and exit
chmod 600 ~/.ssh/authorized_keys
```

### Step 4: Test SSH Connection

Verify that you can connect using the key:

```bash
ssh -i ~/.ssh/drone-deploy user@your-server

# If successful, you should be logged into your server
# Type 'exit' to disconnect
```

### Step 5: Add Secrets to Drone CI

#### 5.1: Navigate to Repository Settings

1. In Drone CI, click on your **note-hub** repository
2. Click **Settings** in the top menu
3. Click **Secrets** in the left sidebar

#### 5.2: Add production_host Secret

1. Click **New Secret**
2. Enter the following:
   - **Name**: `production_host`
   - **Value**: Your server's IP address or domain (e.g., `123.45.67.89` or `notes.example.com`)
   - **Allow Pull Requests**: Leave unchecked (for security)
3. Click **Create**

#### 5.3: Add production_username Secret

1. Click **New Secret**
2. Enter the following:
   - **Name**: `production_username`
   - **Value**: SSH username (e.g., `root`, `deploy`, or your username)
   - **Allow Pull Requests**: Leave unchecked (for security)
3. Click **Create**

#### 5.4: Add production_ssh_key Secret

1. Display your private key:
   ```bash
   cat ~/.ssh/drone-deploy
   ```

2. Copy the **entire output**, including:
   ```
   -----BEGIN OPENSSH PRIVATE KEY-----
   b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtz...
   ... (many lines) ...
   ... (entire key content) ...
   -----END OPENSSH PRIVATE KEY-----
   ```

3. In Drone CI, click **New Secret**
4. Enter the following:
   - **Name**: `production_ssh_key`
   - **Value**: Paste the entire private key (including BEGIN and END lines)
   - **Allow Pull Requests**: Leave unchecked (for security)
5. Click **Create**

### Step 6: Verify Secrets Configuration

You should now see three secrets in your Drone CI repository settings:

```
✓ production_host
✓ production_username
✓ production_ssh_key
```

**Important**: The secret values are hidden after creation. You won't be able to view them again, only update or delete them.

## Testing the Deployment

### Manual Test via Drone CLI (Optional)

If you have Drone CLI installed, you can trigger a deployment manually:

```bash
# Trigger a build manually
drone build create --branch main thienng-it/note-hub
```

### Test via Git Push

1. Make a small change to your repository
2. Commit and push to the main branch:
   ```bash
   git add .
   git commit -m "test: trigger deployment"
   git push origin main
   ```

3. Watch the build in Drone CI:
   - Go to http://your-server:8080
   - Click on your repository
   - You should see a new build starting
   - Watch the `deploy-production` step

### Expected Build Flow

```
1. backend-lint          ✓ Pass
2. backend-test          ✓ Pass
3. frontend-lint         ✓ Pass
4. frontend-type-check   ✓ Pass
5. frontend-test         ✓ Pass
6. frontend-build        ✓ Pass
7. deploy-production     ✓ Pass  ← Deployment step
```

## Troubleshooting

### Secret Not Working

**Problem**: Build fails with "permission denied" or "invalid key"

**Solutions**:

1. **Verify SSH key format**:
   ```bash
   # Your private key should look like:
   cat ~/.ssh/drone-deploy
   -----BEGIN OPENSSH PRIVATE KEY-----
   # ... key content ...
   -----END OPENSSH PRIVATE KEY-----
   ```

2. **Ensure you copied the entire key**:
   - Include the BEGIN and END lines
   - No extra spaces or line breaks
   - All lines included

3. **Test SSH connection manually**:
   ```bash
   ssh -i ~/.ssh/drone-deploy user@your-server
   ```

### Wrong Username or Host

**Problem**: Build fails with "connection refused" or "no route to host"

**Solutions**:

1. **Verify production_host**:
   ```bash
   # Test connection
   ping your-server-ip
   
   # Try SSH
   ssh user@your-server-ip
   ```

2. **Verify production_username**:
   ```bash
   # Check if user exists on server
   ssh user@your-server
   ```

3. **Update secrets in Drone CI**:
   - Delete the incorrect secret
   - Create a new one with the correct value

### Deployment Script Not Found

**Problem**: Build fails with "scripts/deploy.sh: not found"

**Solution**:

Ensure the deployment script exists in your repository:

```bash
# On your local machine
ls -l scripts/deploy.sh

# Should show:
-rwxr-xr-x  1 user  staff  7033 Dec 12 10:00 scripts/deploy.sh

# If not found, the script is in the latest commit
git pull origin main
```

### Permission Denied on Script

**Problem**: Build fails with "permission denied: ./scripts/deploy.sh"

**Solution**:

The deployment script includes `chmod +x scripts/deploy.sh` to make it executable. If this still fails:

```bash
# SSH to your production server
ssh user@your-server

# Make the script executable
cd /opt/note-hub
chmod +x scripts/deploy.sh
ls -l scripts/deploy.sh
```

## Security Best Practices

### 1. Protect Your Private Key

- **Never** commit your private key to Git
- Store it securely on your local machine
- Use a passphrase for extra security (optional)
- Only share it through secure channels (Drone secrets)

### 2. Limit SSH Access

Create a dedicated deployment user with limited permissions:

```bash
# On production server
sudo adduser deploy
sudo usermod -aG docker deploy

# Add SSH key for deploy user
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy nano /home/deploy/.ssh/authorized_keys
# Paste the public key

# Update Drone secret
# production_username: deploy
```

### 3. Restrict SSH Access by IP

If your Drone server has a static IP, restrict SSH access:

```bash
# On production server
sudo ufw allow from <drone-server-ip> to any port 22
sudo ufw enable
```

### 4. Use SSH Key Passphrase

For extra security, generate a key with a passphrase:

```bash
ssh-keygen -t ed25519 -C "drone-deploy" -f ~/.ssh/drone-deploy
# Enter a passphrase when prompted
```

**Note**: If you use a passphrase, you'll need to use `ssh-agent` or configure Drone to handle it.

### 5. Rotate Keys Regularly

Change your SSH keys periodically:

```bash
# Generate new key
ssh-keygen -t ed25519 -C "drone-deploy-2024" -f ~/.ssh/drone-deploy-new

# Add to server
ssh-copy-id -i ~/.ssh/drone-deploy-new.pub user@your-server

# Update Drone secret with new private key

# Remove old key from server
ssh user@your-server
nano ~/.ssh/authorized_keys
# Delete the old key line
```

### 6. Monitor Deployment Logs

Review deployment logs regularly:

```bash
# In Drone CI, check build logs for:
- Successful connections
- Failed attempts
- Unusual activity
```

## Next Steps

After configuring secrets:

1. ✅ **Test the deployment** - Push a small change to main
2. ✅ **Monitor the build** - Watch it in Drone CI
3. ✅ **Verify deployment** - Check your production site
4. ✅ **Set up notifications** - Get alerts for deployments
5. ✅ **Document your setup** - Keep notes on configuration

## Additional Resources

- [DRONE_CI_DEPLOYMENT.md](DRONE_CI_DEPLOYMENT.md) - Complete deployment guide
- [DRONE_CI_DEPLOYMENT_QUICK.md](DRONE_CI_DEPLOYMENT_QUICK.md) - Quick setup guide
- [Drone Secrets Documentation](https://docs.drone.io/secret/)
- [SSH Key Management](https://www.ssh.com/academy/ssh/keygen)

## Getting Help

If you encounter issues:

1. Check deployment logs in Drone CI
2. SSH to your production server and check logs
3. Review the troubleshooting section above
4. Check Drone CI documentation
5. Open an issue on GitHub with:
   - Error message from Drone CI
   - Deployment script output (if available)
   - Your configuration (without secrets!)

---

**Last Updated**: December 2024
