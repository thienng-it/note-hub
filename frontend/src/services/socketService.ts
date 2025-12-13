/**
 * Socket.io client for real-time chat
 */

import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

// Use relative URL in production (same origin), absolute in development
// In development, VITE_API_URL should be set to the backend URL (e.g., http://localhost:5000)
// In production, leave it empty to connect to the same origin
const API_URL = import.meta.env.VITE_API_URL || '';

let socket: Socket | null = null;

/**
 * Initialize Socket.io connection
 * @param token - JWT access token
 * @returns Socket instance
 */
export function initializeSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(API_URL, {
    auth: {
      token,
    },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket.io connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket.io disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.io connection error:', error);
  });

  return socket;
}

/**
 * Get current socket instance
 * @returns Socket instance or null
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Join a chat room
 * @param roomId - Chat room ID
 */
export function joinRoom(roomId: number): void {
  if (socket) {
    socket.emit('chat:join', roomId);
  }
}

/**
 * Leave a chat room
 * @param roomId - Chat room ID
 */
export function leaveRoom(roomId: number): void {
  if (socket) {
    socket.emit('chat:leave', roomId);
  }
}

/**
 * Send a message to a chat room
 * @param roomId - Chat room ID
 * @param message - Message content
 */
export function sendMessage(roomId: number, message: string): void {
  if (socket) {
    socket.emit('chat:message', { roomId, message });
  }
}

/**
 * Send typing indicator
 * @param roomId - Chat room ID
 * @param isTyping - Whether user is typing
 */
export function sendTypingIndicator(roomId: number, isTyping: boolean): void {
  if (socket) {
    socket.emit('chat:typing', { roomId, isTyping });
  }
}

/**
 * Mark messages as read
 * @param roomId - Chat room ID
 */
export function markAsRead(roomId: number): void {
  if (socket) {
    socket.emit('chat:read', { roomId });
  }
}

// ==================== NOTES COLLABORATION ====================

/**
 * Join a note editing room
 * @param noteId - Note ID
 */
export function joinNoteRoom(noteId: number): void {
  if (socket) {
    socket.emit('note:join', noteId);
  }
}

/**
 * Leave a note editing room
 * @param noteId - Note ID
 */
export function leaveNoteRoom(noteId: number): void {
  if (socket) {
    socket.emit('note:leave', noteId);
  }
}

/**
 * Send note update to other collaborators
 * @param noteId - Note ID
 * @param changes - Changes to the note (title, body, tags, etc.)
 */
export function sendNoteUpdate(
  noteId: number,
  changes: {
    title?: string;
    body?: string;
    tags?: string[];
    pinned?: boolean;
    favorite?: boolean;
    archived?: boolean;
  },
): void {
  if (socket) {
    socket.emit('note:update', { noteId, changes });
  }
}

/**
 * Send cursor position in note
 * @param noteId - Note ID
 * @param position - Cursor position
 */
export function sendNoteCursor(noteId: number, position: number): void {
  if (socket) {
    socket.emit('note:cursor', { noteId, position });
  }
}

// ==================== PHASE 2: RICH PRESENCE ====================

/**
 * Send typing indicator for note
 * @param noteId - Note ID
 * @param isTyping - Whether user is typing
 */
export function sendNoteTyping(noteId: number, isTyping: boolean): void {
  if (socket) {
    socket.emit('note:typing', { noteId, isTyping });
  }
}

/**
 * Send focus indicator for note section
 * @param noteId - Note ID
 * @param section - Section being focused ('title', 'body', 'tags', etc.)
 */
export function sendNoteFocus(noteId: number, section: string): void {
  if (socket) {
    socket.emit('note:focus', { noteId, section });
  }
}

// ==================== TASKS COLLABORATION ====================

/**
 * Join a task room
 * @param taskId - Task ID
 */
export function joinTaskRoom(taskId: number): void {
  if (socket) {
    socket.emit('task:join', taskId);
  }
}

/**
 * Leave a task room
 * @param taskId - Task ID
 */
export function leaveTaskRoom(taskId: number): void {
  if (socket) {
    socket.emit('task:leave', taskId);
  }
}

/**
 * Send task update to other collaborators
 * @param taskId - Task ID
 * @param changes - Changes to the task (title, description, completed, etc.)
 */
export function sendTaskUpdate(
  taskId: number,
  changes: {
    title?: string;
    description?: string;
    completed?: boolean;
    priority?: string;
    due_date?: string;
  },
): void {
  if (socket) {
    socket.emit('task:update', { taskId, changes });
  }
}

/**
 * Send typing indicator for task (Phase 2)
 * @param taskId - Task ID
 * @param isTyping - Whether user is typing
 */
export function sendTaskTyping(taskId: number, isTyping: boolean): void {
  if (socket) {
    socket.emit('task:typing', { taskId, isTyping });
  }
}

/**
 * Send focus indicator for task field (Phase 2)
 * @param taskId - Task ID
 * @param field - Field being focused ('title', 'description', 'priority', etc.)
 */
export function sendTaskFocus(taskId: number, field: string): void {
  if (socket) {
    socket.emit('task:focus', { taskId, field });
  }
}

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  joinRoom,
  leaveRoom,
  sendMessage,
  sendTypingIndicator,
  markAsRead,
  joinNoteRoom,
  leaveNoteRoom,
  sendNoteUpdate,
  sendNoteCursor,
  sendNoteTyping,
  sendNoteFocus,
  joinTaskRoom,
  leaveTaskRoom,
  sendTaskUpdate,
  sendTaskTyping,
  sendTaskFocus,
};
