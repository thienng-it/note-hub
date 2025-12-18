import { type IDBPDatabase, openDB } from 'idb';
import type { Folder, Note, Task } from '../types';

const DB_NAME = 'notehub-offline';
const DB_VERSION = 1;

// Store names
const NOTES_STORE = 'notes';
const TASKS_STORE = 'tasks';
const FOLDERS_STORE = 'folders';
const SYNC_QUEUE_STORE = 'sync-queue';
const METADATA_STORE = 'metadata';

export interface SyncQueueItem {
  id: string;
  timestamp: number;
  operation: 'create' | 'update' | 'delete';
  entityType: 'note' | 'task' | 'folder';
  entityId?: number;
  data?: unknown;
  retryCount: number;
  error?: string;
}

class OfflineStorageService {
  private db: IDBPDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Notes store
        if (!db.objectStoreNames.contains(NOTES_STORE)) {
          const notesStore = db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
          notesStore.createIndex('updated_at', 'updated_at');
          notesStore.createIndex('folder_id', 'folder_id');
        }

        // Tasks store
        if (!db.objectStoreNames.contains(TASKS_STORE)) {
          const tasksStore = db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
          tasksStore.createIndex('updated_at', 'updated_at');
        }

        // Folders store
        if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
          const foldersStore = db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
          foldersStore.createIndex('parent_id', 'parent_id');
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          const queueStore = db.createObjectStore(SYNC_QUEUE_STORE, {
            keyPath: 'id',
            autoIncrement: false,
          });
          queueStore.createIndex('timestamp', 'timestamp');
          queueStore.createIndex('entityType', 'entityType');
        }

        // Metadata store for last sync times, etc.
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        }
      },
    });
  }

  private ensureDb(): IDBPDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // Notes operations
  async getNotes(): Promise<Note[]> {
    const db = this.ensureDb();
    return await db.getAll(NOTES_STORE);
  }

  async getNote(id: number): Promise<Note | undefined> {
    const db = this.ensureDb();
    return await db.get(NOTES_STORE, id);
  }

  async saveNote(note: Note): Promise<void> {
    const db = this.ensureDb();
    await db.put(NOTES_STORE, note);
  }

  async saveNotes(notes: Note[]): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(NOTES_STORE, 'readwrite');
    await Promise.all(notes.map((note) => tx.store.put(note)));
    await tx.done;
  }

  async deleteNote(id: number): Promise<void> {
    const db = this.ensureDb();
    await db.delete(NOTES_STORE, id);
  }

  // Tasks operations
  async getTasks(): Promise<Task[]> {
    const db = this.ensureDb();
    return await db.getAll(TASKS_STORE);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const db = this.ensureDb();
    return await db.get(TASKS_STORE, id);
  }

  async saveTask(task: Task): Promise<void> {
    const db = this.ensureDb();
    await db.put(TASKS_STORE, task);
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(TASKS_STORE, 'readwrite');
    await Promise.all(tasks.map((task) => tx.store.put(task)));
    await tx.done;
  }

  async deleteTask(id: number): Promise<void> {
    const db = this.ensureDb();
    await db.delete(TASKS_STORE, id);
  }

  // Folders operations
  async getFolders(): Promise<Folder[]> {
    const db = this.ensureDb();
    return await db.getAll(FOLDERS_STORE);
  }

  async getFolder(id: number): Promise<Folder | undefined> {
    const db = this.ensureDb();
    return await db.get(FOLDERS_STORE, id);
  }

  async saveFolder(folder: Folder): Promise<void> {
    const db = this.ensureDb();
    await db.put(FOLDERS_STORE, folder);
  }

  async saveFolders(folders: Folder[]): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(FOLDERS_STORE, 'readwrite');
    await Promise.all(folders.map((folder) => tx.store.put(folder)));
    await tx.done;
  }

  async deleteFolder(id: number): Promise<void> {
    const db = this.ensureDb();
    await db.delete(FOLDERS_STORE, id);
  }

  // Sync queue operations
  async addToSyncQueue(
    item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>,
  ): Promise<void> {
    const db = this.ensureDb();
    const queueItem: SyncQueueItem = {
      ...item,
      id: `${item.entityType}-${item.operation}-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    await db.put(SYNC_QUEUE_STORE, queueItem);
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = this.ensureDb();
    return await db.getAll(SYNC_QUEUE_STORE);
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    const db = this.ensureDb();
    await db.delete(SYNC_QUEUE_STORE, id);
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    const db = this.ensureDb();
    await db.put(SYNC_QUEUE_STORE, item);
  }

  async clearSyncQueue(): Promise<void> {
    const db = this.ensureDb();
    await db.clear(SYNC_QUEUE_STORE);
  }

  // Metadata operations
  async getMetadata(key: string): Promise<unknown> {
    const db = this.ensureDb();
    const record = await db.get(METADATA_STORE, key);
    return record?.value;
  }

  async setMetadata(key: string, value: unknown): Promise<void> {
    const db = this.ensureDb();
    await db.put(METADATA_STORE, { key, value });
  }

  async getLastSyncTime(): Promise<number | null> {
    const time = await this.getMetadata('lastSyncTime');
    return typeof time === 'number' ? time : null;
  }

  async setLastSyncTime(time: number): Promise<void> {
    await this.setMetadata('lastSyncTime', time);
  }

  // Clear all data
  async clearAll(): Promise<void> {
    const db = this.ensureDb();
    await Promise.all([
      db.clear(NOTES_STORE),
      db.clear(TASKS_STORE),
      db.clear(FOLDERS_STORE),
      db.clear(SYNC_QUEUE_STORE),
      db.clear(METADATA_STORE),
    ]);
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService();
