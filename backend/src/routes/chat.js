/**
 * Chat Routes
 * REST API endpoints for chat functionality
 */

import express from 'express';
import { jwtRequired } from '../middleware/auth.js';
import * as chatService from '../services/chatService.js';
import * as responseHandler from '../utils/responseHandler.js';

const router = express.Router();

/**
 * GET /api/v1/chat/rooms
 * Get all chat rooms for the current user
 */
router.get('/rooms', jwtRequired, async (req, res) => {
  try {
    const rooms = await chatService.getUserChatRooms(req.userId);
    return responseHandler.success(res, rooms, { message: 'Chat rooms retrieved successfully' });
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: 500 });
  }
});

/**
 * POST /api/v1/chat/rooms/direct
 * Create or get a direct chat room with another user
 * Body: { userId: number }
 */
router.post('/rooms/direct', jwtRequired, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return responseHandler.error(res, 'User ID is required', { statusCode: 400 });
    }

    if (userId === req.userId) {
      return responseHandler.error(res, 'Cannot create chat with yourself', {
        statusCode: 400,
      });
    }

    const room = await chatService.getOrCreateDirectChat(req.userId, userId);
    return responseHandler.success(res, room, {
      message: 'Direct chat room created',
      statusCode: 201,
    });
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: 500 });
  }
});

/**
 * GET /api/v1/chat/rooms/:roomId/messages
 * Get messages in a chat room
 * Query params: limit, offset
 */
router.get('/rooms/:roomId/messages', jwtRequired, async (req, res) => {
  try {
    const roomId = Number.parseInt(req.params.roomId, 10);
    const limit = Number.parseInt(req.query.limit, 10) || 50;
    const offset = Number.parseInt(req.query.offset, 10) || 0;

    const messages = await chatService.getRoomMessages(roomId, req.userId, limit, offset);
    return responseHandler.success(res, messages, { message: 'Messages retrieved successfully' });
  } catch (error) {
    const statusCode = error.message.includes('not a participant') ? 403 : 500;
    return responseHandler.error(res, error.message, { statusCode });
  }
});

/**
 * POST /api/v1/chat/rooms/:roomId/messages
 * Send a message to a chat room
 * Body: { message: string }
 */
router.post('/rooms/:roomId/messages', jwtRequired, async (req, res) => {
  try {
    const roomId = Number.parseInt(req.params.roomId, 10);
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return responseHandler.error(res, 'Message is required', { statusCode: 400 });
    }

    const newMessage = await chatService.sendMessage(roomId, req.userId, message);
    return responseHandler.success(res, newMessage, {
      message: 'Message sent successfully',
      statusCode: 201,
    });
  } catch (error) {
    const statusCode = error.message.includes('not a participant') ? 403 : 500;
    return responseHandler.error(res, error.message, { statusCode });
  }
});

/**
 * PUT /api/v1/chat/rooms/:roomId/read
 * Mark messages in a room as read
 */
router.put('/rooms/:roomId/read', jwtRequired, async (req, res) => {
  try {
    const roomId = Number.parseInt(req.params.roomId, 10);
    await chatService.markMessagesAsRead(roomId, req.userId);
    return responseHandler.success(res, null, { message: 'Messages marked as read' });
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: 500 });
  }
});

/**
 * GET /api/v1/chat/users
 * Get all users available for chat (excluding current user)
 */
router.get('/users', jwtRequired, async (req, res) => {
  try {
    const users = await chatService.getAvailableUsers(req.userId);
    return responseHandler.success(res, users, {
      message: 'Available users retrieved successfully',
    });
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: 500 });
  }
});

export default router;
