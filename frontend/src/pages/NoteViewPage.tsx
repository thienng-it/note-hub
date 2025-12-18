import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import { Link, useNavigate, useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { profileApi } from '../api/client';
import { AIActions } from '../components/AIActions';
import { ImageModal } from '../components/ImageModal';
import { useAuth } from '../context/AuthContext';
import { offlineNotesApi } from '../services/offlineApiWrapper';
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
      const fetchedNote = await offlineNotesApi.get(parseInt(id, 10));
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
      const updated = await offlineNotesApi.togglePinned(note);
      setNote(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    }
  };

  const handleToggleFavorite = async () => {
    if (!note) return;
    try {
      const updated = await offlineNotesApi.toggleFavorite(note);
      // Merge updated data with existing note to preserve all fields
      setNote((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    }
  };

  const handleToggleArchive = async () => {
    if (!note) return;
    try {
      const updated = await offlineNotesApi.toggleArchived(note);
      setNote(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    try {
      await offlineNotesApi.delete(note.id);
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
    <div className="note-view-container">
      {/* Header Navigation */}
      <div className="note-view-header">
        <Link to="/" className="note-view-back-btn">
          <i className="fas fa-arrow-left"></i>
          <span>Back to Notes</span>
        </Link>

        {/* Share Button - Always visible for own notes */}
        {note.can_edit !== false && (
          <Link to={`/notes/${note.id}/share`} className="note-view-share-btn">
            <i className="fas fa-share-alt"></i>
            <span>Share Note</span>
          </Link>
        )}
      </div>

      {/* Note Card */}
      <div className="note-view-card">
        {/* Note Header */}
        <div className="note-view-card-header">
          <div className="note-view-header-content">
            {/* Title Section */}
            <div className="note-view-title-section">
              {/* Status Badges */}
              <div className="note-view-badges">
                {note.pinned && (
                  <span className="note-view-badge badge-pinned" title="Pinned">
                    <i className="fas fa-thumbtack"></i>
                  </span>
                )}
                {note.favorite && (
                  <span className="note-view-badge badge-favorite" title="Favorite">
                    <i className="fas fa-heart"></i>
                  </span>
                )}
                {note.archived && (
                  <span className="note-view-badge badge-archived" title={t('notes.archived')}>
                    <i className="fas fa-archive"></i>
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="note-view-title">{note.title}</h1>

              {/* Tags */}
              {note.tags.length > 0 && (
                <div className="note-view-tags">
                  {note.tags.map((tag) => (
                    <span key={tag.id} className={`note-view-tag ${getTagColor(tag.name)}`}>
                      <i className="fas fa-tag"></i>
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta Info */}
              <div className="note-view-meta">
                <span className="note-view-meta-item">
                  <i className="fas fa-clock"></i>
                  <span>{Math.ceil((note.body?.length || 0) / 1000)} min read</span>
                </span>
                {note.created_at && (
                  <span className="note-view-meta-item">
                    <i className="fas fa-calendar-plus"></i>
                    <span>Created {new Date(note.created_at).toLocaleDateString()}</span>
                  </span>
                )}
                {note.updated_at && (
                  <span className="note-view-meta-item">
                    <i className="fas fa-edit"></i>
                    <span>Updated {new Date(note.updated_at).toLocaleDateString()}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {note.can_edit !== false && (
              <div className="note-view-actions">
                <Link
                  to={`/notes/${note.id}/edit`}
                  className="note-view-action-btn action-edit"
                  title="Edit"
                >
                  <i className="fas fa-edit"></i>
                </Link>
                <Link
                  to={`/notes/${note.id}/share`}
                  className="note-view-action-btn action-share"
                  title="Share"
                >
                  <i className="fas fa-share-alt"></i>
                </Link>
                <button
                  type="button"
                  onClick={handleTogglePin}
                  className={`note-view-action-btn ${
                    note.pinned ? 'action-pin-active' : 'action-pin'
                  }`}
                  title={note.pinned ? 'Unpin' : 'Pin'}
                >
                  <i className="fas fa-thumbtack"></i>
                </button>
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`note-view-action-btn ${
                    note.favorite ? 'action-favorite-active' : 'action-favorite'
                  }`}
                  title={note.favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <i className="fas fa-heart"></i>
                </button>
                <button
                  type="button"
                  onClick={handleToggleArchive}
                  className={`note-view-action-btn ${
                    note.archived ? 'action-archive-active' : 'action-archive'
                  }`}
                  title={note.archived ? 'Unarchive' : 'Archive'}
                >
                  <i className="fas fa-archive"></i>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="note-view-action-btn action-delete"
                  title="Delete"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hide/Show Content Toggle */}
        <div className="note-view-toggle-section">
          <button
            type="button"
            onClick={toggleHideContent}
            className={`note-view-toggle-btn ${
              isContentHidden ? 'toggle-active' : 'toggle-inactive'
            }`}
          >
            <i className={`fas ${isContentHidden ? 'fa-eye' : 'fa-eye-slash'}`}></i>
            <span>{isContentHidden ? 'Show Content' : 'Hide Content'}</span>
          </button>
          {isContentHidden && (
            <span className="note-view-privacy-badge">
              <i className="fas fa-shield-alt"></i>
              <span>Content hidden for privacy</span>
            </span>
          )}
        </div>

        {isContentHidden ? (
          /* Hidden Content Placeholder */
          <div className="note-view-hidden-placeholder">
            <div className="note-view-hidden-icon">
              <i className="fas fa-eye-slash"></i>
            </div>
            <h3 className="note-view-hidden-title">Content Hidden</h3>
            <p className="note-view-hidden-text">
              This note's content is hidden for privacy. Click the button above to reveal it.
            </p>
            <button type="button" onClick={toggleHideContent} className="note-view-reveal-btn">
              <i className="fas fa-eye"></i>
              <span>Show Content</span>
            </button>
          </div>
        ) : (
          <>
            {/* AI Actions */}
            {note.body && (
              <div className="note-view-ai-section">
                <AIActions text={note.body} />
              </div>
            )}

            {/* Images */}
            {note.images && note.images.length > 0 && (
              <div className="note-view-images-section">
                <h3 className="note-view-images-title">
                  <i className="fas fa-images"></i>
                  <span>Attached Images ({note.images.length})</span>
                </h3>
                <div className="note-view-images-grid">
                  {note.images.map((image, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => handleImageClick(index)}
                      className="note-view-image-card group"
                    >
                      <img
                        src={image}
                        alt={`Attachment ${index + 1}`}
                        className="note-view-image"
                      />
                      <div className="note-view-image-overlay">
                        <i className="fas fa-search-plus"></i>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Note Content */}
            <div className="note-view-content-section">
              <div className="note-view-content prose prose-lg dark:prose-invert max-w-none">
                <Markdown remarkPlugins={[remarkGfm]}>{note.body || '*No content*'}</Markdown>
              </div>
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
        <div className="note-view-modal-overlay">
          <div className="note-view-modal">
            <div className="note-view-modal-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 className="note-view-modal-title">Delete Note?</h3>
            <p className="note-view-modal-text">
              Are you sure you want to delete "{note.title}"? This action cannot be undone.
            </p>
            <div className="note-view-modal-actions">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="note-view-modal-btn btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="note-view-modal-btn btn-delete"
              >
                <i className="fas fa-trash"></i>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
