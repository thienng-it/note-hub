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

export interface ChatReaction {
  id: number;
  emoji: string;
  user: ChatUser;
  created_at: string;
}

export interface ChatReadReceipt {
  id: number;
  user: ChatUser;
  read_at: string;
}

export interface ChatMessage {
  id: number;
  message: string;
  photo_url?: string | null;
  sender: ChatUser;
  created_at: string;
  sent_at?: string | null;
  delivered_at?: string | null;
  is_read?: boolean;
  is_pinned?: boolean;
  pinned_at?: string | null;
  pinned_by_id?: number | null;
  reactions?: ChatReaction[];
  readReceipts?: ChatReadReceipt[];
}

export type ChatTheme = 'default' | 'ocean' | 'sunset' | 'forest' | 'midnight';

export interface ChatRoom {
  id: number;
  name: string | null;
  is_group: boolean;
  participants: ChatUser[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  created_at: string;
  updated_at: string;
  theme?: ChatTheme;
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

export interface ChatReactionPayload {
  roomId: number;
  messageId: number;
  reaction?: ChatReaction;
  emoji?: string;
  userId?: number;
}

export interface ChatPinPayload {
  roomId: number;
  messageId: number;
  pinnedBy?: number;
  pinnedAt?: string;
}

export interface ChatMessageReadPayload {
  roomId: number;
  messageId: number;
  userId: number;
  readAt: string;
}

export interface ChatThemePayload {
  roomId: number;
  theme: ChatTheme;
}
