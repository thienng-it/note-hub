# Changelog - Version 1.6.0

## Release Date: December 12, 2025

## 🎉 Major Features

### Real-Time Collaboration
- **WebSocket Integration**: Implemented Socket.IO for real-time collaboration on shared notes
- **Room-Based Architecture**: Notes have dedicated rooms for collaborative editing
- **Live Updates**: Note changes are broadcast to all connected users in real-time
- **User Presence**: Track when users join/leave note editing sessions
- **Automatic Reconnection**: WebSocket client handles connection drops gracefully
- **JWT Authentication**: Secure WebSocket connections with JWT token validation

### Hierarchical Folder Organization
- **Folder Management**: Create, edit, delete, and organize notes into folders
- **Tree Structure**: Self-referential parent-child folder relationships
- **Folder Filtering**: Filter notes by folder in the UI
- **Drag-and-Drop Ready**: Backend API supports moving notes between folders
- **Custom Icons & Colors**: Personalize folders with 12 icon options and 8 color themes
- **Expandable Tree**: Folders remember their expanded/collapsed state
- **Note Counts**: See how many notes are in each folder
- **Breadcrumb Support**: API provides folder path for navigation

## 🔧 Backend Changes

### New Features
- **WebSocket Service** (`src/services/websocketService.js`):
  - Socket.IO server initialization
  - Authentication middleware for WebSocket connections
  - Room management for collaborative editing
  - User presence tracking
  - Broadcasting note updates and deletions
  
- **Folder Service** (`src/services/folderService.js`):
  - Complete CRUD operations for folders
  - Tree structure queries with note/task counts
  - Move folders with circular reference prevention
  - Get folder breadcrumb paths
  - Validate folder hierarchy

- **Folder Routes** (`src/routes/folders.js`):
  - `GET /api/v1/folders` - List all folders as tree
  - `POST /api/v1/folders` - Create new folder
  - `GET /api/v1/folders/:id` - Get folder details
  - `PUT /api/v1/folders/:id` - Update folder
  - `DELETE /api/v1/folders/:id` - Delete folder
  - `POST /api/v1/folders/:id/move` - Move folder
  - `GET /api/v1/folders/:id/path` - Get breadcrumb path

- **Database Schema**:
  - New `folders` table with self-referential structure
  - Added `folder_id` column to `notes` table
  - Added `folder_id` column to `tasks` table
  - Automatic migration on server startup

### Improvements
- **Notes API**: Added `folder_id` query parameter for filtering
- **WebSocket Broadcasting**: Integrated into note update/delete operations
- **Error Handling**: Graceful degradation when WebSocket not initialized
- **Test Compatibility**: WebSocket service works in test environments

## 🎨 Frontend Changes

### New Components
- **FolderTree** (`src/components/FolderTree.tsx`):
  - Hierarchical folder navigation
  - Expand/collapse functionality
  - Note count display
  - Icon and color support
  - Loading and error states
  
- **FolderModal** (`src/components/FolderModal.tsx`):
  - Create/edit folders
  - Icon picker (12 options)
  - Color picker (8 options)
  - Parent folder support for subfolders
  - Form validation

- **WebSocket Client** (`src/services/websocketClient.ts`):
  - Connection management
  - Event handling
  - Automatic reconnection
  - TypeScript support

- **useWebSocket Hook** (`src/services/useWebSocket.ts`):
  - React hook for WebSocket integration
  - Connection status tracking
  - Event callbacks
  - Room management

### Page Updates
- **NotesPage**: 
  - Integrated folder sidebar
  - Toggle to show/hide folders
  - Folder filtering in notes list
  - URL parameter support for folder navigation
  
### API Client Updates
- **notesApi.list**: Added `folder_id` parameter
- **New foldersApi**: Complete folder CRUD client
- **TypeScript Types**: Full type definitions for folders

### Translations
- Added folder-related translations in English
- Translation keys for folder UI elements
- Folder feature fully internationalized

## 🧪 Testing

- ✅ All 107 backend tests passing
- ✅ Frontend builds successfully
- ✅ No TypeScript compilation errors
- ✅ CodeQL security scan passed (0 vulnerabilities)
- ✅ Code review completed

## 📚 Documentation

### New Documentation Files
1. **`docs/features/REALTIME_COLLABORATION_AND_FOLDERS.md`**
   - Complete technical documentation
   - WebSocket API reference
   - Folder API reference
   - Usage examples

2. **`docs/guides/API_TESTING_GUIDE.md`**
   - cURL examples for all new endpoints
   - WebSocket connection examples
   - Folder management workflows
   - Testing strategies

3. **`docs/investigation/REALTIME_AND_FOLDERS_IMPLEMENTATION_SUMMARY.md`**
   - Implementation decisions
   - Architecture overview
   - Future enhancements

## 🔒 Security

- JWT authentication for WebSocket connections
- Input validation on all new endpoints
- Circular reference prevention in folder hierarchy
- SQL injection protection via parameterized queries
- XSS prevention in folder names
- CodeQL scan passed with 0 alerts

## ⚡ Performance

- Efficient tree queries for folder hierarchy
- Indexed database columns for faster lookups
- WebSocket connection pooling
- Graceful degradation when services unavailable

## 🐛 Bug Fixes

- Fixed NaN handling in folder ID parsing
- Fixed WebSocket null pointer in test environment
- Improved type safety in folder filtering
- Fixed missing translation keys

## 📝 Breaking Changes

None. This release is fully backward compatible.

## 🔄 Migration Notes

### Database Migration
- Automatic schema migration on server startup
- Creates `folders` table if not exists
- Adds `folder_id` columns to `notes` and `tasks`
- Existing notes remain unfiled (folder_id = NULL)

### Environment Variables
No new required environment variables. WebSocket uses existing configuration.

## 🚀 Deployment

1. Pull latest code
2. Install dependencies: `npm install` (both backend and frontend)
3. Start backend: `npm start` (auto-migration runs)
4. Build frontend: `npm run build`
5. Deploy as usual

## 📦 Dependencies

### New Backend Dependencies
- `socket.io@^4.8.1` - WebSocket server

### New Frontend Dependencies  
- `socket.io-client@^4.8.1` - WebSocket client

## 🔮 Future Enhancements

- Real-time cursor positions in collaborative editing
- Conflict resolution for simultaneous edits
- Drag-and-drop notes to folders in UI
- Folder breadcrumb navigation in UI
- Move to folder context menu
- Share folders with other users
- Folder permissions

## 👥 Contributors

- @copilot - Implementation
- @kobenguyent - Code review

---

**Full Changelog**: v1.5.0...v1.6.0
