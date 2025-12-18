import { foldersApi, notesApi, tasksApi } from '../api/client';
import type { Folder, Note, Task } from '../types';
import { offlineDetector } from '../utils/offlineDetector';
import { offlineStorage, type SyncQueueItem } from './offlineStorage';

type SyncStatusCallback = (status: SyncStatus) => void;

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  error: string | null;
}

class SyncService {
  private syncInProgress = false;
  private listeners: Set<SyncStatusCallback> = new Set();
  private unsubscribeOffline?: () => void;

  async init(): Promise<void> {
    // Initialize offline storage
    await offlineStorage.init();

    // Subscribe to online status changes
    this.unsubscribeOffline = offlineDetector.subscribe((isOnline) => {
      if (isOnline) {
        // When we come back online, sync automatically
        this.sync().catch((error) => {
          console.error('Auto-sync failed:', error);
        });
      }
    });
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(callback: SyncStatusCallback): () => void {
    this.listeners.add(callback);

    // Call immediately with current status
    this.notifyStatus();

    return () => {
      this.listeners.delete(callback);
    };
  }

  private async notifyStatus(): Promise<void> {
    const queue = await offlineStorage.getSyncQueue();
    const lastSyncTime = await offlineStorage.getLastSyncTime();

    const status: SyncStatus = {
      isSyncing: this.syncInProgress,
      pendingCount: queue.length,
      lastSyncTime,
      error: null,
    };

    this.listeners.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }

  /**
   * Sync all pending changes with the server
   */
  async sync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    if (offlineDetector.isOffline) {
      console.log('Cannot sync while offline');
      return;
    }

    this.syncInProgress = true;
    await this.notifyStatus();

    try {
      // Process sync queue
      await this.processSyncQueue();

      // Fetch latest data from server
      await this.fetchLatestData();

      // Update last sync time
      await offlineStorage.setLastSyncTime(Date.now());

      await this.notifyStatus();
    } catch (error) {
      console.error('Sync failed:', error);
      this.listeners.forEach((callback) => {
        callback({
          isSyncing: false,
          pendingCount: 0,
          lastSyncTime: null,
          error: error instanceof Error ? error.message : 'Sync failed',
        });
      });
      throw error;
    } finally {
      this.syncInProgress = false;
      await this.notifyStatus();
    }
  }

  /**
   * Process all items in the sync queue
   */
  private async processSyncQueue(): Promise<void> {
    const queue = await offlineStorage.getSyncQueue();

    // Sort by timestamp to process in order
    queue.sort((a, b) => a.timestamp - b.timestamp);

    for (const item of queue) {
      try {
        await this.processSyncQueueItem(item);
        await offlineStorage.removeSyncQueueItem(item.id);
      } catch (error) {
        console.error('Failed to process sync queue item:', item, error);

        // Increment retry count
        item.retryCount++;
        item.error = error instanceof Error ? error.message : 'Unknown error';

        // Keep item in queue if retry count is less than 3
        if (item.retryCount < 3) {
          await offlineStorage.updateSyncQueueItem(item);
        } else {
          // Remove after 3 failed attempts
          console.error('Max retries reached, removing item from queue:', item);
          await offlineStorage.removeSyncQueueItem(item.id);
        }
      }
    }
  }

  /**
   * Process a single sync queue item
   */
  private async processSyncQueueItem(item: SyncQueueItem): Promise<void> {
    switch (item.entityType) {
      case 'note':
        await this.syncNoteItem(item);
        break;
      case 'task':
        await this.syncTaskItem(item);
        break;
      case 'folder':
        await this.syncFolderItem(item);
        break;
      default:
        console.warn('Unknown entity type:', item.entityType);
    }
  }

  private async syncNoteItem(item: SyncQueueItem): Promise<void> {
    switch (item.operation) {
      case 'create':
        if (item.data) {
          const note = await notesApi.create(item.data as Note);
          // Update local storage with server-assigned ID
          await offlineStorage.saveNote(note);
        }
        break;
      case 'update':
        if (item.entityId && item.data) {
          const note = await notesApi.update(item.entityId, item.data as Note);
          await offlineStorage.saveNote(note);
        }
        break;
      case 'delete':
        if (item.entityId) {
          await notesApi.delete(item.entityId);
          await offlineStorage.deleteNote(item.entityId);
        }
        break;
    }
  }

  private async syncTaskItem(item: SyncQueueItem): Promise<void> {
    switch (item.operation) {
      case 'create':
        if (item.data) {
          const task = await tasksApi.create(item.data as Task);
          await offlineStorage.saveTask(task);
        }
        break;
      case 'update':
        if (item.entityId && item.data) {
          const task = await tasksApi.update(item.entityId, item.data as Task);
          await offlineStorage.saveTask(task);
        }
        break;
      case 'delete':
        if (item.entityId) {
          await tasksApi.delete(item.entityId);
          await offlineStorage.deleteTask(item.entityId);
        }
        break;
    }
  }

  private async syncFolderItem(item: SyncQueueItem): Promise<void> {
    switch (item.operation) {
      case 'create':
        if (item.data) {
          const folder = await foldersApi.create(item.data as Folder);
          await offlineStorage.saveFolder(folder);
        }
        break;
      case 'update':
        if (item.entityId && item.data) {
          const folder = await foldersApi.update(item.entityId, item.data as Folder);
          await offlineStorage.saveFolder(folder);
        }
        break;
      case 'delete':
        if (item.entityId) {
          await foldersApi.delete(item.entityId);
          await offlineStorage.deleteFolder(item.entityId);
        }
        break;
    }
  }

  /**
   * Fetch latest data from server and update local storage
   */
  private async fetchLatestData(): Promise<void> {
    try {
      // Fetch all data in parallel
      const [notes, tasks, folders] = await Promise.all([
        notesApi.list('all').catch(() => [] as Note[]),
        tasksApi.list('all').catch(() => [] as Task[]),
        foldersApi
          .list()
          .then((res) => res.folders)
          .catch(() => [] as Folder[]),
      ]);

      // Update local storage
      await Promise.all([
        offlineStorage.saveNotes(notes),
        offlineStorage.saveTasks(tasks),
        offlineStorage.saveFolders(folders),
      ]);
    } catch (error) {
      console.error('Failed to fetch latest data:', error);
      throw error;
    }
  }

  /**
   * Clear all local data and sync queue
   */
  async clearAllData(): Promise<void> {
    await offlineStorage.clearAll();
    await this.notifyStatus();
  }

  /**
   * Get pending sync count
   */
  async getPendingCount(): Promise<number> {
    const queue = await offlineStorage.getSyncQueue();
    return queue.length;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.unsubscribeOffline) {
      this.unsubscribeOffline();
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const syncService = new SyncService();
