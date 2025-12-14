# Folder Organization Implementation Guide

## Overview

This document describes the implementation of hierarchical folder organization for notes and tasks in NoteHub, following patterns from Notion, Evernote, and Apple Notes.

## Status

**Phase 1 Complete:** Backend API and Database Schema ✅  
**Phase 2 Complete:** Frontend Components and Integration ✅  
**Phase 3 Complete:** Advanced Features ✅  
**Phase 4 Partial:** Optional Enhancements (Future)

## Architecture

### Design Approach: Hybrid Folders + Tags

The implementation follows the **Hybrid Folders + Tags** approach recommended in the research document:

- **Hierarchical Folders:** Unlimited nesting using self-referential parent_id
- **Optional Assignment:** Notes/tasks can optionally belong to one folder
- **Existing Tags Preserved:** Tag system continues to work for cross-cutting categorization
- **Graceful Degradation:** Notes without folders remain fully accessible in "All Notes"
- **Backward Compatible:** Existing notes work without any changes

## Database Schema

### Folders Table

```sql
CREATE TABLE folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  user_id INTEGER NOT NULL,
  parent_id INTEGER DEFAULT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'folder',
  color VARCHAR(20) DEFAULT '#3B82F6',
  position INTEGER DEFAULT 0,
  is_expanded INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);
```

### Schema Modifications

**Notes Table:**
- Added `folder_id INTEGER DEFAULT NULL`
- Foreign key: `FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL`

**Tasks Table:**
- Added `folder_id INTEGER DEFAULT NULL`
- Foreign key: `FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL`

### Automatic Migrations

Both SQLite and MySQL migrations are automatic:
- Check if `folder_id` column exists before adding
- Create indexes after column is added
- Safe for both new installations and upgrades
- No manual migration scripts required

## Backend API

### Folder Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/folders` | List all folders in tree structure |
| POST | `/api/v1/folders` | Create new folder |
| GET | `/api/v1/folders/:id` | Get folder details with counts |
| PUT | `/api/v1/folders/:id` | Update folder properties |
| DELETE | `/api/v1/folders/:id` | Delete folder (requires no children) |
| POST | `/api/v1/folders/:id/move` | Move folder to new parent |
| GET | `/api/v1/folders/:id/path` | Get breadcrumb path |
| GET | `/api/v1/folders/:id/notes` | Get notes in folder (with recursive option) |
| POST | `/api/v1/folders/notes/:noteId/move` | Move note to folder |
| POST | `/api/v1/folders/tasks/:taskId/move` | Move task to folder |

### API Response Format

**List Folders (GET /api/v1/folders):**
```json
{
  "success": true,
  "data": {
    "folders": [
      {
        "id": 1,
        "name": "Work",
        "parent_id": null,
        "icon": "briefcase",
        "color": "#3B82F6",
        "position": 0,
        "is_expanded": true,
        "note_count": 5,
        "task_count": 3,
        "children": [
          {
            "id": 2,
            "name": "Project A",
            "parent_id": 1,
            "icon": "folder",
            "color": "#10B981",
            "note_count": 3,
            "task_count": 2,
            "children": []
          }
        ]
      }
    ],
    "total": 2
  }
}
```

## Backend Services

### FolderService

Located in `backend/src/services/folderService.js`

**Key Features:**
- Tree structure building from flat folder list
- Circular reference detection for folder moves
- Breadcrumb path generation
- Recursive note/task fetching in folders
- Default folder creation for new users
- Redis caching integration (if enabled)

**Important Methods:**
- `getFoldersForUser(userId)` - Get folder tree with counts
- `createFolder(userId, folderData)` - Create with validation
- `updateFolder(folderId, userId, updates)` - Update with circular check
- `deleteFolder(folderId, userId)` - Delete with children validation
- `moveFolder(folderId, userId, newParentId)` - Move with circular check
- `checkCircularReference(folderId, newParentId, userId)` - Prevent loops
- `getAllDescendantFolderIds(folderId, userId)` - Recursive traversal

## Frontend Implementation

### TypeScript Types

Located in `frontend/src/types/index.ts`

```typescript
export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  description?: string;
  icon: string;
  color: string;
  position: number;
  is_expanded: boolean;
  created_at?: string;
  updated_at?: string;
  note_count?: number;
  task_count?: number;
  children?: Folder[];
}

export interface FolderFormData {
  name: string;
  parent_id?: number | null;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
}
```

### API Client

Located in `frontend/src/api/client.ts`

```typescript
// Import
import { foldersApi } from '../api/client';

// Usage examples
const { folders } = await foldersApi.list();
const folder = await foldersApi.create({ name: 'My Folder', icon: 'briefcase' });
await foldersApi.update(folderId, { name: 'New Name', color: '#10B981' });
await foldersApi.moveNote(noteId, folderId);
```

### React Components

#### FolderTree Component

Located in `frontend/src/components/FolderTree.tsx`

**Props:**
- `folders: Folder[]` - Root level folders (with children)
- `selectedFolderId?: number | null` - Currently selected folder
- `onSelectFolder: (folder: Folder | null) => void` - Selection handler
- `onCreateFolder: (parentId?: number | null) => void` - Create handler
- `onEditFolder: (folder: Folder) => void` - Edit handler
- `onDeleteFolder: (folder: Folder) => void` - Delete handler
- `onMoveFolder: (folder: Folder, newParentId: number | null) => void` - Move handler

**Features:**
- "All Notes" special item (selected when selectedFolderId is null)
- Collapsible hierarchy
- Count badges for notes + tasks
- Create folder button in header

#### FolderItem Component

Located in `frontend/src/components/FolderItem.tsx`

**Features:**
- 10 predefined folder icons (folder, briefcase, home, archive, book, star, heart, code, tag, inbox)
- Color-coded icons
- Expand/collapse arrow for folders with children
- Context menu (right-click or button):
  - Create Subfolder
  - Edit Folder
  - Delete Folder
- Visual indentation based on nesting level
- Note/task count display
- Active state highlighting

### Folder Icons

Available icons: `folder`, `briefcase`, `home`, `archive`, `book`, `star`, `heart`, `code`, `tag`, `inbox`

Default colors: `#3B82F6` (blue), `#10B981` (green), `#F59E0B` (amber), `#EF4444` (red), `#8B5CF6` (purple), `#EC4899` (pink), `#6B7280` (gray)

### Internationalization

Translation keys added to `frontend/src/i18n/locales/en.json`

**Namespace:** `folders`

```json
{
  "folders": {
    "title": "Folders",
    "allNotes": "All Notes",
    "createNew": "New Folder",
    "createSubfolder": "New Subfolder",
    "edit": "Edit Folder",
    "delete": "Delete Folder",
    "createSuccess": "Folder created successfully",
    "deleteWarning": "This will remove the folder. Notes inside will remain in 'All Notes'."
  }
}
```

## Phase 3 Features

### Default Folders for New Users

When a new user registers, three default folders are automatically created:

**Implementation (backend/src/services/authService.js):**
```javascript
// After user creation
const FolderService = (await import('./folderService.js')).default;
await FolderService.createDefaultFolders(result.insertId);
```

**Default Folders:**
- **Work** - Briefcase icon (💼), Blue color (#3B82F6)
- **Personal** - Home icon (🏠), Green color (#10B981)
- **Archive** - Archive icon (📦), Gray color (#6B7280)

**Error Handling:**
- Non-blocking: User creation succeeds even if folder creation fails
- Errors logged for monitoring
- Graceful degradation

### Breadcrumb Navigation

Shows the hierarchical path of the current folder with clickable navigation.

**Component (frontend/src/components/FolderBreadcrumb.tsx):**
```typescript
<FolderBreadcrumb
  folderId={selectedFolder?.id}
  onNavigate={handleSelectFolder}
/>
```

**Features:**
- Displays full path: "All Notes > Work > Project A"
- Clickable items to navigate up the hierarchy
- Current folder highlighted with its color
- Loading state while fetching path
- Automatically updates when folder changes

**API Integration:**
```typescript
const result = await foldersApi.getPath(folderId);
// Returns: { path: [{ id, name, parent_id, color, ... }] }
```

### Folder State Persistence

Expanded/collapsed state is automatically saved to the backend.

**Implementation (frontend/src/components/FolderItem.tsx):**
```typescript
const handleToggleExpand = async (e) => {
  e.stopPropagation();
  const newState = !isExpanded;
  setIsExpanded(newState);
  
  // Persist to backend
  await foldersApi.update(folder.id, { is_expanded: newState });
};
```

**Features:**
- Saves immediately when toggled
- Persists across sessions
- Automatic retry on failure
- Optimistic UI update
- Reverts on error

**Database:**
```sql
-- is_expanded column in folders table
is_expanded INTEGER DEFAULT 1  -- SQLite
is_expanded TINYINT DEFAULT 1   -- MySQL
```

## Integration Guide

### Adding Folders to NotesPage

1. **Import Dependencies:**
```typescript
import { useState, useEffect } from 'react';
import { foldersApi } from '../api/client';
import { FolderTree } from '../components/FolderTree';
import type { Folder } from '../types';
```

2. **Add State:**
```typescript
const [folders, setFolders] = useState<Folder[]>([]);
const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
```

3. **Load Folders:**
```typescript
useEffect(() => {
  const loadFolders = async () => {
    try {
      const { folders } = await foldersApi.list();
      setFolders(folders);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };
  loadFolders();
}, []);
```

4. **Filter Notes by Folder:**
```typescript
const filteredNotes = selectedFolder
  ? notes.filter(note => note.folder_id === selectedFolder.id)
  : notes;
```

5. **Add Folder Sidebar:**
```tsx
<div className="sidebar">
  <FolderTree
    folders={folders}
    selectedFolderId={selectedFolder?.id}
    onSelectFolder={setSelectedFolder}
    onCreateFolder={handleCreateFolder}
    onEditFolder={handleEditFolder}
    onDeleteFolder={handleDeleteFolder}
    onMoveFolder={handleMoveFolder}
  />
</div>
```

### Creating Folder Dialog

Example implementation:

```typescript
const handleCreateFolder = async (parentId?: number | null) => {
  const name = prompt('Folder name:');
  if (!name) return;
  
  try {
    const folder = await foldersApi.create({
      name,
      parent_id: parentId,
      icon: 'folder',
      color: '#3B82F6',
    });
    
    // Reload folders
    const { folders } = await foldersApi.list();
    setFolders(folders);
    
    toast.success(t('folders.createSuccess'));
  } catch (error) {
    toast.error(t('folders.createError'));
  }
};
```

### Moving Notes to Folders

```typescript
const handleMoveNote = async (noteId: number, folderId: number | null) => {
  try {
    await foldersApi.moveNote(noteId, folderId);
    
    // Update local state
    setNotes(notes.map(note =>
      note.id === noteId ? { ...note, folder_id: folderId } : note
    ));
    
    toast.success('Note moved successfully');
  } catch (error) {
    toast.error('Failed to move note');
  }
};
```

## Performance Considerations

### Caching

**Redis Caching (if enabled):**
- Cache key: `folders:user:{user_id}`
- TTL: 1 hour (same as tags)
- Invalidated on any folder operation
- Also invalidates `notes:user:{userId}:*` cache

### Indexing

**Database Indexes:**
- `idx_folders_user` - Find user's folders
- `idx_folders_parent` - Find child folders
- `idx_folders_user_parent` - Composite for tree queries
- `idx_notes_folder` - Find notes in folder
- `idx_notes_user_folder` - Composite for filtered queries
- `idx_tasks_folder` - Find tasks in folder
- `idx_tasks_user_folder` - Composite for filtered queries

### Optimization Tips

1. **Folder Tree:** Built in-memory after single query (not N+1)
2. **Recursive Queries:** Use `getAllDescendantFolderIds` to fetch once
3. **Counts:** Fetched in single query with LEFT JOIN
4. **Circular Check:** Early termination with visited set

## Security Considerations

### Validation

1. **Folder Creation:**
   - Name length: max 100 characters
   - Duplicate check: same level only
   - Parent validation: must exist and belong to user

2. **Folder Updates:**
   - Circular reference prevention
   - Parent ownership validation
   - Field whitelisting

3. **Folder Deletion:**
   - Children check: must be empty
   - Cascade behavior: notes/tasks get folder_id set to NULL

### Authorization

All endpoints require JWT authentication via `jwtRequired` middleware. Folder operations are scoped to `req.userId` ensuring users can only access their own folders.

## Edge Cases Handled

1. **Circular References:** Prevented during move operations
2. **Deep Nesting:** No artificial limit (but UI indentation stops at reasonable level)
3. **Duplicate Names:** Allowed at different levels, prevented at same level
4. **Folder Deletion:** Requires no children (subfolders must be deleted first)
5. **Note/Task Orphaning:** ON DELETE SET NULL ensures notes remain accessible
6. **Parent Folder Deletion:** Cascades to children (ON DELETE CASCADE)
7. **Nonexistent Parent:** Validated before creation/move

## Testing

### Backend Tests Needed

- [ ] Folder CRUD operations
- [ ] Circular reference detection
- [ ] Tree structure building
- [ ] Note/task moving
- [ ] Authorization checks
- [ ] Cache invalidation
- [ ] Migration on existing database

### Frontend Tests Needed

- [ ] FolderTree component snapshots
- [ ] FolderItem component snapshots
- [ ] Folder selection behavior
- [ ] Context menu interactions
- [ ] Create/Edit/Delete flows
- [ ] API integration

## Future Enhancements

### Phase 3: Advanced Features ✅ COMPLETED

- [x] **Default folders for new users** - Automatically creates Work, Personal, and Archive folders on registration
- [x] **Breadcrumb navigation** - Shows hierarchical path with clickable navigation
- [x] **Folder state persistence** - Expanded/collapsed state saved to backend
- [ ] Drag-and-drop interface for moving notes/tasks (Optional - Phase 4)
- [ ] Drag-and-drop for reordering folders (Optional - Phase 4)
- [x] Folder color picker UI (Implemented in Phase 2)
- [x] Folder icon selector UI (Implemented in Phase 2)
- [ ] Bulk move operations (Optional - Phase 4)

### Phase 4: Optional Enhancements (Future)

- [ ] Keyboard navigation (arrow keys, enter, etc.)
- [ ] Folder search/filter
- [ ] Collapsed folder persistence per user
- [ ] Folder import/export
- [ ] Folder statistics dashboard
- [ ] Smart folders (auto-categorization based on rules)

## Migration from Existing Installation

Existing installations will automatically migrate when the backend starts:

1. `folders` table created if not exists
2. `folder_id` column added to `notes` and `tasks` if not exists
3. Indexes created automatically
4. Existing notes/tasks have `folder_id = NULL` (shown in "All Notes")
5. Users can organize notes into folders at their own pace

No data loss occurs during migration. All existing functionality remains intact.

## Troubleshooting

### Database Migration Issues

**Symptom:** "no such column: folder_id" error

**Solution:** Ensure migrations run after schema initialization. Check `initSchema()` is called before using folders.

**Symptom:** Index creation fails

**Solution:** Check if column exists before creating index. Migration code handles this automatically.

### API Errors

**Symptom:** "Folder not found" when folder exists

**Solution:** Check userId matches - folders are user-scoped. Verify JWT authentication.

**Symptom:** "Cannot delete folder with subfolders"

**Solution:** This is expected behavior. Delete child folders first, or move them to a new parent.

### Frontend Issues

**Symptom:** Folder tree not displaying

**Solution:** Check API response format matches `FoldersResponse` type. Verify `children` array is populated.

**Symptom:** Icons not showing

**Solution:** Verify icon name matches one of the predefined icons in `FOLDER_ICONS` map.

## Documentation Updates Needed

- [ ] Update API_CHANGELOG.md with folder endpoints
- [ ] Update JWT_API.md with folder endpoint details
- [ ] Create user guide for folder organization
- [ ] Add folder examples to README.md
- [ ] Update architecture diagrams

## References

- [Folder Organization Research](../investigation/FOLDER_ORGANIZATION_RESEARCH.md) - Original research and design decisions
- [Backend Service](../../backend/src/services/folderService.js) - Implementation
- [Backend Routes](../../backend/src/routes/folders.js) - API endpoints
- [Frontend Components](../../frontend/src/components/) - UI components
- [API Client](../../frontend/src/api/client.ts) - Frontend API integration

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Status:** Phase 1 Complete, Phase 2 Partial
