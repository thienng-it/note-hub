/**
 * Authentication Routes.
 */
const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');
const jwtService = require('../services/jwtService');
const googleOAuthService = require('../services/googleOAuthService');
const { jwtRequired } = require('../middleware/auth');
const responseHandler = require('../utils/responseHandler');
const {
  validateRequiredFields,
  sanitizeStrings,
  validateEmail,
  validateLength,
} = require('../middleware/validation');
const db = require('../config/database');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const crypto = require('node:crypto');

/**
 * POST /api/auth/login - User login
 */
router.post('/login', sanitizeStrings(['username', 'password']), async (req, res) => {
  try {
    const { username, password, totp_code } = req.body;

    if (!username || !password) {
      return responseHandler.validationError(res, {
        missingFields: ['username', 'password'],
        message: 'Username/email and password required',
      });
    }

    const user = await AuthService.authenticateUser(username, password);

    if (!user) {
      return responseHandler.unauthorized(res, 'Invalid credentials');
    }

    // Check 2FA if enabled
    if (user.totp_secret && !totp_code) {
      return responseHandler.error(res, '2FA code required', {
        statusCode: 401,
        errorCode: 'REQUIRES_2FA',
        details: { requires_2fa: true },
      });
    }

    if (user.totp_secret) {
      const isValidTotp = authenticator.verify({ token: totp_code, secret: user.totp_secret });
      if (!isValidTotp) {
        return responseHandler.unauthorized(res, 'Invalid 2FA code');
      }
    }

    // Generate tokens with rotation
    const accessToken = jwtService.generateToken(user.id);
    const { token: refreshToken, tokenId } = jwtService.generateRefreshToken(user.id);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const deviceInfo = req.headers['user-agent'] || null;
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    await jwtService.storeRefreshToken(
      user.id,
      tokenId,
      expiresAt.toISOString(),
      deviceInfo,
      ipAddress,
    );

    // Update last login
    await AuthService.updateLastLogin(user.id);

    return responseHandler.success(
      res,
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 86400, // 24 hours
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          preferred_language: user.preferred_language || 'en',
          has_2fa: !!user.totp_secret,
        },
      },
      { message: 'Login successful' },
    );
  } catch (error) {
    console.error('Login error:', error);
    return responseHandler.error(res, 'Internal server error', {
      statusCode: 500,
      errorCode: 'LOGIN_ERROR',
    });
  }
});

/**
 * POST /api/auth/register - User registration
 */
router.post(
  '/register',
  sanitizeStrings(['username', 'password', 'email']),
  validateRequiredFields(['username', 'password']),
  validateLength('username', { min: 3, max: 50 }),
  validateEmail('email'),
  async (req, res) => {
    try {
      const { username, password, email, invite_token } = req.body;

      const result = await AuthService.registerUser(username, password, email, invite_token);

      if (!result.success) {
        return responseHandler.validationError(res, {
          message: result.error,
        });
      }

      return responseHandler.created(
        res,
        {
          user: result.user,
        },
        'Registration successful',
      );
    } catch (error) {
      console.error('Registration error:', error);
      return responseHandler.error(res, 'Internal server error', {
        statusCode: 500,
        errorCode: 'REGISTRATION_ERROR',
      });
    }
  },
);

/**
 * POST /api/auth/refresh - Refresh access token with rotation
 */
router.post('/refresh', validateRequiredFields(['refresh_token']), async (req, res) => {
  const { refresh_token } = req.body;
  const deviceInfo = req.headers['user-agent'] || null;
  const ipAddress = req.ip || req.connection.remoteAddress || null;

  const result = await jwtService.refreshAccessToken(refresh_token, deviceInfo, ipAddress);

  if (!result.success) {
    return responseHandler.unauthorized(res, result.error);
  }

  const response = {
    access_token: result.accessToken,
    token_type: 'Bearer',
    expires_in: 86400, // 24 hours
  };

  // Include new refresh token if rotation occurred
  if (result.rotated && result.refreshToken) {
    response.refresh_token = result.refreshToken;
  }

  return responseHandler.success(res, response, {
    message: 'Token refreshed successfully',
  });
});

/**
 * GET /api/auth/validate - Validate JWT token and return user info
 */
router.get('/validate', jwtRequired, (req, res) => {
  return responseHandler.success(
    res,
    {
      valid: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        bio: req.user.bio,
        theme: req.user.theme,
        preferred_language: req.user.preferred_language || 'en',
        has_2fa: !!req.user.totp_secret,
        created_at: req.user.created_at,
      },
    },
    { message: 'Token is valid' },
  );
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

    const user = await db.queryOne(`SELECT * FROM users WHERE username = ?`, [username]);

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
      token, // Only for development - remove in production
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
      qr_code: qrCodeDataUrl.split(',')[1], // Remove data:image/png;base64, prefix
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

    await db.run(`UPDATE users SET totp_secret = ? WHERE id = ?`, [secret, req.userId]);

    res.json({
      message: '2FA enabled successfully',
      has_2fa: true,
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/2fa/disable - Disable 2FA
 * No OTP code required - user is already authenticated via JWT.
 * Security: JWT token proves user identity, no need for additional 2FA verification.
 */
router.post('/2fa/disable', jwtRequired, async (req, res) => {
  try {
    if (!req.user.totp_secret) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    // Disable 2FA without requiring OTP code
    await db.run(`UPDATE users SET totp_secret = NULL WHERE id = ?`, [req.userId]);

    // Log security event
    // TODO: Consider using a proper logging framework (winston, pino) in production
    console.log(`[SECURITY] 2FA disabled by user ID: ${req.userId}`);

    res.json({
      message: '2FA disabled successfully',
      has_2fa: false,
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/google - Get Google OAuth URL
 */
router.get('/google', (_req, res) => {
  try {
    if (!googleOAuthService.isEnabled()) {
      return res.status(503).json({ error: 'Google OAuth not configured' });
    }

    const authUrl = googleOAuthService.getAuthUrl();
    res.json({ auth_url: authUrl });
  } catch (error) {
    console.error('Google OAuth URL error:', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

/**
 * POST /api/auth/google/callback - Handle Google OAuth callback
 */
router.post('/google/callback', async (req, res) => {
  try {
    const { code, id_token } = req.body;

    if (!code && !id_token) {
      return res.status(400).json({ error: 'Authorization code or ID token required' });
    }

    if (!googleOAuthService.isEnabled()) {
      return res.status(503).json({ error: 'Google OAuth not configured' });
    }

    let googleUser;

    // Method 1: Using authorization code
    if (code) {
      const tokens = await googleOAuthService.getTokens(code);
      googleUser = await googleOAuthService.getUserInfo(tokens.access_token);
    }
    // Method 2: Using ID token (for frontend flow)
    else if (id_token) {
      googleUser = await googleOAuthService.verifyIdToken(id_token);
    }

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({ error: 'Failed to get user information from Google' });
    }

    if (!googleUser.verified_email) {
      return res.status(400).json({ error: 'Google email not verified' });
    }

    // Check if user exists by email
    let user = await db.queryOne(`SELECT * FROM users WHERE email = ?`, [googleUser.email]);

    if (!user) {
      // Create new user with Google account
      // Generate username from email
      let username = googleUser.email.split('@')[0];

      // Check if username exists, add random suffix if needed
      const existingUser = await db.queryOne(`SELECT id FROM users WHERE username = ?`, [username]);

      if (existingUser) {
        username = `${username}_${crypto.randomBytes(4).toString('hex')}`;
      }

      // Create user without password (Google OAuth users)
      // Password hash set to a random unguessable value
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await AuthService.hashPassword(randomPassword);

      const result = await db.run(
        `INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)`,
        [username, passwordHash, googleUser.email],
      );

      user = await db.queryOne(`SELECT * FROM users WHERE id = ?`, [result.insertId]);

      console.log(`[AUTH] New user created via Google OAuth: ${username} (${googleUser.email})`);
    } else {
      console.log(`[AUTH] User logged in via Google OAuth: ${user.username} (${googleUser.email})`);
    }

    // Generate tokens with rotation (no 2FA for Google OAuth users)
    const accessToken = jwtService.generateToken(user.id);
    const { token: refreshToken, tokenId } = jwtService.generateRefreshToken(user.id);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const deviceInfo = req.headers['user-agent'] || null;
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    await jwtService.storeRefreshToken(
      user.id,
      tokenId,
      expiresAt.toISOString(),
      deviceInfo,
      ipAddress,
    );

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
        preferred_language: user.preferred_language || 'en',
        has_2fa: !!user.totp_secret,
        auth_method: 'google',
      },
    });
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * GET /api/auth/google/status - Check if Google OAuth is configured
 */
router.get('/google/status', (_req, res) => {
  res.json({
    enabled: googleOAuthService.isEnabled(),
  });
});

/**
 * GitHub OAuth Routes
 */
const githubOAuthService = require('../services/githubOAuthService');

/**
 * GET /api/auth/github/status - Check if GitHub OAuth is configured
 */
router.get('/github/status', (_req, res) => {
  res.json({
    enabled: githubOAuthService.isEnabled(),
  });
});

/**
 * GET /api/auth/github - Get GitHub OAuth authorization URL
 */
router.get('/github', (_req, res) => {
  try {
    if (!githubOAuthService.isEnabled()) {
      return res.status(503).json({ error: 'GitHub OAuth not configured' });
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(16).toString('hex');
    
    // In production, store state in session or database for validation
    // For now, we'll return it to be sent back by the client
    const authUrl = githubOAuthService.getAuthorizationUrl(state);
    
    res.json({ 
      auth_url: authUrl,
      state: state 
    });
  } catch (error) {
    console.error('GitHub OAuth URL error:', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

/**
 * POST /api/auth/github/callback - Handle GitHub OAuth callback
 */
router.post('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    if (!githubOAuthService.isEnabled()) {
      return res.status(503).json({ error: 'GitHub OAuth not configured' });
    }

    // Authenticate user with GitHub
    const user = await githubOAuthService.authenticateUser(code);

    if (!user) {
      return res.status(400).json({ error: 'Failed to authenticate with GitHub' });
    }

    // Check if account is locked
    if (user.is_locked) {
      return res.status(403).json({ error: 'Account is locked. Please contact an administrator.' });
    }

    // Generate tokens (no 2FA check for OAuth users)
    const accessToken = jwtService.generateToken(user.id);
    const { token: refreshToken, tokenId } = jwtService.generateRefreshToken(user.id);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const deviceInfo = req.headers['user-agent'] || null;
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    await jwtService.storeRefreshToken(
      user.id,
      tokenId,
      expiresAt.toISOString(),
      deviceInfo,
      ipAddress,
    );

    // Update last login
    await AuthService.updateLastLogin(user.id);

    console.log(`[AUTH] User logged in via GitHub OAuth: ${user.username}`);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 86400,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        preferred_language: user.preferred_language || 'en',
        has_2fa: !!user.totp_secret,
        auth_method: 'github',
      },
    });
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    res.status(500).json({ error: error.message || 'Authentication failed' });
  }
});

/**
 * POST /api/auth/logout - Logout and revoke refresh token
 */
router.post('/logout', jwtRequired, async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (refresh_token) {
      // Decode to get token ID
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.decode(refresh_token);
        if (decoded?.jti) {
          await jwtService.revokeRefreshToken(decoded.jti);
        }
      } catch (_error) {
        // Invalid token, ignore
      }
    }

    return responseHandler.success(res, {
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return responseHandler.error(res, 'Internal server error', {
      statusCode: 500,
      errorCode: 'LOGOUT_ERROR',
    });
  }
});

/**
 * POST /api/auth/logout-all - Logout from all devices
 */
router.post('/logout-all', jwtRequired, async (req, res) => {
  try {
    await jwtService.revokeAllUserTokens(req.userId);

    return responseHandler.success(res, {
      message: 'Logged out from all devices successfully',
    });
  } catch (error) {
    console.error('Logout all error:', error);
    return responseHandler.error(res, 'Internal server error', {
      statusCode: 500,
      errorCode: 'LOGOUT_ALL_ERROR',
    });
  }
});

/**
 * GET /api/auth/sessions - Get active sessions
 */
router.get('/sessions', jwtRequired, async (req, res) => {
  try {
    const result = await jwtService.getUserTokens(req.userId);

    if (!result.success) {
      return responseHandler.error(res, 'Failed to retrieve sessions', {
        statusCode: 500,
        errorCode: 'SESSIONS_ERROR',
      });
    }

    return responseHandler.success(res, {
      sessions: result.tokens,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return responseHandler.error(res, 'Internal server error', {
      statusCode: 500,
      errorCode: 'SESSIONS_ERROR',
    });
  }
});

module.exports = router;
