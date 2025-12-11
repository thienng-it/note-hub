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
      excludeCredentials: existingCredentials.map((cred) => ({
        id: Buffer.from(cred.credential_id, 'base64'),
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

    const { credentialID, credentialPublicKey, counter, aaguid } = verification.registrationInfo;

    // Store credential in database
    await db.run(
      `INSERT INTO webauthn_credentials (
        user_id, credential_id, public_key, counter, device_name, aaguid
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        Buffer.from(credentialID).toString('base64'),
        Buffer.from(credentialPublicKey).toString('base64'),
        counter,
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
        allowCredentials = credentials.map((cred) => ({
          id: Buffer.from(cred.credential_id, 'base64'),
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
    const credentialIdBase64 = Buffer.from(response.id, 'base64').toString('base64');
    const credential = await db.queryOne(
      `SELECT * FROM webauthn_credentials WHERE credential_id = ?`,
      [credentialIdBase64],
    );

    if (!credential) {
      return { success: false, error: 'Credential not found' };
    }

    // Get the user
    const user = await db.queryOne(`SELECT * FROM users WHERE id = ?`, [credential.user_id]);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(credential.credential_id, 'base64'),
        credentialPublicKey: Buffer.from(credential.public_key, 'base64'),
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
