/**
 * Secure offline storage service with encryption and user isolation
 * Wraps offlineStorage with encryption layer for sensitive data protection
 */

import { getStoredToken, getStoredUser } from '../api/client';
import type { Folder, Note, Task } from '../types';
import { decryptData, encryptData, isEncryptionSupported } from '../utils/encryption';
import { offlineStorage, type SyncQueueItem } from './offlineStorage';

// Flag to track if encryption is enabled
let encryptionEnabled = false;

/**
 * Initialize secure storage
 * Checks if encryption is supported and user is authenticated
 */
export async function initSecureStorage(): Promise<void> {
  await offlineStorage.init();
  
  // Check if encryption is supported
  encryptionEnabled = isEncryptionSupported();
  
  if (!encryptionEnabled) {
    console.warn('Web Crypto API not available - data will not be encrypted at rest');
  }
  
  // Validate user session
  const user = getStoredUser();
  const token = getStoredToken();
  
  if (!user || !token) {
    throw new Error('User must be authenticated to use offline storage');
  }
  
  // Store user ID in metadata for validation
  await offlineStorage.setMetadata('userId', user.id);
}

/**
 * Validate that current user matches stored user ID
 */
async function validateUserSession(): Promise<{ userId: number; token: string }> {
  const user = getStoredUser();
  const token = getStoredToken();
  
  if (!user || !token) {
    throw new Error('No active user session');
  }
  
  // Check if stored user ID matches current user
  const storedUserId = await offlineStorage.getMetadata('userId');
  if (storedUserId && storedUserId !== user.id) {
    // User mismatch - clear all data for security
    console.warn('User session mismatch detected - clearing offline data');
    await offlineStorage.clearAll();
    await offlineStorage.setMetadata('userId', user.id);
  }
  
  return { userId: user.id, token };
}

/**
 * Encrypt note data if encryption is enabled
 */
async function encryptNote(note: Note): Promise<Note> {
  if (!encryptionEnabled) return note;
  
  const { userId, token } = await validateUserSession();
  
  // Encrypt sensitive fields
  const encrypted: Note = {
    ...note,
    title: await encryptData(note.title, userId, token),
    body: await encryptData(note.body, userId, token),
    tags: await encryptData(note.tags, userId, token),
  };
  
  return encrypted;
}

/**
 * Decrypt note data if encryption is enabled
 */
async function decryptNote(note: Note): Promise<Note> {
  if (!encryptionEnabled) return note;
  
  const { userId, token } = await validateUserSession();
  
  try {
    const decrypted: Note = {
      ...note,
      title: await decryptData<string>(note.title, userId, token),
      body: await decryptData<string>(note.body, userId, token),
      tags: await decryptData<typeof note.tags>(note.tags, userId, token),
    };
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt note:', error);
    // Return note as-is if decryption fails (might be unencrypted legacy data)
    return note;
  }
}

/**
 * Encrypt task data if encryption is enabled
 */
async function encryptTask(task: Task): Promise<Task> {
  if (!encryptionEnabled) return task;
  
  const { userId, token } = await validateUserSession();
  
  const encrypted: Task = {
    ...task,
    title: await encryptData(task.title, userId, token),
    description: await encryptData(task.description, userId, token),
  };
  
  return encrypted;
}

/**
 * Decrypt task data if encryption is enabled
 */
async function decryptTask(task: Task): Promise<Task> {
  if (!encryptionEnabled) return task;
  
  const { userId, token } = await validateUserSession();
  
  try {
    const decrypted: Task = {
      ...task,
      title: await decryptData<string>(task.title, userId, token),
      description: await decryptData<string>(task.description, userId, token),
    };
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt task:', error);
    return task;
  }
}

// Secure Notes API
export const secureNotesStorage = {
  async getNotes(): Promise<Note[]> {
    await validateUserSession();
    const notes = await offlineStorage.getNotes();
    return Promise.all(notes.map(decryptNote));
  },

  async getNote(id: number): Promise<Note | undefined> {
    await validateUserSession();
    const note = await offlineStorage.getNote(id);
    return note ? decryptNote(note) : undefined;
  },

  async saveNote(note: Note): Promise<void> {
    await validateUserSession();
    const encrypted = await encryptNote(note);
    await offlineStorage.saveNote(encrypted);
  },

  async saveNotes(notes: Note[]): Promise<void> {
    await validateUserSession();
    const encrypted = await Promise.all(notes.map(encryptNote));
    await offlineStorage.saveNotes(encrypted);
  },

  async deleteNote(id: number): Promise<void> {
    await validateUserSession();
    await offlineStorage.deleteNote(id);
  },
};

// Secure Tasks API
export const secureTasksStorage = {
  async getTasks(): Promise<Task[]> {
    await validateUserSession();
    const tasks = await offlineStorage.getTasks();
    return Promise.all(tasks.map(decryptTask));
  },

  async getTask(id: number): Promise<Task | undefined> {
    await validateUserSession();
    const task = await offlineStorage.getTask(id);
    return task ? decryptTask(task) : undefined;
  },

  async saveTask(task: Task): Promise<void> {
    await validateUserSession();
    const encrypted = await encryptTask(task);
    await offlineStorage.saveTask(encrypted);
  },

  async saveTasks(tasks: Task[]): Promise<void> {
    await validateUserSession();
    const encrypted = await Promise.all(tasks.map(encryptTask));
    await offlineStorage.saveTasks(encrypted);
  },

  async deleteTask(id: number): Promise<void> {
    await validateUserSession();
    await offlineStorage.deleteTask(id);
  },
};

// Secure Folders API (folders are less sensitive, but still validated)
export const secureFoldersStorage = {
  async getFolders(): Promise<Folder[]> {
    await validateUserSession();
    return offlineStorage.getFolders();
  },

  async getFolder(id: number): Promise<Folder | undefined> {
    await validateUserSession();
    return offlineStorage.getFolder(id);
  },

  async saveFolder(folder: Folder): Promise<void> {
    await validateUserSession();
    await offlineStorage.saveFolder(folder);
  },

  async saveFolders(folders: Folder[]): Promise<void> {
    await validateUserSession();
    await offlineStorage.saveFolders(folders);
  },

  async deleteFolder(id: number): Promise<void> {
    await validateUserSession();
    await offlineStorage.deleteFolder(id);
  },
};

// Secure Sync Queue API
export const secureSyncQueue = {
  async addToSyncQueue(
    item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<void> {
    await validateUserSession();
    await offlineStorage.addToSyncQueue(item);
  },

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    await validateUserSession();
    return offlineStorage.getSyncQueue();
  },

  async removeSyncQueueItem(id: string): Promise<void> {
    await validateUserSession();
    await offlineStorage.removeSyncQueueItem(id);
  },

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    await validateUserSession();
    await offlineStorage.updateSyncQueueItem(item);
  },

  async clearSyncQueue(): Promise<void> {
    await validateUserSession();
    await offlineStorage.clearSyncQueue();
  },
};

// Secure Metadata API
export const secureMetadata = {
  async getLastSyncTime(): Promise<number | null> {
    await validateUserSession();
    return offlineStorage.getLastSyncTime();
  },

  async setLastSyncTime(time: number): Promise<void> {
    await validateUserSession();
    await offlineStorage.setLastSyncTime(time);
  },
};

/**
 * Clear all offline data (used on logout)
 */
export async function clearAllOfflineData(): Promise<void> {
  await offlineStorage.clearAll();
}

/**
 * Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return encryptionEnabled;
}
