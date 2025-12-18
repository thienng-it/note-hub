# Mailjet Email Service Setup Guide

This guide explains how to set up Mailjet for sending password reset emails and other notifications in NoteHub.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Configuration](#configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Email Templates](#email-templates)

## Overview

NoteHub uses Mailjet API to send transactional emails, including:
- Password reset emails with secure tokens
- Account notifications (future)
- System alerts (future)

The email service implements **graceful degradation**:
- When Mailjet is configured: Sends emails via Mailjet API
- When Mailjet is not configured: Logs emails to console (development mode)

## Prerequisites

1. **Mailjet Account**: Free account available at [https://www.mailjet.com/](https://www.mailjet.com/)
2. **Verified Sender**: At least one verified sender email address
3. **API Credentials**: API Key and Secret Key from Mailjet dashboard

## Setup Instructions

### Step 1: Create Mailjet Account

1. Go to [https://www.mailjet.com/](https://www.mailjet.com/)
2. Click "Sign Up" and create a free account
3. Verify your email address
4. Complete the account setup

### Step 2: Get API Credentials

1. Log in to Mailjet dashboard
2. Navigate to **Account Settings** → **REST API** → **API Key Management (Primary and Sub-account)**
3. You'll see your credentials:
   - **API Key** (Public key)
   - **Secret Key** (Private key - click "View" to reveal)
4. Copy both keys for the next step

### Step 3: Verify Sender Email

To send emails, you must verify your sender email address:

1. In Mailjet dashboard, go to **Account Settings** → **Sender addresses & domains**
2. Click **Add a Sender Address**
3. Enter your email address (e.g., `noreply@yourdomain.com`)
4. Click **Send Validation Email**
5. Check your inbox and click the verification link
6. Wait for verification to complete (usually instant)

**Note**: For production use, consider verifying your entire domain for better deliverability.

### Step 4: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Mailjet Configuration
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_SECRET_KEY=your-mailjet-secret-key
MAILJET_SENDER_EMAIL=noreply@yourdomain.com
MAILJET_SENDER_NAME=NoteHub
```

**Important**:
- Replace `your-mailjet-api-key` with your actual API key
- Replace `your-mailjet-secret-key` with your actual secret key
- Use your verified sender email for `MAILJET_SENDER_EMAIL`
- `MAILJET_SENDER_NAME` is optional (defaults to "NoteHub")

### Step 5: Restart Application

After adding the environment variables:

```bash
# If using Docker
docker compose restart backend

# If running locally
npm run dev  # or restart your process
```

## Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MAILJET_API_KEY` | Yes | Mailjet API Key (public) | `abc123...` |
| `MAILJET_SECRET_KEY` | Yes | Mailjet Secret Key (private) | `def456...` |
| `MAILJET_SENDER_EMAIL` | Yes | Verified sender email address | `noreply@yourdomain.com` |
| `MAILJET_SENDER_NAME` | No | Sender name in "From" field | `NoteHub` |

### Development Mode

If Mailjet is not configured (missing API keys), the email service automatically operates in development mode:
- Emails are logged to console instead of being sent
- Password reset tokens are visible in logs
- No actual emails are sent

This is useful for:
- Local development without Mailjet account
- Testing without sending real emails
- Debugging email content

## Testing

### Test Password Reset Email

1. **Trigger Password Reset**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser"}'
   ```

2. **Check Logs**:
   - If Mailjet is configured: Look for `[EMAIL] Successfully sent email to...`
   - If not configured: Look for email content in console logs

3. **Check Email Inbox**:
   - If Mailjet is configured, check the inbox of the user's registered email
   - Email should arrive within seconds

### Verify Email Delivery

Check Mailjet dashboard for email statistics:
1. Go to **Statistics** → **Real-time**
2. View sent, delivered, opened, and clicked metrics
3. Check for any errors or bounces

## Troubleshooting

### Common Issues

#### 1. "Failed to send email via Mailjet"

**Possible causes**:
- Invalid API credentials
- Sender email not verified
- Rate limits exceeded
- Mailjet service issues

**Solutions**:
```bash
# Check logs for detailed error
docker compose logs backend | grep EMAIL

# Verify API credentials
echo $MAILJET_API_KEY
echo $MAILJET_SECRET_KEY

# Test API credentials with curl
curl -X GET https://api.mailjet.com/v3/REST/contact \
  -u "$MAILJET_API_KEY:$MAILJET_SECRET_KEY"
```

#### 2. "Sender email not verified"

**Solution**:
- Go to Mailjet dashboard → Sender addresses
- Verify your sender email
- Wait for verification to complete
- Update `MAILJET_SENDER_EMAIL` in `.env`

#### 3. User doesn't have email on file

**Expected behavior**:
- System still returns success message (to prevent user enumeration)
- Log message: `Password reset requested for user 'X' but no email on file`
- No email is sent

**Solution**:
- User needs to add email to their profile
- Or admin can add email via admin dashboard

#### 4. Emails going to spam

**Solutions**:
- Verify entire domain (not just email address)
- Set up SPF, DKIM, and DMARC records
- Use consistent sender name and email
- Follow Mailjet's deliverability best practices

#### 5. Rate limiting

Mailjet free tier limits:
- 200 emails/day
- 6,000 emails/month

**Solutions**:
- Upgrade to paid plan for higher limits
- Implement email queuing for high-volume scenarios
- Use batch sending for multiple recipients

### Debugging

Enable detailed logging:

```javascript
// In backend/src/services/emailService.js
// Already implemented - check logs for:
logger.info('[EMAIL] Mailjet service initialized successfully');
logger.info('[EMAIL] Successfully sent email to...');
logger.error('[EMAIL] Failed to send email via Mailjet:', error);
```

Check Mailjet API status:
- [https://status.mailjet.com/](https://status.mailjet.com/)

## Email Templates

### Password Reset Email

The password reset email includes:
- Personalized greeting with username
- Secure reset token (also provided as plain text)
- Clickable reset link button
- Expiration notice (1 hour)
- Professional HTML design with NoteHub branding

**Template location**: `backend/src/services/emailService.js` → `sendPasswordResetEmail()`

### Customizing Templates

To customize email templates:

1. Edit `backend/src/services/emailService.js`
2. Modify the `htmlContent` and `textContent` in the respective method
3. Test with sample data
4. Ensure both HTML and plain text versions are updated

**Best practices**:
- Keep both HTML and plain text versions
- Use inline CSS for HTML emails
- Test with multiple email clients
- Keep design simple and responsive
- Include plain text fallback

## Security Considerations

1. **Environment Variables**: Never commit API keys to version control
2. **User Enumeration**: System doesn't reveal if user exists
3. **Token Expiration**: Reset tokens expire after 1 hour
4. **Rate Limiting**: Consider implementing rate limiting for forgot-password endpoint
5. **Sender Verification**: Always use verified sender addresses
6. **HTTPS**: Use HTTPS for reset links in production

## Production Checklist

Before deploying to production:

- [ ] Mailjet account created and verified
- [ ] Sender email/domain verified
- [ ] API credentials added to `.env`
- [ ] Environment variables secured (not in version control)
- [ ] Test password reset flow end-to-end
- [ ] Verify emails arrive in inbox (not spam)
- [ ] Check email design on multiple clients
- [ ] Set up SPF, DKIM, DMARC records
- [ ] Monitor Mailjet dashboard for delivery rates
- [ ] Configure alerts for email failures
- [ ] Review rate limits and upgrade plan if needed

## Additional Resources

- [Mailjet Documentation](https://dev.mailjet.com/)
- [Mailjet Node.js Library](https://github.com/mailjet/mailjet-apiv3-nodejs)
- [Email Best Practices](https://www.mailjet.com/blog/news/email-best-practices/)
- [Deliverability Guide](https://www.mailjet.com/email-deliverability/)

## Support

For issues related to:
- **NoteHub integration**: Check application logs and this documentation
- **Mailjet service**: Contact [Mailjet Support](https://www.mailjet.com/support/)
- **Email deliverability**: Review Mailjet's deliverability documentation

---

**Last Updated**: December 2024  
**NoteHub Version**: 1.7.5+
