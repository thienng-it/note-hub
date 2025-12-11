/**
 * Passkey (WebAuthn) Authentication Routes.
 */
import express from 'express';

const router = express.Router();

import logger from '../config/logger.js';
import { jwtRequired } from '../middleware/auth.js';
import AuthService from '../services/authService.js';
import { getAndRemoveChallenge, storeChallenge } from '../services/challengeStorage.js';
import jwtService from '../services/jwtService.js';
import PasskeyService from '../services/passkeyService.js';
import * as responseHandler from '../utils/responseHandler.js';

/**
 * GET /api/auth/passkey/status - Check if passkey authentication is enabled
 */
router.get('/status', (_req, res) => {
  return responseHandler.success(res, {
    enabled: PasskeyService.isEnabled(),
  });
});

/**
 * POST /api/auth/passkey/register-options - Generate registration options
 * Requires authentication - user must be logged in to add a passkey.
 */
router.post('/register-options', jwtRequired, async (req, res) => {
  try {
    if (!PasskeyService.isEnabled()) {
      return responseHandler.error(res, 'Passkey authentication not configured', {
        statusCode: 503,
        errorCode: 'PASSKEY_NOT_CONFIGURED',
      });
    }

    const options = await PasskeyService.generateRegistrationOptions(req.userId, req.user.username);

    // Store challenge for verification
    const challengeKey = `reg_${req.userId}_${Date.now()}`;
    await storeChallenge(challengeKey, options.challenge);

    return responseHandler.success(res, {
      options,
      challengeKey,
    });
  } catch (error) {
    logger.error('Passkey registration options error', {
      error: error.message,
      stack: error.stack,
    });
    return responseHandler.error(res, 'Failed to generate registration options', {
      statusCode: 500,
      errorCode: 'REGISTRATION_OPTIONS_ERROR',
    });
  }
});

/**
 * POST /api/auth/passkey/register-verify - Verify and store passkey registration
 */
router.post('/register-verify', jwtRequired, async (req, res) => {
  try {
    const { response, challengeKey, deviceName } = req.body;

    if (!response || !challengeKey) {
      return responseHandler.validationError(res, {
        message: 'Response and challenge key required',
      });
    }

    // Retrieve challenge
    const expectedChallenge = await getAndRemoveChallenge(challengeKey);
    if (!expectedChallenge) {
      return responseHandler.error(res, 'Invalid or expired challenge', {
        statusCode: 400,
        errorCode: 'INVALID_CHALLENGE',
      });
    }

    // Verify registration
    const result = await PasskeyService.verifyRegistration(
      req.userId,
      response,
      expectedChallenge,
      deviceName,
    );

    if (!result.success) {
      return responseHandler.error(res, result.error || 'Registration verification failed', {
        statusCode: 400,
        errorCode: 'VERIFICATION_FAILED',
      });
    }

    // Log security event
    logger.security('Passkey registered', { userId: req.userId });

    return responseHandler.success(res, {
      message: 'Passkey registered successfully',
    });
  } catch (error) {
    logger.error('Passkey registration verification error', {
      error: error.message,
      stack: error.stack,
    });
    return responseHandler.error(res, 'Registration verification failed', {
      statusCode: 500,
      errorCode: 'REGISTRATION_VERIFICATION_ERROR',
    });
  }
});

/**
 * POST /api/auth/passkey/login-options - Generate authentication options
 * Public endpoint - allows passkey-only login.
 */
router.post('/login-options', async (req, res) => {
  try {
    if (!PasskeyService.isEnabled()) {
      return responseHandler.error(res, 'Passkey authentication not configured', {
        statusCode: 503,
        errorCode: 'PASSKEY_NOT_CONFIGURED',
      });
    }

    const { username } = req.body;

    const options = await PasskeyService.generateAuthenticationOptions(username);

    // Store challenge for verification
    const challengeKey = `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await storeChallenge(challengeKey, options.challenge);

    return responseHandler.success(res, {
      options,
      challengeKey,
    });
  } catch (error) {
    logger.error('Passkey authentication options error', {
      error: error.message,
      stack: error.stack,
    });
    return responseHandler.error(res, 'Failed to generate authentication options', {
      statusCode: 500,
      errorCode: 'AUTHENTICATION_OPTIONS_ERROR',
    });
  }
});

/**
 * POST /api/auth/passkey/login-verify - Verify passkey and login
 */
router.post('/login-verify', async (req, res) => {
  try {
    const { response, challengeKey } = req.body;

    if (!response || !challengeKey) {
      return responseHandler.validationError(res, {
        message: 'Response and challenge key required',
      });
    }

    // Retrieve challenge
    const expectedChallenge = await getAndRemoveChallenge(challengeKey);
    if (!expectedChallenge) {
      return responseHandler.error(res, 'Invalid or expired challenge', {
        statusCode: 400,
        errorCode: 'INVALID_CHALLENGE',
      });
    }

    // Verify authentication
    const result = await PasskeyService.verifyAuthentication(response, expectedChallenge);

    if (!result.success) {
      return responseHandler.error(res, result.error || 'Authentication verification failed', {
        statusCode: 401,
        errorCode: 'VERIFICATION_FAILED',
      });
    }

    const user = result.user;

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

    // Log security event
    logger.auth('Passkey login', user.id, { username: user.username, method: 'passkey' });

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
          has_2fa: !!user.totp_secret,
          auth_method: 'passkey',
        },
      },
      { message: 'Login successful' },
    );
  } catch (error) {
    logger.error('Passkey authentication verification error', {
      error: error.message,
      stack: error.stack,
    });
    return responseHandler.error(res, 'Authentication verification failed', {
      statusCode: 500,
      errorCode: 'AUTHENTICATION_VERIFICATION_ERROR',
    });
  }
});

/**
 * GET /api/auth/passkey/credentials - List user's registered passkeys
 */
router.get('/credentials', jwtRequired, async (req, res) => {
  try {
    const credentials = await PasskeyService.getUserCredentials(req.userId);
    return responseHandler.success(res, { credentials });
  } catch (error) {
    logger.error('Get credentials error', { error: error.message, stack: error.stack });
    return responseHandler.error(res, 'Failed to retrieve credentials', {
      statusCode: 500,
      errorCode: 'GET_CREDENTIALS_ERROR',
    });
  }
});

/**
 * DELETE /api/auth/passkey/credentials/:id - Delete a passkey
 */
router.delete('/credentials/:id', jwtRequired, async (req, res) => {
  try {
    const credentialId = parseInt(req.params.id, 10);

    if (Number.isNaN(credentialId)) {
      return responseHandler.validationError(res, {
        message: 'Invalid credential ID',
      });
    }

    const deleted = await PasskeyService.deleteCredential(req.userId, credentialId);

    if (!deleted) {
      return responseHandler.error(res, 'Credential not found', {
        statusCode: 404,
        errorCode: 'CREDENTIAL_NOT_FOUND',
      });
    }

    // Log security event
    logger.security('Passkey deleted', { userId: req.userId, credentialId });

    return responseHandler.success(res, {
      message: 'Passkey deleted successfully',
    });
  } catch (error) {
    logger.error('Delete credential error', { error: error.message, stack: error.stack });
    return responseHandler.error(res, 'Failed to delete credential', {
      statusCode: 500,
      errorCode: 'DELETE_CREDENTIAL_ERROR',
    });
  }
});

/**
 * PATCH /api/auth/passkey/credentials/:id - Update passkey device name
 */
router.patch('/credentials/:id', jwtRequired, async (req, res) => {
  try {
    const credentialId = parseInt(req.params.id, 10);
    const { deviceName } = req.body;

    if (Number.isNaN(credentialId)) {
      return responseHandler.validationError(res, {
        message: 'Invalid credential ID',
      });
    }

    if (!deviceName || typeof deviceName !== 'string') {
      return responseHandler.validationError(res, {
        message: 'Device name required',
      });
    }

    const updated = await PasskeyService.updateCredentialName(req.userId, credentialId, deviceName);

    if (!updated) {
      return responseHandler.error(res, 'Credential not found', {
        statusCode: 404,
        errorCode: 'CREDENTIAL_NOT_FOUND',
      });
    }

    return responseHandler.success(res, {
      message: 'Passkey updated successfully',
    });
  } catch (error) {
    logger.error('Update credential error', { error: error.message, stack: error.stack });
    return responseHandler.error(res, 'Failed to update credential', {
      statusCode: 500,
      errorCode: 'UPDATE_CREDENTIAL_ERROR',
    });
  }
});

export default router;
