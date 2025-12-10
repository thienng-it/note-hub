import type {
  AIOperationResult,
  AIRewriteStyle,
  AIStatus,
  LoginCredentials,
  LoginResponse,
  Note,
  NoteFormData,
  NoteResponse,
  NotesResponse,
  NoteViewType,
  Task,
  TaskFilterType,
  TaskFormData,
  TaskResponse,
  TasksResponse,
  User,
  UsersResponse,
} from '../types';

// Use relative URL in production (same origin), absolute in development
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
// Use API v1 for new standardized response format
const API_VERSION = '/api/v1';

// Export API_VERSION and API_BASE_URL for use in other modules
export { API_VERSION, API_BASE_URL };

// Token storage
const TOKEN_KEY = 'notehub_access_token';
const REFRESH_TOKEN_KEY = 'notehub_refresh_token';
const USER_KEY = 'notehub_user';

export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const getStoredRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);
export const getStoredUser = (): User | null => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const setStoredAuth = (accessToken: string, refreshToken: string, user: User): void => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Alias for compatibility
export const storeAuthData = setStoredAuth;

export const clearStoredAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// HTTP client with auth headers
// Handles v1 API responses with standardized format
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 - try to refresh token
  if (response.status === 401 && getStoredRefreshToken()) {
    const refreshed = await refreshToken();
    if (refreshed) {
      // Retry request with new token
      const newToken = getStoredToken();
      const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
      if (!retryResponse.ok) {
        const errorData = await retryResponse
          .json()
          .catch(() => ({ error: { message: 'Request failed' } }));
        // Handle v1 error format
        const errorMessage = errorData.error?.message || errorData.error || 'Request failed';
        throw new Error(errorMessage);
      }
      const data = await retryResponse.json();
      // Extract data from v1 response format if present
      return (data.success !== undefined ? data.data : data) as T;
    } else {
      clearStoredAuth();
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
    // Handle v1 error format
    const errorMessage = errorData.error?.message || errorData.error || 'Request failed';
    throw new Error(errorMessage);
  }

  const data = await response.json();
  // Extract data from v1 response format if present
  return (data.success !== undefined ? data.data : data) as T;
}

// Refresh token with rotation support
async function refreshToken(): Promise<boolean> {
  const refresh = getStoredRefreshToken();
  if (!refresh) return false;

  try {
    const response = await fetch(`${API_BASE_URL}${API_VERSION}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    // Handle v1 response format
    const responseData = data.success ? data.data : data;
    const accessToken = responseData.access_token;
    localStorage.setItem(TOKEN_KEY, accessToken);

    // Store new refresh token if rotation occurred
    if (responseData.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, responseData.refresh_token);
    }

    return true;
  } catch {
    return false;
  }
}

// Auth API
export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}${API_VERSION}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle v1 error format
      const errorMessage = result.error?.message || result.error || 'Login failed';
      const requires2fa = result.error?.details?.requires_2fa || result.requires_2fa;
      throw { error: errorMessage, requires_2fa: requires2fa, status: response.status };
    }

    // Handle v1 response format
    const data = result.success ? result.data : result;
    setStoredAuth(data.access_token, data.refresh_token, data.user);
    return data;
  },

  async validate(): Promise<{ valid: boolean; user: User }> {
    return apiRequest(`${API_VERSION}/auth/validate`);
  },

  logout(): void {
    clearStoredAuth();
  },

  async register(data: {
    username: string;
    email?: string;
    password: string;
    password_confirm: string;
  }): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}${API_VERSION}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Registration failed');
    }

    return result;
  },

  async forgotPassword(username: string): Promise<{
    requires_2fa?: boolean;
    reset_token?: string;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}${API_VERSION}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }

    return result;
  },

  async forgotPasswordVerify2FA(
    username: string,
    totpCode: string,
  ): Promise<{ reset_token?: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}${API_VERSION}/auth/forgot-password/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, totp_code: totpCode }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Verification failed');
    }

    return result;
  },

  async resetPassword(data: {
    token: string;
    password: string;
    password_confirm: string;
  }): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}${API_VERSION}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Password reset failed');
    }

    return result;
  },

  // GitHub OAuth
  async getGitHubAuthStatus(): Promise<{ enabled: boolean }> {
    return apiRequest(`${API_VERSION}/auth/github/status`);
  },

  async getGitHubAuthUrl(): Promise<{ auth_url: string; state: string }> {
    return apiRequest(`${API_VERSION}/auth/github`);
  },

  async githubCallback(code: string, state: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}${API_VERSION}/auth/github/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'GitHub authentication failed');
    }

    setStoredAuth(result.access_token, result.refresh_token, result.user);
    return result;
  },
};

// Profile API
export const profileApi = {
  async get(): Promise<{ user: User }> {
    return apiRequest(`${API_VERSION}/profile`);
  },

  async update(data: Partial<User>): Promise<{ user: User; message: string }> {
    return apiRequest(`${API_VERSION}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateHiddenNotes(hiddenNoteIds: number[]): Promise<{ user: User; message: string }> {
    return apiRequest(`${API_VERSION}/profile`, {
      method: 'PUT',
      body: JSON.stringify({ hidden_notes: JSON.stringify(hiddenNoteIds) }),
    });
  },
};

// Notes API
export const notesApi = {
  async list(view: NoteViewType = 'all', query?: string, tag?: string): Promise<Note[]> {
    const params = new URLSearchParams({ view });
    if (query) params.append('q', query);
    if (tag) params.append('tag', tag);

    const response = await apiRequest<NotesResponse>(`${API_VERSION}/notes?${params}`);
    return response.notes;
  },

  async get(id: number): Promise<Note> {
    const response = await apiRequest<NoteResponse>(`${API_VERSION}/notes/${id}`);
    return response.note;
  },

  async create(data: NoteFormData): Promise<Note> {
    const response = await apiRequest<NoteResponse>(`${API_VERSION}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.note;
  },

  async update(
    id: number,
    data: Partial<NoteFormData & { pinned?: boolean; favorite?: boolean; archived?: boolean }>,
  ): Promise<Note> {
    const response = await apiRequest<NoteResponse>(`${API_VERSION}/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.note;
  },

  async delete(id: number): Promise<void> {
    await apiRequest(`${API_VERSION}/notes/${id}`, { method: 'DELETE' });
  },

  async toggleFavorite(note: Note): Promise<Note> {
    return this.update(note.id, { favorite: !note.favorite });
  },

  async togglePinned(note: Note): Promise<Note> {
    return this.update(note.id, { pinned: !note.pinned });
  },

  async toggleArchived(note: Note): Promise<Note> {
    return this.update(note.id, { archived: !note.archived });
  },
};

// Tasks API
export const tasksApi = {
  async list(filter: TaskFilterType = 'all'): Promise<Task[]> {
    const params = new URLSearchParams({ filter });
    const response = await apiRequest<TasksResponse>(`${API_VERSION}/tasks?${params}`);
    return response.tasks;
  },

  async get(id: number): Promise<Task> {
    const response = await apiRequest<TaskResponse>(`${API_VERSION}/tasks/${id}`);
    return response.task;
  },

  async create(data: TaskFormData): Promise<Task> {
    const response = await apiRequest<TaskResponse>(`${API_VERSION}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.task;
  },

  async update(id: number, data: Partial<TaskFormData & { completed?: boolean }>): Promise<Task> {
    const response = await apiRequest<TaskResponse>(`${API_VERSION}/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.task;
  },

  async delete(id: number): Promise<void> {
    await apiRequest(`${API_VERSION}/tasks/${id}`, { method: 'DELETE' });
  },

  async toggleComplete(task: Task): Promise<Task> {
    return this.update(task.id, { completed: !task.completed });
  },
};

// Health check
export const healthApi = {
  async check(): Promise<{ status: string }> {
    return apiRequest(`${API_VERSION}/health`);
  },
};

// Version API
export const versionApi = {
  async get(): Promise<{ version: string; name: string; description: string }> {
    return apiRequest(`${API_VERSION}/version`);
  },
};

// Generic API client for custom endpoints
export const apiClient = {
  async get<T = unknown>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint);
  },

  async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async patch<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async delete<T = unknown>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'DELETE' });
  },
};

// AI API
export const aiApi = {
  async getStatus(): Promise<AIStatus> {
    return apiRequest(`${API_VERSION}/ai/status`);
  },

  async proofread(text: string): Promise<string> {
    const result = await apiRequest<AIOperationResult>(`${API_VERSION}/ai/proofread`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    return result.result;
  },

  async summarize(text: string): Promise<string> {
    const result = await apiRequest<AIOperationResult>(`${API_VERSION}/ai/summarize`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    return result.result;
  },

  async rewrite(text: string, style: AIRewriteStyle = 'professional'): Promise<string> {
    const result = await apiRequest<AIOperationResult>(`${API_VERSION}/ai/rewrite`, {
      method: 'POST',
      body: JSON.stringify({ text, style }),
    });
    return result.result;
  },
};

export const adminApi = {
  async getUsers(params: URLSearchParams): Promise<UsersResponse> {
    return apiRequest<UsersResponse>(`${API_VERSION}/admin/users?${params}`);
  },

  async disable2fa(userId: number): Promise<void> {
    await apiRequest(`${API_VERSION}/admin/users/${userId}/disable-2fa`, {
      method: 'POST',
    });
  },

  async lockUser(userId: number): Promise<void> {
    await apiRequest(`${API_VERSION}/admin/users/${userId}/lock`, {
      method: 'POST',
    });
  },

  async unlockUser(userId: number): Promise<void> {
    await apiRequest(`${API_VERSION}/admin/users/${userId}/unlock`, {
      method: 'POST',
    });
  },

  async deleteUser(userId: number): Promise<void> {
    await apiRequest(`${API_VERSION}/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async grantAdmin(userId: number): Promise<void> {
    await apiRequest(`${API_VERSION}/admin/users/${userId}/grant-admin`, {
      method: 'POST',
    });
  },

  async revokeAdmin(userId: number): Promise<void> {
    await apiRequest(`${API_VERSION}/admin/users/${userId}/revoke-admin`, {
      method: 'POST',
    });
  },
};

// Upload API
export const uploadApi = {
  async uploadImage(
    file: File,
  ): Promise<{ success: true; path: string; filename: string; size: number; mimetype: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const token = getStoredToken();
    const response = await fetch(`${API_BASE_URL}${API_VERSION}/upload/image`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(errorData.error || 'Failed to upload image');
    }

    const data = await response.json();
    // Backend returns { success: true, path: ..., filename: ..., size: ..., mimetype: ... }
    return data;
  },

  async deleteImage(filename: string): Promise<void> {
    const token = getStoredToken();
    const response = await fetch(`${API_BASE_URL}${API_VERSION}/upload/${filename}`, {
      method: 'DELETE',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Delete failed' }));
      throw new Error(errorData.error || 'Failed to delete image');
    }
  },
};
