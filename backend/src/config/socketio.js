/**
 * Socket.io Integration
 * Real-time WebSocket communication for chat
 */

import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import logger from '../config/logger.js';
import * as chatService from '../services/chatService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'notehub-secret-key';

// Store connected users (userId -> socketId mapping)
const connectedUsers = new Map();

/**
 * Initialize Socket.io server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.io server instance
 */
export function initializeSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
    path: '/socket.io/',
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (error) {
      logger.error('Socket authentication failed', { error: error.message });
      next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info('User connected via WebSocket', {
      userId,
      username: socket.username,
      socketId: socket.id,
    });

    // Store connected user
    connectedUsers.set(userId, socket.id);

    // Notify user is online
    socket.broadcast.emit('user:online', { userId, username: socket.username });

    // Join user's personal room for direct messages
    socket.join(`user:${userId}`);

    // Handle joining chat rooms
    socket.on('chat:join', async (roomId) => {
      try {
        // Verify user has access to this room
        await chatService.getRoomMessages(roomId, userId, 1);
        socket.join(`room:${roomId}`);
        socket.emit('chat:joined', { roomId });
        logger.debug('User joined chat room', { userId, roomId });
      } catch (error) {
        socket.emit('chat:error', {
          message: 'Failed to join chat room',
          error: error.message,
        });
      }
    });

    // Handle leaving chat rooms
    socket.on('chat:leave', (roomId) => {
      socket.leave(`room:${roomId}`);
      logger.debug('User left chat room', { userId, roomId });
    });

    // Handle sending messages
    socket.on('chat:message', async ({ roomId, message }) => {
      try {
        // Save message to database
        const newMessage = await chatService.sendMessage(roomId, userId, message);

        // Broadcast to all users in the room
        io.to(`room:${roomId}`).emit('chat:message', {
          roomId,
          message: {
            id: newMessage.id,
            message: newMessage.message,
            sender: newMessage.sender,
            created_at: newMessage.created_at,
          },
        });

        logger.debug('Message sent via WebSocket', {
          messageId: newMessage.id,
          roomId,
          senderId: userId,
        });
      } catch (error) {
        socket.emit('chat:error', {
          message: 'Failed to send message',
          error: error.message,
        });
      }
    });

    // Handle typing indicators
    socket.on('chat:typing', ({ roomId, isTyping }) => {
      socket.to(`room:${roomId}`).emit('chat:typing', {
        roomId,
        userId,
        username: socket.username,
        isTyping,
      });
    });

    // Handle marking messages as read
    socket.on('chat:read', async ({ roomId }) => {
      try {
        await chatService.markMessagesAsRead(roomId, userId);
        socket.to(`room:${roomId}`).emit('chat:read', { roomId, userId });
      } catch (error) {
        socket.emit('chat:error', {
          message: 'Failed to mark messages as read',
          error: error.message,
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      connectedUsers.delete(userId);
      socket.broadcast.emit('user:offline', { userId, username: socket.username });
      logger.info('User disconnected from WebSocket', {
        userId,
        username: socket.username,
        socketId: socket.id,
      });
    });
  });

  logger.info('✅ Socket.io server initialized');

  return io;
}

/**
 * Check if user is online
 * @param {number} userId - User ID
 * @returns {boolean}
 */
export function isUserOnline(userId) {
  return connectedUsers.has(userId);
}

/**
 * Get connected users count
 * @returns {number}
 */
export function getOnlineUsersCount() {
  return connectedUsers.size;
}

export default {
  initializeSocketIO,
  isUserOnline,
  getOnlineUsersCount,
};
