/**
 * JWT Service for token generation and validation.
 */
const jwt = require('jsonwebtoken');

class JWTService {
  constructor() {
    this.secretKey = process.env.JWT_SECRET || process.env.SECRET_KEY || 'dev-secret-key-change-in-production';
    this.accessTokenExpiry = '24h'; // Extended from 1h for better UX
    this.refreshTokenExpiry = '7d';
  }

  /**
   * Generate an access token for a user.
   */
  generateToken(userId) {
    return jwt.sign(
      { user_id: userId, type: 'access' },
      this.secretKey,
      { expiresIn: this.accessTokenExpiry }
    );
  }

  /**
   * Generate a refresh token for a user.
   */
  generateRefreshToken(userId) {
    return jwt.sign(
      { user_id: userId, type: 'refresh' },
      this.secretKey,
      { expiresIn: this.refreshTokenExpiry }
    );
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
   * Refresh an access token using a refresh token.
   */
  refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.secretKey);
      if (decoded.type !== 'refresh') {
        return { success: false, error: 'Invalid refresh token' };
      }
      const newAccessToken = this.generateToken(decoded.user_id);
      return { success: true, accessToken: newAccessToken };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { success: false, error: 'Refresh token expired' };
      }
      return { success: false, error: 'Invalid refresh token' };
    }
  }
}

module.exports = new JWTService();
