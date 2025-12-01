import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';

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

export function ShareNotePage() {
  const { id } = useParams<{ id: string }>();

  const [note, setNote] = useState<Note | null>(null);
  const [sharedWith, setSharedWith] = useState<SharedUser[]>([]);
  const [username, setUsername] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchNoteAndShares();
    }
  }, [id]);

  const fetchNoteAndShares = async () => {
    try {
      const [noteData, sharesData] = await Promise.all([
        apiClient.get<{ note: Note }>(`/api/notes/${id}`),
        apiClient.get<{ shares: SharedUser[] }>(`/api/notes/${id}/shares`),
      ]);
      setNote(noteData.note);
      setSharedWith(sharesData.shares || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load note';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
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
      await apiClient.post(`/api/notes/${id}/share`, {
        username: username.trim(),
        can_edit: canEdit,
      });
      setSuccess(`Note shared with ${username}`);
      setUsername('');
      setCanEdit(false);
      fetchNoteAndShares();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share note';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnshare = async (userId: number, userName: string) => {
    if (!window.confirm(`Remove share with ${userName}?`)) {
      return;
    }

    try {
      await apiClient.delete(`/api/notes/${id}/shares/${userId}`);
      setSharedWith(sharedWith.filter((u) => u.id !== userId));
      setSuccess(`Share removed for ${userName}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove share';
      setError(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4" aria-hidden="true"></i>
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/notes/${id}`}
          className="flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
          aria-label="Back to Note"
        >
          <i className="fas fa-arrow-left mr-2" aria-hidden="true"></i>
          Back to Note
        </Link>
        <h1 className="text-3xl font-bold flex items-center text-[var(--text-primary)]">
          <i className="fas fa-share-alt mr-3 text-blue-600" aria-hidden="true"></i>
          Share Note
        </h1>
        {note && (
          <p className="mt-2 text-[var(--text-secondary)]">{note.title}</p>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div
          className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start"
          role="alert"
        >
          <i className="fas fa-exclamation-circle mr-2 mt-0.5" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 flex items-start"
          role="status"
        >
          <i className="fas fa-check-circle mr-2 mt-0.5" aria-hidden="true"></i>
          <span>{success}</span>
        </div>
      )}

      {/* Share Form */}
      <div className="card p-6 rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Share with User</h2>
        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="fas fa-user mr-2" aria-hidden="true"></i>
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
              placeholder="Enter username"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="canEdit"
              checked={canEdit}
              onChange={(e) => setCanEdit(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-[var(--border-color)] rounded focus:ring-blue-500"
            />
            <label htmlFor="canEdit" className="text-sm text-[var(--text-secondary)]">
              Allow editing
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary px-6 py-2.5 rounded-lg font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                Sharing...
              </>
            ) : (
              <>
                <i className="fas fa-share mr-2" aria-hidden="true"></i>
                Share Note
              </>
            )}
          </button>
        </form>
      </div>

      {/* Shared With List */}
      <div className="card p-6 rounded-xl">
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
                      <i className={`fas fa-${user.can_edit ? 'edit' : 'eye'} mr-2`} aria-hidden="true"></i>
                      {user.can_edit ? 'Can edit' : 'View only'}
                      {user.created_at && ` • Shared ${new Date(user.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnshare(user.id, user.username)}
                  className="text-red-600 hover:text-red-800 transition-colors p-2"
                  aria-label={`Remove share for ${user.username}`}
                >
                  <i className="fas fa-times" aria-hidden="true"></i>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <i className="fas fa-users text-4xl text-[var(--text-muted)] mb-4" aria-hidden="true"></i>
            <p className="text-[var(--text-secondary)]">This note hasn't been shared with anyone yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
