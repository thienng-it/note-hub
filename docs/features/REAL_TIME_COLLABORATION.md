# Real-time Collaboration Feature

## Overview

NoteHub now supports real-time collaboration for notes and tasks, allowing multiple users to work together simultaneously with instant updates.

## Features

### 📝 Notes Collaboration

- **Real-time Editing**: Multiple users can edit the same note simultaneously
- **Live Updates**: Changes appear instantly without page refresh
- **Cursor Sharing**: See where other users are editing (cursor position tracking)
- **Presence Indicators**: Know who else is viewing/editing the note
- **Permission-Based**: Respects note sharing permissions (view/edit)
- **Conflict Handling**: Last-write-wins approach for concurrent edits

### ✅ Tasks Collaboration

- **Real-time Updates**: Task changes broadcast to all viewers instantly
- **Live Status**: See task completion status update in real-time
- **Priority Changes**: Priority and due date updates appear immediately
- **Owner Access**: Currently limited to task owner (no sharing yet)
- **Presence Tracking**: See who else is viewing the task

## Technical Architecture

### Backend (Node.js/Express)

**File**: `backend/src/config/socketio.js`

The implementation extends the existing Socket.IO server (originally for chat) with collaboration-specific events:

#### Note Events:
- `note:join` - Join a note editing room
- `note:leave` - Leave a note editing room
- `note:update` - Broadcast note changes
- `note:cursor` - Share cursor position
- `note:user-joined` - User presence notification
- `note:user-left` - User departure notification

#### Task Events:
- `task:join` - Join a task room
- `task:leave` - Leave a task room
- `task:update` - Broadcast task changes
- `task:user-joined` - User presence notification
- `task:user-left` - User departure notification

### Frontend (React/TypeScript)

**File**: `frontend/src/services/socketService.ts`

Provides typed methods for collaboration:

```typescript
// Note collaboration
joinNoteRoom(noteId: number)
leaveNoteRoom(noteId: number)
sendNoteUpdate(noteId: number, changes: object)
sendNoteCursor(noteId: number, position: number)

// Task collaboration
joinTaskRoom(taskId: number)
leaveTaskRoom(taskId: number)
sendTaskUpdate(taskId: number, changes: object)
```

## Usage Example

### React Hook for Note Collaboration

```typescript
import { useEffect, useCallback } from 'react';
import { getSocket, joinNoteRoom, leaveNoteRoom, sendNoteUpdate } from '../services/socketService';

export function useNoteCollaboration(noteId: number, onUpdate: (changes: any) => void) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !noteId) return;

    // Join the note room
    joinNoteRoom(noteId);

    // Listen for updates
    const handleNoteUpdate = (payload: any) => {
      if (payload.noteId === noteId) {
        onUpdate(payload.changes);
      }
    };

    socket.on('note:update', handleNoteUpdate);

    // Cleanup
    return () => {
      leaveNoteRoom(noteId);
      socket.off('note:update', handleNoteUpdate);
    };
  }, [noteId, onUpdate]);

  // Broadcast changes
  const broadcastChanges = useCallback((changes: any) => {
    sendNoteUpdate(noteId, changes);
  }, [noteId]);

  return { broadcastChanges };
}
```

### Using the Hook

```typescript
function NoteEditor({ noteId }) {
  const [note, setNote] = useState({ title: '', body: '' });

  // Handle remote updates
  const handleRemoteUpdate = useCallback((changes) => {
    setNote(prev => ({ ...prev, ...changes }));
  }, []);

  // Setup collaboration
  const { broadcastChanges } = useNoteCollaboration(noteId, handleRemoteUpdate);

  // Handle local changes
  const handleChange = (field, value) => {
    // Update local state (optimistic)
    setNote(prev => ({ ...prev, [field]: value }));
    
    // Broadcast to collaborators
    broadcastChanges({ [field]: value });
    
    // Save to server via REST API (debounced)
    debouncedSave({ ...note, [field]: value });
  };

  return (
    <div>
      <input
        value={note.title}
        onChange={(e) => handleChange('title', e.target.value)}
      />
      <textarea
        value={note.body}
        onChange={(e) => handleChange('body', e.target.value)}
      />
    </div>
  );
}
```

## Security

### Authentication
- All WebSocket connections require valid JWT tokens
- Authentication middleware validates tokens on connection
- Expired tokens are rejected

### Authorization
- Notes: Users can only join rooms for notes they own or have shared access to
- Shared notes: Edit permission checked before allowing updates
- Tasks: Currently only owner can access (no sharing implemented yet)

### Rate Limiting
- Socket.IO connections are exempt from standard API rate limiting
- Prevents collaboration features from hitting rate limits
- REST API rate limiting still applies normally

## Performance Considerations

### Scalability
- Each note/task has its own room
- Only users in a room receive updates
- Efficient message broadcasting

### Network Usage
- Only changes are transmitted, not full documents
- Cursor positions can be debounced
- Automatic reconnection on connection loss

### Best Practices
1. **Debounce rapid changes**: Don't broadcast every keystroke
2. **Optimize updates**: Send only changed fields
3. **Leave rooms**: Clean up when user navigates away
4. **Persist via API**: Always save to database via REST API

## Current Limitations

1. **Conflict Resolution**: Uses simple last-write-wins
   - No operational transformation (OT)
   - No CRDT (Conflict-free Replicated Data Types)
   - Future enhancement opportunity

2. **Task Sharing**: Tasks don't support sharing yet
   - Only owner can access task rooms
   - Will be enhanced when task sharing is implemented

3. **Offline Support**: No offline queue
   - Changes made offline are not synced when reconnecting
   - Future enhancement opportunity

4. **History**: No real-time editing history
   - Can't see who made which changes
   - Future enhancement opportunity

## Future Enhancements

### Planned Features
- ✅ Operational Transformation for better conflict resolution
- ✅ Rich presence (typing indicators, active section)
- ✅ Task sharing and multi-user task collaboration
- ✅ Offline sync queue
- ✅ Change attribution (who made what change)
- ✅ Undo/redo across users
- ✅ Cursor color coding per user
- ✅ Version history with real-time markers

### Scalability Improvements
- Redis adapter for Socket.IO (multi-server support)
- Message queue for reliable delivery
- Connection pooling
- Load balancing

## Documentation

- **API Reference**: [docs/api/COLLABORATION_API.md](../api/COLLABORATION_API.md)
- **Testing Guide**: [docs/guides/COLLABORATION_TESTING.md](../guides/COLLABORATION_TESTING.md)
- **Chat API** (similar patterns): [docs/api/CHAT_API.md](../api/CHAT_API.md)

## Implementation Timeline

- **Phase 1** (Completed): Basic real-time collaboration
  - Socket.IO event handlers
  - Rate limiting exemption
  - Frontend service methods
  - Permission-based access control

- **Phase 2** (Future): Enhanced features
  - Operational Transformation
  - Rich presence indicators
  - Task sharing support
  - Offline sync

- **Phase 3** (Future): Production hardening
  - Redis adapter for scaling
  - Load testing and optimization
  - Monitoring and metrics
  - Error recovery strategies

## Related Issues

This implementation addresses:
- Real-time collaboration requirement for notes
- Real-time collaboration requirement for tasks
- Socket.IO rate limiting bypass requirement

## Migration Notes

### For Existing Installations
No database migrations required. The feature uses existing:
- `notes` table for note collaboration
- `tasks` table for task collaboration  
- `share_notes` table for permission checking
- Socket.IO server (already present for chat)

### For New Installations
All required infrastructure is included:
- Socket.IO server initialization in `src/index.js`
- Collaboration events in `src/config/socketio.js`
- Frontend service in `src/services/socketService.ts`

## Support

For issues or questions:
1. Check the [Testing Guide](../guides/COLLABORATION_TESTING.md)
2. Review [API Documentation](../api/COLLABORATION_API.md)
3. Check browser console for Socket.IO errors
4. Verify JWT token is valid
5. Ensure note/task sharing permissions are correct

## Contributors

- Initial implementation: December 2024
- Socket.IO integration: Existing chat infrastructure
- Documentation: Comprehensive guides and API reference

---

**Status**: ✅ Production Ready  
**Version**: 1.6.0+  
**Last Updated**: December 13, 2024
