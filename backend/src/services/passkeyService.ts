/**
 * Passkey (WebAuthn) Service
 * Handles passkey registration and authentication using FIDO2/WebAuthn standards.
 */
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import db from '../config/database';
import type { User } from '../types';

interface RelyingPartyConfig {
  rpID: string;
  rpName: string;
  origin: string;
}

interface VerificationResult {
  success: boolean;
  error?: string;
  user?: User;
}

interface WebAuthnCredential {
  id: number;
  user_id: number;
  credential_id: string;
  public_key: string;
  counter: number;
  device_name: string | null;
  aaguid: string;
  transports: string | null;
  created_at: string;
  last_used_at: string | null;
}

interface UserCredentialInfo {
  id: number;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
  transports: string | null;
}

class PasskeyService {
  /**
   * Get the Relying Party configuration from environment.
   */
  static getRelyingPartyConfig(): RelyingPartyConfig {
    const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
    const rpName = process.env.WEBAUTHN_RP_NAME || 'NoteHub';
    const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

    return { rpID, rpName, origin };
  }

  /**
   * Check if WebAuthn is properly configured.
   */
  static isEnabled(): boolean {
    // WebAuthn requires HTTPS in production, but works with localhost for dev
    const rpID = process.env.WEBAUTHN_RP_ID;
    return !!rpID || process.env.NODE_ENV === 'development';
  }

  /**
   * Generate registration options for a user to register a new passkey.
   */
  static async generateRegistrationOptions(
    userId: number,
    username: string,
  ): Promise<any> {
    const { rpName, rpID } = PasskeyService.getRelyingPartyConfig();

    // Get user's existing credentials to exclude them
    const existingCredentials = await db.query<{ credential_id: string }>(
      `SELECT credential_id FROM webauthn_credentials WHERE user_id = ?`,
      [userId],
    );

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: userId.toString(),
      userName: username,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.credential_id,
        type: 'public-key' as const,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Prefer platform authenticators (Face ID, Touch ID, Windows Hello)
      },
    } as any);

    return options;
  }

  /**
   * Verify registration response and store the credential.
   */
  static async verifyRegistration(
    userId: number,
    response: any,
    expectedChallenge: string,
    deviceName: string | null = null,
  ): Promise<VerificationResult> {
    const { rpID, origin } = PasskeyService.getRelyingPartyConfig();

    const verification: any = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: 'Registration verification failed' };
    }

    const registrationInfo = verification.registrationInfo;
    const credentialID = registrationInfo.credential?.id || registrationInfo.credentialID;
    const credentialPublicKey = registrationInfo.credential?.publicKey || registrationInfo.credentialPublicKey;
    const counter = registrationInfo.credential?.counter || registrationInfo.counter || 0;
    const aaguid = registrationInfo.aaguid || '';

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
  static async generateAuthenticationOptions(
    username: string | null = null,
  ): Promise<any> {
    const { rpID } = PasskeyService.getRelyingPartyConfig();

    let allowCredentials: Array<{ id: Buffer; type: 'public-key' }> = [];

    // If username provided, get only their credentials
    if (username) {
      const trimmedUsername = username.trim();
      const user = await db.queryOne<{ id: number }>(
        `SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(?) OR LOWER(TRIM(email)) = LOWER(?)`,
        [trimmedUsername, trimmedUsername],
      );

      if (user) {
        const credentials = await db.query<{ credential_id: string }>(
          `SELECT credential_id FROM webauthn_credentials WHERE user_id = ?`,
          [user.id],
        );
        allowCredentials = credentials.map((cred) => ({
          id: cred.credential_id as any,
          type: 'public-key' as const,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials: allowCredentials.length > 0 ? (allowCredentials as any) : undefined,
    } as any);

    return options;
  }

  /**
   * Verify authentication response and return user if successful.
   */
  static async verifyAuthentication(
    response: any,
    expectedChallenge: string,
  ): Promise<VerificationResult> {
    const { rpID, origin } = PasskeyService.getRelyingPartyConfig();

    // Find the credential
    const credentialIdBase64 = Buffer.from(response.id, 'base64').toString('base64');
    const credential = await db.queryOne<WebAuthnCredential>(
      `SELECT * FROM webauthn_credentials WHERE credential_id = ?`,
      [credentialIdBase64],
    );

    if (!credential) {
      return { success: false, error: 'Credential not found' };
    }

    // Get the user
    const user = await db.queryOne<User>(`SELECT * FROM users WHERE id = ?`, [credential.user_id]);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const verification: any = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credential_id,
        publicKey: Buffer.from(credential.public_key, 'base64'),
        counter: credential.counter,
      },
    } as any);

    if (!verification.verified) {
      return { success: false, error: 'Authentication verification failed' };
    }

    // Update counter and last used timestamp
    const newCounter = verification.authenticationInfo?.newCounter || credential.counter;
    await db.run(
      `UPDATE webauthn_credentials 
       SET counter = ?, last_used_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newCounter, credential.id],
    );

    return { success: true, user };
  }

  /**
   * Get all credentials for a user.
   */
  static async getUserCredentials(userId: number): Promise<UserCredentialInfo[]> {
    const credentials = await db.query<UserCredentialInfo>(
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
  static async deleteCredential(userId: number, credentialId: number): Promise<boolean> {
    const result = await db.run(`DELETE FROM webauthn_credentials WHERE id = ? AND user_id = ?`, [
      credentialId,
      userId,
    ]);

    return (result.affectedRows || 0) > 0 || (result.changes || 0) > 0;
  }

  /**
   * Update credential device name.
   */
  static async updateCredentialName(
    userId: number,
    credentialId: number,
    deviceName: string,
  ): Promise<boolean> {
    const result = await db.run(
      `UPDATE webauthn_credentials 
       SET device_name = ? 
       WHERE id = ? AND user_id = ?`,
      [deviceName, credentialId, userId],
    );

    return (result.affectedRows || 0) > 0 || (result.changes || 0) > 0;
  }
}

export default PasskeyService;
