/**
 * Chat Context
 * Manages chat state and real-time messaging
 */

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { chatApi } from '../api/chat';
import { getStoredToken } from '../api/client';
import { notificationService } from '../services/notificationService';
import * as socketService from '../services/socketService';
import type {
  ChatMessage,
  ChatMessagePayload,
  ChatMessageReadPayload,
  ChatPinPayload,
  ChatReactionPayload,
  ChatReadPayload,
  ChatRoom,
  ChatTheme,
  ChatThemePayload,
  ChatTypingPayload,
  UserOnlinePayload,
  UserStatusPayload,
} from '../types/chat';
import { useAuth } from './AuthContext';

interface ChatContextType {
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  messages: ChatMessage[];
  pinnedMessages: ChatMessage[];
  typingUsers: Map<number, string>;
  onlineUsers: Set<number>;
  userStatuses: Map<number, string>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  loadRooms: () => Promise<void>;
  selectRoom: (roomId: number) => void;
  clearRoom: () => void;
  startChat: (userId: number) => Promise<void>;
  startGroupChat: (name: string, participantIds: number[]) => Promise<void>;
  sendMessage: (message: string, photoUrl?: string) => void;
  loadMoreMessages: () => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  deleteMessage: (messageId: number) => Promise<void>;
  deleteRoom: (roomId: number) => Promise<void>;
  getUserStatus: (userId: number, userSetStatus?: string) => string;
  addReaction: (messageId: number, emoji: string) => Promise<void>;
  removeReaction: (messageId: number, emoji: string) => Promise<void>;
  pinMessage: (messageId: number) => Promise<void>;
  unpinMessage: (messageId: number) => Promise<void>;
  loadPinnedMessages: () => Promise<void>;
  updateRoomTheme: (theme: ChatTheme) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [userStatuses, setUserStatuses] = useState<Map<number, string>>(new Map());
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
      const isCurrentRoom = currentRoomRef.current?.id === roomId;

      // Add message to current room
      setMessages((prev) => {
        // Only add if still viewing this room - use ref to get latest value
        if (isCurrentRoom) {
          return [...prev, payload.message];
        }
        return prev;
      });

      // Update room's last message and unread count
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId
            ? {
                ...room,
                lastMessage: payload.message,
                unreadCount: isCurrentRoom ? room.unreadCount : room.unreadCount + 1,
              }
            : room,
        ),
      );

      // Show notification if message is not from current user and not in current room
      if (user && payload.message.sender.id !== user.id && !isCurrentRoom) {
        notificationService.notifyNewMessage(
          payload.message.sender.username,
          payload.message.message,
          roomId,
        );
      }
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
      if (payload.status) {
        setUserStatuses((prev) => new Map(prev).set(payload.userId, payload.status));
      }
    });

    newSocket.on('user:offline', (payload: UserOnlinePayload) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(payload.userId);
        return newSet;
      });
    });

    // Handle user status changes
    newSocket.on('user:status', (payload: UserStatusPayload) => {
      setUserStatuses((prev) => new Map(prev).set(payload.userId, payload.status));
    });

    // Handle reactions
    newSocket.on('chat:reaction:added', (payload: ChatReactionPayload) => {
      if (currentRoomRef.current?.id === payload.roomId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === payload.messageId
              ? {
                  ...msg,
                  reactions: [...(msg.reactions || []), payload.reaction],
                }
              : msg,
          ),
        );
      }
    });

    newSocket.on('chat:reaction:removed', (payload: ChatReactionPayload) => {
      if (currentRoomRef.current?.id === payload.roomId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === payload.messageId
              ? {
                  ...msg,
                  reactions: (msg.reactions || []).filter(
                    (r) => !(r.emoji === payload.emoji && r.user.id === payload.userId),
                  ),
                }
              : msg,
          ),
        );
      }
    });

    // Handle pinning
    newSocket.on('chat:message:pinned', (payload: ChatPinPayload) => {
      if (currentRoomRef.current?.id === payload.roomId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === payload.messageId
              ? {
                  ...msg,
                  is_pinned: true,
                  pinned_at: payload.pinnedAt,
                  pinned_by_id: payload.pinnedBy,
                }
              : msg,
          ),
        );
        // loadPinnedMessages(); // TODO: Fix dependency issue
      }
    });

    newSocket.on('chat:message:unpinned', (payload: ChatPinPayload) => {
      if (currentRoomRef.current?.id === payload.roomId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === payload.messageId
              ? { ...msg, is_pinned: false, pinned_at: null, pinned_by_id: null }
              : msg,
          ),
        );
        setPinnedMessages((prev) => prev.filter((msg) => msg.id !== payload.messageId));
      }
    });

    // Handle read receipts
    newSocket.on('chat:message:read', (payload: ChatMessageReadPayload) => {
      if (currentRoomRef.current?.id === payload.roomId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === payload.messageId
              ? {
                  ...msg,
                  readReceipts: [
                    ...(msg.readReceipts || []),
                    { id: 0, user: { id: payload.userId } as unknown, read_at: payload.readAt },
                  ],
                }
              : msg,
          ),
        );
      }
    });

    // Handle theme updates
    newSocket.on('chat:room:theme:updated', (payload: ChatThemePayload) => {
      if (currentRoomRef.current?.id === payload.roomId) {
        setCurrentRoom((prev) => (prev ? { ...prev, theme: payload.theme } : null));
        setRooms((prev) =>
          prev.map((r) => (r.id === payload.roomId ? { ...r, theme: payload.theme } : r)),
        );
      }
    });

    return () => {
      socketService.disconnectSocket();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user]);

  // Update page title with total unread count
  useEffect(() => {
    const totalUnread = rooms.reduce((sum, room) => sum + room.unreadCount, 0);
    notificationService.updateTitleWithCount(totalUnread);

    return () => {
      // Reset title on unmount
      notificationService.updateTitleWithCount(0);
    };
  }, [rooms]);

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
      let room = rooms.find((r) => r.id === roomId);
      if (!room) {
        try {
          const fetchedRooms = await chatApi.getChatRooms();
          setRooms(fetchedRooms);
          room = fetchedRooms.find((r) => r.id === roomId);
        } catch {
          return;
        }
      }
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
      try {
        if (!user) return;

        // Prevent duplicate calls while loading
        if (isLoading) return;

        setIsLoading(true);
        setError(null);

        // Refresh rooms from API to get the latest state and prevent duplicates
        const freshRooms = await chatApi.getChatRooms();
        setRooms(freshRooms);

        // Check for existing direct chat with fresh data
        const existingRoom = freshRooms.find(
          (r) =>
            !r.is_group &&
            r.participants.length === 2 &&
            r.participants.some((p) => p.id === user.id) &&
            r.participants.some((p) => p.id === userId),
        );

        if (existingRoom) {
          selectRoom(existingRoom.id);
          return;
        }

        // Create new direct chat (backend also has duplicate prevention)
        const room = await chatApi.createDirectChat(userId);
        await loadRooms();
        selectRoom(room.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start chat');
      } finally {
        setIsLoading(false);
      }
    },
    [user, isLoading, loadRooms, selectRoom],
  );

  const startGroupChat = useCallback(
    async (name: string, participantIds: number[]) => {
      if (isLoading) return;
      setIsLoading(true);
      setError(null);
      try {
        const room = await chatApi.createGroupChat(name, participantIds);
        await loadRooms();
        selectRoom(room.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start group chat');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, loadRooms, selectRoom],
  );

  // Send message
  const sendMessage = useCallback(
    (message: string, photoUrl?: string) => {
      if (!currentRoom || (!message.trim() && !photoUrl)) return;

      // For now, use REST API for messages with photos, WebSocket for text only
      if (photoUrl) {
        chatApi.sendMessage(currentRoom.id, message.trim() || ' ', photoUrl).catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to send message');
        });
      } else {
        // Send via WebSocket for real-time delivery
        socketService.sendMessage(currentRoom.id, message.trim());
      }
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
        const roomId = currentRoom.id;

        await chatApi.deleteMessage(currentRoom.id, messageId);
        // Remove message from local state
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

        // Always fetch and update the last message to keep sidebar in sync
        // This ensures the sidebar shows the correct last message after deletion
        const latestMessages = await chatApi.getRoomMessages(roomId, 1, 0);
        const newLastMessage = latestMessages.length > 0 ? latestMessages[0] : null;
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, lastMessage: newLastMessage } : r)),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete message');
        throw err;
      }
    },
    [currentRoom],
  );

  // Delete a room
  const deleteRoom = useCallback(async (roomId: number) => {
    setError(null);
    try {
      await chatApi.deleteRoom(roomId);
      // Remove room from local state
      setRooms((prev) => prev.filter((room) => room.id !== roomId));
      // If deleting current room, clear it
      setCurrentRoom((prev) => {
        if (prev?.id === roomId) {
          setMessages([]);
          return null;
        }
        return prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chat room');
      throw err;
    }
  }, []);

  /**
   * Get user status with proper precedence:
   * 1. If not connected via socket -> offline
   * 2. If user set status manually -> use that
   * 3. If connected via socket -> use detected status or 'online'
   */
  const getUserStatus = useCallback(
    (userId: number, userSetStatus?: string): string => {
      const isOnline = onlineUsers.has(userId);

      // If not connected, they're offline
      if (!isOnline) {
        return 'offline';
      }

      // If they have a manually set status, use that
      if (userSetStatus && userSetStatus !== 'online') {
        return userSetStatus;
      }

      // Use socket-detected status or default to online
      return userStatuses.get(userId) || 'online';
    },
    [onlineUsers, userStatuses],
  );

  // Clear current room (for mobile back navigation)
  const clearRoom = useCallback(() => {
    setCurrentRoom(null);
    setMessages([]);
    setPinnedMessages([]);
    setTypingUsers(new Map());
    setOffset(0);
    setHasMore(true);
  }, []);

  // Add reaction to message
  const addReaction = useCallback(
    async (messageId: number, emoji: string) => {
      if (!currentRoom) return;
      try {
        await chatApi.addReaction(currentRoom.id, messageId, emoji);
        socketService.getSocket()?.emit('chat:reaction:add', {
          roomId: currentRoom.id,
          messageId,
          emoji,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add reaction');
        throw err;
      }
    },
    [currentRoom],
  );

  // Remove reaction from message
  const removeReaction = useCallback(
    async (messageId: number, emoji: string) => {
      if (!currentRoom) return;
      try {
        await chatApi.removeReaction(currentRoom.id, messageId, emoji);
        socketService.getSocket()?.emit('chat:reaction:remove', {
          roomId: currentRoom.id,
          messageId,
          emoji,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove reaction');
        throw err;
      }
    },
    [currentRoom],
  );

  // Pin message
  const pinMessage = useCallback(
    async (messageId: number) => {
      if (!currentRoom) return;
      try {
        await chatApi.pinMessage(currentRoom.id, messageId);
        socketService.getSocket()?.emit('chat:message:pin', {
          roomId: currentRoom.id,
          messageId,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to pin message');
        throw err;
      }
    },
    [currentRoom],
  );

  // Unpin message
  const unpinMessage = useCallback(
    async (messageId: number) => {
      if (!currentRoom) return;
      try {
        await chatApi.unpinMessage(currentRoom.id, messageId);
        socketService.getSocket()?.emit('chat:message:unpin', {
          roomId: currentRoom.id,
          messageId,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to unpin message');
        throw err;
      }
    },
    [currentRoom],
  );

  // Load pinned messages
  const loadPinnedMessages = useCallback(async () => {
    if (!currentRoom) return;
    try {
      const pinned = await chatApi.getPinnedMessages(currentRoom.id);
      setPinnedMessages(pinned);
    } catch (err) {
      console.error('Failed to load pinned messages:', err);
    }
  }, [currentRoom]);

  // Update room theme
  const updateRoomTheme = useCallback(
    async (theme: ChatTheme) => {
      if (!currentRoom) return;
      try {
        await chatApi.updateRoomTheme(currentRoom.id, theme);
        socketService.getSocket()?.emit('chat:room:theme', {
          roomId: currentRoom.id,
          theme,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update theme');
        throw err;
      }
    },
    [currentRoom],
  );

  const value: ChatContextType = {
    rooms,
    currentRoom,
    messages,
    pinnedMessages,
    typingUsers,
    onlineUsers,
    userStatuses,
    isConnected,
    isLoading,
    error,
    loadRooms,
    selectRoom,
    clearRoom,
    startChat,
    startGroupChat,
    sendMessage,
    loadMoreMessages,
    setTyping,
    deleteMessage,
    deleteRoom,
    getUserStatus,
    addReaction,
    removeReaction,
    pinMessage,
    unpinMessage,
    loadPinnedMessages,
    updateRoomTheme,
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
