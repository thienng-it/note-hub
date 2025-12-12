/**
 * Folder API Client
 * Handles all folder-related API requests
 */

import type {
  CreateFolderRequest,
  FolderListResponse,
  FolderPathResponse,
  FolderResponse,
  MoveFolderRequest,
  UpdateFolderRequest,
} from '../types/folder';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_VERSION = '/api/v1';

/**
 * Get authorization header with JWT token
 */
function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('notehub_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Handle API response errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const foldersApi = {
  /**
   * List all folders for the current user
   */
  async list(): Promise<FolderListResponse> {
    const response = await fetch(`${API_URL}${API_VERSION}/folders`, {
      headers: getAuthHeader(),
    });
    return handleResponse<FolderListResponse>(response);
  },

  /**
   * Get a specific folder by ID
   */
  async get(folderId: number): Promise<FolderResponse> {
    const response = await fetch(`${API_URL}${API_VERSION}/folders/${folderId}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<FolderResponse>(response);
  },

  /**
   * Get folder breadcrumb path
   */
  async getPath(folderId: number): Promise<FolderPathResponse> {
    const response = await fetch(`${API_URL}${API_VERSION}/folders/${folderId}/path`, {
      headers: getAuthHeader(),
    });
    return handleResponse<FolderPathResponse>(response);
  },

  /**
   * Create a new folder
   */
  async create(data: CreateFolderRequest): Promise<FolderResponse> {
    const response = await fetch(`${API_URL}${API_VERSION}/folders`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<FolderResponse>(response);
  },

  /**
   * Update a folder
   */
  async update(folderId: number, data: UpdateFolderRequest): Promise<FolderResponse> {
    const response = await fetch(`${API_URL}${API_VERSION}/folders/${folderId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<FolderResponse>(response);
  },

  /**
   * Move a folder to a new parent
   */
  async move(folderId: number, data: MoveFolderRequest): Promise<FolderResponse> {
    const response = await fetch(`${API_URL}${API_VERSION}/folders/${folderId}/move`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<FolderResponse>(response);
  },

  /**
   * Delete a folder
   */
  async delete(folderId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}${API_VERSION}/folders/${folderId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<{ message: string }>(response);
  },

  /**
   * Move a note to a folder
   */
  async moveNote(
    noteId: number,
    folderId: number | null,
  ): Promise<{ message: string; folder_id: number | null }> {
    const response = await fetch(`${API_URL}${API_VERSION}/notes/${noteId}/move`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ folder_id: folderId }),
    });
    return handleResponse<{ message: string; folder_id: number | null }>(response);
  },
};
