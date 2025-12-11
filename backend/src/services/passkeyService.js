/**
 * Passkey (WebAuthn) Service
 * Handles passkey registration and authentication using FIDO2/WebAuthn standards.
 */
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';

import db from '../config/database.js';

export default class PasskeyService {
  /**
   * Get the Relying Party configuration from environment.
   */
  static getRelyingPartyConfig() {
    const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
    const rpName = process.env.WEBAUTHN_RP_NAME || 'NoteHub';
    const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

    return { rpID, rpName, origin };
  }

  /**
   * Check if WebAuthn is properly configured.
   */
  static isEnabled() {
    // WebAuthn requires HTTPS in production, but works with localhost for dev
    const rpID = process.env.WEBAUTHN_RP_ID;
    return !!rpID || process.env.NODE_ENV === 'development';
  }

  /**
   * Generate registration options for a user to register a new passkey.
   */
  static async generateRegistrationOptions(userId, username) {
    const { rpName, rpID } = PasskeyService.getRelyingPartyConfig();

    // Get user's existing credentials to exclude them
    const existingCredentials = await db.query(
      `SELECT credential_id FROM webauthn_credentials WHERE user_id = ?`,
      [userId],
    );

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: isoUint8Array.fromUTF8String(userId.toString()),
      userName: username,
      attestationType: 'none',
      // In v13+, excludeCredentials expects id to be Base64URLString directly
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.credential_id, // Already Base64URL-encoded string
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        // No authenticatorAttachment specified - allows both platform and cross-platform authenticators
        // (e.g., Touch ID, Face ID, Windows Hello, Microsoft Authenticator, Apple Password)
      },
    });

    return options;
  }

  /**
   * Verify registration response and store the credential.
   */
  static async verifyRegistration(userId, response, expectedChallenge, deviceName = null) {
    const { rpID, origin } = PasskeyService.getRelyingPartyConfig();

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: 'Registration verification failed' };
    }

    // In @simplewebauthn/server v13+, the API changed to use a 'credential' object
    const { credential, aaguid } = verification.registrationInfo;

    // Store credential in database
    // credential.id is already a Base64URL-encoded string
    // credential.publicKey is a Uint8Array that needs to be converted to base64
    await db.run(
      `INSERT INTO webauthn_credentials (
        user_id, credential_id, public_key, counter, device_name, aaguid
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        credential.id, // Already Base64URL-encoded string
        Buffer.from(credential.publicKey).toString('base64'),
        credential.counter,
        deviceName,
        aaguid,
      ],
    );

    return { success: true };
  }

  /**
   * Generate authentication options for passkey login.
   */
  static async generateAuthenticationOptions(username = null) {
    const { rpID } = PasskeyService.getRelyingPartyConfig();

    let allowCredentials = [];

    // If username provided, get only their credentials
    if (username) {
      const trimmedUsername = username.trim();
      const user = await db.queryOne(
        `SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(?) OR LOWER(TRIM(email)) = LOWER(?)`,
        [trimmedUsername, trimmedUsername],
      );

      if (user) {
        const credentials = await db.query(
          `SELECT credential_id FROM webauthn_credentials WHERE user_id = ?`,
          [user.id],
        );
        // In v13+, allowCredentials expects id to be Base64URLString directly
        allowCredentials = credentials.map((cred) => ({
          id: cred.credential_id, // Already Base64URL-encoded string
          type: 'public-key',
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    });

    return options;
  }

  /**
   * Verify authentication response and return user if successful.
   */
  static async verifyAuthentication(response, expectedChallenge) {
    const { rpID, origin } = PasskeyService.getRelyingPartyConfig();

    // Find the credential
    // response.id is Base64URL-encoded, credential_id in DB is also Base64URL-encoded
    const credential = await db.queryOne(
      `SELECT * FROM webauthn_credentials WHERE credential_id = ?`,
      [response.id],
    );

    if (!credential) {
      return { success: false, error: 'Credential not found' };
    }

    // Get the user
    const user = await db.queryOne(`SELECT * FROM users WHERE id = ?`, [credential.user_id]);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // In @simplewebauthn/server v13+, the API changed to use 'credential' instead of 'authenticator'
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credential_id, // Base64URL-encoded string
        publicKey: Buffer.from(credential.public_key, 'base64'),
        counter: credential.counter,
      },
    });

    if (!verification.verified) {
      return { success: false, error: 'Authentication verification failed' };
    }

    // Update counter and last used timestamp
    await db.run(
      `UPDATE webauthn_credentials
       SET counter = ?, last_used_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [verification.authenticationInfo.newCounter, credential.id],
    );

    return { success: true, user };
  }

  /**
   * Get all credentials for a user.
   */
  static async getUserCredentials(userId) {
    const credentials = await db.query(
      `SELECT id, device_name, created_at, last_used_at, transports
       FROM webauthn_credentials
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId],
    );
    return credentials;
  }

  /**
   * Delete a credential.
   */
  static async deleteCredential(userId, credentialId) {
    const result = await db.run(`DELETE FROM webauthn_credentials WHERE id = ? AND user_id = ?`, [
      credentialId,
      userId,
    ]);

    return result.affectedRows > 0 || result.changes > 0;
  }

  /**
   * Update credential device name.
   */
  static async updateCredentialName(userId, credentialId, deviceName) {
    const result = await db.run(
      `UPDATE webauthn_credentials
       SET device_name = ?
       WHERE id = ? AND user_id = ?`,
      [deviceName, credentialId, userId],
    );

    return result.affectedRows > 0 || result.changes > 0;
  }
}
