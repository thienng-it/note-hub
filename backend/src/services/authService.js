/**
 * Authentication Service for user management.
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Invitation, PasswordResetToken } = require('../models');

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
    const { Op } = require('../models');
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: usernameOrEmail },
          { email: usernameOrEmail }
        ]
      }
    });

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
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return { success: false, error: 'Username already exists' };
    }

    // Check invitation token if provided
    if (inviteToken) {
      const invitation = await Invitation.findOne({
        where: {
          token: inviteToken,
          used: false
        }
      });
      
      if (!invitation || new Date(invitation.expires_at) < new Date()) {
        return { success: false, error: 'Invalid or expired invitation' };
      }
    }

    // Hash password and create user
    const passwordHash = await this.hashPassword(password);
    const newUser = await User.create({
      username,
      password_hash: passwordHash,
      email
    });

    // Mark invitation as used
    if (inviteToken) {
      await Invitation.update(
        { used: true, used_by_id: newUser.id },
        { where: { token: inviteToken } }
      );
    }

    return {
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        created_at: newUser.created_at
      }
    };
  }

  /**
   * Update user's last login timestamp.
   */
  static async updateLastLogin(userId) {
    await User.update(
      { last_login: new Date() },
      { where: { id: userId } }
    );
  }

  /**
   * Generate a password reset token.
   */
  static async generateResetToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens
    await PasswordResetToken.update(
      { used: true },
      { where: { user_id: userId, used: false } }
    );

    await PasswordResetToken.create({
      user_id: userId,
      token,
      expires_at: expiresAt
    });

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

    const resetToken = await PasswordResetToken.findOne({
      where: {
        token,
        used: false
      }
    });

    if (!resetToken || new Date(resetToken.expires_at) < new Date()) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    const passwordHash = await this.hashPassword(newPassword);

    await User.update(
      { password_hash: passwordHash },
      { where: { id: resetToken.user_id } }
    );

    await PasswordResetToken.update(
      { used: true },
      { where: { id: resetToken.id } }
    );

    return { success: true };
  }

  /**
   * Change user password (requires current password).
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findOne({ where: { id: userId } });

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
    await User.update(
      { password_hash: passwordHash },
      { where: { id: userId } }
    );

    return { success: true };
  }
}

module.exports = AuthService;
