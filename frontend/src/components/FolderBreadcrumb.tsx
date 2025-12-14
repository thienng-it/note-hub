import { useEffect, useState } from 'react';
import { foldersApi } from '../api/client';
import type { Folder } from '../types';

interface FolderBreadcrumbProps {
  folderId: number | null;
  onNavigate: (folder: Folder | null) => void;
}

export function FolderBreadcrumb({ folderId, onNavigate }: FolderBreadcrumbProps) {
  const [path, setPath] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!folderId) {
      setPath([]);
      return;
    }

    const loadPath = async () => {
      setIsLoading(true);
      try {
        const result = await foldersApi.getPath(folderId);
        setPath(result.path);
      } catch (error) {
        console.error('Failed to load folder path:', error);
        setPath([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPath();
  }, [folderId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <i className="fas fa-spinner fa-spin"></i>
      </div>
    );
  }

  if (path.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm overflow-x-auto">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
      >
        All Notes
      </button>
      {path.map((folder, index) => (
        <div key={folder.id} className="flex items-center gap-2">
          <i className="fas fa-chevron-right text-[var(--text-muted)]"></i>
          <button
            type="button"
            onClick={() => onNavigate(folder)}
            className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap ${
              index === path.length - 1
                ? 'text-[var(--text-primary)] font-medium'
                : 'text-[var(--text-secondary)]'
            }`}
            style={index === path.length - 1 ? { color: folder.color } : undefined}
          >
            {folder.name}
          </button>
        </div>
      ))}
    </div>
  );
}
