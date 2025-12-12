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
  const response = await apiClient(`${API_VERSION}/chat/rooms`);
  return response.data;
}

/**
 * Create or get direct chat with a user
 * @param userId - User ID to chat with
 */
export async function createDirectChat(userId: number): Promise<ChatRoom> {
  const response = await apiClient(`${API_VERSION}/chat/rooms/direct`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  return response.data;
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
  const response = await apiClient(
    `${API_VERSION}/chat/rooms/${roomId}/messages?limit=${limit}&offset=${offset}`,
  );
  return response.data;
}

/**
 * Send a message to a chat room (REST fallback)
 * @param roomId - Chat room ID
 * @param message - Message content
 */
export async function sendMessage(roomId: number, message: string): Promise<ChatMessage> {
  const response = await apiClient(`${API_VERSION}/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return response.data;
}

/**
 * Mark messages in a room as read
 * @param roomId - Chat room ID
 */
export async function markMessagesAsRead(roomId: number): Promise<void> {
  await apiClient(`${API_VERSION}/chat/rooms/${roomId}/read`, {
    method: 'PUT',
  });
}

/**
 * Get all users available for chat
 */
export async function getAvailableUsers(): Promise<ChatUser[]> {
  const response = await apiClient(`${API_VERSION}/chat/users`);
  return response.data;
}

export const chatApi = {
  getChatRooms,
  createDirectChat,
  getRoomMessages,
  sendMessage,
  markMessagesAsRead,
  getAvailableUsers,
};
