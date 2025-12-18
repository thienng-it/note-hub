/**
 * Email Service using Mailjet API.
 * Handles sending emails for password reset and other notifications.
 * Implements graceful degradation when Mailjet is not configured.
 */

import Mailjet from 'node-mailjet';
import logger from '../config/logger.js';

class EmailService {
  constructor() {
    this.isConfigured = false;
    this.mailjetClient = null;
    this.senderEmail = process.env.MAILJET_SENDER_EMAIL || 'noreply@example.com';
    this.senderName = process.env.MAILJET_SENDER_NAME || 'NoteHub';

    // Initialize Mailjet if API keys are provided
    if (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) {
      try {
        this.mailjetClient = Mailjet.apiConnect(
          process.env.MAILJET_API_KEY,
          process.env.MAILJET_SECRET_KEY,
        );
        this.isConfigured = true;
        logger.info('[EMAIL] Mailjet service initialized successfully');
      } catch (error) {
        logger.error('[EMAIL] Failed to initialize Mailjet:', error);
        this.isConfigured = false;
      }
    } else {
      logger.warn(
        '[EMAIL] Mailjet not configured - emails will be logged to console only. Set MAILJET_API_KEY and MAILJET_SECRET_KEY to enable email sending.',
      );
    }
  }

  /**
   * Check if email service is configured and ready to use.
   */
  isEnabled() {
    return this.isConfigured;
  }

  /**
   * Send password reset email.
   * @param {string} to - Recipient email address
   * @param {string} username - Username for personalization
   * @param {string} resetToken - Password reset token
   * @param {string} resetUrl - Full URL for password reset (optional)
   */
  async sendPasswordResetEmail(to, username, resetToken, resetUrl = null) {
    const subject = 'Password Reset Request - NoteHub';

    // Construct reset URL if not provided
    const fullResetUrl =
      resetUrl ||
      `${process.env.VITE_API_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const textContent = `
Hello ${username},

You recently requested to reset your password for your NoteHub account.

Reset Token: ${resetToken}

You can also use this link to reset your password:
${fullResetUrl}

This token will expire in 1 hour for security reasons.

If you did not request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
The NoteHub Team
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .token-box { background: white; padding: 15px; border-radius: 6px; border: 2px dashed #667eea; margin: 20px 0; font-family: monospace; font-size: 16px; text-align: center; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${username}</strong>,</p>
      <p>You recently requested to reset your password for your NoteHub account.</p>
      
      <p><strong>Your Reset Token:</strong></p>
      <div class="token-box">${resetToken}</div>
      
      <p>You can also click the button below to reset your password:</p>
      <p style="text-align: center;">
        <a href="${fullResetUrl}" class="button">Reset Password</a>
      </p>
      
      <p style="color: #d97706; margin-top: 20px;">⚠️ This token will expire in <strong>1 hour</strong> for security reasons.</p>
      
      <p style="margin-top: 30px;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      
      <div class="footer">
        <p>Best regards,<br>The NoteHub Team</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to,
      subject,
      textContent,
      htmlContent,
    });
  }

  /**
   * Send email using Mailjet API or log to console if not configured.
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.textContent - Plain text content
   * @param {string} options.htmlContent - HTML content
   */
  async sendEmail({ to, subject, textContent, htmlContent }) {
    if (!to) {
      throw new Error('Recipient email address is required');
    }

    // If Mailjet is not configured, log to console
    if (!this.isConfigured) {
      logger.info('[EMAIL] Mailjet not configured - logging email to console:');
      logger.info(`[EMAIL] To: ${to}`);
      logger.info(`[EMAIL] Subject: ${subject}`);
      logger.info(`[EMAIL] Content:\n${textContent}`);
      return {
        success: true,
        message: 'Email logged to console (Mailjet not configured)',
      };
    }

    try {
      const request = this.mailjetClient.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: this.senderEmail,
              Name: this.senderName,
            },
            To: [
              {
                Email: to,
              },
            ],
            Subject: subject,
            TextPart: textContent,
            HTMLPart: htmlContent,
          },
        ],
      });

      const result = await request;

      logger.info(`[EMAIL] Successfully sent email to ${to} via Mailjet`);

      return {
        success: true,
        message: 'Email sent successfully',
        messageId: result.body?.Messages?.[0]?.To?.[0]?.MessageID,
      };
    } catch (error) {
      logger.error('[EMAIL] Failed to send email via Mailjet:', error);

      // Log email details for debugging
      logger.error(`[EMAIL] Failed email - To: ${to}, Subject: ${subject}`);

      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }
}

// Export singleton instance
export default new EmailService();
