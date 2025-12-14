/**
 * Chat related type definitions
 */

export interface ChatUser {
  id: number;
  username: string;
  email?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  avatar_url?: string | null;
}

export interface ChatMessage {
  id: number;
  message: string;
  photo_url?: string | null;
  sender: ChatUser;
  created_at: string;
  is_read?: boolean;
}

export interface ChatRoom {
  id: number;
  name: string | null;
  is_group: boolean;
  participants: ChatUser[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessagePayload {
  roomId: number;
  message: ChatMessage;
}

export interface ChatTypingPayload {
  roomId: number;
  userId: number;
  username: string;
  isTyping: boolean;
}

export interface ChatReadPayload {
  roomId: number;
  userId: number;
}

export interface UserOnlinePayload {
  userId: number;
  username: string;
  avatarUrl?: string | null;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

export interface UserStatusPayload {
  userId: number;
  username: string;
  status: 'online' | 'offline' | 'away' | 'busy';
}
