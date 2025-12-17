import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { foldersApi, notesApi, profileApi } from '../api/client';
import { FolderBreadcrumb } from '../components/FolderBreadcrumb';
import { FolderModal } from '../components/FolderModal';
import { FolderSidebar } from '../components/FolderSidebar';
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

  // Mobile folder drawer state
  const [isFolderDrawerOpen, setIsFolderDrawerOpen] = useState(false);

  return (
    <div className="flex gap-3 sm:gap-6 p-3 sm:p-6 page-padding">
      {/* Folder Sidebar - Responsive */}
      <FolderSidebar
        folders={folders}
        selectedFolder={selectedFolder}
        onSelectFolder={handleSelectFolder}
        onCreateFolder={handleCreateFolder}
        onEditFolder={handleEditFolder}
        onDeleteFolder={handleDeleteFolder}
        isOpen={isFolderDrawerOpen}
        onToggle={() => setIsFolderDrawerOpen(!isFolderDrawerOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Modern Header Section */}
        <div className="modern-search-card">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <div
                  className={`modern-icon-badge ${view === 'favorites' ? 'bg-gradient-to-br from-red-500 to-pink-500' : view === 'archived' ? 'bg-gradient-to-br from-gray-500 to-gray-600' : view === 'shared' ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}
                >
                  <i
                    className={`fas ${getViewIcon().replace('text-red-500', '').replace('text-[var(--text-secondary)]', '').replace('text-green-600', '').replace('text-blue-600', '').trim()} text-white`}
                  ></i>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] truncate">
                  {getViewTitle()}
                </h1>
              </div>
              {/* Breadcrumb Navigation */}
              {selectedFolder && (
                <div className="ml-1">
                  <FolderBreadcrumb folderId={selectedFolder.id} onNavigate={handleSelectFolder} />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="modern-stat-badge">
                <i className="glass-i fas fa-file-alt text-blue-500 mr-2"></i>
                <span className="font-semibold">{notes.length}&nbsp;</span>
                <span className="hidden sm:inline ml-1">{t('common.notesCount')}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {notes.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={hiddenNotes.size === 0 ? hideAllNotes : showAllNotes}
                    className="modern-btn-secondary"
                    title={t(hiddenNotes.size === 0 ? 'notes.hideAllNotes' : 'notes.showAllNotes')}
                  >
                    <i
                      className={`glass-i fas ${hiddenNotes.size === 0 ? 'fa-eye' : 'fa-eye-slash'}`}
                    ></i>
                    <span className="hidden sm:inline">
                      {t(hiddenNotes.size === 0 ? 'common.hideAll' : 'common.showAll')}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modern Search Section */}
        <div className="modern-search-card">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2">
                <div className="modern-input-group">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('notes.searchPlaceholder')}
                    className="modern-input"
                  />
                </div>
              </div>
              <div>
                <div className="modern-input-group">
                  <input
                    type="text"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    placeholder={t('notes.filterByTag')}
                    className="modern-input"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {(query || tagFilter) && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="modern-btn-secondary flex-1 sm:flex-none"
                >
                  <i className="glass-i fas fa-times mr-2"></i>
                  <span>{t('common.clear')}</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Modern Filter Tabs */}
        <div className="modern-filter-tabs">
          <Link to="/" className={`modern-filter-tab ${view === 'all' ? 'active' : ''}`}>
            <i className="glass-i fas fa-home mr-2"></i>
            <span>All</span>
          </Link>
          <Link
            to="/?view=favorites"
            className={`modern-filter-tab ${view === 'favorites' ? 'active' : ''}`}
          >
            <i className="glass-i fas fa-heart mr-2"></i>
            <span>Favorites</span>
          </Link>
          <Link
            to="/?view=archived"
            className={`modern-filter-tab ${view === 'archived' ? 'active' : ''}`}
          >
            <i className="glass-i fas fa-archive mr-2"></i>
            <span>{t('notes.archived')}</span>
          </Link>
          <Link
            to="/?view=shared"
            className={`modern-filter-tab ${view === 'shared' ? 'active' : ''}`}
          >
            <i className="glass-i fas fa-share-alt mr-2"></i>
            <span>Shared</span>
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="modern-error-alert">
            <i className="glass-i fas fa-exclamation-triangle mr-3"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="modern-spinner">
              <i className="glass-i fas fa-circle-notch fa-spin text-5xl text-blue-500"></i>
            </div>
          </div>
        ) : (
          (() => {
            // Filter notes by selected folder
            const filteredNotes = selectedFolder
              ? notes.filter((note) => note.folder_id === selectedFolder.id)
              : notes;

            return filteredNotes.length > 0 ? (
              /* Modern Notes Grid */
              <div className="modern-notes-grid">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="modern-note-card group">
                    {/* Status Badges */}
                    <div className="modern-note-badges">
                      {note.pinned && (
                        <div className="modern-badge badge-pinned" title={t('notes.pinned')}>
                          <i className="glass-i fas fa-thumbtack"></i>
                        </div>
                      )}
                      {note.favorite && (
                        <div className="modern-badge badge-favorite" title={t('notes.favorite')}>
                          <i className="glass-i fas fa-heart"></i>
                        </div>
                      )}
                      {note.archived && (
                        <div className="modern-badge badge-archived" title={t('notes.archived')}>
                          <i className="glass-i fas fa-archive"></i>
                        </div>
                      )}
                    </div>

                    {/* Note Content */}
                    <div className="modern-note-content">
                      <h3 className="modern-note-title">
                        <Link to={`/notes/${note.id}`} className="modern-note-link">
                          {note.title}
                        </Link>
                      </h3>

                      {hiddenNotes.has(note.id) ? (
                        <div className="modern-hidden-content">
                          <div className="modern-hidden-icon">
                            <i className="glass-i fas fa-eye-slash text-2xl"></i>
                          </div>
                          <span className="modern-hidden-text">Content hidden for privacy</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleHideNote(note.id);
                            }}
                            className="btn-apple"
                          >
                            <i className="glass-i fas fa-eye mr-2"></i>
                            Show Content
                          </button>
                        </div>
                      ) : (
                        <>
                          {note.excerpt && <p className="modern-note-excerpt">{note.excerpt}</p>}

                          {/* Tags */}
                          {note.tags.length > 0 && (
                            <div className="modern-note-tags">
                              {note.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag.id}
                                  className={`modern-tag ${getTagColor(tag.name)}`}
                                >
                                  <i className="glass-i fas fa-tag mr-1"></i>
                                  {tag.name}
                                </span>
                              ))}
                              {note.tags.length > 3 && (
                                <span className="modern-tag-more">+{note.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="modern-note-footer">
                      <div className="modern-note-meta">
                        <span className="modern-meta-item">
                          <i className="glass-i fas fa-clock mr-1.5 text-blue-500"></i>
                          {note.reading_time || Math.ceil((note.body?.length || 0) / 1000)}m
                        </span>
                        <span className="modern-meta-item">
                          <i className="glass-i fas fa-calendar-alt mr-1.5 text-purple-500"></i>
                          {note.updated_at
                            ? new Date(note.updated_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>

                      {/* Quick Actions */}
                      <div className="modern-note-actions">
                        <button
                          type="button"
                          onClick={() => toggleHideNote(note.id)}
                          className={`modern-action-btn ${hiddenNotes.has(note.id) ? 'action-active action-purple' : 'action-default'}`}
                          title={hiddenNotes.has(note.id) ? 'Show content' : 'Hide content'}
                        >
                          <i
                            className={`fas ${hiddenNotes.has(note.id) ? 'fa-eye' : 'fa-eye-slash'}`}
                          ></i>
                        </button>
                        <Link
                          to={`/notes/${note.id}/edit`}
                          className="modern-action-btn action-default hover:action-blue"
                          title={t('notes.editTooltip')}
                        >
                          <i className="glass-i fas fa-edit"></i>
                        </Link>
                        <Link
                          to={`/notes/${note.id}/share`}
                          className="modern-action-btn action-default hover:action-green"
                          title={t('notes.shareTooltip')}
                        >
                          <i className="glass-i fas fa-share-alt"></i>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(note)}
                          className={`modern-action-btn ${note.favorite ? 'action-active action-red' : 'action-default'}`}
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
              /* Modern Empty State */
              <div className="modern-empty-state">
                <div className="modern-empty-icon">
                  <i className="glass-i fas fa-folder-open"></i>
                </div>
                <h3 className="modern-empty-title">
                  {selectedFolder ? `No notes in "${selectedFolder.name}"` : t('notes.noNotes')}
                </h3>
                <p className="modern-empty-text">
                  {selectedFolder
                    ? 'Create a note or move existing notes to this folder'
                    : 'Start creating notes to organize them'}
                </p>
                <Link to="/notes/new" className="btn-apple mt-4">
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
