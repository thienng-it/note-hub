/**
 * WebSocket Service for Real-Time Collaboration
 * Handles Socket.IO connections, authentication, and real-time note updates.
 */

import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import logger from '../config/logger.js';

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socket IDs
    this.noteRooms = new Map(); // noteId -> Set of user IDs
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
      },
      // Connection settings
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.username = decoded.username;

        logger.info('WebSocket authentication successful', {
          userId: socket.userId,
          username: socket.username,
          socketId: socket.id,
        });

        next();
      } catch (error) {
        logger.error('WebSocket authentication failed', {
          error: error.message,
          socketId: socket.id,
        });
        next(new Error('Authentication failed'));
      }
    });

    // Handle connections
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('🔌 WebSocket service initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(socket) {
    const { userId, username } = socket;

    // Track connected user
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socket.id);

    logger.info('User connected via WebSocket', {
      userId,
      username,
      socketId: socket.id,
      totalConnections: this.connectedUsers.get(userId).size,
    });

    // Join note room
    socket.on('join-note', async (noteId) => {
      await this.handleJoinNote(socket, noteId);
    });

    // Leave note room
    socket.on('leave-note', (noteId) => {
      this.handleLeaveNote(socket, noteId);
    });

    // Note update event
    socket.on('note-update', async (data) => {
      await this.handleNoteUpdate(socket, data);
    });

    // Cursor position for collaborative editing
    socket.on('cursor-position', (data) => {
      this.handleCursorPosition(socket, data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });

    // Send connection confirmation
    socket.emit('connected', {
      userId,
      username,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle user joining a note room
   */
  async handleJoinNote(socket, noteId) {
    const { userId, username } = socket;
    const roomName = `note:${noteId}`;

    // Join the room
    socket.join(roomName);

    // Track note room membership
    if (!this.noteRooms.has(noteId)) {
      this.noteRooms.set(noteId, new Set());
    }
    this.noteRooms.get(noteId).add(userId);

    logger.info('User joined note room', {
      userId,
      username,
      noteId,
      roomSize: this.noteRooms.get(noteId).size,
    });

    // Notify other users in the room
    socket.to(roomName).emit('user-joined', {
      userId,
      username,
      noteId,
      timestamp: new Date().toISOString(),
    });

    // Send current room members to the joining user
    const roomMembers = Array.from(this.noteRooms.get(noteId));
    socket.emit('room-members', {
      noteId,
      members: roomMembers,
      count: roomMembers.length,
    });
  }

  /**
   * Handle user leaving a note room
   */
  handleLeaveNote(socket, noteId) {
    const { userId, username } = socket;
    const roomName = `note:${noteId}`;

    // Leave the room
    socket.leave(roomName);

    // Update note room tracking
    if (this.noteRooms.has(noteId)) {
      this.noteRooms.get(noteId).delete(userId);
      if (this.noteRooms.get(noteId).size === 0) {
        this.noteRooms.delete(noteId);
      }
    }

    logger.info('User left note room', {
      userId,
      username,
      noteId,
      remainingUsers: this.noteRooms.get(noteId)?.size || 0,
    });

    // Notify other users
    socket.to(roomName).emit('user-left', {
      userId,
      username,
      noteId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle note update from a user
   */
  async handleNoteUpdate(socket, data) {
    const { noteId, changes, version } = data;
    const { userId, username } = socket;
    const roomName = `note:${noteId}`;

    logger.debug('Note update received', {
      userId,
      username,
      noteId,
      changes: Object.keys(changes),
      version,
    });

    // Broadcast update to other users in the room (excluding sender)
    socket.to(roomName).emit('note-updated', {
      noteId,
      changes,
      version,
      updatedBy: {
        userId,
        username,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle cursor position updates for collaborative editing
   */
  handleCursorPosition(socket, data) {
    const { noteId, position, selection } = data;
    const { userId, username } = socket;
    const roomName = `note:${noteId}`;

    // Broadcast cursor position to other users (excluding sender)
    socket.to(roomName).emit('cursor-update', {
      noteId,
      userId,
      username,
      position,
      selection,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle user disconnection
   */
  handleDisconnect(socket) {
    const { userId, username } = socket;

    // Remove socket from user tracking
    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId).delete(socket.id);
      if (this.connectedUsers.get(userId).size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    // Clean up note room memberships
    for (const [noteId, members] of this.noteRooms.entries()) {
      if (members.has(userId)) {
        members.delete(userId);
        if (members.size === 0) {
          this.noteRooms.delete(noteId);
        } else {
          // Notify remaining users
          const roomName = `note:${noteId}`;
          this.io.to(roomName).emit('user-left', {
            userId,
            username,
            noteId,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    logger.info('User disconnected from WebSocket', {
      userId,
      username,
      socketId: socket.id,
    });
  }

  /**
   * Broadcast note update to all users in a note room
   * Used by the REST API when a note is updated
   */
  broadcastNoteUpdate(noteId, changes, updatedBy) {
    // Skip broadcasting if WebSocket is not initialized (e.g., in tests)
    if (!this.io) {
      return;
    }

    const roomName = `note:${noteId}`;

    this.io.to(roomName).emit('note-updated', {
      noteId,
      changes,
      updatedBy,
      timestamp: new Date().toISOString(),
    });

    logger.debug('Broadcasted note update', {
      noteId,
      changes: Object.keys(changes),
      updatedBy,
    });
  }

  /**
   * Broadcast note deletion to all users in a note room
   */
  broadcastNoteDeleted(noteId, deletedBy) {
    // Skip broadcasting if WebSocket is not initialized (e.g., in tests)
    if (!this.io) {
      return;
    }

    const roomName = `note:${noteId}`;

    this.io.to(roomName).emit('note-deleted', {
      noteId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });

    // Clean up room tracking
    this.noteRooms.delete(noteId);

    logger.debug('Broadcasted note deletion', {
      noteId,
      deletedBy,
    });
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get active note rooms count
   */
  getActiveRoomsCount() {
    return this.noteRooms.size;
  }

  /**
   * Get statistics for monitoring
   */
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeRooms: this.noteRooms.size,
      totalConnections: Array.from(this.connectedUsers.values()).reduce(
        (sum, sockets) => sum + sockets.size,
        0,
      ),
    };
  }

  /**
   * Close WebSocket server
   */
  async close() {
    if (this.io) {
      await this.io.close();
      this.connectedUsers.clear();
      this.noteRooms.clear();
      logger.info('WebSocket service closed');
    }
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;
