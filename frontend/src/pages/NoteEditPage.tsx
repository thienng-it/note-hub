import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { notesApi } from '../api/client';
import type { Note } from '../types';

export function NoteEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [pinned, setPinned] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [archived, setArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const loadNote = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const note = await notesApi.get(parseInt(id));
      setTitle(note.title);
      setBody(note.body);
      setTags(note.tags.map(t => t.name).join(', '));
      setPinned(note.pinned);
      setFavorite(note.favorite);
      setArchived(note.archived);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load note');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadNote();
    }
  }, [id, loadNote]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const data = { title: title.trim(), body, tags, pinned, favorite, archived };
      let note: Note;

      if (isNew) {
        note = await notesApi.create(data);
      } else {
        note = await notesApi.update(parseInt(id!), data);
      }

      navigate(`/notes/${note.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to={id ? `/notes/${id}` : '/'} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <i className="fas fa-arrow-left mr-2"></i>
          {id ? 'Back to Note' : 'Back to Notes'}
        </Link>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[var(--border-color)]">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            <i className={`fas ${isNew ? 'fa-plus' : 'fa-edit'} mr-2 text-blue-600`}></i>
            {isNew ? 'Create New Note' : 'Edit Note'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter note title"
              required
              autoFocus
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Tags
            </label>
            <div className="relative">
              <i className="fas fa-tags absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]"></i>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="work, personal, ideas (comma-separated)"
              />
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Separate multiple tags with commas
            </p>
          </div>

          {/* Content with Preview Toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="body" className="block text-sm font-medium text-[var(--text-primary)]">
                Content (Markdown supported)
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <i className={`fas fa-${showPreview ? 'edit' : 'eye'} mr-1`}></i>
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>

            {showPreview ? (
              <div className="glass-input min-h-[300px] p-4 rounded-lg prose prose-lg dark:prose-invert max-w-none overflow-auto note-content">
                <Markdown remarkPlugins={[remarkGfm]}>
                  {body || '*No content to preview*'}
                </Markdown>
              </div>
            ) : (
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="glass-input w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px] font-mono text-sm resize-y"
                placeholder="Write your note here... Markdown is supported!"
              />
            )}
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-[var(--text-primary)]">
                <i className="fas fa-thumbtack text-yellow-500 mr-1"></i>
                Pinned
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-[var(--text-primary)]">
                <i className="fas fa-heart text-red-500 mr-1"></i>
                Favorite
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => setArchived(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-[var(--text-primary)]">
                <i className="fas fa-archive text-gray-500 mr-1"></i>
                Archived
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[var(--border-color)]">
            <Link
              to={id ? `/notes/${id}` : '/'}
              className="px-6 py-3 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  {isNew ? 'Create Note' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
