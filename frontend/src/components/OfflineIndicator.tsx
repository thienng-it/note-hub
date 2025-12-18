import { useTranslation } from 'react-i18next';
import { useOffline } from '../context/OfflineContext';

export function OfflineIndicator() {
  const { t } = useTranslation();
  const { isOnline, syncStatus, triggerSync } = useOffline();

  if (isOnline && syncStatus.pendingCount === 0) {
    return null;
  }

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return t('offline.never');

    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return t('offline.justNow');
    if (diff < 3600000) return t('offline.minutesAgo', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('offline.hoursAgo', { count: Math.floor(diff / 3600000) });
    return t('offline.daysAgo', { count: Math.floor(diff / 86400000) });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="rounded-lg bg-white/90 px-4 py-3 shadow-lg backdrop-blur-sm dark:bg-gray-800/90">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {isOnline ? (
              syncStatus.isSyncing ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              ) : (
                <div className="h-3 w-3 rounded-full bg-green-500" />
              )
            ) : (
              <div className="h-3 w-3 rounded-full bg-amber-500" />
            )}
          </div>

          {/* Status Text */}
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {!isOnline && t('offline.workingOffline')}
              {isOnline && syncStatus.isSyncing && t('offline.syncing')}
              {isOnline && !syncStatus.isSyncing && syncStatus.pendingCount > 0 && (
                <span>{t('offline.pendingChanges', { count: syncStatus.pendingCount })}</span>
              )}
            </div>
            {syncStatus.lastSyncTime && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('offline.lastSync')}: {formatLastSync(syncStatus.lastSyncTime)}
              </div>
            )}
            {syncStatus.error && (
              <div className="text-xs text-red-600 dark:text-red-400">
                {t('offline.syncError')}: {syncStatus.error}
              </div>
            )}
          </div>

          {/* Sync Button */}
          {isOnline && syncStatus.pendingCount > 0 && !syncStatus.isSyncing && (
            <button
              type="button"
              onClick={() => triggerSync()}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {t('offline.syncNow')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
