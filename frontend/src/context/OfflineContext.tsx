import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import type { SyncStatus } from '../services/syncService';
import { syncService } from '../services/syncService';
import { offlineDetector } from '../utils/offlineDetector';

interface OfflineContextType {
  isOnline: boolean;
  syncStatus: SyncStatus;
  triggerSync: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(offlineDetector.isOnline);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    error: null,
  });

  useEffect(() => {
    // Initialize sync service
    syncService.init().catch((error) => {
      console.error('Failed to initialize sync service:', error);
    });

    // Subscribe to online status changes
    const unsubscribeOnline = offlineDetector.subscribe(setIsOnline);

    // Subscribe to sync status changes
    const unsubscribeSync = syncService.subscribe(setSyncStatus);

    return () => {
      unsubscribeOnline();
      unsubscribeSync();
    };
  }, []);

  const triggerSync = async () => {
    try {
      await syncService.sync();
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  };

  const clearOfflineData = async () => {
    try {
      await syncService.clearAllData();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        syncStatus,
        triggerSync,
        clearOfflineData,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
