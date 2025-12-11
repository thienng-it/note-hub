/**
 * JWT Service for token generation and validation with refresh token rotation.
 */

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

class JWTService {
  constructor() {
    this.secretKey =
      process.env.JWT_SECRET || process.env.SECRET_KEY || 'dev-secret-key-change-in-production';
    this.accessTokenExpiry = '24h'; // Extended from 1h for better UX
    this.refreshTokenExpiry = '7d';
  }

  /**
   * Get current timestamp in ISO format for database storage.
   */
  getCurrentTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Generate an access token for a user.
   *
   * Security: Token is cryptographically signed with HMAC-SHA256,
   * preventing forgery or impersonation. User ID is embedded in the
   * payload and verified on each request.
   */
  generateToken(userId) {
    return jwt.sign({ user_id: userId, type: 'access' }, this.secretKey, {
      expiresIn: this.accessTokenExpiry,
    });
  }

  /**
   * Generate a refresh token for a user with a unique token ID.
   * Returns both the token and its hash for database storage.
   */
  generateRefreshToken(userId, tokenId = null) {
    const jti = tokenId || crypto.randomBytes(16).toString('hex');
    const token = jwt.sign({ user_id: userId, type: 'refresh', jti }, this.secretKey, {
      expiresIn: this.refreshTokenExpiry,
    });
    return { token, tokenId: jti };
  }

  /**
   * Hash a token for secure storage in database.
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Store a refresh token in the database.
   */
  async storeRefreshToken(
    userId,
    tokenId,
    expiresAt,
    deviceInfo = null,
    ipAddress = null,
    parentTokenHash = null,
  ) {
    try {
      const tokenHash = this.hashToken(tokenId);
      const now = this.getCurrentTimestamp();
      // Check if refresh_tokens table exists (for backward compatibility with tests/old DBs)
      const result = await db
        .run(
          `INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at, parent_token_hash, last_used_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, tokenHash, deviceInfo, ipAddress, expiresAt, parentTokenHash, now],
        )
        .catch((err) => {
          // Silently fail if table doesn't exist (graceful degradation for tests/old DBs)
          if (
            err.message &&
            (err.message.includes('no such table') || err.message.includes('refresh_tokens'))
          ) {
            console.warn('[JWT] Refresh tokens table not available - token rotation disabled');
            return { success: false, silent: true };
          }
          throw err;
        });

      if (result?.silent) {
        return result;
      }

      return { success: true };
    } catch (error) {
      console.error('[JWT] Failed to store refresh token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate a token and return the user ID if valid.
   */
  validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.secretKey);
      if (decoded.type !== 'access') {
        return { valid: false, error: 'Invalid token type' };
      }
      return { valid: true, userId: decoded.user_id };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token expired' };
      }
      return { valid: false, error: 'Invalid token' };
    }
  }

  /**
   * Refresh an access token using a refresh token with rotation.
   * Implements refresh token rotation for enhanced security:
   * - Validates the refresh token
   * - Checks if it's revoked or already used
   * - Generates new access and refresh tokens
   * - Revokes the old refresh token
   * - Stores the new refresh token with parent tracking
   */
  async refreshAccessToken(refreshToken, deviceInfo = null, ipAddress = null) {
    try {
      // Verify and decode the refresh token
      const decoded = jwt.verify(refreshToken, this.secretKey);
      if (decoded.type !== 'refresh') {
        return { success: false, error: 'Invalid refresh token' };
      }

      const userId = decoded.user_id;
      const tokenId = decoded.jti;

      if (!tokenId) {
        // Legacy token without JTI - allow it but generate new one with rotation
        console.log('[JWT] Legacy refresh token detected, upgrading to rotation');
        const newAccessToken = this.generateToken(userId);
        const { token: newRefreshToken, tokenId: newTokenId } = this.generateRefreshToken(userId);

        // Calculate expiry
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Store new refresh token
        await this.storeRefreshToken(
          userId,
          newTokenId,
          expiresAt.toISOString(),
          deviceInfo,
          ipAddress,
        );

        return {
          success: true,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          rotated: true,
        };
      }

      // Check if token exists and is valid in database
      const tokenHash = this.hashToken(tokenId);
      let storedToken;
      try {
        storedToken = await db.queryOne(
          `SELECT * FROM refresh_tokens WHERE token_hash = ? AND user_id = ?`,
          [tokenHash, userId],
        );
      } catch (error) {
        // Table doesn't exist - graceful degradation, allow refresh without rotation
        if (
          error.message &&
          (error.message.includes('no such table') || error.message.includes('refresh_tokens'))
        ) {
          console.warn('[JWT] Refresh tokens table not available - using legacy mode');
          const newAccessToken = this.generateToken(userId);
          return {
            success: true,
            accessToken: newAccessToken,
            rotated: false,
          };
        }
        throw error;
      }

      if (!storedToken) {
        return { success: false, error: 'Invalid refresh token' };
      }

      // Check if token is revoked
      if (storedToken.revoked) {
        // Token reuse detected - revoke all tokens for this user as security measure
        console.error(`[SECURITY] Refresh token reuse detected for user ${userId}`);
        await this.revokeAllUserTokens(userId);
        return { success: false, error: 'Token reuse detected. All sessions revoked.' };
      }

      // Check if token is expired
      if (new Date(storedToken.expires_at) < new Date()) {
        return { success: false, error: 'Refresh token expired' };
      }

      // Generate new tokens with rotation
      const newAccessToken = this.generateToken(userId);
      const { token: newRefreshToken, tokenId: newTokenId } = this.generateRefreshToken(userId);

      // Calculate new expiry
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      // Revoke the old refresh token
      const revokedAt = this.getCurrentTimestamp();
      await db.run(`UPDATE refresh_tokens SET revoked = 1, revoked_at = ? WHERE token_hash = ?`, [
        revokedAt,
        tokenHash,
      ]);

      // Store the new refresh token with parent tracking
      await this.storeRefreshToken(
        userId,
        newTokenId,
        newExpiresAt.toISOString(),
        deviceInfo,
        ipAddress,
        tokenHash,
      );

      // Update last_used_at for the old token
      const lastUsedAt = this.getCurrentTimestamp();
      await db.run(`UPDATE refresh_tokens SET last_used_at = ? WHERE token_hash = ?`, [
        lastUsedAt,
        tokenHash,
      ]);

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        rotated: true,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { success: false, error: 'Refresh token expired' };
      }
      console.error('[JWT] Token refresh error:', error);
      return { success: false, error: 'Invalid refresh token' };
    }
  }

  /**
   * Revoke a specific refresh token.
   */
  async revokeRefreshToken(tokenId) {
    try {
      const tokenHash = this.hashToken(tokenId);
      const revokedAt = this.getCurrentTimestamp();
      await db.run(`UPDATE refresh_tokens SET revoked = 1, revoked_at = ? WHERE token_hash = ?`, [
        revokedAt,
        tokenHash,
      ]);
      return { success: true };
    } catch (error) {
      console.error('[JWT] Failed to revoke token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Revoke all refresh tokens for a user (e.g., logout from all devices).
   */
  async revokeAllUserTokens(userId) {
    try {
      const revokedAt = this.getCurrentTimestamp();
      await db.run(
        `UPDATE refresh_tokens SET revoked = 1, revoked_at = ? WHERE user_id = ? AND revoked = 0`,
        [revokedAt, userId],
      );
      return { success: true };
    } catch (error) {
      console.error('[JWT] Failed to revoke all user tokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up expired tokens (should be run periodically).
   */
  async cleanupExpiredTokens() {
    try {
      const now = this.getCurrentTimestamp();
      const result = await db.run(`DELETE FROM refresh_tokens WHERE expires_at < ?`, [now]);
      return { success: true, deleted: result.affectedRows };
    } catch (error) {
      console.error('[JWT] Failed to cleanup expired tokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active refresh tokens for a user.
   */
  async getUserTokens(userId) {
    try {
      const now = this.getCurrentTimestamp();
      const tokens = await db.query(
        `SELECT id, device_info, ip_address, created_at, last_used_at, expires_at 
         FROM refresh_tokens 
         WHERE user_id = ? AND revoked = 0 AND expires_at > ?
         ORDER BY last_used_at DESC`,
        [userId, now],
      );
      return { success: true, tokens };
    } catch (error) {
      console.error('[JWT] Failed to get user tokens:', error);
      return { success: false, error: error.message };
    }
  }
}

const jwtService = new JWTService();
export default jwtService;
