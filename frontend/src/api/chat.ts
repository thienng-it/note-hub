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
 */
export async function sendMessage(roomId: number, message: string): Promise<ChatMessage> {
  return apiClient.post<ChatMessage>(`${API_VERSION}/chat/rooms/${roomId}/messages`, { message });
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

export const chatApi = {
  getChatRooms,
  createDirectChat,
  getRoomMessages,
  sendMessage,
  markMessagesAsRead,
  getAvailableUsers,
};
