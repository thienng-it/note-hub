# Real-Time Collaboration & Folder Organization

## Overview

This document describes the implementation of two major features added to NoteHub:

1. **Real-Time Concurrent Updates** - WebSocket-based collaboration for shared notes
2. **Folder Organization** - Hierarchical folder structure for organizing notes and tasks

## Part 1: Real-Time Concurrent Updates

### Architecture

The real-time collaboration feature uses Socket.IO to enable multiple users to collaborate on shared notes simultaneously.

#### Backend Components

**WebSocket Service** (`backend/src/services/websocketService.js`)
- Manages Socket.IO connections and authentication
- Maintains room membership for each note
- Broadcasts updates to all users in a note room
- Tracks connected users and active rooms

**Key Features:**
- JWT-based authentication for WebSocket connections
- Room-based architecture (one room per note)
- Automatic reconnection handling
- User presence tracking (who's viewing a note)
- Graceful degradation when WebSocket unavailable

#### Frontend Components

**WebSocket Client** (`frontend/src/services/websocketClient.ts`)
- TypeScript Socket.IO client wrapper
- Event management and subscription system
- Connection state management
- Automatic reconnection with exponential backoff

**React Hook** (`frontend/src/services/useWebSocket.ts`)
- Custom React hook for easy WebSocket integration
- Automatic room join/leave on component mount/unmount
- Event callbacks for note updates, deletions, and user presence
- Connection status tracking

### WebSocket Events

#### Client → Server

**Authentication**
```javascript
// Sent during connection handshake
{
  auth: {
    token: 'JWT_ACCESS_TOKEN'
  }
}
```

**Join Note Room**
```javascript
socket.emit('join-note', noteId);
```

**Leave Note Room**
```javascript
socket.emit('leave-note', noteId);
```

**Send Note Update**
```javascript
socket.emit('note-update', {
  noteId: 123,
  changes: {
    title: 'Updated Title',
    body: 'Updated content'
  },
  version: 5 // Optional: for conflict resolution
});
```

**Send Cursor Position** (for collaborative editing)
```javascript
socket.emit('cursor-position', {
  noteId: 123,
  position: 42,
  selection: { start: 10, end: 20 }
});
```

#### Server → Client

**Connection Confirmed**
```javascript
{
  userId: 1,
  username: 'john',
  timestamp: '2024-12-12T13:00:00.000Z'
}
```

**Note Updated**
```javascript
{
  noteId: 123,
  changes: {
    title: 'New Title',
    body: 'New content',
    tags: [...]
  },
  updatedBy: {
    userId: 2,
    username: 'jane'
  },
  timestamp: '2024-12-12T13:00:00.000Z'
}
```

**Note Deleted**
```javascript
{
  noteId: 123,
  deletedBy: {
    userId: 2,
    username: 'jane'
  },
  timestamp: '2024-12-12T13:00:00.000Z'
}
```

**User Joined**
```javascript
{
  userId: 3,
  username: 'bob',
  noteId: 123,
  timestamp: '2024-12-12T13:00:00.000Z'
}
```

**User Left**
```javascript
{
  userId: 3,
  username: 'bob',
  noteId: 123,
  timestamp: '2024-12-12T13:00:00.000Z'
}
```

**Room Members**
```javascript
{
  noteId: 123,
  members: [1, 2, 3], // Array of user IDs
  count: 3
}
```

**Cursor Update**
```javascript
{
  noteId: 123,
  userId: 2,
  username: 'jane',
  position: 42,
  selection: { start: 10, end: 20 },
  timestamp: '2024-12-12T13:00:00.000Z'
}
```

**Connection Status**
```javascript
'connected' | 'disconnected' | 'connecting' | 'error'
```

### Usage Examples

#### Backend Integration

The WebSocket service is automatically integrated with note updates:

```javascript
// In routes/notes.js
import websocketService from '../services/websocketService.js';

// When a note is updated
websocketService.broadcastNoteUpdate(noteId, changes, {
  userId: req.userId,
  username: req.user.username,
});

// When a note is deleted
websocketService.broadcastNoteDeleted(noteId, {
  userId: req.userId,
  username: req.user.username,
});
```

#### Frontend Integration

```typescript
import { useWebSocket } from '../services/useWebSocket';

function NoteEditor({ noteId }) {
  const { connectionStatus, isConnected, activeUsers, sendUpdate } = useWebSocket({
    noteId,
    onNoteUpdate: (data) => {
      // Handle incoming update from another user
      console.log(`Note updated by ${data.updatedBy.username}`);
      // Merge changes into local state
      updateLocalNote(data.changes);
    },
    onNoteDeleted: (data) => {
      // Handle note deletion
      console.log(`Note deleted by ${data.deletedBy.username}`);
      navigateToNotesListview();
    },
    onUserJoined: (data) => {
      console.log(`${data.username} joined`);
    },
    onUserLeft: (data) => {
      console.log(`${data.username} left`);
    },
  });

  const handleLocalChange = (changes) => {
    // Update local state immediately (optimistic update)
    updateLocalNote(changes);
    
    // Send update to other users
    if (isConnected) {
      sendUpdate(changes);
    }
  };

  return (
    <div>
      <ConnectionIndicator status={connectionStatus} />
      <ActiveUsers users={activeUsers} />
      <Editor onChange={handleLocalChange} />
    </div>
  );
}
```

### Security Considerations

1. **Authentication**: WebSocket connections require valid JWT tokens
2. **Authorization**: Users can only join rooms for notes they have access to
3. **Rate Limiting**: Consider implementing rate limiting for WebSocket events
4. **Message Validation**: All incoming WebSocket messages should be validated

### Performance Considerations

1. **Room Cleanup**: Rooms are automatically cleaned up when empty
2. **Memory Management**: Connection tracking uses efficient data structures
3. **Broadcasting**: Only sends updates to users in the specific note room
4. **Reconnection**: Automatic reconnection with exponential backoff

### Future Enhancements

- **Operational Transformation (OT)** or **CRDT** for conflict resolution
- **Presence indicators** showing where other users are typing
- **Change history** with ability to see who made which changes
- **Commenting system** for real-time discussions
- **Version control** with branching and merging

---

## Part 2: Folder Organization

### Architecture

The folder organization system provides hierarchical folder structure for organizing notes and tasks.

#### Database Schema

**Folders Table**
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
  is_expanded BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
  UNIQUE (user_id, name, parent_id)
);

CREATE INDEX idx_folders_user ON folders(user_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_id);
```

**Notes Table Updates**
```sql
ALTER TABLE notes ADD COLUMN folder_id INTEGER DEFAULT NULL;
ALTER TABLE notes ADD FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX idx_notes_folder ON notes(folder_id);
```

**Tasks Table Updates**
```sql
ALTER TABLE tasks ADD COLUMN folder_id INTEGER DEFAULT NULL;
ALTER TABLE tasks ADD FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_folder ON tasks(folder_id);
```

#### Sequelize Model

```javascript
const Folder = sequelize.define('Folder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  parent_id: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
  description: { type: DataTypes.TEXT, allowNull: true },
  icon: { type: DataTypes.STRING(50), defaultValue: 'folder' },
  color: { type: DataTypes.STRING(20), defaultValue: '#3B82F6' },
  position: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_expanded: { type: DataTypes.BOOLEAN, defaultValue: true },
});
```

#### Folder Service

**Key Methods:**
- `getFoldersForUser(userId)` - Returns folder tree with note/task counts
- `getFolderById(folderId, userId)` - Get single folder
- `createFolder(userId, data)` - Create new folder
- `updateFolder(folderId, userId, data)` - Update folder properties
- `moveFolder(folderId, userId, newParentId)` - Move to different parent
- `deleteFolder(folderId, userId)` - Delete (moves children to parent)
- `getFolderPath(folderId, userId)` - Get breadcrumb path
- `isDescendant(folderId, potentialAncestorId)` - Check circular refs

### API Endpoints

#### GET /api/v1/folders
List all folders for user in tree structure

**Response:**
```json
{
  "folders": [
    {
      "id": 1,
      "name": "Work",
      "parent_id": null,
      "description": "Work-related notes",
      "icon": "briefcase",
      "color": "#3B82F6",
      "position": 0,
      "is_expanded": true,
      "note_count": 5,
      "task_count": 3,
      "created_at": "2024-12-12T10:00:00.000Z",
      "updated_at": "2024-12-12T10:00:00.000Z",
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
```

#### GET /api/v1/folders/:id
Get specific folder details

#### GET /api/v1/folders/:id/path
Get breadcrumb path for folder

**Response:**
```json
{
  "path": [
    { "id": 1, "name": "Work", "icon": "briefcase", "color": "#3B82F6" },
    { "id": 2, "name": "Project A", "icon": "folder", "color": "#10B981" }
  ]
}
```

#### POST /api/v1/folders
Create new folder

**Request:**
```json
{
  "name": "New Folder",
  "parent_id": 1,
  "description": "Optional description",
  "icon": "folder",
  "color": "#3B82F6",
  "position": 0
}
```

#### PUT /api/v1/folders/:id
Update folder properties

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "icon": "star",
  "color": "#F59E0B",
  "is_expanded": false
}
```

#### POST /api/v1/folders/:id/move
Move folder to new parent

**Request:**
```json
{
  "parent_id": 3
}
```

#### DELETE /api/v1/folders/:id
Delete folder (moves child folders and items to parent)

#### GET /api/v1/notes?folder_id=:id
List notes in specific folder

#### POST /api/v1/notes/:id/move
Move note to folder

**Request:**
```json
{
  "folder_id": 5
}
```

### Folder Features

1. **Hierarchical Structure**
   - Unlimited nesting depth
   - Parent-child relationships
   - Circular reference prevention

2. **Folder Metadata**
   - Custom icons (folder, briefcase, home, book, etc.)
   - Custom colors for visual organization
   - Description field
   - Position for manual ordering

3. **Smart Operations**
   - When folder deleted, children move to parent
   - When folder deleted, notes/tasks move to parent
   - Prevents moving folder into its own descendants
   - Enforces unique names within same parent

4. **Counts and Statistics**
   - Real-time note count per folder
   - Real-time task count per folder
   - Excludes archived notes from counts

### Available Icons

```
folder, briefcase, home, book, code, heart, star, tag, archive, inbox
```

### Available Colors

```
#3B82F6 (Blue)
#10B981 (Green)
#EF4444 (Red)
#F59E0B (Orange)
#8B5CF6 (Purple)
#EC4899 (Pink)
#6B7280 (Gray)
#FBBF24 (Yellow)
```

### Edge Cases

1. **Deleting folder with contents**: Contents move to parent folder
2. **Deleting root folder**: Contents become unfiled
3. **Circular references**: Prevented by `isDescendant()` check
4. **Duplicate names**: Unique constraint on (user_id, name, parent_id)
5. **Orphaned folders**: Parent deletion moves children to grandparent

### Performance Optimizations

1. **Indexed queries**: Indexes on user_id, parent_id, and composite
2. **Batch loading**: Load all folders in one query, build tree in memory
3. **Counts as aggregates**: Single query with JOINs and GROUP BY
4. **Cache invalidation**: Clear user's folder cache on changes

### Frontend Integration (To Be Implemented)

**Folder Tree Component**
```typescript
interface FolderTreeProps {
  folders: Folder[];
  selectedFolderId?: number;
  onSelect: (folderId: number) => void;
  onDrop: (noteId: number, folderId: number) => void;
}

function FolderTree({ folders, selectedFolderId, onSelect, onDrop }: FolderTreeProps) {
  // Render collapsible tree with drag-and-drop support
}
```

**Breadcrumb Navigation**
```typescript
function FolderBreadcrumb({ folderId }: { folderId: number }) {
  const [path, setPath] = useState<FolderPath[]>([]);
  
  useEffect(() => {
    fetch(`/api/v1/folders/${folderId}/path`)
      .then(r => r.json())
      .then(data => setPath(data.path));
  }, [folderId]);
  
  return (
    <nav>
      {path.map(folder => (
        <span key={folder.id}>
          <a onClick={() => navigateToFolder(folder.id)}>
            {folder.name}
          </a>
          <span>/</span>
        </span>
      ))}
    </nav>
  );
}
```

### Migration Guide

**For Existing Installations:**

The database schema will be automatically updated when the server starts. All existing notes and tasks will remain unfiled (folder_id = NULL) and can be organized into folders at your convenience.

**Default Folders:**

Consider creating default folders for new users:
- 📁 Work
- 📁 Personal
- 📁 Archive

This can be added to the user registration process.

---

## Testing

### WebSocket Testing

**Manual Testing:**
1. Open two browser windows with different users
2. Share a note between users
3. Edit the note in one window
4. Verify updates appear in the other window
5. Check connection status indicator
6. Test reconnection by temporarily losing connection

**Automated Testing:**
```javascript
// Test WebSocket authentication
test('should authenticate WebSocket connection', async () => {
  const token = 'valid_jwt_token';
  const socket = io('http://localhost:5000', { auth: { token } });
  
  await new Promise(resolve => socket.on('connected', resolve));
  expect(socket.connected).toBe(true);
});
```

### Folder Testing

**API Testing:**
```javascript
// Test folder creation
test('should create folder', async () => {
  const response = await request(app)
    .post('/api/v1/folders')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Folder', icon: 'star', color: '#F59E0B' });
    
  expect(response.status).toBe(201);
  expect(response.body.folder.name).toBe('Test Folder');
});

// Test circular reference prevention
test('should prevent circular folder references', async () => {
  const response = await request(app)
    .post('/api/v1/folders/1/move')
    .set('Authorization', `Bearer ${token}`)
    .send({ parent_id: 2 }); // Where 2 is a child of 1
    
  expect(response.status).toBe(400);
  expect(response.body.error).toContain('descendant');
});
```

---

## Configuration

### Environment Variables

**Backend:**
```bash
# No new environment variables required
# WebSocket uses existing JWT_SECRET and CORS_ORIGIN
```

**Frontend:**
```bash
# Uses existing VITE_API_URL for WebSocket connection
VITE_API_URL=http://localhost:5000
```

### Security Headers

The CSP has been updated to allow WebSocket connections:

```javascript
connectSrc: ["'self'", 'ws:', 'wss:']
```

---

## Troubleshooting

### WebSocket Issues

**Connection Fails:**
- Check JWT token is valid
- Verify CORS settings allow WebSocket
- Check firewall allows WebSocket ports
- Review browser console for errors

**Updates Not Received:**
- Verify both users are in the same note room
- Check WebSocket connection status
- Review server logs for broadcast errors

**High Latency:**
- Check network connection quality
- Monitor server load
- Consider implementing message batching

### Folder Issues

**Cannot Create Folder:**
- Check folder name is unique within parent
- Verify user has proper permissions
- Review validation error messages

**Folder Tree Broken:**
- Check for orphaned folders (parent_id points to deleted folder)
- Verify database foreign key constraints
- Run database integrity check

**Performance Slow:**
- Check database indexes exist
- Monitor query performance
- Consider caching folder tree

---

## Future Improvements

### Real-Time Collaboration
- [ ] Operational Transformation for conflict resolution
- [ ] Live cursor positions in editor
- [ ] Comment threads on notes
- [ ] Version history with diff view
- [ ] Undo/redo across users

### Folder Organization
- [ ] Drag-and-drop UI for folders
- [ ] Bulk move operations
- [ ] Folder templates
- [ ] Smart folders (auto-organize by criteria)
- [ ] Folder sharing with other users
- [ ] Folder-level permissions

---

## References

- [Socket.IO Documentation](https://socket.io/docs/)
- [Operational Transformation](https://en.wikipedia.org/wiki/Operational_transformation)
- [CRDT - Conflict-free Replicated Data Types](https://crdt.tech/)
- [Tree Data Structures](https://en.wikipedia.org/wiki/Tree_(data_structure))

---

**Document Version:** 1.0  
**Date:** December 2024  
**Author:** NoteHub Development Team
