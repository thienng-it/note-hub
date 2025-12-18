# Offline Mode Guide

## Overview

NoteHub now supports full offline functionality, allowing you to continue using the application even when your internet connection is lost. All changes made while offline are automatically synced when you reconnect.

## Features

### 🔌 Offline-First Architecture
- **Automatic Detection**: The app automatically detects when you go offline or come back online
- **Seamless Operation**: All features work identically whether you're online or offline
- **No Data Loss**: All changes are saved locally and queued for synchronization

### 💾 Local Data Storage
- **IndexedDB**: Uses browser's IndexedDB for reliable local storage
- **Cached Content**: Notes, tasks, and folders are cached for offline access
- **Large Capacity**: Much more storage capacity than localStorage

### 🔄 Automatic Synchronization
- **Background Sync**: Automatically syncs changes when connection is restored
- **Queue Management**: Maintains a queue of pending changes
- **Retry Logic**: Automatically retries failed sync operations up to 3 times
- **Conflict Resolution**: Timestamp-based conflict resolution for concurrent edits

### 🎨 Visual Indicators
- **Offline Badge**: Visible indicator when working offline
- **Sync Status**: Shows pending changes count and sync progress
- **Manual Sync**: Button to trigger synchronization on demand
- **Last Sync Time**: Displays when data was last synchronized

## How It Works

### When You're Online
1. All operations work normally with immediate server synchronization
2. Data is cached in IndexedDB for offline access
3. Service worker caches static assets for faster loading

### When You Go Offline
1. App detects the offline state and displays an indicator
2. All CRUD operations continue to work normally
3. Changes are saved to IndexedDB
4. Operations are added to a sync queue for later synchronization

### When You Come Back Online
1. App detects the online state automatically
2. Sync process begins automatically
3. Queued operations are processed in chronological order
4. Local cache is updated with latest server data
5. Offline indicator disappears once sync is complete

## Supported Operations

All major operations work offline:

### Notes
- ✅ View notes list
- ✅ Search notes (offline search in cached data)
- ✅ View note details
- ✅ Create new notes
- ✅ Edit existing notes
- ✅ Delete notes
- ✅ Toggle favorite/pin/archive
- ✅ Add/remove tags

### Tasks
- ✅ View tasks list
- ✅ Filter tasks (all/pending/completed)
- ✅ View task details
- ✅ Create new tasks
- ✅ Edit existing tasks
- ✅ Delete tasks
- ✅ Toggle complete status
- ✅ Set priority and due date

### Folders
- ✅ View folder hierarchy
- ✅ Create folders
- ✅ Edit folder properties
- ✅ Delete folders
- ✅ Navigate folder structure

## Usage

### No Configuration Required
The offline functionality works automatically once you've logged in and loaded the app at least once. No additional setup is needed.

### Checking Offline Status
Look for the offline indicator in the bottom-right corner of the screen:
- **Green dot**: Online and synced
- **Yellow dot**: Offline (working with cached data)
- **Spinning indicator**: Sync in progress

### Manual Synchronization
If you want to trigger a sync manually:
1. Look for the offline indicator in the bottom-right
2. Click the "Sync Now" button if visible
3. Wait for the sync to complete

### Viewing Pending Changes
The offline indicator shows the number of pending changes that need to be synced:
- Example: "3 pending changes" means 3 operations are waiting to be synced

## Technical Details

### Architecture

```
┌─────────────────┐
│   React Pages   │
└────────┬────────┘
         │
┌────────▼────────────────┐
│ Offline API Wrapper     │  ← Transparent offline handling
├─────────────────────────┤
│ - Notes API             │
│ - Tasks API             │
│ - Folders API           │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────────┐
│Online│  │  Offline  │
│ API  │  │  Storage  │
└──────┘  └───────────┘
          (IndexedDB)
```

### Data Flow

**Online Mode:**
```
User Action → API Call → Server → Response → Update UI + Cache
```

**Offline Mode:**
```
User Action → Update IndexedDB → Add to Sync Queue → Update UI
```

**Sync Process:**
```
Online Event → Process Sync Queue → Server API → Update Cache → Update UI
```

### Storage Structure

**IndexedDB Stores:**
- `notes` - All note data
- `tasks` - All task data  
- `folders` - All folder data
- `sync-queue` - Pending operations
- `metadata` - Last sync time, etc.

**Sync Queue Item:**
```typescript
{
  id: string,           // Unique operation ID
  timestamp: number,    // When operation was created
  operation: 'create' | 'update' | 'delete',
  entityType: 'note' | 'task' | 'folder',
  entityId?: number,    // For update/delete operations
  data?: object,        // Operation payload
  retryCount: number,   // Number of retry attempts
  error?: string        // Last error message
}
```

### Conflict Resolution

When conflicts occur (same entity modified offline and online):
- **Strategy**: Last write wins (based on timestamp)
- **Updates**: Local changes overwrite server changes during sync
- **Deletes**: Deletion takes precedence over updates

## Browser Compatibility

### Required Browser Features
- **Service Workers**: For PWA and caching
- **IndexedDB**: For local data storage
- **Online/Offline Events**: For connection detection

### Supported Browsers
- ✅ Chrome/Edge 67+
- ✅ Firefox 61+
- ✅ Safari 11.1+
- ✅ Opera 54+
- ❌ Internet Explorer (not supported)

### Storage Limits
- **IndexedDB**: Typically 50% of available disk space (varies by browser)
- **Service Worker Cache**: Separate from IndexedDB, usually 50-100 MB

## Best Practices

### For Users

1. **Initial Load**: Make sure to open the app while online at least once to cache data
2. **Regular Sync**: Connect to the internet regularly to sync changes
3. **Monitor Pending Changes**: Keep an eye on the pending changes count
4. **Manual Sync**: Use the manual sync button before long offline periods end

### For Developers

1. **Error Handling**: All offline operations include proper error handling
2. **Optimistic UI**: UI updates immediately, sync happens in background
3. **Queue Management**: Operations are processed in chronological order
4. **Retry Logic**: Failed operations are retried automatically
5. **Cache Invalidation**: Server data refreshes local cache on successful sync

## Troubleshooting

### Offline Mode Not Working

**Check Browser Support:**
```javascript
// Open browser console
console.log('Service Worker:', 'serviceWorker' in navigator);
console.log('IndexedDB:', 'indexedDB' in window);
```

**Clear Cache and Reload:**
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Clear site data
4. Reload the page

### Sync Not Happening

**Check Sync Queue:**
1. Look at the pending changes count
2. Try manual sync button
3. Check browser console for errors
4. Ensure you're actually online

**Reset Sync Queue:**
```javascript
// This will clear all pending changes (use with caution!)
// Open browser console:
import { syncService } from './services/syncService';
await syncService.clearAllData();
```

### Data Not Appearing Offline

**Possible Causes:**
- You haven't loaded the data while online yet
- Browser storage was cleared
- Storage quota exceeded

**Solution:**
1. Connect to internet
2. Navigate to the page with missing data
3. Wait for data to load and cache
4. Try offline mode again

## Limitations

### Current Limitations
- **No Real-time Sync**: Changes from other devices don't appear until manual refresh
- **No Collaboration**: Offline mode doesn't support real-time collaboration features
- **No File Uploads**: Image uploads require online connection
- **No Authentication**: Login/logout requires online connection
- **Chat Disabled**: Chat features require online connection

### Future Enhancements
- Background sync for automatic updates
- Better conflict resolution with merge strategies
- Offline support for image uploads
- Peer-to-peer sync between devices
- Compression for efficient storage

## Security Considerations

### Data Privacy
- All offline data is stored in browser's IndexedDB
- Data is not encrypted at rest (relies on device security)
- Clearing browser data removes all offline data
- Shared devices: Always log out when done

### Authentication
- JWT tokens are stored in localStorage
- Tokens remain valid while offline
- Expired tokens are refreshed when online
- Logout immediately clears all cached data

## Performance Impact

### Storage Usage
- **Notes**: ~1-5 KB per note (depending on content)
- **Tasks**: ~0.5-2 KB per task
- **Folders**: ~0.3-1 KB per folder
- **Sync Queue**: ~0.5 KB per pending operation

### Memory Impact
- Minimal memory footprint
- IndexedDB access is async and non-blocking
- Service worker runs in separate thread

### Battery Impact
- Negligible impact on battery life
- Sync only happens when online
- Background sync is throttled by browser

## FAQ

**Q: Do I need to do anything to enable offline mode?**  
A: No, it's automatically enabled. Just use the app normally.

**Q: How much data can I store offline?**  
A: Typically thousands of notes and tasks, limited by browser storage quota (usually GBs).

**Q: What happens if I make changes on multiple devices while offline?**  
A: Last write wins. The device that syncs last will overwrite earlier changes.

**Q: Can I use the app offline if I've never logged in?**  
A: No, you need to log in online at least once to download initial data.

**Q: Are my offline notes encrypted?**  
A: No, they're stored in plain text in IndexedDB. Use device encryption for security.

**Q: Does offline mode work on mobile?**  
A: Yes! Works on iOS and Android browsers that support PWA features.

**Q: Can I install the app as a PWA?**  
A: Yes! Use your browser's "Add to Home Screen" or "Install App" option.

## Additional Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Background Sync](https://developer.chrome.com/blog/background-sync/)
