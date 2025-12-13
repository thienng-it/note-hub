# Phase 2: Enhanced Real-time Collaboration Features

## Overview

Phase 2 enhances the real-time collaboration features with rich presence indicators, task sharing support, and improved user experience through typing indicators and active field tracking.

## New Features

### 1. Rich Presence Indicators

#### Typing Indicators

**Notes:**
- See when other users are typing in a note
- Real-time feedback for better collaboration awareness
- Reduces edit conflicts by showing active editors

**Tasks:**
- See when collaborators are editing task fields
- Helps coordinate task updates

#### Active Section/Field Tracking

**Notes:**
- Track which section users are focused on (title, body, tags)
- Visual indicators show where collaborators are working
- Prevents simultaneous edits to the same section

**Tasks:**
- Track which field users are editing (title, description, priority, due date)
- Better coordination for task management

### 2. Task Sharing Support

**New Functionality:**
- Tasks can now be shared with other users
- Supports view-only and edit permissions
- Similar to note sharing functionality
- Real-time updates for all collaborators

**Database Schema:**
New `share_tasks` table with the same structure as `share_notes`:
- `task_id`: ID of the shared task
- `shared_by_id`: User who shared the task
- `shared_with_id`: User receiving the share
- `can_edit`: Boolean for edit permissions

## API Reference

### Backend Socket.IO Events

#### Note Typing Indicator
```javascript
// Client sends
socket.emit('note:typing', {
  noteId: 1,
  isTyping: true
});

// Server broadcasts to others in room
socket.on('note:typing', ({ noteId, userId, username, isTyping }) => {
  // Show typing indicator for user
});
```

#### Note Focus Tracking
```javascript
// Client sends
socket.emit('note:focus', {
  noteId: 1,
  section: 'body' // or 'title', 'tags', etc.
});

// Server broadcasts to others in room
socket.on('note:focus', ({ noteId, userId, username, section }) => {
  // Highlight section being edited by user
});
```

#### Task Typing Indicator
```javascript
// Client sends
socket.emit('task:typing', {
  taskId: 1,
  isTyping: true
});

// Server broadcasts to others in room
socket.on('task:typing', ({ taskId, userId, username, isTyping }) => {
  // Show typing indicator for user
});
```

#### Task Focus Tracking
```javascript
// Client sends
socket.emit('task:focus', {
  taskId: 1,
  field: 'description' // or 'title', 'priority', etc.
});

// Server broadcasts to others in room
socket.on('task:focus', ({ taskId, userId, username, field }) => {
  // Highlight field being edited by user
});
```

### Frontend TypeScript Methods

```typescript
import {
  sendNoteTyping,
  sendNoteFocus,
  sendTaskTyping,
  sendTaskFocus
} from './services/socketService';

// Note typing indicator
sendNoteTyping(noteId, true); // User started typing
sendNoteTyping(noteId, false); // User stopped typing

// Note focus tracking
sendNoteFocus(noteId, 'body'); // User focused on body

// Task typing indicator
sendTaskTyping(taskId, true); // User started typing
sendTaskTyping(taskId, false); // User stopped typing

// Task focus tracking
sendTaskFocus(taskId, 'description'); // User focused on description
```

## Implementation Examples

### React Hook with Typing Indicator

```typescript
import { useEffect, useState, useCallback } from 'react';
import { getSocket, sendNoteTyping, sendNoteFocus } from '../services/socketService';

export function useNotePresence(noteId: number) {
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [focusedUsers, setFocusedUsers] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !noteId) return;

    // Handle typing indicators
    const handleTyping = ({ userId, username, isTyping }: any) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    };

    // Handle focus tracking
    const handleFocus = ({ userId, username, section }: any) => {
      setFocusedUsers(prev => {
        const next = new Map(prev);
        next.set(userId, section);
        return next;
      });
    };

    socket.on('note:typing', handleTyping);
    socket.on('note:focus', handleFocus);

    return () => {
      socket.off('note:typing', handleTyping);
      socket.off('note:focus', handleFocus);
    };
  }, [noteId]);

  // Send typing indicator with debounce
  const handleTyping = useCallback((isTyping: boolean) => {
    sendNoteTyping(noteId, isTyping);
  }, [noteId]);

  // Send focus event
  const handleFocus = useCallback((section: string) => {
    sendNoteFocus(noteId, section);
  }, [noteId]);

  return {
    typingUsers,
    focusedUsers,
    handleTyping,
    handleFocus,
  };
}
```

### Usage in Component

```typescript
function NoteEditor({ noteId }: { noteId: number }) {
  const [note, setNote] = useState({ title: '', body: '' });
  const { typingUsers, focusedUsers, handleTyping, handleFocus } = useNotePresence(noteId);
  
  // Typing timeout for debouncing
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleBodyChange = (value: string) => {
    setNote(prev => ({ ...prev, body: value }));
    
    // Send typing indicator
    handleTyping(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 2000);
  };

  const handleBodyFocus = () => {
    handleFocus('body');
  };

  return (
    <div>
      <input
        value={note.title}
        onChange={(e) => setNote({ ...note, title: e.target.value })}
        onFocus={() => handleFocus('title')}
      />
      
      <textarea
        value={note.body}
        onChange={(e) => handleBodyChange(e.target.value)}
        onFocus={handleBodyFocus}
      />
      
      {/* Show typing indicators */}
      {typingUsers.size > 0 && (
        <div className="typing-indicator">
          {Array.from(typingUsers).length} user(s) typing...
        </div>
      )}
      
      {/* Show focused sections */}
      {Array.from(focusedUsers.entries()).map(([userId, section]) => (
        <div key={userId} className="focus-indicator">
          User editing: {section}
        </div>
      ))}
    </div>
  );
}
```

## Task Sharing Implementation

### Backend API Endpoint (to be added)

```javascript
// POST /api/v1/tasks/:id/share
router.post('/:id/share', jwtRequired, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { userId, canEdit } = req.body;
    
    // Verify task ownership
    const task = await db.queryOne(
      'SELECT id FROM tasks WHERE id = ? AND owner_id = ?',
      [taskId, req.userId]
    );
    
    if (!task) {
      return responseHandler.notFound(res, 'Task');
    }
    
    // Create share
    await db.run(
      'INSERT INTO share_tasks (task_id, shared_by_id, shared_with_id, can_edit) VALUES (?, ?, ?, ?)',
      [taskId, req.userId, userId, canEdit ? 1 : 0]
    );
    
    responseHandler.success(res, { message: 'Task shared successfully' });
  } catch (error) {
    responseHandler.error(res, error.message);
  }
});
```

### Frontend Usage

```typescript
// Share a task
async function shareTask(taskId: number, userId: number, canEdit: boolean) {
  const response = await fetch(`/api/v1/tasks/${taskId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId, canEdit })
  });
  
  return response.json();
}
```

## Database Migration

The `share_tasks` table is automatically created during database initialization. No manual migration is required.

**SQLite Schema:**
```sql
CREATE TABLE IF NOT EXISTS share_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  shared_by_id INTEGER NOT NULL,
  shared_with_id INTEGER NOT NULL,
  can_edit INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by_id) REFERENCES users(id),
  FOREIGN KEY (shared_with_id) REFERENCES users(id)
);
```

**MySQL Schema:**
```sql
CREATE TABLE IF NOT EXISTS share_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  shared_by_id INT NOT NULL,
  shared_with_id INT NOT NULL,
  can_edit BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX ix_share_tasks_task (task_id),
  INDEX ix_share_tasks_shared_with (shared_with_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by_id) REFERENCES users(id),
  FOREIGN KEY (shared_with_id) REFERENCES users(id)
);
```

## Best Practices

### Typing Indicators

1. **Debounce typing events** - Don't send on every keystroke
   - Use 1-2 second timeout
   - Stop indicator when user pauses

2. **Clear indicator on blur** - Stop typing when user leaves field

3. **Visual feedback** - Show subtle, non-intrusive indicator

### Focus Tracking

1. **Update on focus** - Send event when user focuses on a field

2. **Clear on blur** - Remove indicator when user leaves field

3. **Visual highlighting** - Use subtle border or background color

4. **Conflict prevention** - Warn users before editing same section

### Task Sharing

1. **Permission checks** - Always verify user has access

2. **Real-time updates** - Use Socket.IO for instant sync

3. **Optimistic UI** - Update UI immediately, rollback on error

## Performance Considerations

### Network Optimization

- **Debounce typing indicators** - Reduce network traffic
- **Throttle focus events** - Send at most once per second
- **Batch updates** - Combine multiple small events when possible

### UI Performance

- **Use React.memo** - Prevent unnecessary re-renders
- **Virtualize lists** - For large numbers of collaborators
- **Optimize animations** - Use CSS transforms for smooth indicators

## Testing

### Manual Testing

1. **Typing Indicators:**
   - Open same note in two browsers
   - Type in one, verify indicator shows in other
   - Stop typing, verify indicator disappears

2. **Focus Tracking:**
   - Focus different fields in each browser
   - Verify visual indicators show correctly
   - Check that indicators clear on blur

3. **Task Sharing:**
   - Share a task with another user
   - Verify both users can join task room
   - Test edit permissions (can_edit = true/false)
   - Verify real-time updates work

### Automated Testing

```typescript
describe('Phase 2 Features', () => {
  it('should broadcast typing indicator', async () => {
    // Join note room
    socket1.emit('note:join', noteId);
    
    // Send typing event
    socket1.emit('note:typing', { noteId, isTyping: true });
    
    // Verify socket2 receives it
    await waitFor(() => {
      expect(socket2).toHaveReceived('note:typing');
    });
  });
  
  it('should track focused section', async () => {
    // Send focus event
    socket1.emit('note:focus', { noteId, section: 'body' });
    
    // Verify broadcast
    await waitFor(() => {
      expect(socket2).toHaveReceived('note:focus');
    });
  });
});
```

## Limitations

1. **No conflict resolution** - Still uses last-write-wins
2. **No edit locking** - Multiple users can edit same field
3. **Limited presence info** - Only shows typing/focus state
4. **No offline support** - Indicators only work when online

## Future Enhancements (Phase 3)

- **Operational Transformation** - Better conflict resolution
- **Edit locking** - Prevent simultaneous edits
- **Rich presence** - Show cursor positions, selections
- **Offline sync** - Queue presence events when offline
- **Collaborative cursor colors** - Unique color per user

## Related Documentation

- [Collaboration API](../api/COLLABORATION_API.md) - Complete API reference
- [Real-time Collaboration](./REAL_TIME_COLLABORATION.md) - Phase 1 features
- [Testing Guide](../guides/COLLABORATION_TESTING.md) - Manual testing scenarios

---

**Status**: ✅ Implemented  
**Version**: 1.7.0+  
**Phase**: 2 of 3  
**Last Updated**: December 2025
