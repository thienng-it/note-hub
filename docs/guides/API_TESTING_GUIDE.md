# API Testing Guide

This guide provides examples for testing the new real-time collaboration and folder organization features.

## Prerequisites

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Get an access token by logging in:
   ```bash
   curl -X POST http://localhost:5000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "your-password"}'
   ```

   Save the `access_token` from the response.

## Folder API Testing

### 1. Create a Root Folder

```bash
curl -X POST http://localhost:5000/api/v1/folders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Work",
    "icon": "briefcase",
    "color": "#3B82F6",
    "description": "Work-related notes"
  }'
```

**Expected Response:**
```json
{
  "folder": {
    "id": 1,
    "name": "Work",
    "user_id": 1,
    "parent_id": null,
    "description": "Work-related notes",
    "icon": "briefcase",
    "color": "#3B82F6",
    "position": 0,
    "is_expanded": true,
    "created_at": "2024-12-12T13:00:00.000Z",
    "updated_at": "2024-12-12T13:00:00.000Z"
  },
  "message": "Folder created successfully"
}
```

### 2. Create a Sub-folder

```bash
curl -X POST http://localhost:5000/api/v1/folders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Project A",
    "parent_id": 1,
    "icon": "folder",
    "color": "#10B981"
  }'
```

### 3. List All Folders (Tree Structure)

```bash
curl -X GET http://localhost:5000/api/v1/folders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "folders": [
    {
      "id": 1,
      "name": "Work",
      "parent_id": null,
      "icon": "briefcase",
      "color": "#3B82F6",
      "position": 0,
      "is_expanded": true,
      "note_count": 0,
      "task_count": 0,
      "created_at": "2024-12-12T13:00:00.000Z",
      "updated_at": "2024-12-12T13:00:00.000Z",
      "children": [
        {
          "id": 2,
          "name": "Project A",
          "parent_id": 1,
          "icon": "folder",
          "color": "#10B981",
          "note_count": 0,
          "task_count": 0,
          "children": []
        }
      ]
    }
  ],
  "total": 2
}
```

### 4. Get Folder Details

```bash
curl -X GET http://localhost:5000/api/v1/folders/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Get Folder Breadcrumb Path

```bash
curl -X GET http://localhost:5000/api/v1/folders/2/path \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "path": [
    {
      "id": 1,
      "name": "Work",
      "icon": "briefcase",
      "color": "#3B82F6"
    },
    {
      "id": 2,
      "name": "Project A",
      "icon": "folder",
      "color": "#10B981"
    }
  ]
}
```

### 6. Update Folder

```bash
curl -X PUT http://localhost:5000/api/v1/folders/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Project Alpha",
    "color": "#F59E0B",
    "icon": "star"
  }'
```

### 7. Move Folder to Different Parent

```bash
curl -X POST http://localhost:5000/api/v1/folders/2/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "parent_id": null
  }'
```

### 8. Delete Folder

```bash
curl -X DELETE http://localhost:5000/api/v1/folders/2 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "message": "Folder deleted successfully"
}
```

## Notes with Folders

### 1. Create Note in Folder

```bash
curl -X POST http://localhost:5000/api/v1/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Meeting Notes",
    "body": "Discussed project timeline",
    "folder_id": 1
  }'
```

### 2. List Notes in Folder

```bash
curl -X GET "http://localhost:5000/api/v1/notes?folder_id=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Move Note to Different Folder

```bash
curl -X POST http://localhost:5000/api/v1/notes/1/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "folder_id": 2
  }'
```

### 4. Remove Note from Folder

```bash
curl -X POST http://localhost:5000/api/v1/notes/1/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "folder_id": null
  }'
```

## WebSocket Testing

### 1. Connect to WebSocket

Using a WebSocket client or browser console:

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'YOUR_ACCESS_TOKEN'
  }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
});

socket.on('connection-status', (status) => {
  console.log('Status:', status);
});
```

### 2. Join a Note Room

```javascript
socket.emit('join-note', 123); // Replace 123 with actual note ID

socket.on('room-members', (data) => {
  console.log('Room members:', data);
});

socket.on('user-joined', (data) => {
  console.log('User joined:', data);
});
```

### 3. Listen for Note Updates

```javascript
socket.on('note-updated', (data) => {
  console.log('Note updated:', data);
  // data.noteId, data.changes, data.updatedBy, data.timestamp
});

socket.on('note-deleted', (data) => {
  console.log('Note deleted:', data);
});
```

### 4. Send Note Update

```javascript
socket.emit('note-update', {
  noteId: 123,
  changes: {
    title: 'Updated Title',
    body: 'Updated content'
  },
  version: 1
});
```

### 5. Leave Note Room

```javascript
socket.emit('leave-note', 123);

socket.on('user-left', (data) => {
  console.log('User left:', data);
});
```

### 6. Test Multi-User Collaboration

1. Open two browser tabs/windows
2. Login as different users in each
3. Share a note between them
4. In tab 1:
   ```javascript
   const socket1 = io('http://localhost:5000', { auth: { token: TOKEN1 } });
   socket1.emit('join-note', 123);
   socket1.on('note-updated', (data) => console.log('Tab1 received:', data));
   ```

5. In tab 2:
   ```javascript
   const socket2 = io('http://localhost:5000', { auth: { token: TOKEN2 } });
   socket2.emit('join-note', 123);
   socket2.emit('note-update', {
     noteId: 123,
     changes: { title: 'New Title' }
   });
   ```

6. Verify that tab 1 receives the update

## Error Cases to Test

### Folder Error Cases

1. **Duplicate folder name in same parent:**
   ```bash
   # Create first folder
   curl -X POST http://localhost:5000/api/v1/folders \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{"name": "Test", "parent_id": 1}'
   
   # Try to create duplicate
   curl -X POST http://localhost:5000/api/v1/folders \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{"name": "Test", "parent_id": 1}'
   ```
   **Expected:** 409 Conflict error

2. **Circular folder reference:**
   ```bash
   # Try to move folder into its own child
   curl -X POST http://localhost:5000/api/v1/folders/1/move \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{"parent_id": 2}'  # Where 2 is a child of 1
   ```
   **Expected:** 400 Bad Request with "descendant" error

3. **Non-existent parent folder:**
   ```bash
   curl -X POST http://localhost:5000/api/v1/folders \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{"name": "Test", "parent_id": 99999}'
   ```
   **Expected:** 404 Not Found error

### WebSocket Error Cases

1. **Invalid token:**
   ```javascript
   const socket = io('http://localhost:5000', {
     auth: { token: 'invalid_token' }
   });
   socket.on('connect_error', (error) => {
     console.log('Expected error:', error.message);
   });
   ```

2. **Missing token:**
   ```javascript
   const socket = io('http://localhost:5000');
   socket.on('connect_error', (error) => {
     console.log('Expected error:', error.message);
   });
   ```

## Performance Testing

### Load Testing Folders

```bash
# Create 100 folders
for i in {1..100}; do
  curl -X POST http://localhost:5000/api/v1/folders \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -d "{\"name\": \"Folder $i\", \"icon\": \"folder\"}" &
done
wait

# List all folders and measure response time
time curl -X GET http://localhost:5000/api/v1/folders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Load Testing WebSocket

```javascript
// Connect 10 simultaneous users to same note
const sockets = [];
for (let i = 0; i < 10; i++) {
  const socket = io('http://localhost:5000', {
    auth: { token: tokens[i] }
  });
  socket.emit('join-note', 123);
  sockets.push(socket);
}

// Send updates from each
sockets.forEach((socket, i) => {
  socket.emit('note-update', {
    noteId: 123,
    changes: { body: `Update from user ${i}` }
  });
});
```

## Debugging Tips

1. **Check server logs:**
   ```bash
   # The server logs all WebSocket events and folder operations
   tail -f backend/logs/app.log
   ```

2. **Enable debug logging:**
   ```bash
   # In .env
   LOG_LEVEL=debug
   ```

3. **Check database state:**
   ```bash
   sqlite3 backend/data/notes.db
   SELECT * FROM folders;
   SELECT * FROM notes WHERE folder_id IS NOT NULL;
   ```

4. **Monitor WebSocket connections:**
   ```bash
   # Check metrics endpoint
   curl http://localhost:5000/metrics | grep websocket
   ```

## Integration Test Script

Save as `test_features.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:5000/api/v1"
TOKEN="YOUR_ACCESS_TOKEN"

echo "Testing Folder API..."

# 1. Create root folder
echo "Creating Work folder..."
FOLDER_ID=$(curl -s -X POST $API_URL/folders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Work", "icon": "briefcase"}' | jq -r '.folder.id')

echo "Created folder ID: $FOLDER_ID"

# 2. Create sub-folder
echo "Creating Project A folder..."
SUB_FOLDER_ID=$(curl -s -X POST $API_URL/folders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\": \"Project A\", \"parent_id\": $FOLDER_ID}" | jq -r '.folder.id')

echo "Created sub-folder ID: $SUB_FOLDER_ID"

# 3. List folders
echo "Listing folders..."
curl -s -X GET $API_URL/folders \
  -H "Authorization: Bearer $TOKEN" | jq '.folders'

# 4. Create note in folder
echo "Creating note in folder..."
NOTE_ID=$(curl -s -X POST $API_URL/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"title\": \"Test Note\", \"body\": \"Content\", \"folder_id\": $SUB_FOLDER_ID}" | jq -r '.note.id')

echo "Created note ID: $NOTE_ID"

# 5. List notes in folder
echo "Listing notes in folder..."
curl -s -X GET "$API_URL/notes?folder_id=$SUB_FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.notes'

# 6. Move note to parent folder
echo "Moving note to parent folder..."
curl -s -X POST $API_URL/notes/$NOTE_ID/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"folder_id\": $FOLDER_ID}"

# 7. Delete sub-folder
echo "Deleting sub-folder..."
curl -s -X DELETE $API_URL/folders/$SUB_FOLDER_ID \
  -H "Authorization: Bearer $TOKEN"

# 8. Clean up
echo "Deleting folder..."
curl -s -X DELETE $API_URL/folders/$FOLDER_ID \
  -H "Authorization: Bearer $TOKEN"

echo "Deleting note..."
curl -s -X DELETE $API_URL/notes/$NOTE_ID \
  -H "Authorization: Bearer $TOKEN"

echo "Test complete!"
```

Make it executable and run:
```bash
chmod +x test_features.sh
./test_features.sh
```

---

**Document Version:** 1.0  
**Date:** December 2024  
**Author:** NoteHub Development Team
