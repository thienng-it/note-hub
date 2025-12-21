import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { clearAllOfflineData } from '../services/secureOfflineStorage';
import type { SyncStatus } from '../services/syncService';
import { syncService } from '../services/syncService';
import { offlineDetector } from '../utils/offlineDetector';
import { useAuth } from './AuthContext';

interface OfflineContextType {
  isOnline: boolean;
  syncStatus: SyncStatus;
  triggerSync: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(offlineDetector.isOnline);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    error: null,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear offline data when user is not authenticated
      clearAllOfflineData().catch((error) => {
        console.error('Failed to clear offline data on logout:', error);
      });
      return;
    }

    // Initialize offline storage database first
    offlineStorage.init().catch((error) => {
      console.error('Failed to initialize offline storage:', error);
    });

    // Initialize sync service only when authenticated
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
  }, [isAuthenticated]);

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
      await clearAllOfflineData();
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
