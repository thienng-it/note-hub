import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { passkeyService } from '../services/passkeyService';
import { ConfirmModal } from './Modal';

interface Credential {
  id: number;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
}

export function PasskeyManager() {
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ id: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const checkPasskeyAvailability = useCallback(async () => {
    const available = await passkeyService.isAvailable();
    setPasskeyAvailable(available);
  }, []);

  const loadCredentials = useCallback(async () => {
    setIsLoading(true);
    try {
      const creds = await passkeyService.getCredentials();
      setCredentials(creds);
    } catch (_err) {
      setError('Failed to load passkeys');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
    checkPasskeyAvailability();
  }, [loadCredentials, checkPasskeyAvailability]);

  const handleRegister = async () => {
    setIsRegistering(true);
    setError(null);
    setSuccess(null);

    try {
      const deviceName = prompt('Enter a name for this passkey (e.g., "My iPhone")');

      const result = await passkeyService.register(deviceName || undefined);

      if (result.success) {
        setSuccess('Passkey registered successfully!');
        await loadCredentials();
      } else {
        setError(result.error || 'Failed to register passkey');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to register passkey');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteModal({ id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;

    setError(null);
    setSuccess(null);
    setIsDeleting(true);

    try {
      const deleted = await passkeyService.deleteCredential(deleteModal.id);
      if (deleted) {
        setSuccess('Passkey removed successfully');
        await loadCredentials();
        setDeleteModal(null);
      } else {
        setError('Failed to remove passkey');
      }
    } catch (_err) {
      setError('Failed to remove passkey');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartEdit = (credential: Credential) => {
    setEditingId(credential.id);
    setNewName(credential.device_name || '');
  };

  const handleSaveEdit = async (id: number) => {
    if (!newName.trim()) {
      setError('Device name cannot be empty');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const updated = await passkeyService.updateCredentialName(id, newName.trim());
      if (updated) {
        setSuccess('Passkey name updated successfully');
        setEditingId(null);
        await loadCredentials();
      } else {
        setError('Failed to update passkey name');
      }
    } catch (_err) {
      setError('Failed to update passkey name');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewName('');
  };

  if (!passkeyAvailable) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
        <svg
          className="w-5 h-5 flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
          role="img"
          aria-label="Warning"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          Passkeys are not available in your browser or are not configured on the server. Please use
          a modern browser with WebAuthn support.
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium text-[var(--text-primary)]">Passkeys</h4>
          <p className="text-sm text-[var(--text-muted)]">
            Sign in quickly and securely with biometrics or device authentication
          </p>
        </div>
        <button
          type="button"
          onClick={handleRegister}
          disabled={isRegistering}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center disabled:opacity-50"
        >
          {isRegistering ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Loading"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Registering...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Add"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Passkey
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 flex items-start gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            role="img"
            aria-label="Error"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 flex items-start gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            role="img"
            aria-label="Success"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-[var(--text-muted)]">Loading passkeys...</div>
      ) : credentials.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-muted)]">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="No passkeys"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
          <p>No passkeys registered yet</p>
          <p className="text-sm mt-2">Click "Add Passkey" to register your first passkey</p>
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map((credential) => (
            <div
              key={credential.id}
              className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]"
            >
              <div className="flex-1">
                {editingId === credential.id ? (
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="px-3 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                    placeholder="Device name"
                  />
                ) : (
                  <div className="font-medium text-[var(--text-primary)]">
                    {credential.device_name || 'Unnamed Device'}
                  </div>
                )}
                <div className="text-sm text-[var(--text-muted)] mt-1">
                  <span>Created: {new Date(credential.created_at).toLocaleDateString()}</span>
                  {credential.last_used_at && (
                    <span className="ml-3">
                      Last used: {new Date(credential.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {editingId === credential.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(credential.id)}
                      className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(credential)}
                      className="p-2 rounded hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)]"
                      title="Edit name"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        role="img"
                        aria-label="Edit"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(credential.id)}
                      className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600"
                      title="Remove passkey"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        role="img"
                        aria-label="Delete"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-sm">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            role="img"
            aria-label="Information"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <strong className="block mb-1">What are passkeys?</strong>
            <p>
              Passkeys provide secure, passwordless authentication using biometrics (fingerprint,
              face recognition) or your device's security features. They're more secure than
              passwords and can't be phished.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal !== null}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDeleteConfirm}
        title={t('passkey.removePasskeyTitle')}
        message={t('passkey.removePasskeyMessage')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
