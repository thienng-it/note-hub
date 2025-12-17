import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Folder } from '../types';
import { ConfirmModal } from './Modal';

interface FolderItemProps {
  folder: Folder;
  level: number;
  selectedFolderId?: number | null;
  onSelect: (folder: Folder) => void;
  onCreate: (parentId: number) => void;
  onEdit: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  onMove?: (folder: Folder, newParentId: number | null) => void; // Optional for now, will be used in Phase 3 for drag-and-drop
}

// Icon mapping for folder icons
const FOLDER_ICONS: Record<string, JSX.Element> = {
  folder: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Folder"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  ),
  briefcase: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Briefcase"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  home: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Home"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  ),
  archive: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Archive"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
      />
    </svg>
  ),
  book: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Book"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
  star: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Star"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  ),
  heart: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Heart"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  ),
  code: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Code"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
      />
    </svg>
  ),
  tag: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Tag"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  ),
  inbox: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Inbox"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  ),
};

export function FolderItem({
  folder,
  level,
  selectedFolderId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onMove,
}: FolderItemProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(folder.is_expanded);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;
  const icon = FOLDER_ICONS[folder.icon] || FOLDER_ICONS.folder;

  const handleToggleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);

    // Persist expanded state to backend
    try {
      const { foldersApi } = await import('../api/client');
      await foldersApi.update(folder.id, { is_expanded: newExpandedState });
    } catch (error) {
      console.error('Failed to update folder expanded state:', error);
      // Revert on error
      setIsExpanded(!newExpandedState);
    }
  };

  const handleSelect = () => {
    onSelect(folder);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  const handleCreateSubfolder = () => {
    setShowMenu(false);
    onCreate(folder.id);
  };

  const handleEdit = () => {
    setShowMenu(false);
    onEdit(folder);
  };

  const handleDelete = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(folder);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete folder:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="folder-item" style={{ marginBottom: '0.5rem' }}>
      <div
        role="button"
        tabIndex={0}
        className={`flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer transition-all relative group ${
          isSelected
            ? 'bg-gradient-to-r from-blue-50/80 to-blue-100/80 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-200/50 dark:border-blue-700/50'
            : 'hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-gray-100/80 dark:hover:from-gray-700/50 dark:hover:to-gray-600/50 text-gray-700 dark:text-gray-300 backdrop-blur-sm'
        }`}
        style={{
          paddingLeft: `${level * 1.5 + 0.75}rem`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        onClick={handleSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelect();
          }
        }}
        onContextMenu={handleContextMenu}
      >
        {/* Expand/collapse arrow */}
        {hasChildren && (
          <button
            type="button"
            onClick={handleToggleExpand}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Spacer when no children */}
        {!hasChildren && <div className="w-5" />}

        {/* Folder icon with color */}
        <div style={{ color: folder.color }}>{icon}</div>

        {/* Folder name and count */}
        <div className="flex-1 flex items-center justify-between min-w-0">
          <span className="text-sm font-medium truncate">{folder.name}</span>
          {((folder.note_count ?? 0) > 0 || (folder.task_count ?? 0) > 0) && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              {(folder.note_count ?? 0) + (folder.task_count ?? 0)}
            </span>
          )}
        </div>

        {/* Context menu button - Always visible on mobile, hover on desktop */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/50 transition-all md:opacity-0 md:group-hover:opacity-100"
          style={{
            opacity: showMenu ? 1 : undefined,
          }}
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="Menu"
          >
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>

        {/* Context menu - Improved positioning and glassmorphism */}
        {showMenu && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 bg-transparent border-0 cursor-default"
              onClick={() => setShowMenu(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowMenu(false);
                }
              }}
              aria-label="Close menu"
            />
            <div
              className="absolute right-0 bottom-full mt-2 z-20 rounded-xl shadow-2xl border py-2 min-w-[180px] overflow-hidden"
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                borderColor: 'var(--glass-border)',
                boxShadow:
                  '0 20px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              <button
                type="button"
                onClick={handleCreateSubfolder}
                className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-folder-plus text-blue-600 dark:text-blue-400 w-4"></i>
                {t('folders.createSubfolder')}
              </button>
              <button
                type="button"
                onClick={handleEdit}
                className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-edit text-gray-600 dark:text-gray-400 w-4"></i>
                {t('folders.edit')}
              </button>
              <div className="my-1 border-t border-gray-200/50 dark:border-gray-700/50"></div>
              <button
                type="button"
                onClick={handleDelete}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-trash w-4"></i>
                {t('folders.delete')}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Children folders */}
      {isExpanded && hasChildren && (
        <div className="mt-1">
          {folder.children?.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onCreate={onCreate}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title={t('folders.deleteConfirm')}
        message={t('folders.deleteWarning')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={isDeleting}
      >
        <div className="text-center text-sm text-[var(--text-primary)] font-semibold">
          "{folder.name}"
        </div>
      </ConfirmModal>
    </div>
  );
}
