import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { foldersApi } from '../api/folders';
import type { Folder } from '../types/folder';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  folder?: Folder | null; // If editing existing folder
  parentFolder?: Folder | null; // If creating subfolder
}

const FOLDER_ICONS = ['📁', '📂', '📋', '📌', '🗂️', '📦', '🎯', '⭐', '💼', '🏠', '🔥', '✨'];
const FOLDER_COLORS = [
  '#6b7280', // gray
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
];

export function FolderModal({
  isOpen,
  onClose,
  onSuccess,
  folder,
  parentFolder,
}: FolderModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#6b7280');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes or folder changes
  useEffect(() => {
    if (isOpen) {
      if (folder) {
        // Editing existing folder
        setName(folder.name);
        setIcon(folder.icon || '📁');
        setColor(folder.color || '#6b7280');
      } else {
        // Creating new folder
        setName('');
        setIcon('📁');
        setColor('#6b7280');
      }
      setError('');
    }
  }, [isOpen, folder]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t('folders.nameRequired', 'Folder name is required'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (folder) {
        // Update existing folder
        await foldersApi.update(folder.id, {
          name: name.trim(),
          icon,
          color,
        });
      } else {
        // Create new folder
        await foldersApi.create({
          name: name.trim(),
          parent_id: parentFolder?.id || null,
          icon,
          color,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Folder operation failed:', err);
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-neutral-900 dark:text-neutral-100">
          {folder
            ? t('folders.editFolder', 'Edit Folder')
            : parentFolder
              ? t('folders.createSubfolder', 'Create Subfolder')
              : t('folders.createFolder', 'Create Folder')}
        </h2>

        {parentFolder && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('folders.parentFolder', 'Parent folder')}: <strong>{parentFolder.name}</strong>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="folder-name"
              className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300"
            >
              {t('folders.folderName', 'Folder Name')}
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              placeholder={t('folders.folderNamePlaceholder', 'Enter folder name')}
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
              {t('folders.icon', 'Icon')}
            </label>
            <div className="grid grid-cols-6 gap-2">
              {FOLDER_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`p-2 text-2xl rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    icon === emoji ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500' : ''
                  }`}
                  disabled={isLoading}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
              {t('folders.color', 'Color')}
            </label>
            <div className="grid grid-cols-7 gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full ${
                    color === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  disabled={isLoading}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
              disabled={isLoading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading
                ? t('common.saving', 'Saving...')
                : folder
                  ? t('common.save')
                  : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
