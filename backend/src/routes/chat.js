/**
 * Chat Routes
 * REST API endpoints for chat functionality
 */

import express from 'express';
import { jwtRequired } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
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

router.post('/rooms/group', jwtRequired, async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    const room = await chatService.createGroupChat(req.userId, name, participantIds);
    return responseHandler.success(res, room, {
      message: 'Group chat room created',
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
 * Body: { message: string, photoUrl?: string }
 */
router.post('/rooms/:roomId/messages', jwtRequired, async (req, res) => {
  try {
    const roomId = Number.parseInt(req.params.roomId, 10);
    const { message, photoUrl } = req.body;

    if (!message || message.trim().length === 0) {
      return responseHandler.error(res, 'Message is required', { statusCode: 400 });
    }

    const newMessage = await chatService.sendMessage(roomId, req.userId, message, photoUrl);
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

/**
 * GET /api/v1/chat/rooms/:roomId/search
 * Search messages in a chat room
 * Query params: q (query string), limit (optional)
 */
router.get('/rooms/:roomId/search', jwtRequired, async (req, res) => {
  try {
    const roomId = Number.parseInt(req.params.roomId, 10);
    const query = req.query.q;
    const limit = Number.parseInt(req.query.limit, 10) || 50;

    if (!query || query.trim().length === 0) {
      return responseHandler.error(res, 'Search query is required', { statusCode: 400 });
    }

    const messages = await chatService.searchRoomMessages(roomId, req.userId, query, limit);
    return responseHandler.success(res, messages, {
      message: 'Search completed successfully',
    });
  } catch (error) {
    const statusCode = error.message.includes('not a participant') ? 403 : 500;
    return responseHandler.error(res, error.message, { statusCode });
  }
});

/**
 * Helper function to determine appropriate status code for chat errors
 * @param {Error} error - The error object
 * @returns {number} HTTP status code
 */
function getChatErrorStatusCode(error) {
  if (error.message.includes('not found')) {
    return 404;
  }
  if (error.message.includes('not authorized')) {
    return 403;
  }
  return 500;
}

/**
 * DELETE /api/v1/chat/rooms/:roomId/messages/:messageId
 * Delete a specific message
 */
router.delete('/rooms/:roomId/messages/:messageId', jwtRequired, async (req, res) => {
  try {
    const roomId = Number.parseInt(req.params.roomId, 10);
    const messageId = Number.parseInt(req.params.messageId, 10);

    await chatService.deleteMessage(roomId, messageId, req.userId);
    return responseHandler.success(res, null, { message: 'Message deleted successfully' });
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: getChatErrorStatusCode(error) });
  }
});

/**
 * DELETE /api/v1/chat/rooms/:roomId
 * Delete entire chat room and all its messages
 */
router.delete('/rooms/:roomId', jwtRequired, async (req, res) => {
  try {
    const roomId = Number.parseInt(req.params.roomId, 10);

    await chatService.deleteRoom(roomId, req.userId);
    return responseHandler.success(res, null, { message: 'Chat room deleted successfully' });
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: getChatErrorStatusCode(error) });
  }
});

/**
 * POST /api/v1/chat/upload
 * Upload a photo for chat
 * Form data: photo (file)
 */
router.post('/upload', jwtRequired, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return responseHandler.error(res, 'No file uploaded', { statusCode: 400 });
    }

    // Return the file path relative to uploads directory
    const photoUrl = `/uploads/${req.file.filename}`;
    return responseHandler.success(
      res,
      { photoUrl },
      {
        message: 'Photo uploaded successfully',
        statusCode: 201,
      },
    );
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: 500 });
  }
});

/**
 * POST /api/v1/chat/rooms/:roomId/messages/:messageId/reactions
 * Add reaction to a message
 * Body: { emoji: string }
 */
router.post('/rooms/:roomId/messages/:messageId/reactions', jwtRequired, async (req, res) => {
  try {
    const messageId = Number.parseInt(req.params.messageId, 10);
    const { emoji } = req.body;

    if (!emoji) {
      return responseHandler.error(res, 'Emoji is required', { statusCode: 400 });
    }

    const reaction = await chatService.addReaction(messageId, req.userId, emoji);
    return responseHandler.success(res, reaction, {
      message: 'Reaction added',
      statusCode: 201,
    });
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: getChatErrorStatusCode(error) });
  }
});

/**
 * DELETE /api/v1/chat/rooms/:roomId/messages/:messageId/reactions/:emoji
 * Remove reaction from a message
 */
router.delete(
  '/rooms/:roomId/messages/:messageId/reactions/:emoji',
  jwtRequired,
  async (req, res) => {
    try {
      const messageId = Number.parseInt(req.params.messageId, 10);
      const { emoji } = req.params;

      await chatService.removeReaction(messageId, req.userId, emoji);
      return responseHandler.success(res, null, { message: 'Reaction removed' });
    } catch (error) {
      return responseHandler.error(res, error.message, {
        statusCode: getChatErrorStatusCode(error),
      });
    }
  },
);

/**
 * POST /api/v1/chat/rooms/:roomId/messages/:messageId/pin
 * Pin a message
 */
router.post('/rooms/:roomId/messages/:messageId/pin', jwtRequired, async (req, res) => {
  try {
    const messageId = Number.parseInt(req.params.messageId, 10);
    const message = await chatService.pinMessage(messageId, req.userId);
    return responseHandler.success(res, message, { message: 'Message pinned' });
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: getChatErrorStatusCode(error) });
  }
});

/**
 * DELETE /api/v1/chat/rooms/:roomId/messages/:messageId/pin
 * Unpin a message
 */
router.delete('/rooms/:roomId/messages/:messageId/pin', jwtRequired, async (req, res) => {
  try {
    const messageId = Number.parseInt(req.params.messageId, 10);
    const message = await chatService.unpinMessage(messageId, req.userId);
    return responseHandler.success(res, message, { message: 'Message unpinned' });
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: getChatErrorStatusCode(error) });
  }
});

/**
 * GET /api/v1/chat/rooms/:roomId/pinned
 * Get pinned messages in a room
 */
router.get('/rooms/:roomId/pinned', jwtRequired, async (req, res) => {
  try {
    const roomId = Number.parseInt(req.params.roomId, 10);
    const messages = await chatService.getPinnedMessages(roomId, req.userId);
    return responseHandler.success(res, messages, { message: 'Pinned messages retrieved' });
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: getChatErrorStatusCode(error) });
  }
});

/**
 * POST /api/v1/chat/rooms/:roomId/messages/:messageId/read
 * Mark message as read
 */
router.post('/rooms/:roomId/messages/:messageId/read', jwtRequired, async (req, res) => {
  try {
    const messageId = Number.parseInt(req.params.messageId, 10);
    const receipt = await chatService.markMessageRead(messageId, req.userId);
    return responseHandler.success(res, receipt, { message: 'Message marked as read' });
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: getChatErrorStatusCode(error) });
  }
});

/**
 * PUT /api/v1/chat/rooms/:roomId/theme
 * Update room theme
 * Body: { theme: string }
 */
router.put('/rooms/:roomId/theme', jwtRequired, async (req, res) => {
  try {
    const roomId = Number.parseInt(req.params.roomId, 10);
    const { theme } = req.body;

    if (!theme) {
      return responseHandler.error(res, 'Theme is required', { statusCode: 400 });
    }

    const room = await chatService.updateRoomTheme(roomId, req.userId, theme);
    return responseHandler.success(res, room, { message: 'Room theme updated' });
  } catch (error) {
    return responseHandler.error(res, error.message, { statusCode: getChatErrorStatusCode(error) });
  }
});

export default router;
