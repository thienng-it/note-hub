/**
 * Chat Context
 * Manages chat state and real-time messaging
 */

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { chatApi } from '../api/chat';
import { getStoredToken } from '../api/client';
import * as socketService from '../services/socketService';
import type {
  ChatMessage,
  ChatMessagePayload,
  ChatReadPayload,
  ChatRoom,
  ChatTypingPayload,
  UserOnlinePayload,
} from '../types/chat';
import { useAuth } from './AuthContext';

interface ChatContextType {
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  messages: ChatMessage[];
  typingUsers: Map<number, string>;
  onlineUsers: Set<number>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  loadRooms: () => Promise<void>;
  selectRoom: (roomId: number) => void;
  startChat: (userId: number) => Promise<void>;
  sendMessage: (message: string) => void;
  loadMoreMessages: () => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  deleteMessage: (messageId: number) => Promise<void>;
  deleteRoom: (roomId: number) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_socket, setSocket] = useState<Socket | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Use ref to track current room for event handlers
  const currentRoomRef = useRef<ChatRoom | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // Initialize socket connection
  useEffect(() => {
    if (!user) {
      return;
    }

    const accessToken = getStoredToken();
    if (!accessToken) {
      return;
    }

    const newSocket = socketService.initializeSocket(accessToken);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setError('Connection error. Trying to reconnect...');
    });

    // Handle real-time messages
    newSocket.on('chat:message', (payload: ChatMessagePayload) => {
      const roomId = payload.roomId;

      // Add message to current room
      setMessages((prev) => {
        // Only add if still viewing this room - use ref to get latest value
        if (currentRoomRef.current?.id === roomId) {
          return [...prev, payload.message];
        }
        return prev;
      });

      // Update room's last message
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId
            ? {
                ...room,
                lastMessage: payload.message,
                unreadCount:
                  currentRoomRef.current?.id === roomId ? room.unreadCount : room.unreadCount + 1,
              }
            : room,
        ),
      );
    });

    // Handle typing indicators
    newSocket.on('chat:typing', (payload: ChatTypingPayload) => {
      if (currentRoomRef.current && payload.roomId === currentRoomRef.current.id) {
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          if (payload.isTyping) {
            newMap.set(payload.userId, payload.username);
          } else {
            newMap.delete(payload.userId);
          }
          return newMap;
        });
      }
    });

    // Handle read receipts
    newSocket.on('chat:read', (payload: ChatReadPayload) => {
      if (currentRoomRef.current && payload.roomId === currentRoomRef.current.id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender.id !== user.id && !msg.is_read ? { ...msg, is_read: true } : msg,
          ),
        );
      }
    });

    // Handle user online/offline
    newSocket.on('user:online', (payload: UserOnlinePayload) => {
      setOnlineUsers((prev) => new Set(prev).add(payload.userId));
    });

    newSocket.on('user:offline', (payload: UserOnlinePayload) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(payload.userId);
        return newSet;
      });
    });

    return () => {
      socketService.disconnectSocket();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user, currentRoom]);

  // Load chat rooms
  const loadRooms = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      const fetchedRooms = await chatApi.getChatRooms();
      setRooms(fetchedRooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Select a room
  const selectRoom = useCallback(
    async (roomId: number) => {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      setCurrentRoom(room);
      setMessages([]);
      setOffset(0);
      setHasMore(true);
      setIsLoading(true);

      try {
        // Leave previous room if any
        if (currentRoom) {
          socketService.leaveRoom(currentRoom.id);
        }

        // Join new room
        socketService.joinRoom(roomId);

        // Load messages
        const fetchedMessages = await chatApi.getRoomMessages(roomId);
        setMessages(fetchedMessages);

        // Mark as read
        await chatApi.markMessagesAsRead(roomId);
        socketService.markAsRead(roomId);

        // Update unread count
        setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    },
    [rooms, currentRoom],
  );

  // Start new chat
  const startChat = useCallback(
    async (userId: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const room = await chatApi.createDirectChat(userId);
        await loadRooms();
        selectRoom(room.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start chat');
      } finally {
        setIsLoading(false);
      }
    },
    [loadRooms, selectRoom],
  );

  // Send message
  const sendMessage = useCallback(
    (message: string) => {
      if (!currentRoom || !message.trim()) return;

      // Send via WebSocket for real-time delivery
      socketService.sendMessage(currentRoom.id, message.trim());
    },
    [currentRoom],
  );

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!currentRoom || !hasMore || isLoading) return;

    setIsLoading(true);
    try {
      const newOffset = offset + 50;
      const fetchedMessages = await chatApi.getRoomMessages(currentRoom.id, 50, newOffset);

      if (fetchedMessages.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => [...fetchedMessages, ...prev]);
        setOffset(newOffset);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    } finally {
      setIsLoading(false);
    }
  }, [currentRoom, offset, hasMore, isLoading]);

  // Send typing indicator
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!currentRoom) return;
      socketService.sendTypingIndicator(currentRoom.id, isTyping);
    },
    [currentRoom],
  );

  // Delete a message
  const deleteMessage = useCallback(
    async (messageId: number) => {
      if (!currentRoom) return;

      setError(null);
      try {
        await chatApi.deleteMessage(currentRoom.id, messageId);
        // Remove message from local state
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete message');
        throw err;
      }
    },
    [currentRoom],
  );

  // Delete a room
  const deleteRoom = useCallback(
    async (roomId: number) => {
      setError(null);
      try {
        await chatApi.deleteRoom(roomId);
        // Remove room from local state
        setRooms((prev) => prev.filter((room) => room.id !== roomId));
        // If deleting current room, clear it
        if (currentRoom?.id === roomId) {
          setCurrentRoom(null);
          setMessages([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete chat room');
        throw err;
      }
    },
    [currentRoom],
  );

  const value: ChatContextType = {
    rooms,
    currentRoom,
    messages,
    typingUsers,
    onlineUsers,
    isConnected,
    isLoading,
    error,
    loadRooms,
    selectRoom,
    startChat,
    sendMessage,
    loadMoreMessages,
    setTyping,
    deleteMessage,
    deleteRoom,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
