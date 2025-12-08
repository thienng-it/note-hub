/**
 * Passkey Service for Frontend
 * Handles WebAuthn browser API interactions.
 */
import {
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { API_VERSION, apiClient } from '../api/client';

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

interface PasskeyTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    username: string;
    email: string;
    has_2fa: boolean;
    auth_method: string;
  };
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
      const response = await apiClient.get<PasskeyStatus>(`${API_VERSION}/auth/passkey/status`);
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
        {},
      );

      // Start WebAuthn registration
      const registrationResponse = await startRegistration({ optionsJSON: options });

      // Verify registration with server
      await apiClient.post(`${API_VERSION}/auth/passkey/register-verify`, {
        response: registrationResponse,
        challengeKey,
        deviceName,
      });

      return { success: true };
    } catch (error: unknown) {
      console.error('Passkey registration error:', error);

      // Handle specific WebAuthn errors
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          return {
            success: false,
            error: 'Registration was cancelled or timed out. Please try again.',
          };
        }
        if (error.name === 'NotSupportedError') {
          return {
            success: false,
            error:
              'Your device does not support passkeys. Please use a modern browser or device with biometric authentication.',
          };
        }
        if (error.name === 'InvalidStateError') {
          return {
            success: false,
            error: 'This passkey is already registered. Please try with a different authenticator.',
          };
        }
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Registration was cancelled. Please try again.',
          };
        }
      }

      const err = error as { error?: string; message?: string };
      return {
        success: false,
        error: err?.error || err?.message || 'Failed to register passkey',
      };
    }
  }

  /**
   * Authenticate using a passkey.
   */
  async authenticate(
    username?: string,
  ): Promise<{ success: boolean; tokens?: PasskeyTokens; error?: string }> {
    try {
      // Get authentication options from server
      const { options, challengeKey } = await apiClient.post<AuthenticationOptions>(
        `${API_VERSION}/auth/passkey/login-options`,
        { username },
      );

      // Start WebAuthn authentication
      const authenticationResponse = await startAuthentication({ optionsJSON: options });

      // Verify authentication with server
      const result = await apiClient.post(`${API_VERSION}/auth/passkey/login-verify`, {
        response: authenticationResponse,
        challengeKey,
      });

      return { success: true, tokens: result as PasskeyTokens };
    } catch (error: unknown) {
      console.error('Passkey authentication error:', error);

      // Handle specific WebAuthn errors
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          return {
            success: false,
            error: 'Authentication was cancelled or timed out. Please try again.',
          };
        }
        if (error.name === 'NotSupportedError') {
          return {
            success: false,
            error:
              'Your device does not support passkeys. Please use a modern browser or device with biometric authentication.',
          };
        }
        if (error.name === 'SecurityError') {
          return {
            success: false,
            error:
              'Security error occurred. Please ensure you are using a secure connection (HTTPS).',
          };
        }
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Authentication was cancelled. Please try again.',
          };
        }
        if (error.name === 'InvalidStateError') {
          return {
            success: false,
            error:
              'No matching passkey found. Please check your credentials or sign in with password.',
          };
        }
      }

      const err = error as { error?: string; message?: string };
      return {
        success: false,
        error: err?.error || err?.message || 'Failed to authenticate with passkey',
      };
    }
  }

  /**
   * Get list of registered passkeys for the current user.
   */
  async getCredentials(): Promise<Credential[]> {
    try {
      const response = await apiClient.get<{ credentials: Credential[] }>(
        `${API_VERSION}/auth/passkey/credentials`,
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
      await apiClient.delete(`${API_VERSION}/auth/passkey/credentials/${credentialId}`);
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
      await apiClient.patch(`${API_VERSION}/auth/passkey/credentials/${credentialId}`, {
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
