/**
 * Chat Service
 * Business logic for chat functionality
 */

import { Op } from 'sequelize';
import logger from '../config/logger.js';
import {
  ChatMessage,
  ChatMessageReaction,
  ChatMessageRead,
  ChatParticipant,
  ChatRoom,
  User,
} from '../models/index.js';
import { decryptMessage, encryptMessage, generateSalt } from '../utils/encryption.js';

// Get encryption secret from environment or use default for development
const ENCRYPTION_SECRET =
  process.env.CHAT_ENCRYPTION_SECRET || 'notehub-chat-default-secret-change-in-production';

/**
 * Check if room is a direct chat between two specific users
 * @param {Object} room - Chat room object with participants
 * @param {number} userId1 - First user ID
 * @param {number} userId2 - Second user ID
 * @returns {boolean}
 */
function isDirectChatBetween(room, userId1, userId2) {
  if (!room || !room.participants || room.participants.length !== 2) return false;
  const participantIds = room.participants.map((p) => p.user_id);
  return participantIds.includes(userId1) && participantIds.includes(userId2);
}

/**
 * Check if user has access to a chat room
 * @param {number} roomId - Chat room ID
 * @param {number} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function checkRoomAccess(roomId, userId) {
  const participant = await ChatParticipant.findOne({
    where: { room_id: roomId, user_id: userId },
  });
  return !!participant;
}

/**
 * Get or create a direct chat room between two users
 * @param {number} userId1 - First user ID
 * @param {number} userId2 - Second user ID
 * @returns {Promise<Object>} Chat room object
 */
export async function getOrCreateDirectChat(userId1, userId2) {
  try {
    const sequelize = ChatParticipant.sequelize;
    const candidateRows = await ChatParticipant.findAll({
      where: {
        user_id: {
          [Op.in]: [userId1, userId2],
        },
      },
      attributes: ['room_id'],
      group: ['room_id'],
      having: sequelize.literal('COUNT(DISTINCT user_id) = 2'),
    });

    const candidateRoomIds = candidateRows.map((r) => r.room_id);
    if (candidateRoomIds.length > 0) {
      const existingRoom = await ChatRoom.findOne({
        where: {
          id: {
            [Op.in]: candidateRoomIds,
          },
          is_group: false,
        },
        include: [
          {
            model: ChatParticipant,
            as: 'participants',
            attributes: ['user_id'],
          },
        ],
      });

      if (existingRoom && isDirectChatBetween(existingRoom, userId1, userId2)) {
        return existingRoom;
      }
    }

    // Create new direct chat room with encryption salt
    const encryptionSalt = generateSalt();
    const newRoom = await ChatRoom.create({
      is_group: false,
      created_by_id: userId1,
      encryption_salt: encryptionSalt,
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

export async function createGroupChat(creatorUserId, name, participantIds) {
  try {
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      throw new Error('Group name is required');
    }

    const uniqueParticipants = Array.from(
      new Set([creatorUserId, ...(Array.isArray(participantIds) ? participantIds : [])]),
    ).filter((id) => Number.isInteger(id) && id > 0);

    if (uniqueParticipants.length < 3) {
      throw new Error('Group chat must include at least 3 participants');
    }

    const encryptionSalt = generateSalt();
    const room = await ChatRoom.create({
      is_group: true,
      name: trimmedName,
      created_by_id: creatorUserId,
      encryption_salt: encryptionSalt,
    });

    await ChatParticipant.bulkCreate(
      uniqueParticipants.map((userId) => ({ room_id: room.id, user_id: userId })),
    );

    logger.info('Group chat room created', {
      roomId: room.id,
      createdBy: creatorUserId,
      participantCount: uniqueParticipants.length,
    });

    return room;
  } catch (error) {
    logger.error('Error creating group chat', { error: error.message, createdBy: creatorUserId });
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
                  attributes: ['id', 'username', 'avatar_url', 'status'],
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
    });

    // Process rooms with unread counts
    const rooms = await Promise.all(
      participations.map(async (p) => {
        const unreadCount = await getUnreadCount(p.room.id, userId);

        const lastMsg = p.room.messages[0] || null;
        let lastMessage = null;
        if (lastMsg) {
          let decryptedMessage = lastMsg.message;
          if (lastMsg.is_encrypted && p.room.encryption_salt) {
            try {
              decryptedMessage = decryptMessage(
                lastMsg.message,
                ENCRYPTION_SECRET,
                p.room.encryption_salt,
              );
            } catch (error) {
              logger.error('Failed to decrypt last message for room list', {
                messageId: lastMsg.id,
                roomId: p.room.id,
                error: error.message,
              });
              decryptedMessage = '[Encrypted message - decryption failed]';
            }
          }

          lastMessage = {
            id: lastMsg.id,
            message: decryptedMessage,
            photo_url: lastMsg.photo_url,
            sender: lastMsg.sender,
            created_at: lastMsg.created_at,
          };
        }

        return {
          id: p.room.id,
          name: p.room.name,
          is_group: p.room.is_group,
          participants: p.room.participants.map((participant) => ({
            id: participant.user.id,
            username: participant.user.username,
            avatar_url: participant.user.avatar_url,
            status: participant.user.status,
          })),
          lastMessage,
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

    // Get room to access encryption salt
    const room = await ChatRoom.findByPk(roomId);
    if (!room) {
      throw new Error('Chat room not found');
    }

    const messages = await ChatMessage.findAll({
      where: { room_id: roomId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'avatar_url', 'status'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    // Decrypt messages before returning
    const decryptedMessages = messages.map((msg) => {
      const msgData = msg.toJSON();
      if (msgData.is_encrypted && room.encryption_salt) {
        try {
          msgData.message = decryptMessage(
            msgData.message,
            ENCRYPTION_SECRET,
            room.encryption_salt,
          );
        } catch (error) {
          logger.error('Failed to decrypt message', { messageId: msg.id, error: error.message });
          msgData.message = '[Encrypted message - decryption failed]';
        }
      }
      return msgData;
    });

    return decryptedMessages.reverse(); // Return in chronological order
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
 * @param {string} photoUrl - Optional photo URL/path
 * @returns {Promise<Object>} Created message
 */
export async function sendMessage(roomId, senderId, message, photoUrl = null) {
  try {
    // Verify user is participant
    const isParticipant = await ChatParticipant.findOne({
      where: { room_id: roomId, user_id: senderId },
    });

    if (!isParticipant) {
      throw new Error('User is not a participant in this chat room');
    }

    // Get room to access encryption salt
    const room = await ChatRoom.findByPk(roomId);
    if (!room) {
      throw new Error('Chat room not found');
    }

    // Ensure room has encryption salt
    let encryptionSalt = room.encryption_salt;
    if (!encryptionSalt) {
      encryptionSalt = generateSalt();
      await room.update({ encryption_salt: encryptionSalt });
    }

    // Encrypt message
    const encryptedMessage = encryptMessage(message, ENCRYPTION_SECRET, encryptionSalt);

    const newMessage = await ChatMessage.create({
      room_id: roomId,
      sender_id: senderId,
      message: encryptedMessage,
      photo_url: photoUrl,
      is_encrypted: true,
      encryption_salt: encryptionSalt,
      sent_at: new Date(),
    });

    // Load sender info and reactions
    const messageWithSender = await ChatMessage.findByPk(newMessage.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'avatar_url', 'status'],
        },
        {
          model: ChatMessageReaction,
          as: 'reactions',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username'],
            },
          ],
        },
        {
          model: ChatMessageRead,
          as: 'readReceipts',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username'],
            },
          ],
        },
      ],
    });

    logger.info('Message sent', {
      messageId: newMessage.id,
      roomId,
      senderId,
    });

    // Decrypt message for return (so sender sees decrypted version)
    const msgData = messageWithSender.toJSON();
    msgData.message = message; // Return original unencrypted message

    return msgData;
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
      attributes: ['id', 'username', 'status', 'avatar_url'],
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

/**
 * Search messages in a chat room
 * @param {number} roomId - Chat room ID
 * @param {number} userId - User ID (to verify access)
 * @param {string} query - Search query
 * @param {number} limit - Max results to return
 * @returns {Promise<Array>} Array of matching messages
 */
export async function searchRoomMessages(roomId, userId, query, limit = 50) {
  try {
    // Verify user is participant
    const isParticipant = await ChatParticipant.findOne({
      where: { room_id: roomId, user_id: userId },
    });

    if (!isParticipant) {
      throw new Error('User is not a participant in this chat room');
    }

    // Get room to access encryption salt
    const room = await ChatRoom.findByPk(roomId);
    if (!room) {
      throw new Error('Chat room not found');
    }

    // Get all messages (need to decrypt before searching)
    const messages = await ChatMessage.findAll({
      where: { room_id: roomId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'avatar_url', 'status'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: 500, // Limit to recent messages for performance
    });

    // Decrypt and filter messages
    const matchingMessages = [];
    const lowerQuery = query.toLowerCase();

    for (const msg of messages) {
      const msgData = msg.toJSON();
      if (msgData.is_encrypted && room.encryption_salt) {
        try {
          msgData.message = decryptMessage(
            msgData.message,
            ENCRYPTION_SECRET,
            room.encryption_salt,
          );
        } catch (error) {
          logger.error('Failed to decrypt message during search', {
            messageId: msg.id,
            error: error.message,
          });
          continue;
        }
      }

      // Check if message matches query
      if (msgData.message.toLowerCase().includes(lowerQuery)) {
        matchingMessages.push(msgData);
        if (matchingMessages.length >= limit) {
          break;
        }
      }
    }

    return matchingMessages.reverse(); // Return in chronological order
  } catch (error) {
    logger.error('Error searching room messages', {
      roomId,
      userId,
      query,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Delete a message
 * Only the sender or room creator can delete messages
 * @param {number} roomId - Chat room ID
 * @param {number} messageId - Message ID
 * @param {number} userId - User ID (must be sender or room creator)
 * @returns {Promise<void>}
 */
export async function deleteMessage(roomId, messageId, userId) {
  try {
    // Get the message
    const message = await ChatMessage.findOne({
      where: { id: messageId, room_id: roomId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user is the sender
    if (message.sender_id !== userId) {
      // Check if user is room creator (admin privilege)
      const room = await ChatRoom.findByPk(roomId);
      if (!room || room.created_by_id !== userId) {
        throw new Error('User is not authorized to delete this message');
      }
    }

    // Delete the message
    await message.destroy();

    logger.info('Message deleted', {
      messageId,
      roomId,
      deletedBy: userId,
    });
  } catch (error) {
    logger.error('Error deleting message', {
      messageId,
      roomId,
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Delete a chat room and all its messages
 * Only room creator or participant can delete (for direct chats, any participant can delete)
 * @param {number} roomId - Chat room ID
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
export async function deleteRoom(roomId, userId) {
  try {
    // Get the room
    const room = await ChatRoom.findByPk(roomId, {
      include: [
        {
          model: ChatParticipant,
          as: 'participants',
          where: { user_id: userId },
          required: false,
        },
      ],
    });

    if (!room) {
      throw new Error('Chat room not found');
    }

    // Check if user has permission
    const isParticipant = room.participants.length > 0;
    const isCreator = room.created_by_id === userId;

    if (!isParticipant && !isCreator) {
      throw new Error('User is not authorized to delete this chat room');
    }

    // For direct chats, any participant can delete
    // For group chats, only creator can delete
    if (room.is_group && !isCreator) {
      throw new Error('Only the room creator can delete group chats');
    }

    // Delete all messages in the room
    await ChatMessage.destroy({
      where: { room_id: roomId },
    });

    // Delete all participants
    await ChatParticipant.destroy({
      where: { room_id: roomId },
    });

    // Delete the room
    await room.destroy();

    logger.info('Chat room deleted', {
      roomId,
      deletedBy: userId,
    });
  } catch (error) {
    logger.error('Error deleting chat room', {
      roomId,
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Add reaction to a message
 * @param {number} messageId - Message ID
 * @param {number} userId - User ID
 * @param {string} emoji - Emoji reaction
 * @returns {Promise<Object>} Created reaction
 */
export async function addReaction(messageId, userId, emoji) {
  try {
    const message = await ChatMessage.findByPk(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user has access to the room
    const hasAccess = await checkRoomAccess(message.room_id, userId);
    if (!hasAccess) {
      throw new Error('User does not have access to this chat room');
    }

    // Create or update reaction
    const [reaction] = await ChatMessageReaction.findOrCreate({
      where: { message_id: messageId, user_id: userId, emoji },
      defaults: { message_id: messageId, user_id: userId, emoji },
    });

    const reactionWithUser = await ChatMessageReaction.findByPk(reaction.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username'],
        },
      ],
    });

    logger.info('Reaction added', { messageId, userId, emoji });
    return reactionWithUser;
  } catch (error) {
    logger.error('Error adding reaction', { messageId, userId, emoji, error: error.message });
    throw error;
  }
}

/**
 * Remove reaction from a message
 * @param {number} messageId - Message ID
 * @param {number} userId - User ID
 * @param {string} emoji - Emoji reaction
 * @returns {Promise<void>}
 */
export async function removeReaction(messageId, userId, emoji) {
  try {
    await ChatMessageReaction.destroy({
      where: { message_id: messageId, user_id: userId, emoji },
    });

    logger.info('Reaction removed', { messageId, userId, emoji });
  } catch (error) {
    logger.error('Error removing reaction', { messageId, userId, emoji, error: error.message });
    throw error;
  }
}

/**
 * Pin a message
 * @param {number} messageId - Message ID
 * @param {number} userId - User ID (must be room creator or participant)
 * @returns {Promise<Object>} Updated message
 */
export async function pinMessage(messageId, userId) {
  try {
    const message = await ChatMessage.findByPk(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user has access to the room
    const hasAccess = await checkRoomAccess(message.room_id, userId);
    if (!hasAccess) {
      throw new Error('User does not have access to this chat room');
    }

    await message.update({
      is_pinned: true,
      pinned_at: new Date(),
      pinned_by_id: userId,
    });

    logger.info('Message pinned', { messageId, userId });
    return message;
  } catch (error) {
    logger.error('Error pinning message', { messageId, userId, error: error.message });
    throw error;
  }
}

/**
 * Unpin a message
 * @param {number} messageId - Message ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated message
 */
export async function unpinMessage(messageId, userId) {
  try {
    const message = await ChatMessage.findByPk(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user has access to the room
    const hasAccess = await checkRoomAccess(message.room_id, userId);
    if (!hasAccess) {
      throw new Error('User does not have access to this chat room');
    }

    await message.update({
      is_pinned: false,
      pinned_at: null,
      pinned_by_id: null,
    });

    logger.info('Message unpinned', { messageId, userId });
    return message;
  } catch (error) {
    logger.error('Error unpinning message', { messageId, userId, error: error.message });
    throw error;
  }
}

/**
 * Get pinned messages in a room
 * @param {number} roomId - Chat room ID
 * @param {number} userId - User ID (to verify access)
 * @returns {Promise<Array>} Array of pinned messages
 */
export async function getPinnedMessages(roomId, userId) {
  try {
    const hasAccess = await checkRoomAccess(roomId, userId);
    if (!hasAccess) {
      throw new Error('User does not have access to this chat room');
    }

    const room = await ChatRoom.findByPk(roomId);
    if (!room) {
      throw new Error('Chat room not found');
    }

    const messages = await ChatMessage.findAll({
      where: { room_id: roomId, is_pinned: true },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'avatar_url', 'status'],
        },
        {
          model: User,
          as: 'pinnedBy',
          attributes: ['id', 'username'],
        },
        {
          model: ChatMessageReaction,
          as: 'reactions',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username'],
            },
          ],
        },
      ],
      order: [['pinned_at', 'DESC']],
    });

    // Decrypt messages
    const decryptedMessages = messages.map((msg) => {
      const msgData = msg.toJSON();
      if (msgData.is_encrypted && room.encryption_salt) {
        try {
          msgData.message = decryptMessage(
            msgData.message,
            ENCRYPTION_SECRET,
            room.encryption_salt,
          );
        } catch (error) {
          logger.error('Failed to decrypt pinned message', {
            messageId: msg.id,
            error: error.message,
          });
          msgData.message = '[Encrypted message - decryption failed]';
        }
      }
      return msgData;
    });

    return decryptedMessages;
  } catch (error) {
    logger.error('Error getting pinned messages', { roomId, userId, error: error.message });
    throw error;
  }
}

/**
 * Mark message as read by user
 * @param {number} messageId - Message ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Read receipt
 */
export async function markMessageRead(messageId, userId) {
  try {
    const message = await ChatMessage.findByPk(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Don't mark own messages as read
    if (message.sender_id === userId) {
      return null;
    }

    const hasAccess = await checkRoomAccess(message.room_id, userId);
    if (!hasAccess) {
      throw new Error('User does not have access to this chat room');
    }

    const [readReceipt] = await ChatMessageRead.findOrCreate({
      where: { message_id: messageId, user_id: userId },
      defaults: { message_id: messageId, user_id: userId, read_at: new Date() },
    });

    // Update message delivered_at if not set
    if (!message.delivered_at) {
      await message.update({ delivered_at: new Date() });
    }

    return readReceipt;
  } catch (error) {
    logger.error('Error marking message as read', { messageId, userId, error: error.message });
    throw error;
  }
}

/**
 * Update chat room theme
 * @param {number} roomId - Chat room ID
 * @param {number} userId - User ID (must be creator)
 * @param {string} theme - Theme name
 * @returns {Promise<Object>} Updated room
 */
export async function updateRoomTheme(roomId, userId, theme) {
  try {
    const room = await ChatRoom.findByPk(roomId);
    if (!room) {
      throw new Error('Chat room not found');
    }

    // Only creator can change theme
    if (room.created_by_id !== userId) {
      throw new Error('Only room creator can change theme');
    }

    const validThemes = ['default', 'ocean', 'sunset', 'forest', 'midnight'];
    if (!validThemes.includes(theme)) {
      throw new Error('Invalid theme');
    }

    await room.update({ theme });
    logger.info('Room theme updated', { roomId, theme });
    return room;
  } catch (error) {
    logger.error('Error updating room theme', { roomId, userId, theme, error: error.message });
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
  checkRoomAccess,
  deleteMessage,
  deleteRoom,
  searchRoomMessages,
  addReaction,
  removeReaction,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  markMessageRead,
  updateRoomTheme,
};
