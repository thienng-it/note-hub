/**
 * Core Type Definitions for NoteHub Backend
 */

import type { Request } from 'express';

// ===========================
// User Types
// ===========================

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  bio?: string | null;
  theme: 'light' | 'dark';
  hidden_notes: boolean;
  preferred_language: string;
  totp_secret?: string | null;
  is_admin: boolean;
  is_locked: boolean;
  created_at: string;
  last_login?: string | null;
  google_id?: string | null;
  github_id?: string | null;
}

export interface UserPublic {
  id: number;
  username: string;
  email: string;
  bio?: string | null;
  theme: 'light' | 'dark';
  hidden_notes: boolean;
  preferred_language: string;
  is_admin: boolean;
  created_at: string;
  last_login?: string | null;
}

// ===========================
// Note Types
// ===========================

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  is_favorite: boolean;
  is_pinned: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteWithTags extends Note {
  tags: Tag[];
}

export interface Tag {
  id: number;
  name: string;
}

// ===========================
// Task Types
// ===========================

export interface Task {
  id: number;
  owner_id: number;
  title: string;
  description?: string | null;
  images?: string | null;
  completed: number; // SQLite uses 0/1 for boolean
  priority: 'low' | 'medium' | 'high';
  due_date?: string | null;
  created_at: string;
  updated_at: string;
}

// ===========================
// Auth Types
// ===========================

export interface TokenPayload {
  userId: number;
  username: string;
  email: string;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenId: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user?: UserPublic;
}

export interface TokenValidationResult {
  valid: boolean;
  userId?: number;
  error?: string;
}

// ===========================
// Request Types (Extended Express)
// ===========================

export interface AuthRequest extends Request {
  user?: UserPublic;
  userId?: number;
}

// ===========================
// Response Types
// ===========================

export interface SuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
  meta: {
    timestamp: string;
    version: string;
    requestId?: string;
    [key: string]: any;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = any> extends SuccessResponse<T[]> {
  meta: {
    timestamp: string;
    version: string;
    requestId?: string;
    pagination: PaginationMeta;
  };
}

// ===========================
// Database Types
// ===========================

export interface DatabaseConfig {
  type: 'sqlite' | 'mysql';
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  filename?: string;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

// ===========================
// Cache Types
// ===========================

export interface CacheConfig {
  enabled: boolean;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
}

// ===========================
// Elasticsearch Types
// ===========================

export interface ElasticsearchConfig {
  enabled: boolean;
  node?: string;
  auth?: {
    username: string;
    password: string;
  };
}

// ===========================
// OAuth Types
// ===========================

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface GitHubProfile {
  id: string;
  login: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

// ===========================
// Passkey Types
// ===========================

export interface PasskeyCredential {
  id: number;
  user_id: number;
  credential_id: string;
  public_key: string;
  counter: number;
  device_name?: string | null;
  created_at: string;
  last_used_at?: string | null;
}

// ===========================
// Upload Types
// ===========================

export interface UploadedFile {
  id: number;
  user_id: number;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  path: string;
  created_at: string;
}

// ===========================
// Metrics Types
// ===========================

export interface MetricsData {
  httpRequestsTotal: number;
  httpRequestDuration: number[];
  activeConnections: number;
}

// ===========================
// Logger Types
// ===========================

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface LoggerConfig {
  level: LogLevel;
  format: string;
  transports: string[];
}

// ===========================
// Validation Types
// ===========================

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

// ===========================
// Service Response Types
// ===========================

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// ===========================
// Environment Variables
// ===========================

export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  JWT_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  NOTES_ADMIN_PASSWORD: string;
  DATABASE_URL?: string;
  REDIS_URL?: string;
  ELASTICSEARCH_NODE?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_REDIRECT_URI?: string;
}
