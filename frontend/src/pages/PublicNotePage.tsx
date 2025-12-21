import { useCallback, useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { Link, useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { publicApi } from '../api/client';
import { ImageModal } from '../components/ImageModal';
import type { Note } from '../types';
import { getTagColor } from '../utils/tagColors';

export function PublicNotePage() {
  const { token } = useParams<{ token: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await publicApi.getSharedNote(token);
      setNote(res.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Shared note not found');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] p-4">
        <div className="glass-card p-8 rounded-2xl text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i>
          <p className="text-[var(--text-secondary)]">Loading shared note...</p>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] p-6 flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl w-full max-w-2xl">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 flex items-start">
            <i className="fas fa-exclamation-triangle mr-3 mt-0.5"></i>
            <div>
              <h3 className="font-medium">Error loading note</h3>
              <p className="text-sm mt-1">
                {error || 'The shared note could not be found or is no longer available.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/login" className="btn-primary px-4 py-2 text-sm">
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Sign in
                </Link>
                <Link to="/" className="btn-secondary-glass px-4 py-2 text-sm">
                  <i className="fas fa-home mr-2"></i>
                  Go to homepage
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-white/10">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] truncate">
                {note.title}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2">
                {note.tags?.map((tag) => (
                  <span key={tag.id} className={`modern-tag ${getTagColor(tag.name)}`}>
                    <i className="fas fa-tag mr-1"></i>
                    {tag.name}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-xs text-[var(--text-muted)] flex flex-wrap gap-4">
                {note.updated_at && (
                  <span>
                    <i className="glass-i fas fa-clock mr-1"></i>
                    Updated {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Link to="/login" className="btn-secondary-glass">
                <i className="fas fa-sign-in-alt mr-2"></i>
                Login
              </Link>
            </div>
          </div>

          {note.images && note.images.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Attachments</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {note.images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => handleImageClick(index)}
                    className="group relative overflow-hidden rounded-xl border border-white/10 hover:border-blue-400/30 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={image}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center">
                        View <i className="fas fa-expand ml-1 text-xs"></i>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="prose prose-lg dark:prose-invert max-w-none mt-8 p-4 rounded-xl bg-white/5 border border-white/5">
            <Markdown remarkPlugins={[remarkGfm]}>{note.body || '*No content*'}</Markdown>
          </div>
        </div>
      </div>

      {showImageModal && note?.images && (
        <ImageModal
          images={note.images}
          currentIndex={currentImageIndex}
          onClose={() => setShowImageModal(false)}
          onNext={handleNextImage}
          onPrev={handlePrevImage}
        />
      )}
    </div>
  );
}
