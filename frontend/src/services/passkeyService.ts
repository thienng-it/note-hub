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
import i18n from '../i18n';

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
   * Handle WebAuthn errors with user-friendly translated messages.
   */
  private handleWebAuthnError(
    error: unknown,
    operationType: 'registration' | 'authentication',
  ): string {
    if (error instanceof Error) {
      switch (error.name) {
        case 'NotAllowedError':
          return operationType === 'registration'
            ? i18n.t('passkey.errors.registrationCancelled')
            : i18n.t('passkey.errors.authenticationCancelled');
        case 'NotSupportedError':
          return i18n.t('passkey.errors.notSupported');
        case 'InvalidStateError':
          return operationType === 'registration'
            ? i18n.t('passkey.errors.alreadyRegistered')
            : i18n.t('passkey.errors.notFound');
        case 'AbortError':
          return i18n.t('passkey.errors.cancelled');
        case 'SecurityError':
          return i18n.t('passkey.errors.securityError');
      }
    }

    // Fallback to generic error or server error message
    const err = error as { error?: string; message?: string };
    return (
      err?.error ||
      err?.message ||
      (operationType === 'registration'
        ? i18n.t('passkey.errors.registrationFailed')
        : i18n.t('passkey.errors.authenticationFailed'))
    );
  }

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
   * Get registration options from server (step 1 of registration).
   * This should be called before showing the UI to get device name,
   * so that startRegistration can be called immediately from user gesture.
   */
  async getRegistrationOptions(): Promise<{
    options: PublicKeyCredentialCreationOptionsJSON;
    challengeKey: string;
  }> {
    const response = await apiClient.post<{
      options: PublicKeyCredentialCreationOptionsJSON;
      challengeKey: string;
    }>('/api/v1/auth/passkey/register-options', {});
    return response;
  }

  /**
   * Complete passkey registration (step 2 of registration).
   * This should be called immediately from a user gesture with pre-fetched options.
   */
  async completeRegistration(
    options: PublicKeyCredentialCreationOptionsJSON,
    challengeKey: string,
    deviceName?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[Passkey] Starting registration with options:', {
        rpId: options.rp.id,
        rpName: options.rp.name,
        userName: options.user.name,
        timeout: options.timeout,
        authenticatorSelection: options.authenticatorSelection,
      });

      // Start WebAuthn registration - this must be called from user gesture context
      const registrationResponse = await startRegistration({ optionsJSON: options });

      console.log('[Passkey] Registration response received, verifying with server...');

      // Verify registration with server
      await apiClient.post(`${API_VERSION}/auth/passkey/register-verify`, {
        response: registrationResponse,
        challengeKey,
        deviceName,
      });

      console.log('[Passkey] Registration successful!');
      return { success: true };
    } catch (error: unknown) {
      console.error('[Passkey] Registration error details:', {
        error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: this.handleWebAuthnError(error, 'registration'),
      };
    }
  }

  /**
   * Register a new passkey for the current user.
   * @deprecated Use getRegistrationOptions + completeRegistration for better user gesture handling
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
      return {
        success: false,
        error: this.handleWebAuthnError(error, 'registration'),
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
      console.log('[Passkey] Getting authentication options for username:', username || '(none)');

      // Get authentication options from server
      const { options, challengeKey } = await apiClient.post<AuthenticationOptions>(
        `${API_VERSION}/auth/passkey/login-options`,
        { username },
      );

      console.log('[Passkey] Starting authentication with options:', {
        rpId: options.rpId,
        timeout: options.timeout,
        userVerification: options.userVerification,
        allowCredentialsCount: options.allowCredentials?.length || 0,
      });

      // Start WebAuthn authentication
      const authenticationResponse = await startAuthentication({ optionsJSON: options });

      console.log('[Passkey] Authentication response received, verifying with server...');

      // Verify authentication with server
      const result = await apiClient.post(`${API_VERSION}/auth/passkey/login-verify`, {
        response: authenticationResponse,
        challengeKey,
      });

      console.log('[Passkey] Authentication successful!');
      return { success: true, tokens: result as PasskeyTokens };
    } catch (error: unknown) {
      console.error('[Passkey] Authentication error details:', {
        error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: this.handleWebAuthnError(error, 'authentication'),
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
