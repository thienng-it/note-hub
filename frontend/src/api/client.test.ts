import { describe, expect, it, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

import {
  authApi,
  clearStoredAuth,
  getStoredToken,
  notesApi,
  setStoredAuth,
  tasksApi,
  uploadApi,
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

  describe('authApi', () => {
    describe('login', () => {
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

        await expect(authApi.login({ username: 'test', password: 'wrong' })).rejects.toMatchObject({
          error: 'Invalid credentials',
        });
      });
    });

    describe('register', () => {
      it('registers a new user successfully', async () => {
        const mockResponse = { message: 'User registered successfully' };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await authApi.register({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'securePassword123!',
          password_confirm: 'securePassword123!',
        });

        expect(result.message).toBe('User registered successfully');
      });

      it('throws on registration failure', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Username already exists' }),
        });

        await expect(
          authApi.register({
            username: 'existinguser',
            password: 'password123',
            password_confirm: 'password123',
          }),
        ).rejects.toThrow('Username already exists');
      });
    });

    describe('forgotPassword', () => {
      it('initiates password reset without 2FA', async () => {
        const mockResponse = {
          message: 'Password reset initiated',
          reset_token: 'reset-token-123',
        };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await authApi.forgotPassword('testuser');

        expect(result.reset_token).toBe('reset-token-123');
        expect(result.requires_2fa).toBeUndefined();
      });

      it('requires 2FA verification', async () => {
        const mockResponse = {
          message: '2FA verification required',
          requires_2fa: true,
        };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await authApi.forgotPassword('testuser');

        expect(result.requires_2fa).toBe(true);
      });
    });

    describe('forgotPasswordVerify2FA', () => {
      it('verifies 2FA and returns reset token', async () => {
        const mockResponse = {
          message: '2FA verified',
          reset_token: 'reset-token-456',
        };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await authApi.forgotPasswordVerify2FA('testuser', '123456');

        expect(result.reset_token).toBe('reset-token-456');
      });

      it('throws on invalid 2FA code', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Invalid verification code' }),
        });

        await expect(authApi.forgotPasswordVerify2FA('testuser', '000000')).rejects.toThrow(
          'Invalid verification code',
        );
      });
    });

    describe('resetPassword', () => {
      it('resets password successfully', async () => {
        const mockResponse = { message: 'Password reset successful' };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await authApi.resetPassword({
          token: 'reset-token-123',
          password: 'newPassword123!',
          password_confirm: 'newPassword123!',
        });

        expect(result.message).toBe('Password reset successful');
      });

      it('throws on invalid token', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Invalid or expired token' }),
        });

        await expect(
          authApi.resetPassword({
            token: 'invalid-token',
            password: 'newPassword123!',
            password_confirm: 'newPassword123!',
          }),
        ).rejects.toThrow('Invalid or expired token');
      });
    });
  });

  describe('notesApi', () => {
    beforeEach(() => {
      // Set up auth token for authenticated requests
      const mockUser = { id: 1, username: 'test', email: 'test@example.com' };
      setStoredAuth('test-token', 'test-refresh', mockUser);
    });

    it('fetches notes list', async () => {
      const mockNotes = [{ id: 1, title: 'Test Note', body: 'Content', tags: [] }];

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
      const mockTasks = [{ id: 1, title: 'Test Task', completed: false, priority: 'medium' }];

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

  describe('uploadApi', () => {
    beforeEach(() => {
      const mockUser = { id: 1, username: 'test', email: 'test@example.com' };
      setStoredAuth('test-token', 'test-refresh', mockUser);
    });

    describe('uploadImage', () => {
      it('uploads an image successfully', async () => {
        const mockResponse = { path: '/uploads/image-123.jpg' };
        const mockFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await uploadApi.uploadImage(mockFile);

        expect(result.path).toBe('/uploads/image-123.jpg');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/upload/image'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          }),
        );
      });

      it('throws on upload failure', async () => {
        const mockFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Upload failed' }),
        });

        await expect(uploadApi.uploadImage(mockFile)).rejects.toThrow('Upload failed');
      });
    });

    describe('deleteImage', () => {
      it('deletes an image successfully', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await uploadApi.deleteImage('image-123.jpg');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/upload/image-123.jpg'),
          expect.objectContaining({
            method: 'DELETE',
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          }),
        );
      });

      it('throws on delete failure', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Delete failed' }),
        });

        await expect(uploadApi.deleteImage('image-123.jpg')).rejects.toThrow('Delete failed');
      });
    });
  });
});
