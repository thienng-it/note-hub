/**
 * Folder Types
 * TypeScript interfaces for folder-related data structures
 */

export interface Folder {
  id: number;
  name: string;
  user_id: number;
  parent_id: number | null;
  description?: string;
  icon: string;
  color: string;
  position: number;
  is_expanded: boolean;
  created_at: string;
  updated_at: string;
  note_count?: number;
  task_count?: number;
  children?: Folder[];
}

export interface FolderPath {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface CreateFolderRequest {
  name: string;
  parent_id?: number | null;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
}

export interface UpdateFolderRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
  is_expanded?: boolean;
}

export interface MoveFolderRequest {
  parent_id: number | null;
}

export interface FolderListResponse {
  folders: Folder[];
  total: number;
}

export interface FolderResponse {
  folder: Folder;
  message?: string;
}

export interface FolderPathResponse {
  path: FolderPath[];
}

// Folder icon options
export const FOLDER_ICONS = [
  'folder',
  'briefcase',
  'home',
  'book',
  'code',
  'heart',
  'star',
  'tag',
  'archive',
  'inbox',
] as const;

export type FolderIcon = (typeof FOLDER_ICONS)[number];

// Folder color options
export const FOLDER_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Yellow', value: '#FBBF24' },
] as const;
