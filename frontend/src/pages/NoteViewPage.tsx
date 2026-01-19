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
      if (user?.hidden_notes) {
        const hiddenSet = new Set(JSON.parse(user.hidden_notes));
        return id ? hiddenSet.has(parseInt(id, 10)) : false;
      }
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
      setError(err instanceof Error ? err.message : t('notes.failedToLoadNote'));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  const handleTogglePin = async () => {
    if (!note) return;
    try {
      const updated = await offlineNotesApi.togglePinned(note);
      setNote(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notes.failedToUpdateNote'));
    }
  };

  const handleToggleFavorite = async () => {
    if (!note) return;
    try {
      const updated = await offlineNotesApi.toggleFavorite(note);
      setNote((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notes.failedToUpdateNote'));
    }
  };

  const handleToggleArchive = async () => {
    if (!note) return;
    try {
      const updated = await offlineNotesApi.toggleArchived(note);
      setNote(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notes.failedToUpdateNote'));
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    try {
      await offlineNotesApi.delete(note.id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notes.failedToDeleteNote'));
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
          {error || t('notes.noteNotFound')}
        </div>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
          <i className="glass-i fas fa-arrow-left mr-2"></i>
          {t('notes.backToNotes')}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-padding max-w-5xl mx-auto">
      {/* Header Navigation Link */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mr-3 group-hover:bg-[var(--bg-tertiary)] transition-colors">
            <i className="fas fa-arrow-left text-sm group-hover:-translate-x-0.5 transition-transform"></i>
          </div>
          <span className="font-medium text-sm">{t('common.backToNotes')}</span>
        </Link>
      </div>

      <div className="glass-panel overflow-hidden border border-[var(--border-color)] shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Main Note Header */}
        <div className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/30">
          {/* Top Bar: Title & Actions */}
          <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1 min-w-0 space-y-4">
              {/* Title and Badges */}
              <div className="flex items-start gap-3">
                <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] leading-tight tracking-tight break-words">
                  {note.title}
                </h1>

                {/* Status Icons */}
                <div className="flex items-center gap-2 mt-2 flex-shrink-0">
                  {note.pinned && (
                    <i
                      className="fas fa-thumbtack text-yellow-500 text-lg drop-shadow-sm"
                      title="Pinned"
                    ></i>
                  )}
                  {note.favorite && (
                    <i
                      className="fas fa-heart text-red-500 text-lg drop-shadow-sm"
                      title="Favorite"
                    ></i>
                  )}
                  {note.archived && (
                    <i
                      className="fas fa-archive text-gray-500 text-lg drop-shadow-sm"
                      title={t('notes.archived')}
                    ></i>
                  )}
                </div>
              </div>

              {/* Tags */}
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {note.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getTagColor(tag.name)}`}
                    >
                      <i className="fas fa-tag mr-1.5 opacity-70"></i>
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Toolbar */}
            {note.can_edit !== false && (
              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap bg-[var(--bg-primary)]/50 p-1.5 rounded-xl border border-[var(--border-color)] shadow-sm backdrop-blur-sm">
                <Link
                  to={`/notes/${note.id}/edit`}
                  className="p-2.5 rounded-lg text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-500/10 transition-all active:scale-95"
                  title={t('common.editTitle')}
                >
                  <i className="fas fa-edit text-lg"></i>
                </Link>
                <Link
                  to={`/notes/${note.id}/share`}
                  className="p-2.5 rounded-lg text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-500/10 transition-all active:scale-95"
                  title={t('common.shareTitle')}
                >
                  <i className="fas fa-share-alt text-lg"></i>
                </Link>
                <div className="w-px h-6 bg-[var(--border-color)] mx-0.5"></div>
                <button
                  type="button"
                  onClick={handleTogglePin}
                  className={`p-2.5 rounded-lg transition-all active:scale-95 ${
                    note.pinned
                      ? 'text-yellow-500 bg-yellow-500/10'
                      : 'text-[var(--text-secondary)] hover:text-yellow-500 hover:bg-yellow-500/10'
                  }`}
                  title={note.pinned ? t('notes.unpinTitle') : t('notes.pinTitle')}
                >
                  <i className="fas fa-thumbtack text-lg"></i>
                </button>
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`p-2.5 rounded-lg transition-all active:scale-95 ${
                    note.favorite
                      ? 'text-red-500 bg-red-500/10'
                      : 'text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10'
                  }`}
                  title={
                    note.favorite
                      ? t('notes.removeFromFavoritesTitle')
                      : t('notes.addToFavoritesTitle')
                  }
                >
                  <i className="fas fa-heart text-lg"></i>
                </button>
                <button
                  type="button"
                  onClick={handleToggleArchive}
                  className={`p-2.5 rounded-lg transition-all active:scale-95 ${
                    note.archived
                      ? 'text-gray-500 bg-gray-500/10'
                      : 'text-[var(--text-secondary)] hover:text-gray-500 hover:bg-gray-500/10'
                  }`}
                  title={note.archived ? t('notes.unarchiveTitle') : t('notes.archiveTitle')}
                >
                  <i className="fas fa-archive text-lg"></i>
                </button>
                <div className="w-px h-6 bg-[var(--border-color)] mx-0.5"></div>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2.5 rounded-lg text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-500/10 transition-all active:scale-95"
                  title={t('common.deleteTitle')}
                >
                  <i className="fas fa-trash text-lg"></i>
                </button>
              </div>
            )}
          </div>

          {/* Metadata Footer */}
          <div className="px-6 md:px-8 py-4 flex flex-wrap gap-y-2 gap-x-6 text-xs md:text-sm text-[var(--text-muted)] border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]/10">
            <span className="flex items-center gap-2">
              <i className="far fa-clock text-[var(--primary)]"></i>
              <span>{Math.ceil((note.body?.length || 0) / 1000)} min read</span>
            </span>
            {note.created_at && (
              <span className="flex items-center gap-2">
                <i className="far fa-calendar-plus text-[var(--primary)]"></i>
                <span>
                  {t('common.created')} {new Date(note.created_at).toLocaleDateString()}
                </span>
              </span>
            )}
            {note.updated_at && (
              <span className="flex items-center gap-2">
                <i className="far fa-edit text-[var(--primary)]"></i>
                <span>
                  {t('common.updated')} {new Date(note.updated_at).toLocaleDateString()}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Content Visibility Toggle */}
        <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] p-2 flex justify-end sticky top-0 z-10 backdrop-blur-md bg-opacity-80">
          <button
            type="button"
            onClick={toggleHideContent}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isContentHidden
                ? 'text-blue-600 bg-blue-500/10 hover:bg-blue-500/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <i
              className={`fas ${isContentHidden ? 'fa-eye' : 'fa-eye-slash'} ${isContentHidden ? '' : 'text-[var(--text-muted)]'}`}
            ></i>
            <span>{isContentHidden ? t('notes.showContent') : t('notes.hideContent')}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 md:p-10 bg-[var(--bg-primary)]">
          {isContentHidden ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6 shadow-inner">
                <i className="fas fa-eye-slash text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                {t('notes.contentHiddenTitle')}
              </h3>
              <p className="text-[var(--text-secondary)] mb-8 max-w-sm">
                {t('notes.contentHiddenMessage')}
              </p>
              <button
                type="button"
                onClick={toggleHideContent}
                className="btn-primary-glass inline-flex items-center"
              >
                <i className="fas fa-eye mr-2"></i>
                <span>{t('common.showContent')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* AI Actions */}
              {note.body && (
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-color)]">
                  <AIActions text={note.body} />
                </div>
              )}

              {/* Images Grid */}
              {note.images && note.images.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                    <i className="fas fa-images"></i>
                    {t('common.attachedImages', { count: note.images.length })}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {note.images.map((image, index) => (
                      <button
                        type="button"
                        key={image}
                        onClick={() => handleImageClick(index)}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:shadow-lg transition-all hover:scale-[1.02]"
                      >
                        <img
                          src={image}
                          alt={`Attachment ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <i className="fas fa-search-plus text-white text-2xl drop-shadow-md transform scale-50 group-hover:scale-100 transition-transform"></i>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Markdown Content */}
              <div
                className="prose prose-lg dark:prose-invert max-w-none 
                prose-headings:text-[var(--text-primary)] prose-headings:font-bold
                prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-[var(--bg-secondary)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-[var(--bg-secondary)] prose-pre:border prose-pre:border-[var(--border-color)]
                prose-img:rounded-xl prose-img:shadow-md
                prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-500/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
              "
              >
                <Markdown remarkPlugins={[remarkGfm]}>{note.body || '*No content*'}</Markdown>
              </div>
            </div>
          )}
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <i className="fas fa-trash-alt text-3xl text-red-500"></i>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Delete Note?</h3>
              <p className="text-[var(--text-secondary)] mb-6">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-[var(--text-primary)]">"{note.title}"</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium shadow-lg shadow-red-500/30 transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
