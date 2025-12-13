/**
 * Socket.io Integration
 * Real-time WebSocket communication for chat
 */

import { Server } from 'socket.io';
import db from '../config/database.js';
import logger from '../config/logger.js';
import * as chatService from '../services/chatService.js';
import jwtService from '../services/jwtService.js';

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
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      // Validate token using jwtService
      const result = jwtService.validateToken(token);
      if (!result.valid) {
        return next(new Error(result.error || 'Invalid authentication token'));
      }

      // Get user from database
      const user = await db.queryOne(
        'SELECT id, username, avatar_url, status FROM users WHERE id = ?',
        [result.userId],
      );

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.username = user.username;
      socket.avatarUrl = user.avatar_url;
      socket.userStatus = user.status;
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

    // Notify user is online (socket connection detected)
    socket.broadcast.emit('user:online', {
      userId,
      username: socket.username,
      avatarUrl: socket.avatarUrl,
      status: socket.userStatus,
    });

    // Join user's personal room for direct messages
    socket.join(`user:${userId}`);

    // Handle joining chat rooms
    socket.on('chat:join', async (roomId) => {
      try {
        // Verify user has access to this room
        const hasAccess = await chatService.checkRoomAccess(roomId, userId);
        if (!hasAccess) {
          throw new Error('User does not have access to this room');
        }

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

    // Handle user status update
    socket.on('user:status', async ({ status }) => {
      try {
        const validStatuses = ['online', 'offline', 'away', 'busy'];
        if (validStatuses.includes(status)) {
          // Update in database
          await db.run('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
          socket.userStatus = status;

          // Broadcast to all connected users
          socket.broadcast.emit('user:status', {
            userId,
            username: socket.username,
            status,
          });

          logger.debug('User status updated via socket', { userId, status });
        }
      } catch (error) {
        logger.error('Error updating user status', { userId, error: error.message });
      }
    });

    // ==================== NOTES COLLABORATION ====================

    // Handle joining note editing room
    socket.on('note:join', async (noteId) => {
      try {
        // Verify user has access to this note
        const note = await db.queryOne('SELECT id FROM notes WHERE id = ? AND user_id = ?', [
          noteId,
          userId,
        ]);

        if (!note) {
          // Check if shared with user
          const sharedNote = await db.queryOne(
            'SELECT id FROM share_notes WHERE note_id = ? AND shared_with_id = ?',
            [noteId, userId],
          );
          if (!sharedNote) {
            throw new Error('User does not have access to this note');
          }
        }

        socket.join(`note:${noteId}`);
        socket.emit('note:joined', { noteId });

        // Notify others in the room that user joined
        socket.to(`note:${noteId}`).emit('note:user-joined', {
          noteId,
          userId,
          username: socket.username,
        });

        logger.debug('User joined note room', { userId, noteId });
      } catch (error) {
        socket.emit('note:error', {
          message: 'Failed to join note room',
          error: error.message,
        });
      }
    });

    // Handle leaving note editing room
    socket.on('note:leave', (noteId) => {
      socket.leave(`note:${noteId}`);

      // Notify others that user left
      socket.to(`note:${noteId}`).emit('note:user-left', {
        noteId,
        userId,
        username: socket.username,
      });

      logger.debug('User left note room', { userId, noteId });
    });

    // Handle real-time note updates
    socket.on('note:update', async ({ noteId, changes }) => {
      try {
        // Verify access
        const note = await db.queryOne('SELECT id FROM notes WHERE id = ? AND user_id = ?', [
          noteId,
          userId,
        ]);

        if (!note) {
          // Check if user has edit permission via share
          const sharedNote = await db.queryOne(
            'SELECT can_edit FROM share_notes WHERE note_id = ? AND shared_with_id = ?',
            [noteId, userId],
          );
          if (!sharedNote || !sharedNote.can_edit) {
            throw new Error('User does not have edit permission for this note');
          }
        }

        // Broadcast changes to all users in the room except sender
        socket.to(`note:${noteId}`).emit('note:update', {
          noteId,
          userId,
          username: socket.username,
          changes,
          timestamp: new Date().toISOString(),
        });

        logger.debug('Note updated via WebSocket', { noteId, userId });
      } catch (error) {
        socket.emit('note:error', {
          message: 'Failed to update note',
          error: error.message,
        });
      }
    });

    // Handle cursor position updates
    socket.on('note:cursor', ({ noteId, position }) => {
      socket.to(`note:${noteId}`).emit('note:cursor', {
        noteId,
        userId,
        username: socket.username,
        position,
      });
    });

    // ==================== TASKS COLLABORATION ====================

    // Handle joining task room
    socket.on('task:join', async (taskId) => {
      try {
        // Verify user has access to this task
        const task = await db.queryOne('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [
          taskId,
          userId,
        ]);

        if (!task) {
          throw new Error('User does not have access to this task');
        }

        socket.join(`task:${taskId}`);
        socket.emit('task:joined', { taskId });

        // Notify others in the room that user joined
        socket.to(`task:${taskId}`).emit('task:user-joined', {
          taskId,
          userId,
          username: socket.username,
        });

        logger.debug('User joined task room', { userId, taskId });
      } catch (error) {
        socket.emit('task:error', {
          message: 'Failed to join task room',
          error: error.message,
        });
      }
    });

    // Handle leaving task room
    socket.on('task:leave', (taskId) => {
      socket.leave(`task:${taskId}`);

      // Notify others that user left
      socket.to(`task:${taskId}`).emit('task:user-left', {
        taskId,
        userId,
        username: socket.username,
      });

      logger.debug('User left task room', { userId, taskId });
    });

    // Handle real-time task updates
    socket.on('task:update', async ({ taskId, changes }) => {
      try {
        // Verify access (tasks don't have sharing yet, so only owner can edit)
        const task = await db.queryOne('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [
          taskId,
          userId,
        ]);

        if (!task) {
          throw new Error('User does not have access to this task');
        }

        // Broadcast changes to all users in the room except sender
        socket.to(`task:${taskId}`).emit('task:update', {
          taskId,
          userId,
          username: socket.username,
          changes,
          timestamp: new Date().toISOString(),
        });

        logger.debug('Task updated via WebSocket', { taskId, userId });
      } catch (error) {
        socket.emit('task:error', {
          message: 'Failed to update task',
          error: error.message,
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      connectedUsers.delete(userId);
      socket.broadcast.emit('user:offline', {
        userId,
        username: socket.username,
        avatarUrl: socket.avatarUrl,
      });
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
