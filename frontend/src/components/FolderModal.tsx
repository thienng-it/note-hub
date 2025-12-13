import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Folder } from '../types';

interface FolderModalProps {
  folder?: Folder | null;
  parentId?: number | null;
  onSave: (name: string, icon: string, color: string) => Promise<void>;
  onClose: () => void;
}

const FOLDER_ICONS = [
  { value: 'folder', label: 'Folder', icon: '📁' },
  { value: 'briefcase', label: 'Briefcase', icon: '💼' },
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'archive', label: 'Archive', icon: '📦' },
  { value: 'book', label: 'Book', icon: '📚' },
  { value: 'star', label: 'Star', icon: '⭐' },
  { value: 'heart', label: 'Heart', icon: '❤️' },
  { value: 'code', label: 'Code', icon: '💻' },
  { value: 'tag', label: 'Tag', icon: '🏷️' },
  { value: 'inbox', label: 'Inbox', icon: '📥' },
];

const FOLDER_COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#6B7280', label: 'Gray' },
  { value: '#14B8A6', label: 'Teal' },
];

export function FolderModal({ folder, onSave, onClose }: FolderModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(folder?.name || '');
  const [icon, setIcon] = useState(folder?.icon || 'folder');
  const [color, setColor] = useState(folder?.color || '#3B82F6');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('folders.nameRequired'));
      return;
    }

    if (name.length > 100) {
      setError(t('folders.nameTooLong'));
      return;
    }

    setIsLoading(true);
    try {
      await onSave(name.trim(), icon, color);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('folders.createError'));
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card p-6 rounded-2xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
          {folder ? t('folders.edit') : t('folders.createNew')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <div>
            <label htmlFor="folderName" className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
              {t('folders.name')}
            </label>
            <input
              id="folderName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('folders.namePlaceholder')}
              className="glass-input w-full px-4 py-2 rounded-lg"
              autoFocus
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
              {t('folders.icon')}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {FOLDER_ICONS.map((iconOption) => (
                <button
                  key={iconOption.value}
                  type="button"
                  onClick={() => setIcon(iconOption.value)}
                  className={`p-3 rounded-lg text-2xl transition-all ${
                    icon === iconOption.value
                      ? 'bg-blue-500/20 border-2 border-blue-500'
                      : 'glass-card hover:bg-blue-500/10 border-2 border-transparent'
                  }`}
                  title={iconOption.label}
                >
                  {iconOption.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
              {t('folders.color')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`w-10 h-10 rounded-full border-2 transition-transform ${
                    color === colorOption.value
                      ? 'border-white scale-110 shadow-lg'
                      : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.label}
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn-secondary-glass"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-apple"
            >
              {isLoading ? t('common.processing') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
