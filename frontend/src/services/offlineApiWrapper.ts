import { foldersApi, notesApi, tasksApi } from '../api/client';
import type {
  Folder,
  FolderFormData,
  Note,
  NoteFormData,
  NoteViewType,
  Task,
  TaskFilterType,
  TaskFormData,
} from '../types';
import { offlineDetector } from '../utils/offlineDetector';
import {
  secureFoldersStorage,
  secureNotesStorage,
  secureSyncQueue,
  secureTasksStorage,
} from './secureOfflineStorage';

/**
 * Wrapper around API client that handles offline operations
 * Falls back to IndexedDB when offline, queues changes for sync
 */

// Generate temporary IDs for offline-created entities
let tempIdCounter = -1;
const generateTempId = (): number => {
  return tempIdCounter--;
};

// Notes API with offline support
export const offlineNotesApi = {
  async list(view: NoteViewType = 'all', query?: string, tagFilter?: string): Promise<Note[]> {
    if (offlineDetector.isOnline) {
      try {
        const notes = await notesApi.list(view, query, tagFilter);
        // Cache in IndexedDB for offline access
        await secureNotesStorage.saveNotes(notes);
        return notes;
      } catch (error) {
        console.warn('Failed to fetch notes from server, using cached data:', error);
      }
    }

    // Fallback to cached data
    let notes = await secureNotesStorage.getNotes();

    // Apply view filter
    if (view === 'favorites') {
      notes = notes.filter((note) => note.favorite);
    } else if (view === 'archived') {
      notes = notes.filter((note) => note.archived);
    } else if (view === 'pinned') {
      notes = notes.filter((note) => note.pinned);
    }

    // Apply search query
    if (query) {
      const lowerQuery = query.toLowerCase();
      notes = notes.filter(
        (note) =>
          note.title.toLowerCase().includes(lowerQuery) ||
          note.body.toLowerCase().includes(lowerQuery),
      );
    }

    // Apply tag filter
    if (tagFilter) {
      notes = notes.filter((note) => note.tags.some((tag) => tag.name === tagFilter));
    }

    return notes;
  },

  async get(id: number): Promise<Note> {
    if (offlineDetector.isOnline) {
      try {
        const note = await notesApi.get(id);
        await secureNotesStorage.saveNote(note);
        return note;
      } catch (error) {
        console.warn('Failed to fetch note from server, using cached data:', error);
      }
    }

    const note = await secureNotesStorage.getNote(id);
    if (!note) {
      throw new Error('Note not found');
    }
    return note;
  },

  async create(data: NoteFormData): Promise<Note> {
    if (offlineDetector.isOnline) {
      try {
        const note = await notesApi.create(data);
        await secureNotesStorage.saveNote(note);
        return note;
      } catch (error) {
        console.warn('Failed to create note online, creating offline:', error);
      }
    }

    // Create note offline with temporary ID
    const tempNote: Note = {
      id: generateTempId(),
      title: data.title,
      body: data.body || '',
      tags: data.tags
        ? data.tags.split(',').map((tag) => ({
            id: generateTempId(),
            name: tag.trim(),
          }))
        : [],
      images: data.images || [],
      pinned: data.pinned || false,
      favorite: data.favorite || false,
      archived: data.archived || false,
      folder_id: data.folder_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 0, // Will be set by server
    };

    await secureNotesStorage.saveNote(tempNote);
    await secureSyncQueue.addToSyncQueue({
      operation: 'create',
      entityType: 'note',
      data: data,
    });

    return tempNote;
  },

  async update(id: number, data: Partial<NoteFormData>): Promise<Note> {
    if (offlineDetector.isOnline) {
      try {
        const note = await notesApi.update(id, data);
        await secureNotesStorage.saveNote(note);
        return note;
      } catch (error) {
        console.warn('Failed to update note online, updating offline:', error);
      }
    }

    // Update note offline
    const existingNote = await secureNotesStorage.getNote(id);
    if (!existingNote) {
      throw new Error('Note not found');
    }

    const updatedNote: Note = {
      ...existingNote,
      ...data,
      tags: data.tags
        ? data.tags.split(',').map((tag) => ({
            id: generateTempId(),
            name: tag.trim(),
          }))
        : existingNote.tags,
      updated_at: new Date().toISOString(),
    };

    await secureNotesStorage.saveNote(updatedNote);
    await secureSyncQueue.addToSyncQueue({
      operation: 'update',
      entityType: 'note',
      entityId: id,
      data: data,
    });

    return updatedNote;
  },

  async delete(id: number): Promise<void> {
    if (offlineDetector.isOnline) {
      try {
        await notesApi.delete(id);
        await secureNotesStorage.deleteNote(id);
        return;
      } catch (error) {
        console.warn('Failed to delete note online, deleting offline:', error);
      }
    }

    await secureNotesStorage.deleteNote(id);
    await secureSyncQueue.addToSyncQueue({
      operation: 'delete',
      entityType: 'note',
      entityId: id,
    });
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

// Tasks API with offline support
export const offlineTasksApi = {
  async list(filter: TaskFilterType = 'all'): Promise<Task[]> {
    if (offlineDetector.isOnline) {
      try {
        const tasks = await tasksApi.list(filter);
        await secureTasksStorage.saveTasks(tasks);
        return tasks;
      } catch (error) {
        console.warn('Failed to fetch tasks from server, using cached data:', error);
      }
    }

    let tasks = await secureTasksStorage.getTasks();

    // Apply filter
    if (filter === 'completed') {
      tasks = tasks.filter((task) => task.completed);
    } else if (filter === 'pending') {
      tasks = tasks.filter((task) => !task.completed);
    }

    return tasks;
  },

  async get(id: number): Promise<Task> {
    if (offlineDetector.isOnline) {
      try {
        const task = await tasksApi.get(id);
        await secureTasksStorage.saveTask(task);
        return task;
      } catch (error) {
        console.warn('Failed to fetch task from server, using cached data:', error);
      }
    }

    const task = await secureTasksStorage.getTask(id);
    if (!task) {
      throw new Error('Task not found');
    }
    return task;
  },

  async create(data: TaskFormData): Promise<Task> {
    if (offlineDetector.isOnline) {
      try {
        const task = await tasksApi.create(data);
        await secureTasksStorage.saveTask(task);
        return task;
      } catch (error) {
        console.warn('Failed to create task online, creating offline:', error);
      }
    }

    const tempTask: Task = {
      id: generateTempId(),
      title: data.title,
      description: data.description || '',
      completed: false,
      priority: data.priority || 'medium',
      due_date: data.due_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 0,
    };

    await secureTasksStorage.saveTask(tempTask);
    await secureSyncQueue.addToSyncQueue({
      operation: 'create',
      entityType: 'task',
      data: data,
    });

    return tempTask;
  },

  async update(id: number, data: Partial<TaskFormData>): Promise<Task> {
    if (offlineDetector.isOnline) {
      try {
        const task = await tasksApi.update(id, data);
        await secureTasksStorage.saveTask(task);
        return task;
      } catch (error) {
        console.warn('Failed to update task online, updating offline:', error);
      }
    }

    const existingTask = await secureTasksStorage.getTask(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    const updatedTask: Task = {
      ...existingTask,
      ...data,
      updated_at: new Date().toISOString(),
    };

    await secureTasksStorage.saveTask(updatedTask);
    await secureSyncQueue.addToSyncQueue({
      operation: 'update',
      entityType: 'task',
      entityId: id,
      data: data,
    });

    return updatedTask;
  },

  async delete(id: number): Promise<void> {
    if (offlineDetector.isOnline) {
      try {
        await tasksApi.delete(id);
        await secureTasksStorage.deleteTask(id);
        return;
      } catch (error) {
        console.warn('Failed to delete task online, deleting offline:', error);
      }
    }

    await secureTasksStorage.deleteTask(id);
    await secureSyncQueue.addToSyncQueue({
      operation: 'delete',
      entityType: 'task',
      entityId: id,
    });
  },

  async toggleComplete(task: Task): Promise<Task> {
    return this.update(task.id, { completed: !task.completed });
  },
};

// Folders API with offline support
export const offlineFoldersApi = {
  async list(): Promise<{ folders: Folder[] }> {
    if (offlineDetector.isOnline) {
      try {
        const result = await foldersApi.list();
        await secureFoldersStorage.saveFolders(result.folders);
        return result;
      } catch (error) {
        console.warn('Failed to fetch folders from server, using cached data:', error);
      }
    }

    const folders = await secureFoldersStorage.getFolders();
    return { folders };
  },

  async get(id: number): Promise<Folder> {
    if (offlineDetector.isOnline) {
      try {
        const folder = await foldersApi.get(id);
        await secureFoldersStorage.saveFolder(folder);
        return folder;
      } catch (error) {
        console.warn('Failed to fetch folder from server, using cached data:', error);
      }
    }

    const folder = await secureFoldersStorage.getFolder(id);
    if (!folder) {
      throw new Error('Folder not found');
    }
    return folder;
  },

  async create(data: FolderFormData): Promise<Folder> {
    if (offlineDetector.isOnline) {
      try {
        const folder = await foldersApi.create(data);
        await secureFoldersStorage.saveFolder(folder);
        return folder;
      } catch (error) {
        console.warn('Failed to create folder online, creating offline:', error);
      }
    }

    const tempFolder: Folder = {
      id: generateTempId(),
      name: data.name,
      parent_id: data.parent_id || null,
      color: data.color || '#3b82f6',
      icon: data.icon || '📁',
      user_id: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await secureFoldersStorage.saveFolder(tempFolder);
    await secureSyncQueue.addToSyncQueue({
      operation: 'create',
      entityType: 'folder',
      data: data,
    });

    return tempFolder;
  },

  async update(id: number, data: Partial<FolderFormData>): Promise<Folder> {
    if (offlineDetector.isOnline) {
      try {
        const folder = await foldersApi.update(id, data);
        await secureFoldersStorage.saveFolder(folder);
        return folder;
      } catch (error) {
        console.warn('Failed to update folder online, updating offline:', error);
      }
    }

    const existingFolder = await secureFoldersStorage.getFolder(id);
    if (!existingFolder) {
      throw new Error('Folder not found');
    }

    const updatedFolder: Folder = {
      ...existingFolder,
      ...data,
      updated_at: new Date().toISOString(),
    };

    await secureFoldersStorage.saveFolder(updatedFolder);
    await secureSyncQueue.addToSyncQueue({
      operation: 'update',
      entityType: 'folder',
      entityId: id,
      data: data,
    });

    return updatedFolder;
  },

  async delete(id: number): Promise<void> {
    if (offlineDetector.isOnline) {
      try {
        await foldersApi.delete(id);
        await secureFoldersStorage.deleteFolder(id);
        return;
      } catch (error) {
        console.warn('Failed to delete folder online, deleting offline:', error);
      }
    }

    await secureFoldersStorage.deleteFolder(id);
    await secureSyncQueue.addToSyncQueue({
      operation: 'delete',
      entityType: 'folder',
      entityId: id,
    });
  },
};
