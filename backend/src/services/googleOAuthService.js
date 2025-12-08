/**
 * Google OAuth Service for Single Sign-On (SSO).
 * Handles Google OAuth 2.0 authentication flow.
 */
const { google } = require('googleapis');
const axios = require('axios');

class GoogleOAuthService {
  constructor() {
    this.oauth2Client = null;
    this.enabled = false;
    this.initializeClient();
  }

  /**
   * Initialize Google OAuth client.
   * Optional - app works without Google SSO if not configured.
   */
  initializeClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.log('⚠️  Google OAuth not configured - SSO disabled');
      this.enabled = false;
      return;
    }

    try {
      this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

      this.enabled = true;
      console.log('🔐 Google OAuth configured - SSO enabled');
    } catch (error) {
      console.error('⚠️  Google OAuth initialization failed:', error.message);
      this.enabled = false;
    }
  }

  /**
   * Get authorization URL for Google OAuth.
   */
  getAuthUrl() {
    if (!this.enabled || !this.oauth2Client) {
      throw new Error('Google OAuth not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  /**
   * Exchange authorization code for tokens.
   */
  async getTokens(code) {
    if (!this.enabled || !this.oauth2Client) {
      throw new Error('Google OAuth not configured');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Error getting tokens:', error.message);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Get user info from Google using access token.
   */
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture,
        verified_email: response.data.verified_email,
      };
    } catch (error) {
      console.error('Error getting user info:', error.message);
      throw new Error('Failed to get user information from Google');
    }
  }

  /**
   * Verify Google ID token (alternative method).
   */
  async verifyIdToken(idToken) {
    if (!this.enabled || !this.oauth2Client) {
      throw new Error('Google OAuth not configured');
    }

    try {
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        verified_email: payload.email_verified,
      };
    } catch (error) {
      console.error('Error verifying ID token:', error.message);
      throw new Error('Failed to verify Google ID token');
    }
  }

  /**
   * Check if Google OAuth is enabled.
   */
  isEnabled() {
    return this.enabled;
  }
}

// Singleton instance
const googleOAuthService = new GoogleOAuthService();

module.exports = googleOAuthService;
