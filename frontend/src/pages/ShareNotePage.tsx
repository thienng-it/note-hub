import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { apiClient, notesApi } from '../api/client';
import { ConfirmModal } from '../components/Modal';

interface SharedUser {
  id: number;
  username: string;
  can_edit: boolean;
  created_at: string;
}

interface Note {
  id: number;
  title: string;
}

interface UserSuggestion {
  id: number;
  username: string;
}

export function ShareNotePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [note, setNote] = useState<Note | null>(null);
  const [sharedWith, setSharedWith] = useState<SharedUser[]>([]);
  const [username, setUsername] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [isPublicSubmitting, setIsPublicSubmitting] = useState(false);
  const [revokePublicModalOpen, setRevokePublicModalOpen] = useState(false);
  const [unshareModal, setUnshareModal] = useState<{ userId: number; userName: string } | null>(
    null,
  );
  const [isUnsharing, setIsUnsharing] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const publicUrl = publicToken ? `${window.location.origin}/public/notes/${publicToken}` : '';

  const fetchNoteAndShares = useCallback(async () => {
    try {
      const noteId = id ? Number.parseInt(id, 10) : NaN;
      if (!Number.isFinite(noteId)) {
        setError('Failed to load note');
        setIsLoading(false);
        return;
      }

      const [noteData, sharesData] = await Promise.all([
        apiClient.get<{ note: Note }>(`/api/v1/notes/${noteId}`),
        apiClient.get<{ shares: SharedUser[] }>(`/api/v1/notes/${noteId}/shares`),
      ]);

      const publicShare = await notesApi.getPublicShare(noteId);
      setNote(noteData.note);
      setSharedWith(sharesData.shares || []);
      setPublicToken(publicShare?.token || null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load note';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchNoteAndShares();
    }
  }, [id, fetchNoteAndShares]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user suggestions when username changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (username.trim().length < 2) {
        setUserSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await apiClient.get<{ users: UserSuggestion[] }>(
          `/api/v1/users/search?q=${encodeURIComponent(username.trim())}`,
        );
        setUserSuggestions(response.users || []);
        setShowSuggestions(response.users.length > 0);
      } catch (_err) {
        // Silent fail for autocomplete
        setUserSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [username]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || userSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < userSuggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < userSuggestions.length) {
          selectUser(userSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const copyPublicLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setSuccess('Link copied');
      setError('');
    } catch {
      setSuccess('');
      setError('Failed to copy link');
    }
  };

  const createPublicLink = async () => {
    if (!id) return;
    const noteId = Number.parseInt(id, 10);
    if (!Number.isFinite(noteId)) return;

    setIsPublicSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const share = await notesApi.createPublicShare(noteId);
      setPublicToken(share.token);
      setSuccess('Public link created');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create public link';
      setError(errorMessage);
    } finally {
      setIsPublicSubmitting(false);
    }
  };

  const revokePublicLink = async () => {
    if (!id) return;
    const noteId = Number.parseInt(id, 10);
    if (!Number.isFinite(noteId)) return;

    setIsPublicSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await notesApi.revokePublicShare(noteId);
      setPublicToken(null);
      setSuccess('Public link revoked');
      setRevokePublicModalOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke public link';
      setError(errorMessage);
    } finally {
      setIsPublicSubmitting(false);
    }
  };

  const selectUser = (user: UserSuggestion) => {
    setUsername(user.username);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(`/api/v1/notes/${id}/share`, {
        username: username.trim(),
        can_edit: canEdit,
      });
      setSuccess(`Note shared with ${username}`);
      setUsername('');
      setCanEdit(false);
      setUserSuggestions([]);
      fetchNoteAndShares();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share note';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnshareClick = (userId: number, userName: string) => {
    setUnshareModal({ userId, userName });
  };

  const handleUnshareConfirm = async () => {
    if (!unshareModal) return;

    setIsUnsharing(true);
    try {
      await apiClient.delete(`/api/v1/notes/${id}/share/${unshareModal.userId}`);
      setSharedWith((prev) => prev.filter((u) => u.id !== unshareModal.userId));
      setSuccess(`Share removed for ${unshareModal.userName}`);
      setUnshareModal(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove share';
      setError(errorMessage);
    } finally {
      setIsUnsharing(false);
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
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel">
      {/* Header */}
      <div className="note-view-card-header">
        <Link
          to={`/notes/${id}`}
          className="modern-btn-secondary flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
          aria-label="Back to Note"
        >
          <i className="glass-i fas fa-arrow-left mr-2" aria-hidden="true"></i>
          Back to Note
        </Link>
        <h1 className="modern-search-card text-3xl font-bold flex items-center text-[var(--text-primary)]">
          <i className="glass-i fas fa-share-alt mr-3 text-blue-600" aria-hidden="true"></i>
          Share Note
        </h1>
        {note && <p className="mt-2 text-[var(--text-secondary)]">{note.title}</p>}
      </div>

      {/* Alerts */}
      {error && (
        <div
          className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start"
          role="alert"
        >
          <i className="glass-i fas fa-exclamation-circle mr-2 mt-0.5" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <output className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 flex items-start">
          <i className="glass-i fas fa-check-circle mr-2 mt-0.5" aria-hidden="true"></i>
          <span>{success}</span>
        </output>
      )}

      <div className="glass-panel p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Public link</h2>

        {publicToken ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={publicUrl}
                readOnly
                className="glass-input w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)]"
              />
              <button
                type="button"
                onClick={copyPublicLink}
                className="modern-btn-primary px-6 py-2.5 rounded-lg font-medium"
              >
                <i className="glass-i fas fa-copy mr-2" aria-hidden="true"></i>
                Copy
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary-glass px-6 py-2.5 rounded-lg"
              >
                <i className="glass-i fas fa-external-link-alt mr-2" aria-hidden="true"></i>
                Open
              </a>
              <button
                type="button"
                onClick={() => setRevokePublicModalOpen(true)}
                className="btn-danger-glass px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                disabled={isPublicSubmitting}
              >
                <i className="glass-i fas fa-ban mr-2" aria-hidden="true"></i>
                Revoke
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">
              Create a public link so anyone with the URL can view this note without logging in.
            </p>
            <button
              type="button"
              onClick={createPublicLink}
              className="btn-primary px-6 py-2.5 rounded-lg font-medium"
              disabled={isPublicSubmitting}
            >
              {isPublicSubmitting ? (
                <>
                  <i className="glass-i fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="glass-i fas fa-link mr-2" aria-hidden="true"></i>
                  Create public link
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Share Form */}
      <div className="glass-panel p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Share with User</h2>
        <form onSubmit={handleShare} className="space-y-4">
          <div className="relative">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="glass-i fas fa-user mr-2" aria-hidden="true"></i>
              {t('share.usernamePlaceholder')}
            </label>
            <input
              ref={inputRef}
              type="text"
              id="username"
              value={username}
              onChange={handleUsernameChange}
              onKeyDown={handleKeyDown}
              onFocus={() =>
                username.length >= 2 && userSuggestions.length > 0 && setShowSuggestions(true)
              }
              className="glass-input w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
              placeholder={t('share.usernamePlaceholder')}
              autoComplete="off"
            />
            {showSuggestions && userSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {userSuggestions.map((user, index) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => selectUser(user)}
                    className={`modern-btn-primary w-full px-4 py-3 text-left hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-3 ${
                      index === selectedIndex ? 'bg-[var(--bg-secondary)]' : ''
                    }`}
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[var(--text-primary)] font-medium">{user.username}</span>
                  </button>
                ))}
              </div>
            )}
            {username.length > 0 && username.length < 2 && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Type at least 2 characters to search for users
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="canEdit"
              checked={canEdit}
              onChange={(e) => setCanEdit(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-[var(--border-color)] rounded focus:ring-blue-500"
              style={{ marginBottom: '1rem' }}
            />
            <label
              htmlFor="canEdit"
              className="text-sm text-[var(--text-secondary)]"
              style={{ marginBottom: '1rem' }}
            >
              Allow editing
            </label>
          </div>

          <button
            type="submit"
            className="modern-btn-primary px-6 py-2.5 rounded-lg font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <i className="glass-i fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                Sharing...
              </>
            ) : (
              <>
                <i className="glass-i fas fa-share mr-2" aria-hidden="true"></i>
                Share Note
              </>
            )}
          </button>
        </form>
      </div>

      {/* Shared With List */}
      <div className="glass-card p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Shared With</h2>
        {sharedWith.length > 0 ? (
          <div className="space-y-3">
            {sharedWith.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{user.username}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      <i
                        className={`fas fa-${user.can_edit ? 'edit' : 'eye'} mr-2`}
                        aria-hidden="true"
                      ></i>
                      {user.can_edit ? 'Can edit' : 'View only'}
                      {user.created_at &&
                        ` • Shared ${new Date(user.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnshareClick(user.id, user.username)}
                  className="text-red-600 hover:text-red-800 transition-colors p-2"
                  aria-label={`Remove share for ${user.username}`}
                >
                  <i className="glass-i fas fa-times" aria-hidden="true"></i>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <i
              className="glass-i fas fa-users text-4xl text-[var(--text-muted)] mb-4"
              aria-hidden="true"
            ></i>
            <p className="text-[var(--text-secondary)]">
              This note hasn't been shared with anyone yet.
            </p>
          </div>
        )}
      </div>

      {/* Unshare Confirmation Modal */}
      <ConfirmModal
        isOpen={unshareModal !== null}
        onClose={() => setUnshareModal(null)}
        onConfirm={handleUnshareConfirm}
        title={t('share.removeAccessTooltip')}
        message={`Are you sure you want to remove share access for ${unshareModal?.userName}? They will no longer be able to view or edit this note.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        isLoading={isUnsharing}
      />

      <ConfirmModal
        isOpen={revokePublicModalOpen}
        onClose={() => setRevokePublicModalOpen(false)}
        onConfirm={revokePublicLink}
        title="Revoke public link"
        message="Anyone with the old link will no longer be able to access this note. Continue?"
        confirmText="Revoke"
        cancelText="Cancel"
        variant="danger"
        isLoading={isPublicSubmitting}
      />
    </div>
  );
}
