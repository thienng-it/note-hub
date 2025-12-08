import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { notesApi } from '../api/client';
import type { Note, NoteViewType, Tag } from '../types';
import { getTagColor } from '../utils/tagColors';

export function NotesPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') || '');
  const [hiddenNotes, setHiddenNotes] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('hiddenNotes');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleHideNote = (noteId: number) => {
    setHiddenNotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      try {
        localStorage.setItem('hiddenNotes', JSON.stringify([...newSet]));
      } catch {
        // Silently fail if localStorage is unavailable (e.g., private browsing, storage full)
      }
      return newSet;
    });
  };

  const hideAllNotes = () => {
    const allNoteIds = new Set(notes.map((note) => note.id));
    setHiddenNotes(allNoteIds);
    try {
      localStorage.setItem('hiddenNotes', JSON.stringify([...allNoteIds]));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  };

  const showAllNotes = () => {
    setHiddenNotes(new Set());
    try {
      localStorage.setItem('hiddenNotes', JSON.stringify([]));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  };

  const view = (searchParams.get('view') || 'all') as NoteViewType;

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const fetchedNotes = await notesApi.list(view, query, tagFilter);
      setNotes(fetchedNotes);

      // Extract unique tags with counts
      const tagMap = new Map<string, { id: number; name: string; count: number }>();
      fetchedNotes.forEach((note) => {
        note.tags.forEach((tag) => {
          const existing = tagMap.get(tag.name);
          if (existing) {
            existing.count++;
          } else {
            tagMap.set(tag.name, { id: tag.id, name: tag.name, count: 1 });
          }
        });
      });
      setAllTags(
        Array.from(tagMap.values())
          .map((t) => ({ id: t.id, name: t.name, note_count: t.count }))
          .sort((a, b) => (b.note_count || 0) - (a.note_count || 0)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [view, query, tagFilter]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query && query.trim().length < 3) {
      setError('Search query must be at least 3 characters long.');
      return;
    }
    const params = new URLSearchParams();
    if (view !== 'all') params.set('view', view);
    if (query.trim()) params.set('q', query.trim());
    if (tagFilter.trim()) params.set('tag', tagFilter.trim());
    setSearchParams(params);
  };

  const clearSearch = () => {
    setQuery('');
    setTagFilter('');
    const params = new URLSearchParams();
    if (view !== 'all') params.set('view', view);
    setSearchParams(params);
  };

  const handleToggleFavorite = async (note: Note) => {
    try {
      const updated = await notesApi.toggleFavorite(note);
      // Update the note in the list while preserving all fields
      setNotes((prevNotes) => prevNotes.map((n) => (n.id === note.id ? { ...n, ...updated } : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    }
  };

  const getViewIcon = () => {
    switch (view) {
      case 'favorites':
        return 'fa-heart text-red-500';
      case 'archived':
        return 'fa-archive text-[var(--text-secondary)]';
      case 'shared':
        return 'fa-share-alt text-green-600';
      default:
        return 'fa-home text-blue-600';
    }
  };

  const getViewTitle = () => {
    switch (view) {
      case 'favorites':
        return t('notes.favorites');
      case 'archived':
        return t('notes.archivedNotes');
      case 'shared':
        return t('notes.sharedWithMe');
      default:
        return t('notes.allNotes');
    }
  };

  const getEmptyState = (): {
    icon: string;
    title: string;
    description: string;
    action: { label: string; to?: string; onClick?: () => void };
  } => {
    if (query || tagFilter) {
      return {
        icon: 'fa-search',
        title: 'No notes found',
        description: 'Try adjusting your search criteria',
        action: { label: 'Clear Search', onClick: clearSearch },
      };
    }
    switch (view) {
      case 'favorites':
        return {
          icon: 'fa-heart',
          title: 'No favorite notes yet',
          description: 'Mark notes as favorites to see them here',
          action: { label: 'View All Notes', to: '/' },
        };
      case 'archived':
        return {
          icon: 'fa-archive',
          title: t('notes.noNotes'),
          description: t('notes.archivedDescription'),
          action: { label: t('notes.allNotes'), to: '/' },
        };
      case 'shared':
        return {
          icon: 'fa-share-alt',
          title: 'No shared notes',
          description: 'Notes shared with you will appear here',
          action: { label: 'View All Notes', to: '/' },
        };
      default:
        return {
          icon: 'fa-sticky-note',
          title: 'No notes yet',
          description: 'Create your first note to get started',
          action: { label: 'Create Your First Note', to: '/notes/new' },
        };
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold flex items-center">
            <i className={`fas ${getViewIcon()} mr-3`}></i>
            <span className="text-[var(--text-primary)]">{getViewTitle()}</span>
          </h1>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-[var(--text-secondary)]">{notes.length} {t('common.notesCount')}</span>
            {notes.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={hideAllNotes}
                  className="btn-secondary-glass text-sm"
                  title={t('notes.hideAllNotes')}
                >
                  <i className="glass-i fas fa-eye-slash mr-2"></i>{t('common.hideAll')}
                </button>
                <button
                  type="button"
                  onClick={showAllNotes}
                  className="btn-secondary-glass text-sm"
                  title={t('notes.showAllNotes')}
                >
                  <i className="glass-i fas fa-eye mr-2"></i>{t('common.showAll')}
                </button>
              </div>
            )}
            <Link to="/notes/new" className="btn-apple">
              <i className="glass-i fas fa-plus mr-2"></i>{t('common.addNote')}
            </Link>
          </div>
        </div>

        {/* Search Form */}
        <div className="glass-card shadow-sm p-4 border bg-[var(--bg-secondary)] border-[var(--border-color)]">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('notes.searchPlaceholder')}
                  className="glass-input w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <i className="glass-i fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]"></i>
              </div>
            </div>
            <div className="sm:w-48">
              <div className="relative">
                <i className="glass-i fas fa-tag absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]"></i>
                <input
                  type="text"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  placeholder={t('notes.filterByTag')}
                  className="glass-input w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button type="submit" className="btn-apple">
              <i className="glass-i fas fa-search mr-2"></i>
              <span>{t('common.search')}</span>
            </button>
            {(query || tagFilter) && (
              <button type="button" onClick={clearSearch} className="btn-secondary-glass">
                <i className="glass-i fas fa-times mr-2"></i>
                <span>{t('common.clear')}</span>
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Quick Filter Tabs */}
      <div className="glass-card flex space-x-1 p-1 rounded-lg bg-[var(--bg-tertiary)]">
        <Link
          to="/"
          className={`flex-1 text-center py-2 px-4 rounded-md transition-all ${
            view === 'all'
              ? 'shadow-sm text-blue-600 dark:text-blue-400 bg-[var(--bg-secondary)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <i className="glass-i fas fa-home mr-2"></i>All
        </Link>
        <Link
          to="/?view=favorites"
          className={`flex-1 text-center py-2 px-4 rounded-md transition-all ${
            view === 'favorites'
              ? 'shadow-sm text-red-600 dark:text-red-400 bg-[var(--bg-secondary)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <i className="glass-i fas fa-heart mr-2"></i>Favorites
        </Link>
        <Link
          to="/?view=archived"
          className={`flex-1 text-center py-2 px-4 rounded-md transition-all ${
            view === 'archived'
              ? 'shadow-sm bg-[var(--bg-secondary)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <i className="glass-i fas fa-archive mr-2"></i>
          {t('notes.archived')}
        </Link>
        <Link
          to="/?view=shared"
          className={`flex-1 text-center py-2 px-4 rounded-md transition-all ${
            view === 'shared'
              ? 'shadow-sm text-green-600 dark:text-green-400 bg-[var(--bg-secondary)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <i className="glass-i fas fa-share-alt mr-2"></i>Shared
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
          <i className="glass-i fas fa-exclamation-triangle mr-2"></i>
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <i className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600"></i>
        </div>
      ) : notes.length > 0 ? (
        /* Notes Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {notes.map((note) => (
            <div key={note.id} className="glass-card p-4 rounded-xl relative group">
              {/* Pin and Favorite Icons */}
              <div className="absolute top-3 right-3 flex space-x-2">
                {note.pinned && (
                  <span className="text-yellow-500" title={t('notes.pinned')}>
                    <i className="glass-i fas fa-thumbtack"></i>
                  </span>
                )}
                {note.favorite && (
                  <span className="text-red-500" title={t('notes.favorite')}>
                    <i className="glass-i fas fa-heart"></i>
                  </span>
                )}
                {note.archived && (
                  <span className="text-gray-500" title={t('notes.archived')}>
                    <i className="glass-i fas fa-archive"></i>
                  </span>
                )}
              </div>

              {/* Note Content */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2 pr-12">
                  <h3 className="font-semibold text-lg line-clamp-1">
                    <Link
                      to={`/notes/${note.id}`}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-[var(--text-primary)]"
                    >
                      {note.title}
                    </Link>
                  </h3>
                </div>

                {hiddenNotes.has(note.id) ? (
                  <div className="flex items-center justify-center py-4 bg-[var(--bg-tertiary)] rounded-lg mb-3">
                    <i className="fas fa-eye-slash text-[var(--text-muted)] mr-2"></i>
                    <span className="text-sm text-[var(--text-muted)]">Content hidden</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleHideNote(note.id);
                      }}
                      className="ml-3 text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    >
                      Show
                    </button>
                  </div>
                ) : (
                  <>
                    {note.excerpt && (
                      <p className="text-sm line-clamp-3 mb-3 text-[var(--text-secondary)]">
                        {note.excerpt}
                      </p>
                    )}

                    {/* Tags */}
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className={`px-2 py-1 text-xs font-medium rounded-full border ${getTagColor(tag.name)}`}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-xs text-[var(--text-muted)]">
                            +{note.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <div className="flex items-center space-x-3">
                  <span title={t('notes.readingTime')}>
                    <i className="glass-i fas fa-clock mr-1"></i>
                    {note.reading_time || Math.ceil((note.body?.length || 0) / 1000)}m
                  </span>
                  <span title={t('notes.lastUpdated')}>
                    {note.updated_at
                      ? new Date(note.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : ''}
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                  <button
                    type="button"
                    onClick={() => toggleHideNote(note.id)}
                    className={`${hiddenNotes.has(note.id) ? 'text-purple-600 hover:text-purple-800' : 'text-gray-400 hover:text-purple-600'} transition-colors`}
                    title={hiddenNotes.has(note.id) ? 'Show content' : 'Hide content'}
                  >
                    <i
                      className={`glass-i fas ${hiddenNotes.has(note.id) ? 'fa-eye' : 'fa-eye-slash'}`}
                    ></i>
                  </button>
                  <Link
                    to={`/notes/${note.id}/edit`}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title={t('notes.editTooltip')}
                  >
                    <i className="glass-i fas fa-edit"></i>
                  </Link>
                  <Link
                    to={`/notes/${note.id}/share`}
                    className="text-green-600 hover:text-green-800 transition-colors"
                    title={t('notes.shareTooltip')}
                  >
                    <i className="glass-i fas fa-share-alt"></i>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(note)}
                    className={`${note.favorite ? 'text-red-600 hover:text-red-800' : 'text-gray-400 hover:text-red-600'} transition-colors`}
                    title={note.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <i className="glass-i fas fa-heart"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-card glass-div-center">
          <div className="max-w-md mx-auto">
            {(() => {
              const emptyState = getEmptyState();
              return (
                <>
                  <i
                    className={`fas ${emptyState.icon} text-6xl mb-4 text-[var(--text-muted)]`}
                  ></i>
                  <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">
                    {emptyState.title}
                  </h3>
                  <p className="mb-6 text-[var(--text-secondary)]">{emptyState.description}</p>
                  {emptyState.action.to ? (
                    <Link
                      to={emptyState.action.to}
                      className="btn-apple inline-flex items-center px-6 py-3 rounded-lg"
                    >
                      <i className="glass-i fas fa-plus mr-2"></i>
                      {emptyState.action.label}
                    </Link>
                  ) : emptyState.action.onClick ? (
                    <button
                      type="button"
                      onClick={emptyState.action.onClick}
                      className="btn-apple inline-flex items-center px-6 py-3 rounded-lg"
                    >
                      <i className="glass-i fas fa-times mr-2"></i>
                      {emptyState.action.label}
                    </button>
                  ) : null}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tags Sidebar */}
      {allTags.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-[var(--text-primary)]">
            <i className="glass-i fas fa-tags mr-2 text-blue-600"></i>Popular Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 10).map((tag) => (
              <button
                type="button"
                key={tag.id}
                onClick={() => {
                  setTagFilter(tag.name);
                  const params = new URLSearchParams();
                  if (view !== 'all') params.set('view', view);
                  params.set('tag', tag.name);
                  setSearchParams(params);
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-transform hover:scale-105 ${getTagColor(tag.name)}`}
              >
                {tag.name}
                <span className="ml-1 opacity-75">({tag.note_count})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
