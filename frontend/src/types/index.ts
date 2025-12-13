// User types
export interface User {
  id: number;
  username: string;
  email?: string;
  bio?: string;
  created_at?: string;
  last_login?: string;
  theme?: 'light' | 'dark';
  hidden_notes?: string | null;
  preferred_language?: string;
  has_2fa?: boolean;
  is_admin?: boolean;
  is_locked?: boolean;
  avatar_url?: string | null;
  status?: 'online' | 'offline' | 'away' | 'busy';
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
  images?: string[];
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
  images?: string[];
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
}

// Task types
export interface Task {
  id: number;
  title: string;
  description?: string;
  images?: string[];
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at?: string;
  is_overdue?: boolean;
}

export interface TaskFormData {
  title: string;
  description?: string;
  images?: string[];
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

export interface UsersResponse {
  users: User[];
  stats: {
    total_users: number;
    users_with_2fa: number;
    users_with_email: number;
    locked_users: number;
    admin_users: number;
  };
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

// View types
export type NoteViewType = 'all' | 'favorites' | 'archived' | 'shared';
export type TaskFilterType = 'all' | 'active' | 'completed' | 'overdue';
export type ThemeType = 'light' | 'dark';

// AI types
export interface AIProvider {
  id: 'openai' | 'gemini' | 'ollama';
  name: string;
  configured: boolean;
  model?: string;
  url?: string;
}

export interface AIStatus {
  enabled: boolean;
  provider: string | null;
  availableProviders: AIProvider[];
}

export interface AIOperationResult {
  result: string;
}

export type AIOperationType = 'proofread' | 'summarize' | 'rewrite';
export type AIRewriteStyle = 'professional' | 'casual' | 'concise';

// Audit Log types
export interface AuditLog {
  id: number;
  user_id: number;
  username?: string;
  entity_type: string;
  entity_id: number | null;
  action: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

export interface AuditLogStats {
  total_logs: number;
  recent_activity_24h: number;
  by_action: Array<{ action: string; count: number }>;
  by_entity_type: Array<{ entity_type: string; count: number }>;
  most_active_users: Array<{ id: number; username: string; action_count: number }>;
  date_range: {
    start: string | null;
    end: string | null;
  };
}
