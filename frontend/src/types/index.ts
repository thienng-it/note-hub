// User types
export interface User {
  id: number;
  username: string;
  email?: string;
  bio?: string;
  created_at?: string;
  theme?: 'light' | 'dark';
  has_2fa?: boolean;
}

// Auth types
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  totp_code?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface AuthError {
  error: string;
  requires_2fa?: boolean;
}

// Note types
export interface Tag {
  id: number;
  name: string;
  note_count?: number;
}

export interface Note {
  id: number;
  title: string;
  body: string;
  excerpt?: string;
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  created_at?: string;
  updated_at?: string;
  tags: Tag[];
  can_edit?: boolean;
  reading_time?: number;
}

export interface NoteFormData {
  title: string;
  body: string;
  tags: string;
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
}

// Task types
export interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at?: string;
  is_overdue?: boolean;
}

export interface TaskFormData {
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface NotesResponse {
  notes: Note[];
}

export interface NoteResponse {
  note: Note;
}

export interface TasksResponse {
  tasks: Task[];
}

export interface TaskResponse {
  task: Task;
}

// View types
export type NoteViewType = 'all' | 'favorites' | 'archived' | 'shared';
export type TaskFilterType = 'all' | 'active' | 'completed' | 'overdue';
export type ThemeType = 'light' | 'dark';
