/**
 * Passkey Service for Frontend
 * Handles WebAuthn browser API interactions.
 */
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';
import { apiClient } from '../api/client';

interface PasskeyStatus {
  enabled: boolean;
}

interface RegistrationOptions {
  options: PublicKeyCredentialCreationOptionsJSON;
  challengeKey: string;
}

interface AuthenticationOptions {
  options: PublicKeyCredentialRequestOptionsJSON;
  challengeKey: string;
}

interface Credential {
  id: number;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
}

class PasskeyService {
  /**
   * Check if passkey authentication is available.
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check browser support
      if (
        !window.PublicKeyCredential ||
        !window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
      ) {
        return false;
      }

      // Check if platform authenticator is available
      const available =
        await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

      if (!available) {
        return false;
      }

      // Check if server supports passkeys
      const response = await apiClient.get<PasskeyStatus>('/api/v1/auth/passkey/status');
      return response.enabled;
    } catch {
      return false;
    }
  }

  /**
   * Register a new passkey for the current user.
   */
  async register(deviceName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get registration options from server
      const { options, challengeKey } = await apiClient.post<RegistrationOptions>(
        '/api/v1/auth/passkey/register-options',
        {}
      );

      // Start WebAuthn registration
      const registrationResponse = await startRegistration(options);

      // Verify registration with server
      await apiClient.post('/api/v1/auth/passkey/register-verify', {
        response: registrationResponse,
        challengeKey,
        deviceName,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Passkey registration error:', error);
      return {
        success: false,
        error: error?.error || error?.message || 'Failed to register passkey',
      };
    }
  }

  /**
   * Authenticate using a passkey.
   */
  async authenticate(
    username?: string
  ): Promise<{ success: boolean; tokens?: any; error?: string }> {
    try {
      // Get authentication options from server
      const { options, challengeKey } = await apiClient.post<AuthenticationOptions>(
        '/api/v1/auth/passkey/login-options',
        { username }
      );

      // Start WebAuthn authentication
      const authenticationResponse = await startAuthentication(options);

      // Verify authentication with server
      const result = await apiClient.post('/api/v1/auth/passkey/login-verify', {
        response: authenticationResponse,
        challengeKey,
      });

      return { success: true, tokens: result };
    } catch (error: any) {
      console.error('Passkey authentication error:', error);
      return {
        success: false,
        error: error?.error || error?.message || 'Failed to authenticate with passkey',
      };
    }
  }

  /**
   * Get list of registered passkeys for the current user.
   */
  async getCredentials(): Promise<Credential[]> {
    try {
      const response = await apiClient.get<{ credentials: Credential[] }>(
        '/api/v1/auth/passkey/credentials'
      );
      return response.credentials;
    } catch (error) {
      console.error('Failed to get credentials:', error);
      return [];
    }
  }

  /**
   * Delete a passkey.
   */
  async deleteCredential(credentialId: number): Promise<boolean> {
    try {
      await apiClient.delete(`/api/v1/auth/passkey/credentials/${credentialId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete credential:', error);
      return false;
    }
  }

  /**
   * Update passkey device name.
   */
  async updateCredentialName(credentialId: number, deviceName: string): Promise<boolean> {
    try {
      await apiClient.patch(`/api/v1/auth/passkey/credentials/${credentialId}`, {
        deviceName,
      });
      return true;
    } catch (error) {
      console.error('Failed to update credential:', error);
      return false;
    }
  }
}

export const passkeyService = new PasskeyService();
