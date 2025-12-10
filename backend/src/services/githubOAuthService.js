/**
 * GitHub OAuth Service for user authentication.
 * Handles GitHub OAuth 2.0 flow for user login and registration.
 */
const axios = require('axios');
const crypto = require('node:crypto');
const db = require('../config/database');

class GitHubOAuthService {
  /**
   * Check if GitHub OAuth is configured and enabled.
   */
  static isEnabled() {
    return !!(
      process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET &&
      process.env.GITHUB_REDIRECT_URI
    );
  }

  /**
   * Get GitHub OAuth configuration status.
   */
  static getStatus() {
    return {
      enabled: this.isEnabled(),
      client_id: process.env.GITHUB_CLIENT_ID || null,
      redirect_uri: process.env.GITHUB_REDIRECT_URI || null,
    };
  }

  /**
   * Generate GitHub OAuth authorization URL.
   * @param {string} state - CSRF protection state token
   * @returns {string} Authorization URL
   */
  static getAuthorizationUrl(state) {
    if (!this.isEnabled()) {
      throw new Error('GitHub OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: process.env.GITHUB_REDIRECT_URI,
      scope: 'read:user user:email',
      state: state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token.
   * @param {string} code - Authorization code from GitHub
   * @returns {Promise<string>} Access token
   */
  static async exchangeCodeForToken(code) {
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          redirect_uri: process.env.GITHUB_REDIRECT_URI,
          code: code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (response.data.error) {
        throw new Error(response.data.error_description || response.data.error);
      }

      return response.data.access_token;
    } catch (error) {
      console.error('GitHub token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Get user information from GitHub API.
   * @param {string} accessToken - GitHub access token
   * @returns {Promise<Object>} User profile information
   */
  static async getUserProfile(accessToken) {
    try {
      const [userResponse, emailsResponse] = await Promise.all([
        axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
        axios.get('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
      ]);

      const user = userResponse.data;
      const emails = emailsResponse.data;

      // Get primary verified email
      const primaryEmail = emails.find((e) => e.primary && e.verified);
      const email = primaryEmail ? primaryEmail.email : user.email;

      return {
        github_id: user.id.toString(),
        username: user.login,
        email: email,
        name: user.name,
        avatar_url: user.avatar_url,
        bio: user.bio,
      };
    } catch (error) {
      console.error('GitHub API error:', error.response?.data || error.message);
      throw new Error('Failed to fetch user profile from GitHub');
    }
  }

  /**
   * Find or create user from GitHub profile.
   * @param {Object} githubProfile - GitHub user profile
   * @returns {Promise<Object>} User object
   */
  static async findOrCreateUser(githubProfile) {
    const { github_id, username, email, name, bio } = githubProfile;

    // Check if user already exists with this GitHub ID
    let user = await db.queryOne(
      `SELECT * FROM users WHERE username = ? OR email = ?`,
      [username, email],
    );

    if (user) {
      // User exists, return it
      return user;
    }

    // Check if username is taken (should be unique)
    const existingUsername = await db.queryOne(
      `SELECT id FROM users WHERE username = ?`,
      [username],
    );

    // Generate unique username if taken
    let finalUsername = username;
    if (existingUsername) {
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      finalUsername = `${username}_${randomSuffix}`;
    }

    // Create new user with random password (they'll use GitHub OAuth to login)
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(randomPassword, 14);

    const result = await db.run(
      `INSERT INTO users (username, password_hash, email, bio, preferred_language) VALUES (?, ?, ?, ?, ?)`,
      [finalUsername, passwordHash, email, bio || null, 'en'],
    );

    // Fetch and return the created user
    user = await db.queryOne(`SELECT * FROM users WHERE id = ?`, [result.insertId]);

    console.log(`[GitHub OAuth] Created new user: ${finalUsername} (GitHub ID: ${github_id})`);

    return user;
  }

  /**
   * Complete GitHub OAuth flow.
   * @param {string} code - Authorization code
   * @param {string} state - CSRF protection state
   * @returns {Promise<Object>} User object
   */
  static async authenticateUser(code) {
    if (!this.isEnabled()) {
      throw new Error('GitHub OAuth is not configured');
    }

    // Exchange code for access token
    const accessToken = await this.exchangeCodeForToken(code);

    // Get user profile from GitHub
    const githubProfile = await this.getUserProfile(accessToken);

    // Find or create user in database
    const user = await this.findOrCreateUser(githubProfile);

    return user;
  }
}

module.exports = GitHubOAuthService;
