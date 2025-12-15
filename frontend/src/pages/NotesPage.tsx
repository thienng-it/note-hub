import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { foldersApi, notesApi, profileApi } from '../api/client';
import { FolderBreadcrumb } from '../components/FolderBreadcrumb';
import { FolderModal } from '../components/FolderModal';
import { FolderTree } from '../components/FolderTree';
import { useAuth } from '../context/AuthContext';
import type { Folder, Note, NoteViewType, Tag } from '../types';
import { getTagColor } from '../utils/tagColors';

export function NotesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [_allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') || '');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [folderParentId, setFolderParentId] = useState<number | null>(null);
  const [hiddenNotes, setHiddenNotes] = useState<Set<number>>(() => {
    try {
      // First try to load from user profile
      if (user?.hidden_notes) {
        return new Set(JSON.parse(user.hidden_notes));
      }
      // Fallback to localStorage for migration
      const saved = localStorage.getItem('hiddenNotes');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const syncHiddenNotesToBackend = async (hiddenNoteIds: number[]) => {
    try {
      await profileApi.updateHiddenNotes(hiddenNoteIds);
    } catch (err) {
      console.error('Failed to sync hidden notes:', err);
      // Silently fail - the user's local state is still updated
    }
  };

  const toggleHideNote = (noteId: number) => {
    setHiddenNotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      const hiddenArray = [...newSet];
      // Sync to backend
      syncHiddenNotesToBackend(hiddenArray);
      return newSet;
    });
  };

  const hideAllNotes = () => {
    const allNoteIds = new Set(notes.map((note) => note.id));
    setHiddenNotes(allNoteIds);
    const hiddenArray = [...allNoteIds];
    // Sync to backend
    syncHiddenNotesToBackend(hiddenArray);
  };

  const showAllNotes = () => {
    setHiddenNotes(new Set());
    // Sync to backend
    syncHiddenNotesToBackend([]);
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

  const loadFolders = useCallback(async () => {
    try {
      const { folders: fetchedFolders } = await foldersApi.list();
      setFolders(fetchedFolders);
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  }, []);

  useEffect(() => {
    loadNotes();
    loadFolders();
  }, [loadNotes, loadFolders]);

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

  // Folder handlers
  const handleSelectFolder = (folder: Folder | null) => {
    setSelectedFolder(folder);
  };

  const handleCreateFolder = (parentId?: number | null) => {
    setFolderParentId(parentId ?? null);
    setFolderToEdit(null);
    setShowFolderModal(true);
  };

  const handleEditFolder = (folder: Folder) => {
    setFolderToEdit(folder);
    setFolderParentId(folder.parent_id);
    setShowFolderModal(true);
  };

  const handleDeleteFolder = async (folder: Folder) => {
    if (!confirm(`${t('folders.deleteConfirm')}\n\n${t('folders.deleteWarning')}`)) {
      return;
    }
    try {
      await foldersApi.delete(folder.id);
      await loadFolders();
      if (selectedFolder?.id === folder.id) {
        setSelectedFolder(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('folders.deleteError'));
    }
  };

  const handleSaveFolder = async (name: string, icon: string, color: string) => {
    if (folderToEdit) {
      await foldersApi.update(folderToEdit.id, { name, icon, color });
    } else {
      await foldersApi.create({
        name,
        parent_id: folderParentId,
        icon,
        color,
      });
    }
    await loadFolders();
    setShowFolderModal(false);
    setFolderToEdit(null);
    setFolderParentId(null);
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

  return (
    <div className="flex gap-3 sm:gap-6 p-3 sm:p-6">
      {/* Folder Sidebar */}
      <div className="w-64 flex-shrink-0 hidden lg:block">
        <div className="glass-card p-4 rounded-xl sticky top-6">
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolder?.id}
            onSelectFolder={handleSelectFolder}
            onCreateFolder={handleCreateFolder}
            onEditFolder={handleEditFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveFolder={() => {
              // TODO: Implement folder move functionality in Phase 4
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header with Search */}
        <div className="space-y-4">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
                <i className={`fas ${getViewIcon()} mr-2 sm:mr-3 text-xl sm:text-2xl`}></i>
                <span className="text-[var(--text-primary)]">{getViewTitle()}</span>
              </h1>
              {/* Breadcrumb Navigation */}
              {selectedFolder && (
                <div className="mt-2">
                  <FolderBreadcrumb folderId={selectedFolder.id} onNavigate={handleSelectFolder} />
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm text-[var(--text-secondary)]">
                {notes.length} {t('common.notesCount')}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {notes.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={hideAllNotes}
                      className="btn-secondary-glass text-sm"
                      title={t('notes.hideAllNotes')}
                    >
                      <i className="glass-i fas fa-eye-slash mr-2"></i>
                      <span className="hidden sm:inline">{t('common.hideAll')}</span>
                      <span className="sm:hidden">Hide</span>
                    </button>
                    <button
                      type="button"
                      onClick={showAllNotes}
                      className="btn-secondary-glass text-sm"
                      title={t('notes.showAllNotes')}
                    >
                      <i className="glass-i fas fa-eye mr-2"></i>
                      <span className="hidden sm:inline">{t('common.showAll')}</span>
                      <span className="sm:hidden">Show</span>
                    </button>
                  </>
                )}
                <Link to="/notes/new" className="btn-apple">
                  <i className="glass-i fas fa-plus mr-2"></i>
                  <span className="hidden sm:inline">{t('common.addNote')}</span>
                  <span className="sm:hidden">New</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Search Form */}
          <div className="glass-panel p-3 sm:p-4">
            <form onSubmit={handleSearch} className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t('notes.searchPlaceholder')}
                      className="glass-input glass-input-with-icon w-full pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <i className="glass-i fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]"></i>
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <div className="relative">
                    <i className="glass-i fas fa-tag absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]"></i>
                    <input
                      type="text"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      placeholder={t('notes.filterByTag')}
                      className="glass-input glass-input-with-icon w-full pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-apple flex-1 sm:flex-none">
                  <i className="glass-i fas fa-search mr-2"></i>
                  <span>{t('common.search')}</span>
                </button>
                {(query || tagFilter) && (
                  <button type="button" onClick={clearSearch} className="btn-secondary-glass flex-1 sm:flex-none">
                    <i className="glass-i fas fa-times mr-2"></i>
                    <span>{t('common.clear')}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="glass-segmented overflow-x-auto">
          <Link to="/" className={`glass-segmented-item ${view === 'all' ? 'active' : ''}`}>
            <i className="glass-i fas fa-home mr-1 sm:mr-2"></i>
            <span className="text-sm sm:text-base">All</span>
          </Link>
          <Link
            to="/?view=favorites"
            className={`glass-segmented-item ${view === 'favorites' ? 'active' : ''}`}
          >
            <i className="glass-i fas fa-heart mr-1 sm:mr-2"></i>
            <span className="text-sm sm:text-base">Favorites</span>
          </Link>
          <Link
            to="/?view=archived"
            className={`glass-segmented-item ${view === 'archived' ? 'active' : ''}`}
          >
            <i className="glass-i fas fa-archive mr-1 sm:mr-2"></i>
            <span className="text-sm sm:text-base">{t('notes.archived')}</span>
          </Link>
          <Link
            to="/?view=shared"
            className={`glass-segmented-item ${view === 'shared' ? 'active' : ''}`}
          >
            <i className="glass-i fas fa-share-alt mr-1 sm:mr-2"></i>
            <span className="text-sm sm:text-base">Shared</span>
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
        ) : (
          (() => {
            // Filter notes by selected folder
            const filteredNotes = selectedFolder
              ? notes.filter((note) => note.folder_id === selectedFolder.id)
              : notes;

            return filteredNotes.length > 0 ? (
              /* Notes Grid */
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="glass-card p-3 sm:p-4 rounded-xl relative group">
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
              /* Empty State when filtered by folder */
              <div className="glass-card p-12 rounded-2xl text-center">
                <i className="glass-i fas fa-folder-open text-6xl mb-4 text-[var(--text-muted)]"></i>
                <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">
                  {selectedFolder ? `No notes in "${selectedFolder.name}"` : t('notes.noNotes')}
                </h3>
                <p className="text-[var(--text-secondary)] mb-6">
                  {selectedFolder
                    ? 'Create a note or move existing notes to this folder'
                    : 'Start creating notes to organize them'}
                </p>
                <Link to="/notes/new" className="btn-apple inline-flex items-center">
                  <i className="glass-i fas fa-plus mr-2"></i>
                  {t('common.addNote')}
                </Link>
              </div>
            );
          })()
        )}
      </div>

      {/* Folder Modal */}
      {showFolderModal && (
        <FolderModal
          folder={folderToEdit}
          parentId={folderParentId}
          onSave={handleSaveFolder}
          onClose={() => {
            setShowFolderModal(false);
            setFolderToEdit(null);
            setFolderParentId(null);
          }}
        />
      )}
    </div>
  );
}
