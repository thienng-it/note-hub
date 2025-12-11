/**
 * Authentication Service for user management.
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import db from '../config/database.js';

export default class AuthService {
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
   * Hash a password using bcrypt with strengthened work factor.
   * Uses 14 rounds (increased from 12) for better security against brute-force attacks.
   * Estimated time: ~200ms per hash (acceptable for authentication).
   */
  static async hashPassword(password) {
    const saltRounds = 14; // Increased from 12 for better security
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Check if password hash needs rehashing (older hash with lower work factor).
   */
  static needsRehash(hash) {
    try {
      // Extract rounds from bcrypt hash (format: $2b$rounds$salt+hash)
      const rounds = parseInt(hash.split('$')[2], 10);
      return rounds < 14;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Verify a password against a hash.
   */
  static async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Authenticate a user by username/email and password.
   * Automatically rehashes password if using old work factor.
   * Handles case-insensitive and whitespace-trimmed comparison.
   */
  static async authenticateUser(usernameOrEmail, password) {
    // Trim whitespace from input
    const trimmedInput = usernameOrEmail.trim();

    // Query with case-insensitive comparison (COLLATE NOCASE for SQLite, LOWER() for MySQL)
    const user = await db.queryOne(
      `SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(?) OR LOWER(TRIM(email)) = LOWER(?)`,
      [trimmedInput, trimmedInput],
    );

    if (!user) {
      return null;
    }

    // Check if account is locked
    if (user.is_locked) {
      return null; // Return null for locked accounts (same as invalid credentials)
    }

    const isValid = await AuthService.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    // Opportunistic rehashing: upgrade hash if using old work factor
    // Note: Runs asynchronously during login. Adds ~200ms but acceptable tradeoff.
    // TODO: Consider using a proper logging framework (winston, pino) in production
    if (AuthService.needsRehash(user.password_hash)) {
      console.log(`[SECURITY] Upgrading password hash for user ID: ${user.id}`);
      const newHash = await AuthService.hashPassword(password);
      await db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, user.id]);
      user.password_hash = newHash;
    }

    return user;
  }

  /**
   * Register a new user.
   */
  static async registerUser(username, password, email = null, inviteToken = null) {
    // Validate password
    const validation = AuthService.validatePassword(password);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check if username exists (case-insensitive and trimmed)
    const trimmedUsername = username.trim();
    const existingUser = await db.queryOne(
      `SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(?)`,
      [trimmedUsername],
    );
    if (existingUser) {
      return { success: false, error: 'Username already exists' };
    }

    // Check invitation token if provided
    if (inviteToken) {
      const invitation = await db.queryOne(
        `SELECT * FROM invitations WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
        [inviteToken],
      );
      if (!invitation) {
        return { success: false, error: 'Invalid or expired invitation' };
      }
    }

    // Hash password and create user (store trimmed username/email)
    const passwordHash = await AuthService.hashPassword(password);
    const trimmedEmail = email ? email.trim() : null;
    const result = await db.run(
      `INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)`,
      [trimmedUsername, passwordHash, trimmedEmail],
    );

    // Mark invitation as used
    if (inviteToken) {
      await db.run(`UPDATE invitations SET used = 1, used_by_id = ? WHERE token = ?`, [
        result.insertId,
        inviteToken,
      ]);
    }

    const newUser = await db.queryOne(
      `SELECT id, username, email, created_at FROM users WHERE id = ?`,
      [result.insertId],
    );

    return { success: true, user: newUser };
  }

  /**
   * Update user's last login timestamp.
   */
  static async updateLastLogin(userId) {
    await db.run(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [userId]);
  }

  /**
   * Generate a password reset token.
   */
  static async generateResetToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens
    await db.run(`UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0`, [
      userId,
    ]);

    await db.run(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
      [userId, token, expiresAt.toISOString()],
    );

    return token;
  }

  /**
   * Reset password using a token.
   */
  static async resetPassword(token, newPassword) {
    // Validate password
    const validation = AuthService.validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const resetToken = await db.queryOne(
      `SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
      [token],
    );

    if (!resetToken) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    const passwordHash = await AuthService.hashPassword(newPassword);

    await db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [
      passwordHash,
      resetToken.user_id,
    ]);

    await db.run(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`, [resetToken.id]);

    return { success: true };
  }

  /**
   * Change user password (requires current password).
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await db.queryOne(`SELECT * FROM users WHERE id = ?`, [userId]);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const isValid = await AuthService.verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    const validation = AuthService.validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const passwordHash = await AuthService.hashPassword(newPassword);
    await db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, userId]);

    return { success: true };
  }
}
