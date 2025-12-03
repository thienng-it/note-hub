/**
 * Authentication Service for user management.
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');

class AuthService {
  /**
   * Password policy enforcement.
   */
  static validatePassword(password) {
    if (!password || password.length < 12) {
      return { valid: false, error: 'Password must be at least 12 characters long' };
    }
    
    // Check for mixed character types
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasUpper || !hasLower || !hasNumber) {
      return { valid: false, error: 'Password must contain uppercase, lowercase, and numbers' };
    }
    
    return { valid: true };
  }

  /**
   * Hash a password using bcrypt.
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against a hash.
   */
  static async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Authenticate a user by username/email and password.
   */
  static async authenticateUser(usernameOrEmail, password) {
    const user = await db.queryOne(
      `SELECT * FROM users WHERE username = ? OR email = ?`,
      [usernameOrEmail, usernameOrEmail]
    );

    if (!user) {
      return null;
    }

    const isValid = await this.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  /**
   * Register a new user.
   */
  static async registerUser(username, password, email = null, inviteToken = null) {
    // Validate password
    const validation = this.validatePassword(password);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check if username exists
    const existingUser = await db.queryOne(
      `SELECT id FROM users WHERE username = ?`,
      [username]
    );
    if (existingUser) {
      return { success: false, error: 'Username already exists' };
    }

    // Check invitation token if provided
    if (inviteToken) {
      const invitation = await db.queryOne(
        `SELECT * FROM invitations WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
        [inviteToken]
      );
      if (!invitation) {
        return { success: false, error: 'Invalid or expired invitation' };
      }
    }

    // Hash password and create user
    const passwordHash = await this.hashPassword(password);
    const result = await db.run(
      `INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)`,
      [username, passwordHash, email]
    );

    // Mark invitation as used
    if (inviteToken) {
      await db.run(
        `UPDATE invitations SET used = 1, used_by_id = ? WHERE token = ?`,
        [result.insertId, inviteToken]
      );
    }

    const newUser = await db.queryOne(
      `SELECT id, username, email, created_at FROM users WHERE id = ?`,
      [result.insertId]
    );

    return { success: true, user: newUser };
  }

  /**
   * Update user's last login timestamp.
   */
  static async updateLastLogin(userId) {
    await db.run(
      `UPDATE users SET last_login = datetime('now') WHERE id = ?`,
      [userId]
    );
  }

  /**
   * Generate a password reset token.
   */
  static async generateResetToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens
    await db.run(
      `UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0`,
      [userId]
    );

    await db.run(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
      [userId, token, expiresAt.toISOString()]
    );

    return token;
  }

  /**
   * Reset password using a token.
   */
  static async resetPassword(token, newPassword) {
    // Validate password
    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const resetToken = await db.queryOne(
      `SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
      [token]
    );

    if (!resetToken) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    const passwordHash = await this.hashPassword(newPassword);

    await db.run(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [passwordHash, resetToken.user_id]
    );

    await db.run(
      `UPDATE password_reset_tokens SET used = 1 WHERE id = ?`,
      [resetToken.id]
    );

    return { success: true };
  }

  /**
   * Change user password (requires current password).
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await db.queryOne(
      `SELECT * FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const isValid = await this.verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const passwordHash = await this.hashPassword(newPassword);
    await db.run(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [passwordHash, userId]
    );

    return { success: true };
  }
}

module.exports = AuthService;
