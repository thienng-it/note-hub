import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import { Link, useNavigate, useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { notesApi } from '../api/client';
import { AIActions } from '../components/AIActions';
import { ImageUpload } from '../components/ImageUpload';
import type { Note } from '../types';
import { type NoteTemplate, noteTemplates } from '../utils/templates';

export function NoteEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [archived, setArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(isNew);
  const [hasAppliedTemplate, setHasAppliedTemplate] = useState(false);

  const loadNote = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const note = await notesApi.get(parseInt(id, 10));
      setTitle(note.title);
      setBody(note.body);
      setTags(note.tags.map((t) => t.name).join(', '));
      setImages(note.images || []);
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
      const data = { title: title.trim(), body, tags, images, pinned, favorite, archived };
      let note: Note;

      if (isNew) {
        note = await notesApi.create(data);
      } else {
        if (!id) throw new Error('Note ID is required');
        note = await notesApi.update(parseInt(id, 10), data);
      }

      navigate(`/notes/${note.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const applyTemplate = (template: NoteTemplate) => {
    setTitle(template.title);
    setBody(template.body);
    setTags(template.tags);
    setShowTemplates(false);
    setHasAppliedTemplate(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <i className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600"></i>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to={id ? `/notes/${id}` : '/'}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <i className="glass-i fas fa-arrow-left mr-2"></i>
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
              <i className="glass-i fas fa-exclamation-triangle mr-2"></i>
              {error}
            </div>
          )}

          {/* Template Selection - Only show for new notes */}
          {isNew && (
            <>
              {showTemplates ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      <i className="glass-i fas fa-magic mr-2 text-purple-600"></i>
                      Choose a Template
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowTemplates(false)}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <i className="glass-i fas fa-times mr-1"></i>
                      Skip templates
                    </button>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Start with a pre-formatted template or create a blank note
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {noteTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="glass-card p-4 rounded-xl text-left hover:shadow-lg transition-all hover:scale-[1.02] border border-[var(--border-color)] hover:border-blue-500"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <i className={`glass-i fas ${template.icon} text-blue-600`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                              {template.name}
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                hasAppliedTemplate && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                      <i className="glass-i fas fa-check-circle mr-2"></i>
                      Template applied! You can customize it below.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTemplates(true);
                        setHasAppliedTemplate(false);
                      }}
                      className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                    >
                      Choose different template
                    </button>
                  </div>
                )
              )}
              {!showTemplates && !hasAppliedTemplate && (
                <button
                  type="button"
                  onClick={() => setShowTemplates(true)}
                  className="w-full p-3 rounded-lg border-2 border-dashed border-[var(--border-color)] hover:border-blue-500 text-[var(--text-muted)] hover:text-blue-600 transition-colors"
                >
                  <i className="glass-i fas fa-magic mr-2"></i>
                  Use a template
                </button>
              )}
            </>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-[var(--text-primary)] mb-2"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('notes.noteTitlePlaceholder')}
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-[var(--text-primary)] mb-2"
            >
              Tags
            </label>
            <div className="relative">
              <i className="glass-i fas fa-tags absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]"></i>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('notes.tagsPlaceholder')}
              />
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Separate multiple tags with commas
            </p>
          </div>

          {/* Images */}
          <ImageUpload images={images} onImagesChange={setImages} maxImages={5} />

          {/* AI Actions */}
          {body.trim() && !showPreview && (
            <AIActions text={body} onApply={(newText) => setBody(newText)} className="mb-4" />
          )}

          {/* Content with Preview Toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="body"
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
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
              <div className="glass-input min-h-[300px] md:min-h-[400px] lg:min-h-[500px] p-4 rounded-lg prose prose-lg dark:prose-invert max-w-none overflow-auto note-content">
                <Markdown remarkPlugins={[remarkGfm]}>{body || '*No content to preview*'}</Markdown>
              </div>
            ) : (
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="glass-input w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px] md:min-h-[400px] lg:min-h-[500px] font-mono text-sm resize-y"
                placeholder={t('notes.contentPlaceholderMarkdown')}
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
                <i className="glass-i fas fa-thumbtack text-yellow-500 mr-1"></i>
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
                <i className="glass-i fas fa-heart text-red-500 mr-1"></i>
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
                <i className="glass-i fas fa-archive text-gray-500 mr-1"></i>
                {t('notes.archived')}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[var(--border-color)]">
            <Link to={id ? `/notes/${id}` : '/'} className="btn-secondary-glass">
              Cancel
            </Link>
            <button type="submit" disabled={isSaving} className="btn-apple">
              {isSaving ? (
                <>
                  <i className="glass-i fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="glass-i fas fa-save mr-2"></i>
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
