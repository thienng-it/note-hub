# Chat API Documentation

## Overview

The Chat API provides real-time messaging functionality for NoteHub users. It includes both REST endpoints and WebSocket (Socket.io) events for real-time communication.

## Features

- **Direct Messaging**: One-on-one conversations between users
- **Real-time Updates**: Instant message delivery via WebSocket
- **Typing Indicators**: See when other users are typing
- **Read Receipts**: Track message read status
- **Online Status**: See which users are currently online
- **Unread Counts**: Track unread messages per conversation

## Authentication

All chat endpoints and WebSocket connections require JWT authentication.

### REST API
```http
Authorization: Bearer <access_token>
```

### WebSocket
```javascript
io.connect(API_URL, {
  auth: {
    token: '<access_token>'
  }
});
```

## REST API Endpoints

### Get Chat Rooms

Get all chat rooms for the authenticated user.

```http
GET /api/v1/chat/rooms
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": null,
      "is_group": false,
      "participants": [
        {
          "id": 1,
          "username": "john",
          "email": "john@example.com"
        },
        {
          "id": 2,
          "username": "jane",
          "email": "jane@example.com"
        }
      ],
      "lastMessage": {
        "id": 5,
        "message": "Hello!",
        "sender": {
          "id": 2,
          "username": "jane"
        },
        "created_at": "2024-12-12T10:30:00Z"
      },
      "unreadCount": 2,
      "created_at": "2024-12-10T08:00:00Z",
      "updated_at": "2024-12-12T10:30:00Z"
    }
  ]
}
```

### Create Direct Chat

Create or get an existing direct chat with another user.

```http
POST /api/v1/chat/rooms/direct
Content-Type: application/json

{
  "userId": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": null,
    "is_group": false,
    "created_by_id": 1,
    "created_at": "2024-12-10T08:00:00Z",
    "updated_at": "2024-12-10T08:00:00Z"
  }
}
```

### Get Room Messages

Get messages in a chat room with pagination support.

```http
GET /api/v1/chat/rooms/:roomId/messages?limit=50&offset=0
```

**Query Parameters:**
- `limit` (optional): Number of messages to fetch (default: 50, max: 100)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "message": "Hello, how are you?",
      "sender": {
        "id": 1,
        "username": "john",
        "email": "john@example.com"
      },
      "created_at": "2024-12-12T10:00:00Z"
    },
    {
      "id": 2,
      "message": "I'm good, thanks!",
      "sender": {
        "id": 2,
        "username": "jane",
        "email": "jane@example.com"
      },
      "created_at": "2024-12-12T10:01:00Z"
    }
  ]
}
```

### Send Message (REST)

Send a message to a chat room via REST API (fallback when WebSocket is unavailable).

```http
POST /api/v1/chat/rooms/:roomId/messages
Content-Type: application/json

{
  "message": "Hello!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "message": "Hello!",
    "sender": {
      "id": 1,
      "username": "john",
      "email": "john@example.com"
    },
    "created_at": "2024-12-12T10:02:00Z"
  }
}
```

### Mark Messages as Read

Mark all messages in a room as read.

```http
PUT /api/v1/chat/rooms/:roomId/read
```

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Messages marked as read"
}
```

### Get Available Users

Get all users available for chat (excluding current user).

```http
GET /api/v1/chat/users
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "username": "jane",
      "email": "jane@example.com"
    },
    {
      "id": 3,
      "username": "bob",
      "email": "bob@example.com"
    }
  ]
}
```

## WebSocket Events

### Client Events (Emit)

#### Join Room
```javascript
socket.emit('chat:join', roomId);
```

#### Leave Room
```javascript
socket.emit('chat:leave', roomId);
```

#### Send Message
```javascript
socket.emit('chat:message', {
  roomId: 1,
  message: 'Hello!'
});
```

#### Typing Indicator
```javascript
socket.emit('chat:typing', {
  roomId: 1,
  isTyping: true
});
```

#### Mark as Read
```javascript
socket.emit('chat:read', {
  roomId: 1
});
```

### Server Events (Listen)

#### Connection Success
```javascript
socket.on('connect', () => {
  console.log('Connected to chat server');
});
```

#### Connection Error
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

#### Joined Room
```javascript
socket.on('chat:joined', (payload) => {
  // { roomId: 1 }
});
```

#### New Message
```javascript
socket.on('chat:message', (payload) => {
  // {
  //   roomId: 1,
  //   message: {
  //     id: 5,
  //     message: 'Hello!',
  //     sender: { id: 2, username: 'jane', email: 'jane@example.com' },
  //     created_at: '2024-12-12T10:30:00Z'
  //   }
  // }
});
```

#### Typing Indicator
```javascript
socket.on('chat:typing', (payload) => {
  // {
  //   roomId: 1,
  //   userId: 2,
  //   username: 'jane',
  //   isTyping: true
  // }
});
```

#### Read Receipt
```javascript
socket.on('chat:read', (payload) => {
  // {
  //   roomId: 1,
  //   userId: 2
  // }
});
```

#### User Online
```javascript
socket.on('user:online', (payload) => {
  // {
  //   userId: 2,
  //   username: 'jane'
  // }
});
```

#### User Offline
```javascript
socket.on('user:offline', (payload) => {
  // {
  //   userId: 2,
  //   username: 'jane'
  // }
});
```

#### Error
```javascript
socket.on('chat:error', (payload) => {
  // {
  //   message: 'Failed to send message',
  //   error: 'Error details'
  // }
});
```

## Database Schema

### chat_rooms
```sql
CREATE TABLE chat_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(200),  -- Optional for group chats
  is_group BOOLEAN DEFAULT 0,
  created_by_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

### chat_messages
```sql
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);
```

### chat_participants
```sql
CREATE TABLE chat_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  last_read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(room_id, user_id)
);
```

## Error Handling

All endpoints return standard error responses:

```json
{
  "success": false,
  "error": "Error message",
  "errorCode": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (user not participant in room)
- `404` - Not Found (room or user not found)
- `500` - Internal Server Error

## Best Practices

1. **Connection Management**
   - Establish WebSocket connection once on app load
   - Reconnect automatically on disconnection
   - Clean up connections on logout

2. **Message Sending**
   - Use WebSocket for real-time delivery
   - Fallback to REST API if WebSocket unavailable
   - Implement optimistic UI updates

3. **Performance**
   - Load messages with pagination
   - Limit initial message load to 50 messages
   - Use infinite scroll for older messages

4. **User Experience**
   - Show typing indicators for better feedback
   - Display online/offline status
   - Show unread counts prominently
   - Mark messages as read when room is opened

## Example Client Implementation

```typescript
import { io } from 'socket.io-client';

// Initialize connection
const socket = io('http://localhost:5000', {
  auth: {
    token: accessToken
  }
});

// Join room
socket.emit('chat:join', roomId);

// Listen for messages
socket.on('chat:message', (payload) => {
  addMessage(payload.message);
});

// Send message
socket.emit('chat:message', {
  roomId: 1,
  message: 'Hello!'
});

// Cleanup on unmount
socket.disconnect();
```

## Security Considerations

1. **Authentication**: All endpoints and WebSocket connections require valid JWT tokens
2. **Authorization**: Users can only access rooms they are participants in
3. **Input Validation**: All message content is validated and sanitized
4. **Rate Limiting**: API endpoints are rate-limited to prevent abuse
5. **XSS Protection**: Message content is sanitized to prevent XSS attacks
