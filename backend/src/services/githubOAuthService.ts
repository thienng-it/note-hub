/**
 * GitHub OAuth Service for user authentication.
 * Handles GitHub OAuth 2.0 flow for user login and registration.
 */

import crypto from 'node:crypto';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import db from '../config/database';
import type { User } from '../types';

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility?: string;
}

interface GitHubProfile {
  github_id: string;
  username: string;
  email: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
}

interface OAuthStatus {
  enabled: boolean;
  client_id: string | null;
  redirect_uri: string | null;
}

class GitHubOAuthService {
  /**
   * Check if GitHub OAuth is configured and enabled.
   */
  static isEnabled(): boolean {
    return !!(
      process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET &&
      process.env.GITHUB_REDIRECT_URI
    );
  }

  /**
   * Get GitHub OAuth configuration status.
   */
  static getStatus(): OAuthStatus {
    return {
      enabled: GitHubOAuthService.isEnabled(),
      client_id: process.env.GITHUB_CLIENT_ID || null,
      redirect_uri: process.env.GITHUB_REDIRECT_URI || null,
    };
  }

  /**
   * Generate GitHub OAuth authorization URL.
   */
  static getAuthorizationUrl(state: string): string {
    if (!GitHubOAuthService.isEnabled()) {
      throw new Error('GitHub OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri: process.env.GITHUB_REDIRECT_URI!,
      scope: 'read:user user:email',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token.
   */
  static async exchangeCodeForToken(code: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          redirect_uri: process.env.GITHUB_REDIRECT_URI,
          code,
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
    } catch (error: any) {
      console.error('GitHub token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Get user information from GitHub API.
   */
  static async getUserProfile(accessToken: string): Promise<GitHubProfile> {
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
      const emails: GitHubEmail[] = emailsResponse.data;

      // Get primary verified email
      const primaryEmail = emails.find((e) => e.primary && e.verified);
      const email = primaryEmail ? primaryEmail.email : user.email;

      return {
        github_id: user.id.toString(),
        username: user.login,
        email,
        name: user.name,
        avatar_url: user.avatar_url,
        bio: user.bio,
      };
    } catch (error: any) {
      console.error('GitHub API error:', error.response?.data || error.message);
      throw new Error('Failed to fetch user profile from GitHub');
    }
  }

  /**
   * Find or create user from GitHub profile.
   */
  static async findOrCreateUser(githubProfile: GitHubProfile): Promise<User> {
    const { github_id, username, email, bio } = githubProfile;

    // Check if user already exists with this GitHub ID
    let user = await db.queryOne<User>(`SELECT * FROM users WHERE username = ? OR email = ?`, [
      username,
      email,
    ]);

    if (user) {
      // User exists, return it
      return user;
    }

    // Check if username is taken (should be unique)
    let finalUsername = username;
    let existingUsername = await db.queryOne<{ id: number }>(
      `SELECT id FROM users WHERE username = ?`,
      [finalUsername],
    );

    // Generate unique username if taken (try up to 5 times)
    let attempts = 0;
    while (existingUsername && attempts < 5) {
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      finalUsername = `${username}_${randomSuffix}`;
      existingUsername = await db.queryOne<{ id: number }>(
        `SELECT id FROM users WHERE username = ?`,
        [finalUsername],
      );
      attempts++;
    }

    // If still conflicting after 5 attempts, use timestamp as last resort
    if (existingUsername) {
      finalUsername = `${username}_${Date.now()}`;
    }

    // Create new user with random password (they'll use GitHub OAuth to login)
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 14);

    const result = await db.run(
      `INSERT INTO users (username, password_hash, email, bio, preferred_language) VALUES (?, ?, ?, ?, ?)`,
      [finalUsername, passwordHash, email, bio || null, 'en'],
    );

    // Fetch and return the created user
    user = await db.queryOne<User>(`SELECT * FROM users WHERE id = ?`, [result.insertId as number]);

    if (!user) {
      throw new Error('Failed to create user');
    }

    console.log(`[GitHub OAuth] Created new user: ${finalUsername} (GitHub ID: ${github_id})`);

    return user;
  }

  /**
   * Complete GitHub OAuth flow.
   *
   * TODO: Implement proper state validation for CSRF protection in production
   * - Store state in session or Redis with expiration
   * - Validate state parameter matches stored value
   * - Clear state after validation
   */
  static async authenticateUser(code: string): Promise<User> {
    if (!GitHubOAuthService.isEnabled()) {
      throw new Error('GitHub OAuth is not configured');
    }

    // Exchange code for access token
    const accessToken = await GitHubOAuthService.exchangeCodeForToken(code);

    // Get user profile from GitHub
    const githubProfile = await GitHubOAuthService.getUserProfile(accessToken);

    // Find or create user in database
    const user = await GitHubOAuthService.findOrCreateUser(githubProfile);

    return user;
  }
}

export default GitHubOAuthService;
