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

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  joinRoom,
  leaveRoom,
  sendMessage,
  sendTypingIndicator,
  markAsRead,
};
