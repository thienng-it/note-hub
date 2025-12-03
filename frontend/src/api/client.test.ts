import { describe, it, expect, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

import {
  authApi,
  notesApi,
  tasksApi,
  getStoredToken,
  setStoredAuth,
  clearStoredAuth,
} from './client';

describe('API Client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  describe('Token Storage', () => {
    it('stores and retrieves auth tokens', () => {
      const mockUser = { id: 1, username: 'test', email: 'test@example.com' };
      
      setStoredAuth('test-access-token', 'test-refresh-token', mockUser);
      
      expect(getStoredToken()).toBe('test-access-token');
    });

    it('clears stored auth', () => {
      const mockUser = { id: 1, username: 'test', email: 'test@example.com' };
      setStoredAuth('test-access-token', 'test-refresh-token', mockUser);
      
      clearStoredAuth();
      
      expect(getStoredToken()).toBeNull();
    });
  });

  describe('authApi.login', () => {
    it('calls login endpoint and stores tokens', async () => {
      const mockResponse = {
        access_token: 'access-123',
        refresh_token: 'refresh-123',
        token_type: 'Bearer',
        expires_in: 86400,
        user: { id: 1, username: 'test', email: 'test@example.com' },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authApi.login({ username: 'test', password: 'password' });

      expect(result.access_token).toBe('access-123');
      expect(result.user.username).toBe('test');
      expect(getStoredToken()).toBe('access-123');
    });

    it('throws on invalid credentials', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      await expect(authApi.login({ username: 'test', password: 'wrong' }))
        .rejects.toMatchObject({ error: 'Invalid credentials' });
    });
  });

  describe('notesApi', () => {
    beforeEach(() => {
      // Set up auth token for authenticated requests
      const mockUser = { id: 1, username: 'test', email: 'test@example.com' };
      setStoredAuth('test-token', 'test-refresh', mockUser);
    });

    it('fetches notes list', async () => {
      const mockNotes = [
        { id: 1, title: 'Test Note', body: 'Content', tags: [] },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ notes: mockNotes }),
      });

      const notes = await notesApi.list();

      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('Test Note');
    });

    it('creates a new note', async () => {
      const mockNote = { id: 2, title: 'New Note', body: 'New content', tags: [] };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ note: mockNote }),
      });

      const note = await notesApi.create({ title: 'New Note', body: 'New content', tags: '' });

      expect(note.title).toBe('New Note');
    });
  });

  describe('tasksApi', () => {
    beforeEach(() => {
      const mockUser = { id: 1, username: 'test', email: 'test@example.com' };
      setStoredAuth('test-token', 'test-refresh', mockUser);
    });

    it('fetches tasks list', async () => {
      const mockTasks = [
        { id: 1, title: 'Test Task', completed: false, priority: 'medium' },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tasks: mockTasks }),
      });

      const tasks = await tasksApi.list();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Test Task');
    });

    it('creates a new task', async () => {
      const mockTask = { id: 2, title: 'New Task', completed: false, priority: 'high' };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task: mockTask }),
      });

      const task = await tasksApi.create({ title: 'New Task', priority: 'high' });

      expect(task.title).toBe('New Task');
      expect(task.priority).toBe('high');
    });
  });
});
