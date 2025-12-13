# Real-time Collaboration API Documentation

## Overview

The Collaboration API provides real-time editing functionality for notes and tasks in NoteHub. It uses WebSocket (Socket.IO) for instant updates and synchronization between multiple users working on the same note or task.

## Features

- **Real-time Note Editing**: Multiple users can edit notes simultaneously
- **Real-time Task Updates**: Collaborate on task management
- **Presence Indicators**: See who else is viewing/editing a note or task
- **Cursor Position Sharing**: See where other users are editing (notes only)
- **Live Updates**: Changes are instantly broadcasted to all collaborators
- **Permission-based Access**: Respects note sharing permissions

## Authentication

All WebSocket connections require JWT authentication.

### WebSocket Connection
```javascript
io.connect(API_URL, {
  auth: {
    token: '<access_token>'
  }
});
```

## Notes Collaboration

### Client Events (Emit)

#### Join Note Room
Join a note editing session to receive real-time updates.

```javascript
socket.emit('note:join', noteId);
```

**Parameters:**
- `noteId` (number): The ID of the note to join

**Access Control:**
- Note owner has full access
- Users with shared access can join if note is shared with them

#### Leave Note Room
Leave a note editing session.

```javascript
socket.emit('note:leave', noteId);
```

**Parameters:**
- `noteId` (number): The ID of the note to leave

#### Send Note Update
Broadcast changes to all collaborators in the note room.

```javascript
socket.emit('note:update', {
  noteId: 1,
  changes: {
    title: 'Updated Title',
    body: 'Updated content',
    tags: ['tag1', 'tag2'],
    pinned: true,
    favorite: false,
    archived: false
  }
});
```

**Parameters:**
- `noteId` (number): The ID of the note
- `changes` (object): The changes to broadcast
  - `title` (string, optional): Updated note title
  - `body` (string, optional): Updated note content
  - `tags` (array, optional): Updated tags
  - `pinned` (boolean, optional): Pin status
  - `favorite` (boolean, optional): Favorite status
  - `archived` (boolean, optional): Archive status

**Access Control:**
- Note owner can make any changes
- Shared users can only edit if `can_edit` permission is true

#### Send Cursor Position
Share cursor position with other collaborators (useful for showing where users are editing).

```javascript
socket.emit('note:cursor', {
  noteId: 1,
  position: 42
});
```

**Parameters:**
- `noteId` (number): The ID of the note
- `position` (number): Cursor position in the text

### Server Events (Listen)

#### Note Joined Confirmation
Received after successfully joining a note room.

```javascript
socket.on('note:joined', (payload) => {
  // { noteId: 1 }
  console.log(`Joined note ${payload.noteId}`);
});
```

#### User Joined Note
Notification when another user joins the note room.

```javascript
socket.on('note:user-joined', (payload) => {
  // {
  //   noteId: 1,
  //   userId: 2,
  //   username: 'jane'
  // }
  console.log(`${payload.username} started editing note ${payload.noteId}`);
});
```

#### User Left Note
Notification when another user leaves the note room.

```javascript
socket.on('note:user-left', (payload) => {
  // {
  //   noteId: 1,
  //   userId: 2,
  //   username: 'jane'
  // }
  console.log(`${payload.username} stopped editing note ${payload.noteId}`);
});
```

#### Note Update
Receive real-time updates from other collaborators.

```javascript
socket.on('note:update', (payload) => {
  // {
  //   noteId: 1,
  //   userId: 2,
  //   username: 'jane',
  //   changes: {
  //     title: 'Updated Title',
  //     body: 'Updated content'
  //   },
  //   timestamp: '2024-12-13T10:30:00.000Z'
  // }
  
  // Apply changes to local state
  updateNoteLocally(payload.noteId, payload.changes);
});
```

#### Cursor Position Update
Receive cursor position updates from other collaborators.

```javascript
socket.on('note:cursor', (payload) => {
  // {
  //   noteId: 1,
  //   userId: 2,
  //   username: 'jane',
  //   position: 42
  // }
  
  // Show cursor indicator for the user
  showUserCursor(payload.userId, payload.username, payload.position);
});
```

#### Note Error
Error notification for note operations.

```javascript
socket.on('note:error', (payload) => {
  // {
  //   message: 'Failed to update note',
  //   error: 'User does not have edit permission'
  // }
  console.error('Note error:', payload.message, payload.error);
});
```

## Tasks Collaboration

### Client Events (Emit)

#### Join Task Room
Join a task editing session to receive real-time updates.

```javascript
socket.emit('task:join', taskId);
```

**Parameters:**
- `taskId` (number): The ID of the task to join

**Access Control:**
- Only task owner can join (tasks don't have sharing yet)

#### Leave Task Room
Leave a task editing session.

```javascript
socket.emit('task:leave', taskId);
```

**Parameters:**
- `taskId` (number): The ID of the task to leave

#### Send Task Update
Broadcast task changes to all collaborators in the task room.

```javascript
socket.emit('task:update', {
  taskId: 1,
  changes: {
    title: 'Updated Task',
    description: 'Updated description',
    completed: true,
    priority: 'high',
    due_date: '2024-12-31'
  }
});
```

**Parameters:**
- `taskId` (number): The ID of the task
- `changes` (object): The changes to broadcast
  - `title` (string, optional): Updated task title
  - `description` (string, optional): Updated task description
  - `completed` (boolean, optional): Completion status
  - `priority` (string, optional): Priority level ('low', 'medium', 'high')
  - `due_date` (string, optional): Due date in ISO format

**Access Control:**
- Only task owner can make changes

### Server Events (Listen)

#### Task Joined Confirmation
Received after successfully joining a task room.

```javascript
socket.on('task:joined', (payload) => {
  // { taskId: 1 }
  console.log(`Joined task ${payload.taskId}`);
});
```

#### User Joined Task
Notification when another user joins the task room.

```javascript
socket.on('task:user-joined', (payload) => {
  // {
  //   taskId: 1,
  //   userId: 2,
  //   username: 'jane'
  // }
  console.log(`${payload.username} is viewing task ${payload.taskId}`);
});
```

#### User Left Task
Notification when another user leaves the task room.

```javascript
socket.on('task:user-left', (payload) => {
  // {
  //   taskId: 1,
  //   userId: 2,
  //   username: 'jane'
  // }
  console.log(`${payload.username} stopped viewing task ${payload.taskId}`);
});
```

#### Task Update
Receive real-time task updates from other collaborators.

```javascript
socket.on('task:update', (payload) => {
  // {
  //   taskId: 1,
  //   userId: 2,
  //   username: 'jane',
  //   changes: {
  //     completed: true,
  //     priority: 'high'
  //   },
  //   timestamp: '2024-12-13T10:30:00.000Z'
  // }
  
  // Apply changes to local state
  updateTaskLocally(payload.taskId, payload.changes);
});
```

#### Task Error
Error notification for task operations.

```javascript
socket.on('task:error', (payload) => {
  // {
  //   message: 'Failed to update task',
  //   error: 'User does not have access to this task'
  // }
  console.error('Task error:', payload.message, payload.error);
});
```

## Rate Limiting Exemption

Socket.IO connections are exempt from the standard API rate limiting to ensure smooth real-time collaboration. The rate limiting is configured to skip requests to the `/socket.io` path.

## Best Practices

### Connection Management
1. **Establish Connection Once**: Initialize Socket.IO connection on app load
2. **Auto-Reconnect**: Socket.IO automatically handles reconnection on disconnect
3. **Clean Up**: Join/leave rooms appropriately to conserve resources
4. **Logout Cleanup**: Disconnect socket on user logout

### Real-time Updates
1. **Optimistic UI**: Update local state immediately, don't wait for server confirmation
2. **Conflict Resolution**: Implement last-write-wins or merge strategies for concurrent edits
3. **Debouncing**: Debounce cursor position and rapid update events to reduce network traffic
4. **Persistence**: Always save changes to the server via REST API, use WebSocket for broadcasting only

### Performance
1. **Leave Rooms**: Always leave rooms when done editing to free server resources
2. **Batch Updates**: Consider batching multiple small changes into a single update
3. **Selective Subscriptions**: Only join rooms for notes/tasks actively being viewed/edited

### Error Handling
1. **Handle Errors**: Listen to error events and show appropriate user feedback
2. **Fallback**: If WebSocket fails, fall back to periodic REST API polling
3. **Retry Logic**: Implement exponential backoff for reconnection attempts

## Example Implementation

### React Hook for Note Collaboration

```typescript
import { useEffect } from 'react';
import { getSocket, joinNoteRoom, leaveNoteRoom, sendNoteUpdate } from '../services/socketService';

export function useNoteCollaboration(noteId: number, onUpdate: (changes: any) => void) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !noteId) return;

    // Join the note room
    joinNoteRoom(noteId);

    // Listen for updates from other users
    const handleNoteUpdate = (payload: any) => {
      if (payload.noteId === noteId) {
        onUpdate(payload.changes);
      }
    };

    socket.on('note:update', handleNoteUpdate);

    // Listen for users joining/leaving
    const handleUserJoined = (payload: any) => {
      console.log(`${payload.username} joined`);
    };

    const handleUserLeft = (payload: any) => {
      console.log(`${payload.username} left`);
    };

    socket.on('note:user-joined', handleUserJoined);
    socket.on('note:user-left', handleUserLeft);

    // Cleanup
    return () => {
      leaveNoteRoom(noteId);
      socket.off('note:update', handleNoteUpdate);
      socket.off('note:user-joined', handleUserJoined);
      socket.off('note:user-left', handleUserLeft);
    };
  }, [noteId, onUpdate]);

  // Function to broadcast changes
  const broadcastChanges = (changes: any) => {
    sendNoteUpdate(noteId, changes);
  };

  return { broadcastChanges };
}
```

### Usage Example

```typescript
function NoteEditor({ noteId }) {
  const [note, setNote] = useState({ title: '', body: '' });

  // Handle updates from other users
  const handleRemoteUpdate = useCallback((changes) => {
    setNote(prev => ({ ...prev, ...changes }));
  }, []);

  // Setup collaboration
  const { broadcastChanges } = useNoteCollaboration(noteId, handleRemoteUpdate);

  // Handle local changes
  const handleChange = (field, value) => {
    // Update local state (optimistic)
    setNote(prev => ({ ...prev, [field]: value }));
    
    // Broadcast to other users
    broadcastChanges({ [field]: value });
    
    // Debounce and save to server via REST API
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

## Security Considerations

1. **Authentication**: All WebSocket connections require valid JWT tokens
2. **Authorization**: Users can only join rooms for notes/tasks they have access to
3. **Permission Checks**: Edit operations verify user permissions before broadcasting
4. **Input Validation**: All update payloads are validated on the server
5. **Rate Limiting Exemption**: Socket.IO is exempt from API rate limiting but connection-level rate limiting may still apply

## Limitations

1. **Task Sharing**: Tasks currently don't support sharing, so only the owner can join task rooms
2. **Conflict Resolution**: The system uses a simple last-write-wins approach for concurrent edits
3. **Offline Support**: Changes made while offline are not automatically synced when reconnecting
4. **Scale**: For large-scale deployments, consider using Redis adapter for Socket.IO to support multiple server instances

## Future Enhancements

1. Operational Transformation (OT) or CRDT for better conflict resolution
2. Offline-first architecture with sync queue
3. Task sharing and multi-user task collaboration
4. Rich presence indicators (typing status, cursor colors)
5. Change history and undo/redo across users
