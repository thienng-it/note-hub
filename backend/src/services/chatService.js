/**
 * Chat Service
 * Business logic for chat functionality
 */

import { Op } from 'sequelize';
import logger from '../config/logger.js';
import { ChatMessage, ChatParticipant, ChatRoom, User } from '../models/index.js';

/**
 * Get or create a direct chat room between two users
 * @param {number} userId1 - First user ID
 * @param {number} userId2 - Second user ID
 * @returns {Promise<Object>} Chat room object
 */
export async function getOrCreateDirectChat(userId1, userId2) {
  try {
    // Find existing direct chat between these users
    const existingRoom = await ChatRoom.findOne({
      where: { is_group: false },
      include: [
        {
          model: ChatParticipant,
          as: 'participants',
          where: {
            user_id: {
              [Op.in]: [userId1, userId2],
            },
          },
          attributes: ['user_id'],
        },
      ],
    });

    // If room exists with exactly 2 participants that match both users
    if (existingRoom) {
      const participantIds = existingRoom.participants.map((p) => p.user_id);
      if (
        participantIds.length === 2 &&
        participantIds.includes(userId1) &&
        participantIds.includes(userId2)
      ) {
        return existingRoom;
      }
    }

    // Create new direct chat room
    const newRoom = await ChatRoom.create({
      is_group: false,
      created_by_id: userId1,
    });

    // Add both users as participants
    await ChatParticipant.bulkCreate([
      { room_id: newRoom.id, user_id: userId1 },
      { room_id: newRoom.id, user_id: userId2 },
    ]);

    logger.info('Direct chat room created', {
      roomId: newRoom.id,
      user1: userId1,
      user2: userId2,
    });

    return newRoom;
  } catch (error) {
    logger.error('Error creating direct chat', { error: error.message });
    throw error;
  }
}

/**
 * Get user's chat rooms with latest message
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of chat rooms
 */
export async function getUserChatRooms(userId) {
  try {
    const participations = await ChatParticipant.findAll({
      where: { user_id: userId },
      include: [
        {
          model: ChatRoom,
          as: 'room',
          include: [
            {
              model: ChatParticipant,
              as: 'participants',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'username', 'email'],
                },
              ],
            },
            {
              model: ChatMessage,
              as: 'messages',
              limit: 1,
              order: [['created_at', 'DESC']],
              include: [
                {
                  model: User,
                  as: 'sender',
                  attributes: ['id', 'username'],
                },
              ],
            },
          ],
        },
      ],
      order: [
        [
          { model: ChatRoom, as: 'room' },
          { model: ChatMessage, as: 'messages' },
          'created_at',
          'DESC',
        ],
      ],
    });

    // Process rooms with unread counts
    const rooms = await Promise.all(
      participations.map(async (p) => {
        const unreadCount = await getUnreadCount(p.room.id, userId);
        return {
          id: p.room.id,
          name: p.room.name,
          is_group: p.room.is_group,
          participants: p.room.participants.map((participant) => ({
            id: participant.user.id,
            username: participant.user.username,
            email: participant.user.email,
          })),
          lastMessage: p.room.messages[0]
            ? {
                id: p.room.messages[0].id,
                message: p.room.messages[0].message,
                sender: p.room.messages[0].sender,
                created_at: p.room.messages[0].created_at,
              }
            : null,
          unreadCount,
          created_at: p.room.created_at,
          updated_at: p.room.updated_at,
        };
      }),
    );

    return rooms;
  } catch (error) {
    logger.error('Error getting user chat rooms', { userId, error: error.message });
    throw error;
  }
}

/**
 * Get messages in a chat room
 * @param {number} roomId - Chat room ID
 * @param {number} userId - User ID (to verify access)
 * @param {number} limit - Max messages to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of messages
 */
export async function getRoomMessages(roomId, userId, limit = 50, offset = 0) {
  try {
    // Verify user is participant
    const isParticipant = await ChatParticipant.findOne({
      where: { room_id: roomId, user_id: userId },
    });

    if (!isParticipant) {
      throw new Error('User is not a participant in this chat room');
    }

    const messages = await ChatMessage.findAll({
      where: { room_id: roomId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return messages.reverse(); // Return in chronological order
  } catch (error) {
    logger.error('Error getting room messages', {
      roomId,
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Send a message to a chat room
 * @param {number} roomId - Chat room ID
 * @param {number} senderId - Sender user ID
 * @param {string} message - Message content
 * @returns {Promise<Object>} Created message
 */
export async function sendMessage(roomId, senderId, message) {
  try {
    // Verify user is participant
    const isParticipant = await ChatParticipant.findOne({
      where: { room_id: roomId, user_id: senderId },
    });

    if (!isParticipant) {
      throw new Error('User is not a participant in this chat room');
    }

    const newMessage = await ChatMessage.create({
      room_id: roomId,
      sender_id: senderId,
      message,
    });

    // Load sender info
    const messageWithSender = await ChatMessage.findByPk(newMessage.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });

    logger.info('Message sent', {
      messageId: newMessage.id,
      roomId,
      senderId,
    });

    return messageWithSender;
  } catch (error) {
    logger.error('Error sending message', {
      roomId,
      senderId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Mark messages as read
 * @param {number} roomId - Chat room ID
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
export async function markMessagesAsRead(roomId, userId) {
  try {
    // Update last_read_at for participant
    await ChatParticipant.update(
      { last_read_at: new Date() },
      {
        where: {
          room_id: roomId,
          user_id: userId,
        },
      },
    );

    logger.debug('Messages marked as read', { roomId, userId });
  } catch (error) {
    logger.error('Error marking messages as read', {
      roomId,
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get unread message count for a room
 * @param {number} roomId - Chat room ID
 * @param {number} userId - User ID
 * @returns {Promise<number>} Unread count
 */
export async function getUnreadCount(roomId, userId) {
  try {
    const participant = await ChatParticipant.findOne({
      where: { room_id: roomId, user_id: userId },
    });

    if (!participant) {
      return 0;
    }

    const lastReadAt = participant.last_read_at || participant.created_at;

    const count = await ChatMessage.count({
      where: {
        room_id: roomId,
        sender_id: { [Op.ne]: userId }, // Don't count own messages
        created_at: { [Op.gt]: lastReadAt },
      },
    });

    return count;
  } catch (error) {
    logger.error('Error getting unread count', {
      roomId,
      userId,
      error: error.message,
    });
    return 0;
  }
}

/**
 * Get all users available for chat (excluding current user)
 * @param {number} currentUserId - Current user ID
 * @returns {Promise<Array>} Array of users
 */
export async function getAvailableUsers(currentUserId) {
  try {
    const users = await User.findAll({
      where: {
        id: { [Op.ne]: currentUserId },
      },
      attributes: ['id', 'username', 'email'],
      order: [['username', 'ASC']],
    });

    return users;
  } catch (error) {
    logger.error('Error getting available users', {
      currentUserId,
      error: error.message,
    });
    throw error;
  }
}

export default {
  getOrCreateDirectChat,
  getUserChatRooms,
  getRoomMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  getAvailableUsers,
};
