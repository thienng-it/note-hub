import { useTranslation } from 'react-i18next';
import type { Folder } from '../types';
import { FolderTree } from './FolderTree';

interface FolderSidebarProps {
  folders: Folder[];
  selectedFolder: Folder | null;
  onSelectFolder: (folder: Folder | null) => void;
  onCreateFolder: (parentId?: number | null) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onMoveFolder?: (folder: Folder, newParentId: number | null) => void;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * FolderSidebar - A responsive folder navigation component
 *
 * Features:
 * - Mobile: Slide-out drawer from left with backdrop
 * - Tablet: Collapsible sidebar or drawer based on screen size
 * - Desktop: Fixed sticky sidebar on the left
 *
 * @param folders - Array of folders to display
 * @param selectedFolder - Currently selected folder
 * @param onSelectFolder - Callback when a folder is selected
 * @param onCreateFolder - Callback to create a new folder
 * @param onEditFolder - Callback to edit a folder
 * @param onDeleteFolder - Callback to delete a folder
 * @param onMoveFolder - Callback to move a folder (optional)
 * @param isOpen - Whether the mobile drawer is open
 * @param onToggle - Callback to toggle the mobile drawer
 */
export function FolderSidebar({
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onMoveFolder,
  isOpen,
  onToggle,
}: FolderSidebarProps) {
  const { t } = useTranslation();

  const handleSelectFolder = (folder: Folder | null) => {
    onSelectFolder(folder);
    // Close mobile drawer after selection
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile/Tablet Drawer Backdrop */}
      <button
        type="button"
        className={`mobile-drawer-backdrop lg:hidden ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        onKeyDown={(e) => e.key === 'Escape' && onToggle()}
        aria-label={t('folders.closeDrawer') || 'Close folder drawer'}
      />

      {/* Mobile/Tablet Drawer */}
      <aside
        className={`folder-sidebar-mobile ${isOpen ? 'open' : ''}`}
        aria-label={t('folders.navigation') || 'Folder navigation'}
      >
        <div className="folder-sidebar-header">
          <h2 className="folder-sidebar-title">
            <i className="fas fa-folder mr-2 text-blue-600" aria-hidden="true"></i>
            {t('folders.title') || 'Folders'}
          </h2>
          <button
            type="button"
            onClick={onToggle}
            className="folder-sidebar-close-btn"
            aria-label={t('folders.close') || 'Close folders'}
          >
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <FolderTree
          folders={folders}
          selectedFolderId={selectedFolder?.id}
          onSelectFolder={handleSelectFolder}
          onCreateFolder={onCreateFolder}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
          onMoveFolder={
            onMoveFolder ||
            (() => {
              /* Not implemented */
            })
          }
        />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className="folder-sidebar-desktop"
        aria-label={t('folders.navigation') || 'Folder navigation'}
      >
        <div className="folder-sidebar-content">
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolder?.id}
            onSelectFolder={onSelectFolder}
            onCreateFolder={onCreateFolder}
            onEditFolder={onEditFolder}
            onDeleteFolder={onDeleteFolder}
            onMoveFolder={
              onMoveFolder ||
              (() => {
                /* Not implemented */
              })
            }
          />
        </div>
      </aside>

      {/* Mobile Toggle Button - Floating */}
      <button
        type="button"
        onClick={onToggle}
        className="folder-sidebar-toggle-btn"
        aria-label={t('folders.open') || 'Open folders'}
      >
        <i className="fas fa-folder" aria-hidden="true"></i>
      </button>
    </>
  );
}
