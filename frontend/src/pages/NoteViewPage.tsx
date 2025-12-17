import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import { Link, useNavigate, useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { notesApi, profileApi } from '../api/client';
import { AIActions } from '../components/AIActions';
import { ImageModal } from '../components/ImageModal';
import { useAuth } from '../context/AuthContext';
import type { Note } from '../types';
import { getTagColor } from '../utils/tagColors';

export function NoteViewPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isContentHidden, setIsContentHidden] = useState(() => {
    try {
      // First try to load from user profile
      if (user?.hidden_notes) {
        const hiddenSet = new Set(JSON.parse(user.hidden_notes));
        return id ? hiddenSet.has(parseInt(id, 10)) : false;
      }
      // Fallback to localStorage for migration
      const saved = localStorage.getItem('hiddenNotes');
      const hiddenSet = saved ? new Set(JSON.parse(saved)) : new Set();
      return id ? hiddenSet.has(parseInt(id, 10)) : false;
    } catch {
      return false;
    }
  });

  const syncHiddenNotesToBackend = async (hiddenNoteIds: number[]) => {
    try {
      await profileApi.updateHiddenNotes(hiddenNoteIds);
    } catch (err) {
      console.error('Failed to sync hidden notes:', err);
    }
  };

  const toggleHideContent = () => {
    if (!id) return;
    const noteId = parseInt(id, 10);
    let hiddenSet: Set<number>;

    try {
      if (user?.hidden_notes) {
        hiddenSet = new Set(JSON.parse(user.hidden_notes));
      } else {
        const saved = localStorage.getItem('hiddenNotes');
        hiddenSet = saved ? new Set(JSON.parse(saved)) : new Set<number>();
      }
    } catch {
      hiddenSet = new Set<number>();
    }

    if (isContentHidden) {
      hiddenSet.delete(noteId);
    } else {
      hiddenSet.add(noteId);
    }

    const hiddenArray = [...hiddenSet];
    syncHiddenNotesToBackend(hiddenArray);
    setIsContentHidden(!isContentHidden);
  };

  const loadNote = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const fetchedNote = await notesApi.get(parseInt(id, 10));
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
      setNote((prev) => (prev ? { ...prev, ...updated } : updated));
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

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageModal(true);
  };

  const handleNextImage = () => {
    if (note?.images && currentImageIndex < note.images.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <i className="glass-i fas fa-arrow-left mr-2"></i>Back to Notes
        </Link>

        {/* Share Button - Always visible for own notes */}
        {note.can_edit !== false && (
          <Link
            to={`/notes/${note.id}/share`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            <i className="fas fa-share-alt"></i>
            <span>Share Note</span>
          </Link>
        )}
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
                  <span className="text-gray-500" title={t('notes.archived')}>
                    <i className="glass-i fas fa-archive"></i>
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{note.title}</h1>

              {/* Tags */}
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {note.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className={`px-3 py-1 text-sm font-medium rounded-full border ${getTagColor(tag.name)}`}
                    >
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
                  type="button"
                  onClick={handleTogglePin}
                  className={`p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors ${
                    note.pinned ? 'text-yellow-500' : 'text-[var(--text-muted)]'
                  }`}
                  title={note.pinned ? 'Unpin' : 'Pin'}
                >
                  <i className="glass-i fas fa-thumbtack"></i>
                </button>
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors ${
                    note.favorite ? 'text-red-500' : 'text-[var(--text-muted)]'
                  }`}
                  title={note.favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <i className="glass-i fas fa-heart"></i>
                </button>
                <button
                  type="button"
                  onClick={handleToggleArchive}
                  className={`p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors ${
                    note.archived ? 'text-gray-500' : 'text-[var(--text-muted)]'
                  }`}
                  title={note.archived ? 'Unarchive' : 'Archive'}
                >
                  <i className="glass-i fas fa-archive"></i>
                </button>
                <button
                  type="button"
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

        {/* Hide/Show Content Toggle */}
        <div className="px-6 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <button
            type="button"
            onClick={toggleHideContent}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isContentHidden
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <i className={`fas ${isContentHidden ? 'fa-eye' : 'fa-eye-slash'}`}></i>
            <span>{isContentHidden ? 'Show Content' : 'Hide Content'}</span>
          </button>
          {isContentHidden && (
            <span className="text-sm text-[var(--text-muted)]">
              <i className="fas fa-shield-alt mr-1"></i>
              Content hidden for privacy
            </span>
          )}
        </div>

        {isContentHidden ? (
          /* Hidden Content Placeholder */
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <i className="glass-i fas fa-eye-slash text-3xl text-purple-500"></i>
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Content Hidden
            </h3>
            <p className="text-[var(--text-secondary)] mb-4 max-w-md">
              This note's content is hidden for privacy. Click the button above to reveal it.
            </p>
            <button
              type="button"
              onClick={toggleHideContent}
              className="px-6 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
            >
              <i className="glass-i fas fa-eye mr-2"></i>
              Show Content
            </button>
          </div>
        ) : (
          <>
            {/* AI Actions */}
            {note.body && (
              <div className="px-6 pt-4 pb-2 border-b border-[var(--border-color)] overflow-visible relative z-10">
                <AIActions text={note.body} />
              </div>
            )}

            {/* Images */}
            {note.images && note.images.length > 0 && (
              <div className="px-6 pt-6 border-b border-[var(--border-color)]">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center">
                  <i className="fas fa-images mr-2 text-blue-600"></i>
                  Attached Images ({note.images.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                  {note.images.map((image, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => handleImageClick(index)}
                      className="relative group overflow-hidden rounded-lg border-2 border-[var(--border-color)] hover:border-blue-500 transition-all cursor-pointer aspect-video bg-[var(--bg-tertiary)]"
                    >
                      <img
                        src={image}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <i className="fas fa-search-plus text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity"></i>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Note Content */}
            <div className="p-6 note-content prose prose-lg dark:prose-invert max-w-none">
              <Markdown remarkPlugins={[remarkGfm]}>{note.body || '*No content*'}</Markdown>
            </div>
          </>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && note?.images && (
        <ImageModal
          images={note.images}
          currentIndex={currentImageIndex}
          onClose={() => setShowImageModal(false)}
          onNext={handleNextImage}
          onPrev={handlePrevImage}
        />
      )}

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
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
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
