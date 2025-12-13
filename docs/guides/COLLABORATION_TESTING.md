# Real-time Collaboration Testing Guide

This guide provides instructions for manually testing the real-time collaboration features for notes and tasks.

## Prerequisites

1. Backend server running with Socket.IO enabled
2. Frontend application running
3. Two or more user accounts for testing collaboration
4. Browser developer console access for debugging

## Testing Notes Collaboration

### Setup

1. **Create Test Users**
   - Create two user accounts (e.g., `user1` and `user2`)
   - Log in with `user1` in Browser/Tab 1
   - Log in with `user2` in Browser/Tab 2

2. **Create a Shared Note**
   - As `user1`, create a new note
   - Share the note with `user2` with edit permissions

### Test Cases

#### Test 1: Join Note Room

**Steps:**
1. Open the shared note in both browsers
2. Open browser console in both windows
3. In console, verify Socket.IO connection:
   ```javascript
   // Should see: "Socket.io connected"
   ```

**Expected Result:**
- Both users should successfully connect to the Socket.IO server
- No connection errors in console

#### Test 2: Real-time Note Updates

**Steps:**
1. In Browser 1 (user1), edit the note title
2. Observe Browser 2 (user2)

**Expected Result:**
- Changes made by user1 should appear in real-time in user2's view
- No page refresh required
- Update should be instant (within 1-2 seconds)

**How to Implement (Frontend Dev):**
```typescript
import { useNoteCollaboration } from '../hooks/useNoteCollaboration';

function NoteEditor({ noteId }) {
  const [note, setNote] = useState({ title: '', body: '' });

  // Handle remote updates
  const handleRemoteUpdate = useCallback((changes) => {
    setNote(prev => ({ ...prev, ...changes }));
  }, []);

  // Setup collaboration
  const { broadcastChanges } = useNoteCollaboration(noteId, handleRemoteUpdate);

  // Handle local changes
  const handleTitleChange = (newTitle) => {
    setNote(prev => ({ ...prev, title: newTitle }));
    broadcastChanges({ title: newTitle });
  };

  return (
    <input
      value={note.title}
      onChange={(e) => handleTitleChange(e.target.value)}
    />
  );
}
```

#### Test 3: Presence Indicators

**Steps:**
1. User1 opens a note
2. User2 opens the same note
3. Monitor console for events

**Expected Console Output (User1):**
```
User user2 joined note editing
```

**Expected Console Output (User2):**
```
Connected to note collaboration room
```

#### Test 4: Cursor Position (Advanced)

**Steps:**
1. Both users edit the note body
2. Move cursor to different positions
3. Observe cursor indicators (if implemented in UI)

**Expected Result:**
- Each user should see where the other user's cursor is
- Cursor positions update in real-time

#### Test 5: Permission Enforcement

**Steps:**
1. Create a note as user1
2. DO NOT share it with user2
3. As user2, try to access the note via URL

**Expected Result:**
- User2 should not be able to join the note room
- Console should show error: "User does not have access to this note"

#### Test 6: Leave Note Room

**Steps:**
1. Both users in the same note
2. User1 navigates away or closes the note
3. Check user2's console

**Expected Console Output (User2):**
```
User user1 left note editing
```

## Testing Tasks Collaboration

### Setup

1. Create a task as `user1`
2. Tasks currently don't support sharing, so only owner can collaborate

### Test Cases

#### Test 1: Join Task Room

**Steps:**
1. As user1, open a task
2. Open browser console
3. Verify Socket.IO events

**Expected Result:**
- Successfully joined task room
- Console shows: "Joined task {taskId}"

#### Test 2: Real-time Task Updates

**Steps:**
1. Open the same task in two tabs (both as user1)
2. In Tab 1, mark task as complete
3. Observe Tab 2

**Expected Result:**
- Task completion status updates in real-time in Tab 2
- Checkbox state changes without refresh

#### Test 3: Task Permission Enforcement

**Steps:**
1. As user2, try to join user1's task room

**Expected Result:**
- Access denied
- Console error: "User does not have access to this task"

## Testing Rate Limiting Exemption

### Test Case: Socket.IO Connections Not Rate Limited

**Steps:**
1. Open 15+ tabs with different notes
2. All should connect via Socket.IO
3. Monitor for rate limiting errors

**Expected Result:**
- All connections succeed
- No "Too many requests" errors for Socket.IO connections
- API rate limiting still applies to REST endpoints

## Debugging Tips

### Enable Detailed Socket.IO Logging

In browser console:
```javascript
localStorage.setItem('debug', 'socket.io-client:*');
// Then refresh the page
```

### Check Active Socket Rooms

Backend logging should show:
```
User joined note room: userId=1, noteId=5
User left note room: userId=1, noteId=5
```

### Verify WebSocket Connection

In browser DevTools:
1. Open Network tab
2. Filter by "WS" (WebSocket)
3. Should see connection to `/socket.io/`
4. Status should be "101 Switching Protocols"

### Common Issues

**Issue: Socket.IO not connecting**
- Check CORS configuration in backend
- Verify JWT token is valid
- Check browser console for errors

**Issue: Events not received**
- Verify user is in the correct room (joined via `note:join` or `task:join`)
- Check Socket.IO server logs
- Ensure event names match exactly

**Issue: Permission denied**
- Verify note is shared with correct permissions
- Check database share_notes table
- Ensure can_edit is set to 1 for edit permissions

## Performance Testing

### Test Load with Multiple Users

**Steps:**
1. Simulate 10+ users in the same note
2. Have all users make rapid changes
3. Monitor server CPU and memory usage

**Expected Behavior:**
- Updates should remain smooth
- No significant lag (< 2 seconds)
- Server should handle load without crashing

### Test Reconnection

**Steps:**
1. Connect to note room
2. Disable network temporarily
3. Re-enable network

**Expected Result:**
- Socket.IO should automatically reconnect
- User should rejoin note room
- No data loss

## Integration with REST API

### Verify Persistence

**Steps:**
1. Make changes via WebSocket
2. Refresh the page
3. Verify changes are saved

**Important Notes:**
- WebSocket is for broadcasting changes
- Actual persistence should still use REST API
- Implement optimistic updates with rollback on API error

## Security Testing

### Test Authentication

**Steps:**
1. Try to connect without JWT token
2. Try to connect with invalid token
3. Try to connect with expired token

**Expected Result:**
- All should fail with authentication error
- No access to collaboration features

### Test Authorization

**Steps:**
1. Try to join note owned by another user (not shared)
2. Try to edit note with read-only permission

**Expected Result:**
- Access denied for unshared notes
- Edit denied for read-only notes

## Automated Testing (Future)

For production deployments, consider implementing:
- Socket.IO client tests with `socket.io-client`
- Integration tests with multiple client connections
- Load testing with tools like Artillery or k6
- End-to-end tests with Playwright or Cypress

## Reporting Issues

When reporting collaboration issues, include:
1. Browser and version
2. Console errors (full stack trace)
3. Network tab WebSocket frames
4. Steps to reproduce
5. Expected vs actual behavior
6. Backend server logs

## Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Collaboration API Reference](../api/COLLABORATION_API.md)
- [Chat API Reference](../api/CHAT_API.md) (similar patterns)
