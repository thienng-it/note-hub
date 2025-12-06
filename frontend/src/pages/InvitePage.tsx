import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

interface Invitation {
  id: number;
  token: string;
  email?: string;
  message?: string;
  used: boolean;
  used_by?: { username: string };
  created_at: string;
  expires_at: string;
}

export function InvitePage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const fetchInvitations = async () => {
    try {
      const data = await apiClient.get<{ invitations: Invitation[] }>('/api/v1/invitations');
      setInvitations(data.invitations || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load invitations';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInviteUrl('');

    setIsSubmitting(true);
    try {
      const data = await apiClient.post<{ token: string }>('/api/v1/invitations', {
        email: email.trim() || undefined,
        message: message.trim() || undefined,
      });
      setInviteUrl(`${window.location.origin}/register?token=${data.token}`);
      setEmail('');
      setMessage('');
      fetchInvitations();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create invitation';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers that don't support the Clipboard API
      // Note: execCommand('copy') is deprecated but provides necessary fallback for IE11 and older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <i
            className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"
            aria-hidden="true"
          ></i>
          <p className="text-[var(--text-secondary)]">Loading invitations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center text-[var(--text-primary)]">
          <i className="glass-i fas fa-user-plus mr-3 text-blue-600" aria-hidden="true"></i>
          Invite Users
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">Invite others to join NoteHub</p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start"
          role="alert"
        >
          <i className="glass-i fas fa-exclamation-circle mr-2 mt-0.5" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Invite Form */}
      <div className="glass-card p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Create Invitation</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="glass-i fas fa-envelope mr-2" aria-hidden="true"></i>
              Email (optional)
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
              placeholder="user@example.com"
            />
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Optional: Add email for reference
            </p>
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="glass-i fas fa-comment mr-2" aria-hidden="true"></i>
              Message (optional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)] resize-none"
              rows={3}
              placeholder="Add a personal message..."
            />
          </div>

          <button
            type="submit"
            className="btn-primary px-6 py-2.5 rounded-lg font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <i className="glass-i fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                Creating...
              </>
            ) : (
              <>
                <i className="glass-i fas fa-plus mr-2" aria-hidden="true"></i>
                Create Invitation Link
              </>
            )}
          </button>
        </form>
      </div>

      {/* Invitation Link Display */}
      {inviteUrl && (
        <div className="mb-6 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-3">
            <i className="glass-i fas fa-check-circle mr-2" aria-hidden="true"></i>
            Invitation Created!
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                Invitation Link:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded-lg text-[var(--text-primary)] font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(inviteUrl)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <i className="glass-i fas fa-copy mr-2" aria-hidden="true"></i>
                  Copy
                </button>
              </div>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              <i className="glass-i fas fa-info-circle mr-1" aria-hidden="true"></i>
              This link expires in 7 days. Share it with anyone you want to invite.
            </p>
          </div>
        </div>
      )}

      {/* Invitations List */}
      <div className="glass-card p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Your Invitations</h2>
        {invitations.length > 0 ? (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        invitation.used
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                      }`}
                    >
                      {invitation.used ? (
                        <>
                          <i className="glass-i fas fa-check mr-1" aria-hidden="true"></i>
                          Used
                        </>
                      ) : (
                        <>
                          <i className="glass-i fas fa-clock mr-1" aria-hidden="true"></i>
                          Active
                        </>
                      )}
                    </span>
                    {invitation.email && (
                      <span className="text-sm text-[var(--text-muted)]">
                        <i className="glass-i fas fa-envelope mr-1" aria-hidden="true"></i>
                        {invitation.email}
                      </span>
                    )}
                  </div>
                  {invitation.message && (
                    <p className="text-sm text-[var(--text-secondary)] mb-2">
                      {invitation.message}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 text-xs text-[var(--text-muted)]">
                    <span>
                      <i className="glass-i fas fa-calendar mr-1" aria-hidden="true"></i>
                      Created {new Date(invitation.created_at).toLocaleDateString()}
                    </span>
                    {invitation.used && invitation.used_by ? (
                      <span>
                        <i className="glass-i fas fa-user mr-1" aria-hidden="true"></i>
                        Used by {invitation.used_by.username}
                      </span>
                    ) : (
                      <span>
                        <i className="glass-i fas fa-hourglass-half mr-1" aria-hidden="true"></i>
                        Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {!invitation.used && (
                  <div className="ml-4">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}/register?token=${invitation.token}`,
                        )
                      }
                      className="btn-apple px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <i className="glass-i fas fa-copy mr-1" aria-hidden="true"></i>
                      Copy Link
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <i
              className="glass-i fas fa-inbox text-4xl text-[var(--text-muted)] mb-4"
              aria-hidden="true"
            ></i>
            <p className="text-[var(--text-secondary)]">You haven't created any invitations yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
