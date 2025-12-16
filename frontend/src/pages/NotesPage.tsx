import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { foldersApi, notesApi, profileApi } from '../api/client';
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

  // Mobile folder drawer state
  const [isFolderDrawerOpen, setIsFolderDrawerOpen] = useState(false);

  return (
    <div className="flex gap-3 sm:gap-6 p-3 sm:p-6">
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
      <div className="flex-1 space-y-4 sm:space-y-6 min-w-0">
        {/* Header with Search */}
        <div className="space-y-4 sm:space-y-4">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative group">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('notes.searchPlaceholder')}
                    className="glass-input glass-input-with-icon w-full pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 border border-[var(--border-color)] focus:border-blue-400"
                  />
                  <i className="glass-i fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 text-sm"></i>
                </div>
              </div>
              <div className="flex-1">
                <div className="relative group">
                  <i className="glass-i fas fa-tag absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 text-sm"></i>
                  <input
                    type="text"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    placeholder={t('notes.filterByTag')}
                    className="glass-input glass-input-with-icon w-full pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 border border-[var(--border-color)] focus:border-purple-400"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="relative group">
                  {notes.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={hiddenNotes.size === 0 ? hideAllNotes : showAllNotes}
                        className="btn-secondary-glass text-xs sm:text-sm touch-no-select"
                        title={t(
                          hiddenNotes.size === 0 ? 'notes.hideAllNotes' : 'notes.showAllNotes',
                        )}
                      >
                        <i
                          className={
                            hiddenNotes.size === 0
                              ? 'glass-i fas fa-eye-slash'
                              : 'glass-i fas fa-eye' + ' mr-1 sm:mr-2'
                          }
                        ></i>
                        <span className="hidden xs:inline sm:hidden">
                          {hiddenNotes.size === 0 ? 'Hide' : 'Show'}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {(query || tagFilter) && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="btn-secondary-glass flex-1 sm:flex-none shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <i className="glass-i fas fa-times mr-2"></i>
                  <span>{t('common.clear')}</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 sm:p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            <i className="glass-i fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
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
              <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="glass-card p-4 sm:p-5 rounded-2xl relative group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ease-out border border-[var(--border-color)] hover:border-blue-400"
                  >
                    {/* Pin and Favorite Icons */}
                    <div className="absolute top-4 right-4 flex space-x-2 z-10">
                      {note.pinned && (
                        <span
                          className="text-yellow-500 drop-shadow-lg text-lg"
                          title={t('notes.pinned')}
                        >
                          <i className="glass-i fas fa-thumbtack"></i>
                        </span>
                      )}
                      {note.favorite && (
                        <span
                          className="text-red-500 drop-shadow-lg text-lg"
                          title={t('notes.favorite')}
                        >
                          <i className="glass-i fas fa-heart"></i>
                        </span>
                      )}
                      {note.archived && (
                        <span
                          className="text-gray-500 drop-shadow-lg text-lg"
                          title={t('notes.archived')}
                        >
                          <i className="glass-i fas fa-archive"></i>
                        </span>
                      )}
                    </div>

                    {/* Note Content */}
                    <div className="mb-4">
                      {/* Quick Actions */}
                      <div className="opacity-100 transition-all duration-300 flex space-x-1.5">
                        <button
                          type="button"
                          onClick={() => toggleHideNote(note.id)}
                          className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${hiddenNotes.has(note.id) ? 'text-purple-600 hover:text-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30'}`}
                          title={hiddenNotes.has(note.id) ? 'Show content' : 'Hide content'}
                        >
                          <i
                            className={`glass-i fas ${hiddenNotes.has(note.id) ? 'fa-eye' : 'fa-eye-slash'} text-sm`}
                          ></i>
                        </button>
                        <Link
                          to={`/notes/${note.id}/edit`}
                          className="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 hover:scale-110"
                          title={t('notes.editTooltip')}
                        >
                          <i className="glass-i fas fa-edit text-sm"></i>
                        </Link>
                        <Link
                          to={`/notes/${note.id}/share`}
                          className="p-2 rounded-lg text-green-600 hover:text-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-200 hover:scale-110"
                          title={t('notes.shareTooltip')}
                        >
                          <i className="glass-i fas fa-share-alt text-sm"></i>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(note)}
                          className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${note.favorite ? 'text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/30' : 'text-gray-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30'}`}
                          title={note.favorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <i className="glass-i fas fa-heart text-sm"></i>
                        </button>
                      </div>
                      <div className="flex items-center justify-between mb-3 pr-12">
                        <h3 className="font-bold text-xl line-clamp-2">
                          <Link
                            to={`/notes/${note.id}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 text-[var(--text-primary)] hover:underline decoration-2 underline-offset-4"
                          >
                            {note.title}
                          </Link>
                        </h3>
                      </div>

                      {hiddenNotes.has(note.id) ? (
                        <div className="relative overflow-hidden rounded-xl mb-3 backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-300/30 shadow-inner">
                          <div className="flex flex-col items-center justify-center py-6 px-4">
                            <div className="mb-3 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center backdrop-blur-sm border border-purple-400/30">
                              <i className="fas fa-eye-slash text-purple-600 dark:text-purple-400 text-xl"></i>
                            </div>
                            <span className="text-sm font-medium text-[var(--text-secondary)] mb-3 text-center">
                              Content hidden for privacy
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                toggleHideNote(note.id);
                              }}
                              className="btn-apple text-sm px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                            >
                              <i className="fas fa-eye mr-2"></i>
                              Show Content
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {note.excerpt && (
                            <p className="text-sm line-clamp-3 mb-4 text-[var(--text-secondary)] leading-relaxed">
                              {note.excerpt}
                            </p>
                          )}

                          {/* Tags */}
                          {note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {note.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag.id}
                                  className={`glass-span px-3 py-1.5 text-xs font-semibold rounded-full border shadow-sm hover:shadow-md transition-shadow ${getTagColor(tag.name)}`}
                                >
                                  <i className="fas fa-tag mr-1 text-[0.65rem]"></i>
                                  {tag.name}
                                </span>
                              ))}
                              {note.tags.length > 3 && (
                                <span className="text-xs text-[var(--text-muted)] font-medium px-2 py-1.5">
                                  +{note.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-color)]">
                      <div className="flex items-center space-x-4">
                        <span
                          title={t('notes.readingTime')}
                          className="flex items-center font-medium"
                        >
                          <i className="glass-i fas fa-clock mr-1.5 text-blue-500"></i>
                          {note.reading_time || Math.ceil((note.body?.length || 0) / 1000)}m read
                        </span>
                        <span
                          title={t('notes.lastUpdated')}
                          className="flex items-center font-medium"
                        >
                          <i className="glass-i fas fa-calendar-alt mr-1.5 text-purple-500"></i>
                          {note.updated_at
                            ? new Date(note.updated_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : ''}
                        </span>
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
