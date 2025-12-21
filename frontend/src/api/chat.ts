/**
 * Chat API client
 */

import type { ChatMessage, ChatRoom, ChatUser } from '../types/chat';
import { apiClient } from './client';

const API_VERSION = '/api/v1';

/**
 * Get all chat rooms for current user
 */
export async function getChatRooms(): Promise<ChatRoom[]> {
  return apiClient.get<ChatRoom[]>(`${API_VERSION}/chat/rooms`);
}

/**
 * Create or get direct chat with a user
 * @param userId - User ID to chat with
 */
export async function createDirectChat(userId: number): Promise<ChatRoom> {
  return apiClient.post<ChatRoom>(`${API_VERSION}/chat/rooms/direct`, { userId });
}
export async function createGroupChat(name: string, participantIds: number[]): Promise<ChatRoom> {
  return apiClient.post<ChatRoom>(`${API_VERSION}/chat/rooms/group`, { name, participantIds });
}

/**
 * Get messages in a chat room
 * @param roomId - Chat room ID
 * @param limit - Max messages to fetch
 * @param offset - Offset for pagination
 */
export async function getRoomMessages(
  roomId: number,
  limit = 50,
  offset = 0,
): Promise<ChatMessage[]> {
  return apiClient.get<ChatMessage[]>(
    `${API_VERSION}/chat/rooms/${roomId}/messages?limit=${limit}&offset=${offset}`,
  );
}

/**
 * Send a message to a chat room (REST fallback)
 * @param roomId - Chat room ID
 * @param message - Message content
 * @param photoUrl - Optional photo URL
 */
export async function sendMessage(
  roomId: number,
  message: string,
  photoUrl?: string,
): Promise<ChatMessage> {
  return apiClient.post<ChatMessage>(`${API_VERSION}/chat/rooms/${roomId}/messages`, {
    message,
    photoUrl,
  });
}

/**
 * Mark messages in a room as read
 * @param roomId - Chat room ID
 */
export async function markMessagesAsRead(roomId: number): Promise<void> {
  await apiClient.put<void>(`${API_VERSION}/chat/rooms/${roomId}/read`);
}

/**
 * Get all users available for chat
 */
export async function getAvailableUsers(): Promise<ChatUser[]> {
  return apiClient.get<ChatUser[]>(`${API_VERSION}/chat/users`);
}

/**
 * Delete a message
 * @param roomId - Chat room ID
 * @param messageId - Message ID to delete
 */
export async function deleteMessage(roomId: number, messageId: number): Promise<void> {
  await apiClient.delete<void>(`${API_VERSION}/chat/rooms/${roomId}/messages/${messageId}`);
}

/**
 * Delete a chat room and all its messages
 * @param roomId - Chat room ID
 */
export async function deleteRoom(roomId: number): Promise<void> {
  await apiClient.delete<void>(`${API_VERSION}/chat/rooms/${roomId}`);
}

/**
 * Search messages in a chat room
 * @param roomId - Chat room ID
 * @param query - Search query
 * @param limit - Max results to return
 */
export async function searchMessages(
  roomId: number,
  query: string,
  limit = 50,
): Promise<ChatMessage[]> {
  return apiClient.get<ChatMessage[]>(
    `${API_VERSION}/chat/rooms/${roomId}/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
}

/**
 * Upload a photo for chat
 * @param file - File to upload
 */
export async function uploadPhoto(file: File): Promise<{ photoUrl: string }> {
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${API_VERSION}/chat/upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('notehub_access_token')}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error('Failed to upload photo');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Add reaction to a message
 * @param roomId - Chat room ID
 * @param messageId - Message ID
 * @param emoji - Emoji reaction
 */
export async function addReaction(roomId: number, messageId: number, emoji: string): Promise<void> {
  await apiClient.post<void>(
    `${API_VERSION}/chat/rooms/${roomId}/messages/${messageId}/reactions`,
    {
      emoji,
    },
  );
}

/**
 * Remove reaction from a message
 * @param roomId - Chat room ID
 * @param messageId - Message ID
 * @param emoji - Emoji reaction
 */
export async function removeReaction(
  roomId: number,
  messageId: number,
  emoji: string,
): Promise<void> {
  await apiClient.delete<void>(
    `${API_VERSION}/chat/rooms/${roomId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
  );
}

/**
 * Pin a message
 * @param roomId - Chat room ID
 * @param messageId - Message ID
 */
export async function pinMessage(roomId: number, messageId: number): Promise<void> {
  await apiClient.post<void>(`${API_VERSION}/chat/rooms/${roomId}/messages/${messageId}/pin`);
}

/**
 * Unpin a message
 * @param roomId - Chat room ID
 * @param messageId - Message ID
 */
export async function unpinMessage(roomId: number, messageId: number): Promise<void> {
  await apiClient.delete<void>(`${API_VERSION}/chat/rooms/${roomId}/messages/${messageId}/pin`);
}

/**
 * Get pinned messages in a room
 * @param roomId - Chat room ID
 */
export async function getPinnedMessages(roomId: number): Promise<ChatMessage[]> {
  return apiClient.get<ChatMessage[]>(`${API_VERSION}/chat/rooms/${roomId}/pinned`);
}

/**
 * Mark message as read
 * @param roomId - Chat room ID
 * @param messageId - Message ID
 */
export async function markMessageRead(roomId: number, messageId: number): Promise<void> {
  await apiClient.post<void>(`${API_VERSION}/chat/rooms/${roomId}/messages/${messageId}/read`);
}

/**
 * Update room theme
 * @param roomId - Chat room ID
 * @param theme - Theme name
 */
export async function updateRoomTheme(
  roomId: number,
  theme: 'default' | 'ocean' | 'sunset' | 'forest' | 'midnight',
): Promise<void> {
  await apiClient.put<void>(`${API_VERSION}/chat/rooms/${roomId}/theme`, { theme });
}

export const chatApi = {
  getChatRooms,
  createDirectChat,
  createGroupChat,
  getRoomMessages,
  sendMessage,
  markMessagesAsRead,
  getAvailableUsers,
  deleteMessage,
  deleteRoom,
  searchMessages,
  uploadPhoto,
  addReaction,
  removeReaction,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  markMessageRead,
  updateRoomTheme,
};
