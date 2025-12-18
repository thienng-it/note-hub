import { describe, it, expect, beforeEach } from 'vitest';
import { offlineStorage } from '../offlineStorage';
import type { Note, Task, Folder } from '../../types';

describe('OfflineStorage', () => {
  beforeEach(async () => {
    await offlineStorage.init();
    await offlineStorage.clearAll();
  });

  describe('Notes', () => {
    it('should save and retrieve a note', async () => {
      const note: Note = {
        id: 1,
        title: 'Test Note',
        body: 'Test content',
        tags: [],
        images: [],
        pinned: false,
        favorite: false,
        archived: false,
        folder_id: null,
        user_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await offlineStorage.saveNote(note);
      const retrieved = await offlineStorage.getNote(1);

      expect(retrieved).toEqual(note);
    });

    it('should retrieve all notes', async () => {
      const notes: Note[] = [
        {
          id: 1,
          title: 'Note 1',
          body: 'Content 1',
          tags: [],
          images: [],
          pinned: false,
          favorite: false,
          archived: false,
          folder_id: null,
          user_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          title: 'Note 2',
          body: 'Content 2',
          tags: [],
          images: [],
          pinned: false,
          favorite: false,
          archived: false,
          folder_id: null,
          user_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      await offlineStorage.saveNotes(notes);
      const retrieved = await offlineStorage.getNotes();

      expect(retrieved).toHaveLength(2);
    });

    it('should delete a note', async () => {
      const note: Note = {
        id: 1,
        title: 'Test Note',
        body: 'Test content',
        tags: [],
        images: [],
        pinned: false,
        favorite: false,
        archived: false,
        folder_id: null,
        user_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await offlineStorage.saveNote(note);
      await offlineStorage.deleteNote(1);
      const retrieved = await offlineStorage.getNote(1);

      expect(retrieved).toBeUndefined();
    });
  });

  describe('Tasks', () => {
    it('should save and retrieve a task', async () => {
      const task: Task = {
        id: 1,
        title: 'Test Task',
        description: 'Test description',
        completed: false,
        priority: 'medium',
        due_date: null,
        user_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await offlineStorage.saveTask(task);
      const retrieved = await offlineStorage.getTask(1);

      expect(retrieved).toEqual(task);
    });

    it('should retrieve all tasks', async () => {
      const tasks: Task[] = [
        {
          id: 1,
          title: 'Task 1',
          description: 'Description 1',
          completed: false,
          priority: 'high',
          due_date: null,
          user_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          title: 'Task 2',
          description: 'Description 2',
          completed: true,
          priority: 'low',
          due_date: null,
          user_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      await offlineStorage.saveTasks(tasks);
      const retrieved = await offlineStorage.getTasks();

      expect(retrieved).toHaveLength(2);
    });
  });

  describe('Folders', () => {
    it('should save and retrieve a folder', async () => {
      const folder: Folder = {
        id: 1,
        name: 'Test Folder',
        parent_id: null,
        color: '#3b82f6',
        icon: '📁',
        user_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await offlineStorage.saveFolder(folder);
      const retrieved = await offlineStorage.getFolder(1);

      expect(retrieved).toEqual(folder);
    });
  });

  describe('Sync Queue', () => {
    it('should add and retrieve sync queue items', async () => {
      await offlineStorage.addToSyncQueue({
        operation: 'create',
        entityType: 'note',
        data: { title: 'Test' },
      });

      const queue = await offlineStorage.getSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].operation).toBe('create');
      expect(queue[0].entityType).toBe('note');
    });

    it('should remove sync queue items', async () => {
      await offlineStorage.addToSyncQueue({
        operation: 'update',
        entityType: 'task',
        entityId: 1,
        data: { completed: true },
      });

      let queue = await offlineStorage.getSyncQueue();
      const itemId = queue[0].id;

      await offlineStorage.removeSyncQueueItem(itemId);
      queue = await offlineStorage.getSyncQueue();

      expect(queue).toHaveLength(0);
    });
  });

  describe('Metadata', () => {
    it('should save and retrieve metadata', async () => {
      const now = Date.now();
      await offlineStorage.setLastSyncTime(now);
      const retrieved = await offlineStorage.getLastSyncTime();

      expect(retrieved).toBe(now);
    });

    it('should return null for missing metadata', async () => {
      const retrieved = await offlineStorage.getLastSyncTime();
      expect(retrieved).toBeNull();
    });
  });

  describe('Clear All', () => {
    it('should clear all data', async () => {
      // Add some data
      await offlineStorage.saveNote({
        id: 1,
        title: 'Test',
        body: 'Test',
        tags: [],
        images: [],
        pinned: false,
        favorite: false,
        archived: false,
        folder_id: null,
        user_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await offlineStorage.setLastSyncTime(Date.now());

      // Clear all
      await offlineStorage.clearAll();

      // Verify everything is cleared
      const notes = await offlineStorage.getNotes();
      const tasks = await offlineStorage.getTasks();
      const folders = await offlineStorage.getFolders();
      const queue = await offlineStorage.getSyncQueue();
      const lastSync = await offlineStorage.getLastSyncTime();

      expect(notes).toHaveLength(0);
      expect(tasks).toHaveLength(0);
      expect(folders).toHaveLength(0);
      expect(queue).toHaveLength(0);
      expect(lastSync).toBeNull();
    });
  });
});
