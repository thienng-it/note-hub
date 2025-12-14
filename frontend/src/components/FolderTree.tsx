import { useTranslation } from 'react-i18next';
import type { Folder } from '../types';
import { FolderItem } from './FolderItem';

interface FolderTreeProps {
  folders: Folder[];
  selectedFolderId?: number | null;
  onSelectFolder: (folder: Folder | null) => void;
  onCreateFolder: (parentId?: number | null) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onMoveFolder: (folder: Folder, newParentId: number | null) => void;
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onMoveFolder,
}: FolderTreeProps) {
  const { t } = useTranslation();

  return (
    <div className="folder-tree">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('folders.title')}
        </h3>
        <button
          type="button"
          onClick={() => onCreateFolder(null)}
          className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
          title={t('folders.createNew')}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-label="Add folder"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="space-y-1">
        {/* All Notes - special item */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            selectedFolderId === null
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
          onClick={() => onSelectFolder(null)}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-label="All Notes"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <span className="text-sm font-medium">{t('folders.allNotes')}</span>
        </div>

        {/* Folder tree */}
        {folders.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('folders.empty')}
          </div>
        ) : (
          folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              level={0}
              selectedFolderId={selectedFolderId}
              onSelect={onSelectFolder}
              onCreate={onCreateFolder}
              onEdit={onEditFolder}
              onDelete={onDeleteFolder}
              onMove={onMoveFolder}
            />
          ))
        )}
      </div>
    </div>
  );
}
