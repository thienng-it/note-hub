import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { notesApi } from '../api/client';
import { AIActions } from '../components/AIActions';
import type { Note } from '../types';

export function NoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadNote = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const fetchedNote = await notesApi.get(parseInt(id));
      setNote(fetchedNote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load note');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  const handleTogglePin = async () => {
    if (!note) return;
    try {
      const updated = await notesApi.togglePinned(note);
      setNote(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    }
  };

  const handleToggleFavorite = async () => {
    if (!note) return;
    try {
      const updated = await notesApi.toggleFavorite(note);
      // Merge updated data with existing note to preserve all fields
      setNote(prev => prev ? { ...prev, ...updated } : updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    }
  };

  const handleToggleArchive = async () => {
    if (!note) return;
    try {
      const updated = await notesApi.toggleArchived(note);
      setNote(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    try {
      await notesApi.delete(note.id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <i className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600"></i>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
          <i className="glass-i fas fa-exclamation-triangle mr-2"></i>
          {error || 'Note not found'}
        </div>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
          <i className="glass-i fas fa-arrow-left mr-2"></i>Back to Notes
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <i className="glass-i fas fa-arrow-left mr-2"></i>Back to Notes
        </Link>
      </div>

      {/* Note Card */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Note Header */}
        <div className="p-6 border-b border-[var(--border-color)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {note.pinned && (
                  <span className="text-yellow-500" title="Pinned">
                    <i className="glass-i fas fa-thumbtack"></i>
                  </span>
                )}
                {note.favorite && (
                  <span className="text-red-500" title="Favorite">
                    <i className="glass-i fas fa-heart"></i>
                  </span>
                )}
                {note.archived && (
                  <span className="text-gray-500" title="Archived">
                    <i className="glass-i fas fa-archive"></i>
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{note.title}</h1>

              {/* Tags */}
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {note.tags.map((tag) => (
                    <span key={tag.id} className="tag">
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta Info */}
              <div className="flex items-center gap-4 mt-4 text-sm text-[var(--text-muted)]">
                <span>
                  <i className="glass-i fas fa-clock mr-1"></i>
                  {Math.ceil((note.body?.length || 0) / 1000)} min read
                </span>
                {note.created_at && (
                  <span>
                    <i className="glass-i fas fa-calendar-plus mr-1"></i>
                    Created {new Date(note.created_at).toLocaleDateString()}
                  </span>
                )}
                {note.updated_at && (
                  <span>
                    <i className="glass-i fas fa-edit mr-1"></i>
                    Updated {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {note.can_edit !== false && (
              <div className="flex items-center gap-2">
                <Link
                  to={`/notes/${note.id}/edit`}
                  className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-blue-600 transition-colors"
                  title="Edit"
                >
                  <i className="glass-i fas fa-edit"></i>
                </Link>
                <Link
                  to={`/notes/${note.id}/share`}
                  className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-green-600 transition-colors"
                  title="Share"
                >
                  <i className="glass-i fas fa-share-alt"></i>
                </Link>
                <button
                  onClick={handleTogglePin}
                  className={`p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors ${
                    note.pinned ? 'text-yellow-500' : 'text-[var(--text-muted)]'
                  }`}
                  title={note.pinned ? 'Unpin' : 'Pin'}
                >
                  <i className="glass-i fas fa-thumbtack"></i>
                </button>
                <button
                  onClick={handleToggleFavorite}
                  className={`p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors ${
                    note.favorite ? 'text-red-500' : 'text-[var(--text-muted)]'
                  }`}
                  title={note.favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <i className="glass-i fas fa-heart"></i>
                </button>
                <button
                  onClick={handleToggleArchive}
                  className={`p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors ${
                    note.archived ? 'text-gray-500' : 'text-[var(--text-muted)]'
                  }`}
                  title={note.archived ? 'Unarchive' : 'Archive'}
                >
                  <i className="glass-i fas fa-archive"></i>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 transition-colors"
                  title="Delete"
                >
                  <i className="glass-i fas fa-trash"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* AI Actions */}
        {note.body && (
          <div className="px-6 pt-4 pb-2 border-b border-[var(--border-color)]">
            <AIActions text={note.body} />
          </div>
        )}

        {/* Note Content */}
        <div className="p-6 note-content prose prose-lg dark:prose-invert max-w-none">
          <Markdown remarkPlugins={[remarkGfm]}>
            {note.body || '*No content*'}
          </Markdown>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 rounded-xl max-w-md w-full">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              <i className="glass-i fas fa-exclamation-triangle text-red-500 mr-2"></i>
              Delete Note?
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Are you sure you want to delete "{note.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <i className="glass-i fas fa-trash mr-2"></i>Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
