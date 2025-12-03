/**
 * Authentication Routes.
 */
const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');
const jwtService = require('../services/jwtService');
const { jwtRequired } = require('../middleware/auth');
const db = require('../config/database');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

/**
 * POST /api/auth/login - User login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password, totp_code } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username/email and password required' });
    }

    const user = await AuthService.authenticateUser(username, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check 2FA if enabled
    if (user.totp_secret && !totp_code) {
      return res.status(401).json({ error: '2FA code required', requires_2fa: true });
    }

    if (user.totp_secret) {
      const isValidTotp = authenticator.verify({ token: totp_code, secret: user.totp_secret });
      if (!isValidTotp) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    // Generate tokens
    const accessToken = jwtService.generateToken(user.id);
    const refreshToken = jwtService.generateRefreshToken(user.id);

    // Update last login
    await AuthService.updateLastLogin(user.id);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        has_2fa: !!user.totp_secret
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/register - User registration
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, invite_token } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const result = await AuthService.registerUser(username, password, email, invite_token);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      message: 'Registration successful',
      user: result.user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/refresh - Refresh access token
 */
router.post('/refresh', (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  const result = jwtService.refreshAccessToken(refresh_token);

  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  res.json({
    access_token: result.accessToken,
    token_type: 'Bearer',
    expires_in: 86400 // 24 hours
  });
});

/**
 * GET /api/auth/validate - Validate JWT token and return user info
 */
router.get('/validate', jwtRequired, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      bio: req.user.bio,
      theme: req.user.theme,
      has_2fa: !!req.user.totp_secret,
      created_at: req.user.created_at
    }
  });
});

/**
 * POST /api/auth/forgot-password - Request password reset
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const user = await db.queryOne(
      `SELECT * FROM users WHERE username = ?`,
      [username]
    );

    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If the account exists, a reset token has been generated' });
    }

    // Check if 2FA is required
    if (user.totp_secret) {
      return res.json({ requires_2fa: true, user_id: user.id });
    }

    const token = await AuthService.generateResetToken(user.id);

    // In production, this would be sent via email
    console.log(`[SECURITY] Password reset token for '${user.username}': ${token}`);

    res.json({
      message: 'Reset token generated',
      token // Only for development - remove in production
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/reset-password - Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' });
    }

    const result = await AuthService.resetPassword(token, password);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/change-password - Change password (authenticated)
 */
router.post('/change-password', jwtRequired, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    const result = await AuthService.changePassword(req.userId, current_password, new_password);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/2fa/setup - Get 2FA setup QR code
 */
router.get('/2fa/setup', jwtRequired, async (req, res) => {
  try {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user.username, 'NoteHub', secret);
    
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    res.json({
      secret,
      qr_code: qrCodeDataUrl.split(',')[1] // Remove data:image/png;base64, prefix
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/2fa/enable - Enable 2FA
 */
router.post('/2fa/enable', jwtRequired, async (req, res) => {
  try {
    const { secret, totp_code } = req.body;

    if (!secret || !totp_code) {
      return res.status(400).json({ error: 'Secret and TOTP code required' });
    }

    const isValid = authenticator.verify({ token: totp_code, secret });
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await db.run(
      `UPDATE users SET totp_secret = ? WHERE id = ?`,
      [secret, req.userId]
    );

    res.json({ 
      message: '2FA enabled successfully',
      has_2fa: true
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/2fa/disable - Disable 2FA
 */
router.post('/2fa/disable', jwtRequired, async (req, res) => {
  try {
    const { totp_code } = req.body;

    if (!req.user.totp_secret) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    if (!totp_code) {
      return res.status(400).json({ error: 'TOTP code required' });
    }

    const isValid = authenticator.verify({ token: totp_code, secret: req.user.totp_secret });
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }

    await db.run(
      `UPDATE users SET totp_secret = NULL WHERE id = ?`,
      [req.userId]
    );

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
