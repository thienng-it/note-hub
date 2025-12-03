import type {
  LoginCredentials,
  LoginResponse,
  Note,
  NoteFormData,
  NoteResponse,
  NotesResponse,
  NoteViewType,
  Task,
  TaskFormData,
  TaskResponse,
  TasksResponse,
  TaskFilterType,
  User,
} from '../types';

// Use relative URL in production (same origin), absolute in development
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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

export const clearStoredAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// HTTP client with auth headers
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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
        const error = await retryResponse.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
      }
      return retryResponse.json();
    } else {
      clearStoredAuth();
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Refresh token
async function refreshToken(): Promise<boolean> {
  const refresh = getStoredRefreshToken();
  if (!refresh) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return true;
  } catch {
    return false;
  }
}

// Auth API
export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw { ...data, status: response.status };
    }

    setStoredAuth(data.access_token, data.refresh_token, data.user);
    return data;
  },

  async validate(): Promise<{ valid: boolean; user: User }> {
    return apiRequest('/api/auth/validate');
  },

  logout(): void {
    clearStoredAuth();
  },
};

// Notes API
export const notesApi = {
  async list(view: NoteViewType = 'all', query?: string, tag?: string): Promise<Note[]> {
    const params = new URLSearchParams({ view });
    if (query) params.append('q', query);
    if (tag) params.append('tag', tag);

    const response = await apiRequest<NotesResponse>(`/api/notes?${params}`);
    return response.notes;
  },

  async get(id: number): Promise<Note> {
    const response = await apiRequest<NoteResponse>(`/api/notes/${id}`);
    return response.note;
  },

  async create(data: NoteFormData): Promise<Note> {
    const response = await apiRequest<NoteResponse>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.note;
  },

  async update(id: number, data: Partial<NoteFormData & { pinned?: boolean; favorite?: boolean; archived?: boolean }>): Promise<Note> {
    const response = await apiRequest<NoteResponse>(`/api/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.note;
  },

  async delete(id: number): Promise<void> {
    await apiRequest(`/api/notes/${id}`, { method: 'DELETE' });
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
    const response = await apiRequest<TasksResponse>(`/api/tasks?${params}`);
    return response.tasks;
  },

  async get(id: number): Promise<Task> {
    const response = await apiRequest<TaskResponse>(`/api/tasks/${id}`);
    return response.task;
  },

  async create(data: TaskFormData): Promise<Task> {
    const response = await apiRequest<TaskResponse>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.task;
  },

  async update(id: number, data: Partial<TaskFormData & { completed?: boolean }>): Promise<Task> {
    const response = await apiRequest<TaskResponse>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.task;
  },

  async delete(id: number): Promise<void> {
    await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' });
  },

  async toggleComplete(task: Task): Promise<Task> {
    return this.update(task.id, { completed: !task.completed });
  },
};

// Health check
export const healthApi = {
  async check(): Promise<{ status: string }> {
    return apiRequest('/api/health');
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
