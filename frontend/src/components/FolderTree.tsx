import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { foldersApi } from '../api/folders';
import type { Folder } from '../types/folder';
import { websocketClient } from '../services/websocketClient';

interface FolderTreeProps {
  selectedFolderId?: number | null;
  onFolderSelect: (folderId: number | null) => void;
  onCreateFolder?: () => void;
}

export function FolderTree({ selectedFolderId, onFolderSelect, onCreateFolder }: FolderTreeProps) {
  const { t } = useTranslation();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null>(null);

  const loadFolders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await foldersApi.list();
      setFolders(response.folders);

      // Auto-expand folders that were previously expanded or have selected child
      const newExpanded = new Set<number>();
      response.folders.forEach((folder) => {
        if (folder.is_expanded) {
          newExpanded.add(folder.id);
        }
      });
      setExpandedFolders(newExpanded);
    } catch (err) {
      console.error('Failed to load folders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();

    // Listen for real-time folder updates
    const handleFolderCreated = () => {
      loadFolders();
    };

    const handleFolderUpdated = () => {
      loadFolders();
    };

    const handleFolderDeleted = () => {
      loadFolders();
    };

    websocketClient.on('folder-created', handleFolderCreated);
    websocketClient.on('folder-updated', handleFolderUpdated);
    websocketClient.on('folder-deleted', handleFolderDeleted);

    return () => {
      websocketClient.off('folder-created', handleFolderCreated);
      websocketClient.off('folder-updated', handleFolderUpdated);
      websocketClient.off('folder-deleted', handleFolderDeleted);
    };
  }, [loadFolders]);

  const toggleFolder = async (folderId: number) => {
    const isExpanded = expandedFolders.has(folderId);
    const newExpanded = new Set(expandedFolders);

    if (isExpanded) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }

    setExpandedFolders(newExpanded);

    // Persist expansion state to backend
    try {
      await foldersApi.update(folderId, { is_expanded: !isExpanded });
    } catch (err) {
      console.error('Failed to update folder expansion state:', err);
    }
  };

  const handleDrop = async (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    try {
      const noteId = e.dataTransfer.getData('noteId');
      if (noteId) {
        await foldersApi.moveNote(Number.parseInt(noteId, 10), folderId);
        loadFolders();
      }
    } catch (err) {
      console.error('Failed to move note to folder:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
  };

  const renderFolder = (folder: Folder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folders.some((f) => f.parent_id === folder.id);
    const isDragOver = dragOverFolderId === folder.id;

    const indentStyle = {
      paddingLeft: `${level * 1.5 + 0.5}rem`,
    };

    return (
      <div key={folder.id} className="folder-item">
        <div
          className={`folder-row flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
            isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''
          } ${isDragOver ? 'bg-blue-200 dark:bg-blue-800/50 border-2 border-blue-400' : ''}`}
          style={indentStyle}
          onClick={() => onFolderSelect(folder.id)}
          onDrop={(e) => handleDrop(e, folder.id)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
        >
          {hasChildren && (
            <button
              type="button"
              className="w-4 h-4 flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="w-4" />}

          {folder.icon && <span className="text-lg">{folder.icon}</span>}

          <span
            className="flex-1 text-sm truncate"
            style={folder.color ? { color: folder.color } : undefined}
          >
            {folder.name}
          </span>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {folder.note_count !== undefined && folder.note_count > 0 && (
              <span className="bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                {folder.note_count}
              </span>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="folder-children">
            {folders
              .filter((f) => f.parent_id === folder.id)
              .sort((a, b) => a.position - b.position)
              .map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-neutral-500">
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p className="text-sm">{error}</p>
        <button
          type="button"
          onClick={loadFolders}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const rootFolders = folders.filter((f) => !f.parent_id).sort((a, b) => a.position - b.position);

  return (
    <div className="folder-tree">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          {t('folders.title', 'Folders')}
        </h3>
        {onCreateFolder && (
          <button
            type="button"
            onClick={onCreateFolder}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            title={t('folders.create', 'Create folder')}
          >
            +
          </button>
        )}
      </div>

      <div className="folder-list">
        <div
          className={`folder-row flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
            selectedFolderId === null ? 'bg-blue-100 dark:bg-blue-900/30' : ''
          }`}
          onClick={() => onFolderSelect(null)}
        >
          <span className="text-lg">📁</span>
          <span className="flex-1 text-sm">{t('folders.allNotes', 'All Notes')}</span>
        </div>

        {rootFolders.map((folder) => renderFolder(folder))}

        {folders.length === 0 && (
          <div className="p-4 text-center text-neutral-500 text-sm">
            {t('folders.empty', 'No folders yet')}
          </div>
        )}
      </div>
    </div>
  );
}
