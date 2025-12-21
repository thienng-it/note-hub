/**
 * Chat Page
 * Main chat interface with room list and messaging
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { chatApi } from '../api/chat';
import {
  MessageReactions,
  MessageStatus,
  PinnedMessagesBanner,
  ThemeSelector,
} from '../components/ChatFeatures';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { notificationService } from '../services/notificationService';
import type { ChatUser } from '../types/chat';
import { linkify } from '../utils/linkify';

/**
 * Custom hook to handle Escape key press for modals
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback to close the modal
 */
function useEscapeKey(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
}

export function ChatPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    rooms,
    currentRoom,
    messages,
    pinnedMessages,
    typingUsers,
    isConnected,
    isLoading,
    error,
    loadRooms,
    selectRoom,
    clearRoom,
    startChat,
    startGroupChat,
    sendMessage,
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
  } = useChat();

  const [messageInput, setMessageInput] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof messages>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<number | null>(null);
  const [showDeleteRoomConfirm, setShowDeleteRoomConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    notificationService.getPermission(),
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>('');
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isGroupChatMode, setIsGroupChatMode] = useState(false);
  const [groupChatName, setGroupChatName] = useState('');
  const [selectedGroupUserIds, setSelectedGroupUserIds] = useState<Set<number>>(new Set());
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load rooms on mount
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Load pinned messages when room changes
  useEffect(() => {
    if (currentRoom) {
      loadPinnedMessages();
    }
  }, [currentRoom, loadPinnedMessages]);

  // Check notification permission and show banner if needed
  useEffect(() => {
    if (notificationService.isSupported() && notificationPermission === 'default') {
      setShowNotificationBanner(true);
    }
  }, [notificationPermission]);

  // Request notification permission
  const handleRequestNotificationPermission = async () => {
    const granted = await notificationService.requestPermission();
    setNotificationPermission(notificationService.getPermission());
    setShowNotificationBanner(false);
    if (granted) {
      console.log('Notifications enabled');
    }
  };

  // Dismiss notification banner
  const handleDismissNotificationBanner = () => {
    setShowNotificationBanner(false);
  };

  // Auto-scroll to latest message
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  // Scroll to bottom when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages is intentionally included to trigger scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Scroll to bottom when room changes
  useEffect(() => {
    if (currentRoom) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(scrollToBottom, 100);
    }
  }, [currentRoom, scrollToBottom]);

  // Handle Escape key for modals
  useEscapeKey(showNewChatModal, () => setShowNewChatModal(false));
  useEscapeKey(!!messageToDelete, () => setMessageToDelete(null));
  useEscapeKey(showDeleteRoomConfirm, () => setShowDeleteRoomConfirm(false));
  useEscapeKey(!!viewingPhoto, () => setViewingPhoto(null));

  // Load available users when modal opens
  const handleOpenNewChat = async () => {
    setShowNewChatModal(true);
    try {
      const users = await chatApi.getAvailableUsers();
      setAvailableUsers(users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleToggleGroupUser = (userId: number) => {
    setSelectedGroupUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleCreateGroupChat = async () => {
    const name = groupChatName.trim();
    const participantIds = Array.from(selectedGroupUserIds);
    if (!name || participantIds.length < 2) return;

    try {
      await startGroupChat(name, participantIds);
      setShowNewChatModal(false);
      setSearchQuery('');
      setIsGroupChatMode(false);
      setGroupChatName('');
      setSelectedGroupUserIds(new Set());
    } catch (err) {
      console.error('Failed to create group chat:', err);
    }
  };

  // Handle message send
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && !selectedPhoto) return;

    try {
      let photoUrl = '';
      if (selectedPhoto) {
        setUploadingPhoto(true);
        const result = await chatApi.uploadPhoto(selectedPhoto);
        photoUrl = result.photoUrl;
        setUploadingPhoto(false);
      }

      sendMessage(messageInput || ' ', photoUrl);
      setMessageInput('');
      setSelectedPhoto(null);
      setPhotoPreviewUrl('');
      setTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      setUploadingPhoto(false);
    }
  };

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear selected photo
  const handleClearPhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle message search
  const handleMessageSearch = async (query: string) => {
    setMessageSearchQuery(query);
    if (!query.trim() || !currentRoom) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await chatApi.searchMessages(currentRoom.id, query);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Failed to search messages:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setMessageSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Handle typing indicator
  const handleTyping = (value: string) => {
    setMessageInput(value);

    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Send typing indicator
    if (value.length > 0) {
      setTyping(true);
      // Stop typing after 2 seconds of inactivity
      const timeout = setTimeout(() => {
        setTyping(false);
      }, 2000);
      setTypingTimeout(timeout);
    } else {
      setTyping(false);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId: number) => {
    try {
      await deleteMessage(messageId);
      setMessageToDelete(null);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Handle room deletion
  const handleDeleteRoom = async () => {
    if (!currentRoom) return;
    try {
      await deleteRoom(currentRoom.id);
      setShowDeleteRoomConfirm(false);
    } catch (err) {
      console.error('Failed to delete room:', err);
    }
  };

  // Filter available users
  const filteredUsers = availableUsers.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (hours < 48) {
      return t('chat.yesterday');
    }
    return date.toLocaleDateString();
  };

  // Get other participant in direct chat
  const getOtherParticipant = (room: (typeof rooms)[0]) => {
    if (room.is_group || !user) return null;
    return room.participants.find((p) => p.id !== user.id);
  };

  return (
    <div
      className={`h-full flex flex-col overflow-hidden chat-page-container chat-container chat-page-padding chat-theme-${currentRoom?.theme || 'default'}`}
    >
      {/* Compact Header - Only show notification banner and connection status */}
      {(showNotificationBanner || !isConnected) && (
        <div className="chat-compact-header flex-shrink-0">
          {!isConnected && (
            <div className="chat-connection-status disconnected">
              <i className="fas fa-wifi-slash mr-2" />
              <span>{t('chat.disconnected')}</span>
            </div>
          )}
          {showNotificationBanner && (
            <div className="chat-notification-banner">
              <div className="chat-notification-icon">
                <i className="fas fa-bell" />
              </div>
              <div className="chat-notification-content">
                <p className="chat-notification-title">{t('chat.enableNotifications')}</p>
                <p className="chat-notification-desc">{t('chat.notificationDescription')}</p>
              </div>
              <div className="chat-notification-actions">
                <button
                  type="button"
                  onClick={handleRequestNotificationPermission}
                  className="chat-notification-btn enable"
                >
                  {t('chat.enable')}
                </button>
                <button
                  type="button"
                  onClick={handleDismissNotificationBanner}
                  className="chat-notification-btn dismiss"
                  aria-label="Dismiss"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0 chat-main-wrapper relative">
        {/* Sidebar Collapse Toggle (visible when collapsed on desktop) */}
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="chat-sidebar-expand-btn fixed flex"
            aria-label="Expand sidebar"
          >
            <i className="fas fa-comments" />
          </button>
        )}

        {/* Rooms list - Hidden on mobile when chat is selected, collapsible on desktop */}
        <div
          className={`chat-sidebar-enhanced overflow-hidden flex-shrink-0 transition-all duration-300 ${
            isSidebarCollapsed ? 'chat-sidebar-collapsed !hidden' : 'w-full md:w-80 lg:w-88'
          } ${!isSidebarCollapsed && currentRoom ? 'hidden md:flex md:flex-col' : ''} ${
            !isSidebarCollapsed && !currentRoom ? 'flex flex-col' : ''
          }`}
        >
          {/* Sidebar Header */}
          <div className="chat-sidebar-header">
            <div className="flex items-center justify-between gap-2">
              <h2 className="chat-sidebar-title">{t('chat.conversations')}</h2>
              <div className="flex items-center gap-1">
                {rooms.length > 0 && <span className="chat-sidebar-count">{rooms.length}</span>}
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="chat-sidebar-collapse-btn flex"
                  aria-label="Collapse sidebar"
                >
                  <i className="fas fa-chevron-left" />
                </button>
              </div>
            </div>
            {/* Sidebar Search */}
            <div className="chat-sidebar-search">
              <i className="fas fa-search chat-sidebar-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('chat.searchConversations')}
                className="chat-sidebar-search-input"
                aria-label="Search conversations"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="chat-sidebar-search-clear"
                  aria-label="Clear search"
                >
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
            {/* New Chat Button */}
            <button
              type="button"
              onClick={handleOpenNewChat}
              className="chat-sidebar-new-btn"
              aria-label={t('chat.newChat')}
            >
              <i className="fas fa-plus" />
              <span>{t('chat.newChat')}</span>
            </button>
          </div>

          {/* Rooms List */}
          <div className="chat-sidebar-rooms">
            {isLoading && rooms.length === 0 ? (
              <div className="chat-sidebar-loading">
                <div className="chat-sidebar-loading-spinner">
                  <i className="fas fa-circle-notch fa-spin" />
                </div>
                <p>{t('chat.loadingChats')}</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="chat-sidebar-empty">
                <div className="chat-sidebar-empty-icon">
                  <i className="fas fa-comments" />
                </div>
                <p className="chat-sidebar-empty-title">{t('chat.noChats')}</p>
                <p className="chat-sidebar-empty-subtitle">{t('chat.startNewChat')}</p>
                <button
                  type="button"
                  onClick={handleOpenNewChat}
                  className="chat-sidebar-empty-btn"
                >
                  <i className="fas fa-plus mr-2" />
                  {t('chat.newChat')}
                </button>
              </div>
            ) : (
              <div className="chat-room-list">
                {rooms
                  .filter((room) => {
                    if (!searchQuery.trim()) return true;
                    const otherUser = getOtherParticipant(room);
                    const displayName = room.is_group
                      ? room.name || 'Group'
                      : otherUser?.username || 'Unknown';
                    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
                  })
                  .map((room) => {
                    const otherUser = getOtherParticipant(room);
                    const displayName = room.is_group
                      ? room.name || 'Group'
                      : otherUser?.username || 'Unknown';
                    const userStatus = otherUser
                      ? getUserStatus(otherUser.id, otherUser.status)
                      : 'offline';

                    return (
                      <button
                        type="button"
                        key={room.id}
                        onClick={() => selectRoom(room.id)}
                        className={`chat-room-card ${currentRoom?.id === room.id ? 'active' : ''}`}
                      >
                        <div className="chat-room-card-avatar">
                          {!room.is_group && otherUser ? (
                            <UserAvatar
                              username={otherUser.username}
                              avatarUrl={otherUser.avatar_url}
                              size="md"
                              status={userStatus as 'online' | 'offline' | 'away' | 'busy'}
                              showStatus={true}
                            />
                          ) : (
                            <div className="chat-room-group-avatar">
                              <i className="fas fa-users" />
                            </div>
                          )}
                        </div>
                        <div className="chat-room-card-content">
                          <div className="chat-room-card-header">
                            <span className="chat-room-card-name">{displayName}</span>
                            {room.lastMessage && (
                              <span className="chat-room-card-time">
                                {formatTime(room.lastMessage.created_at)}
                              </span>
                            )}
                          </div>
                          <div className="chat-room-card-body">
                            {room.lastMessage ? (
                              <p className="chat-room-card-preview">
                                <span className="chat-room-card-sender">
                                  {room.lastMessage.sender.username}:
                                </span>{' '}
                                {room.lastMessage.photo_url ? (
                                  <span className="chat-room-card-media">
                                    <i className="fas fa-image mr-1" />
                                    Photo
                                  </span>
                                ) : (
                                  room.lastMessage.message
                                )}
                              </p>
                            ) : (
                              <p className="chat-room-card-preview empty">
                                <i className="fas fa-comment-slash mr-1" />
                                {t('chat.noMessagesYet') || 'No messages yet'}
                              </p>
                            )}
                            {room.unreadCount > 0 && (
                              <span className="chat-room-card-badge">
                                {room.unreadCount > 99 ? '99+' : room.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Chat area - Full width on mobile when chat is selected */}
        <div
          className={`flex-1 flex flex-col chat-main overflow-hidden min-h-0 ${
            currentRoom ? 'flex' : 'hidden md:flex'
          }`}
        >
          {!currentRoom ? (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">
                <i className="fas fa-comment-dots" />
              </div>
              <p className="chat-empty-title">{t('chat.noChatSelected')}</p>
              <p className="chat-empty-subtitle">
                Select a conversation from the list or start a new chat
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div
                className={`chat-header flex-shrink-0 safe-area-inset-top chat-theme-${currentRoom.theme || 'default'}`}
              >
                {/* Pinned messages banner */}
                {pinnedMessages.length > 0 && (
                  <PinnedMessagesBanner
                    pinnedMessages={pinnedMessages}
                    onViewPinned={() => setShowPinnedModal(true)}
                    onUnpin={unpinMessage}
                  />
                )}

                <div className="flex items-center gap-2 md:gap-3 mb-3">
                  {/* Back button for mobile */}
                  <button
                    type="button"
                    onClick={() => clearRoom()}
                    className="md:hidden chat-input-btn"
                    title={t('common.back')}
                    aria-label="Back to chat list"
                  >
                    <i className="fas fa-arrow-left text-lg" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="chat-header-title truncate">
                      {currentRoom.is_group
                        ? currentRoom.name
                        : t('chat.chatWith', {
                            username: getOtherParticipant(currentRoom)?.username || 'Unknown',
                          })}
                    </h2>
                    {typingUsers.size > 0 && (
                      <p className="chat-header-subtitle">
                        <span className="chat-typing-indicator">
                          <span className="chat-typing-dot" />
                          <span className="chat-typing-dot" />
                          <span className="chat-typing-dot" />
                        </span>
                        {Array.from(typingUsers.values())[0]} {t('chat.typing')}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowThemeSelector(!showThemeSelector)}
                      className="chat-input-btn"
                      title="Change theme"
                      aria-label="Change theme"
                    >
                      <i className="fas fa-palette text-sm" />
                    </button>
                    {showThemeSelector && (
                      <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 z-10">
                        <ThemeSelector
                          currentTheme={currentRoom.theme || 'default'}
                          onThemeChange={(theme) => {
                            updateRoomTheme(theme);
                            setShowThemeSelector(false);
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteRoomConfirm(true)}
                    className="chat-input-btn text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                    title={t('chat.deleteChat')}
                    aria-label="Delete chat"
                  >
                    <i className="fas fa-trash text-sm" />
                  </button>
                </div>
                {/* Search bar */}
                <div className="chat-search-container">
                  <i className="fas fa-search chat-search-icon" />
                  <input
                    type="text"
                    value={messageSearchQuery}
                    onChange={(e) => handleMessageSearch(e.target.value)}
                    placeholder={t('chat.searchMessages')}
                    className="chat-search-input"
                    aria-label="Search messages"
                  />
                  {messageSearchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="chat-search-clear"
                      aria-label="Clear search"
                    >
                      <i className="fas fa-times text-xs" />
                    </button>
                  )}
                  {isSearching && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      <i className="fas fa-spinner fa-spin text-blue-500" />
                    </div>
                  )}
                </div>
                {showSearchResults && (
                  <div className="mt-2 text-sm text-[var(--text-secondary)] flex items-center gap-2">
                    <span className="font-medium">{searchResults.length}</span>{' '}
                    {t('chat.resultsFound')}
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="ml-auto text-blue-600 dark:text-blue-400 hover:underline text-xs"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="chat-messages flex-1 min-h-0 overscroll-contain"
              >
                {(showSearchResults ? searchResults : messages).length === 0 &&
                  !showSearchResults && (
                    <div className="flex-1 flex items-center justify-center py-12">
                      <div className="text-center text-[var(--text-tertiary)]">
                        <i className="fas fa-comments text-3xl mb-3 opacity-50" />
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    </div>
                  )}
                {(showSearchResults ? searchResults : messages).map((message, index) => {
                  const isSender = user && message.sender.id === user.id;
                  return (
                    <div
                      key={message.id || index}
                      className={`chat-message group ${isSender ? 'outgoing' : ''} ${message.is_pinned ? 'pinned' : ''}`}
                    >
                      {!isSender && (
                        <UserAvatar
                          username={message.sender.username}
                          avatarUrl={message.sender.avatar_url}
                          size="sm"
                          className="flex-shrink-0 hidden sm:block self-end mb-5"
                        />
                      )}
                      <div className="chat-message-content">
                        {!isSender && (
                          <p className="chat-message-sender">{message.sender.username}</p>
                        )}
                        <div className="relative">
                          <div className={`chat-bubble ${isSender ? 'outgoing' : 'incoming'}`}>
                            {message.photo_url && (
                              <div className="chat-bubble-photo">
                                <button
                                  type="button"
                                  className="block rounded-xl overflow-hidden hover:opacity-90 active:opacity-80 transition-opacity touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  onClick={() =>
                                    setViewingPhoto(
                                      `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${message.photo_url}`,
                                    )
                                  }
                                  aria-label="View full size image"
                                >
                                  <img
                                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${message.photo_url}`}
                                    alt="Chat attachment"
                                    className="max-w-full h-auto"
                                    style={{ maxHeight: '280px' }}
                                    loading="lazy"
                                  />
                                </button>
                              </div>
                            )}
                            <p className="chat-bubble-text">{linkify(message.message)}</p>
                            {/* Message reactions */}
                            {user && (
                              <MessageReactions
                                message={message}
                                currentUserId={user.id}
                                onAddReaction={(emoji) => addReaction(message.id, emoji)}
                                onRemoveReaction={(emoji) => removeReaction(message.id, emoji)}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Pin button */}
                            {message.id && !showSearchResults && (
                              <button
                                type="button"
                                onClick={() =>
                                  message.is_pinned
                                    ? unpinMessage(message.id)
                                    : pinMessage(message.id)
                                }
                                className={`chat-message-delete ${message.is_pinned ? 'text-amber-600' : ''}`}
                                title={message.is_pinned ? 'Unpin message' : 'Pin message'}
                                aria-label={message.is_pinned ? 'Unpin message' : 'Pin message'}
                              >
                                <i
                                  className={`fas fa-thumbtack text-xs ${message.is_pinned ? '' : 'opacity-50'}`}
                                />
                              </button>
                            )}
                            {/* Delete button */}
                            {isSender && message.id && !showSearchResults && (
                              <button
                                type="button"
                                onClick={() => setMessageToDelete(message.id)}
                                className="chat-message-delete"
                                title={t('chat.deleteMessage')}
                                aria-label="Delete message"
                              >
                                <i className="fas fa-trash text-xs" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="chat-message-time">
                          {formatTime(message.created_at)}
                          {user && <MessageStatus message={message} currentUserId={user.id} />}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {/* Scroll target */}
                <div ref={messagesEndRef} className="h-1" />
              </div>

              {/* Message input */}
              <div className="chat-input-container flex-shrink-0 safe-area-inset-bottom">
                {/* Photo preview */}
                {photoPreviewUrl && (
                  <div className="chat-photo-preview">
                    <img src={photoPreviewUrl} alt="Preview" />
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      className="chat-photo-preview-remove"
                      aria-label="Remove photo"
                    >
                      <i className="fas fa-times text-xs" />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="chat-input-wrapper">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    tabIndex={-1}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="chat-input-btn"
                    title={t('chat.uploadPhoto')}
                    aria-label="Upload photo"
                  >
                    <i className="fas fa-image text-lg" />
                  </button>
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => handleTyping(e.target.value)}
                    placeholder={t('chat.typeMessage')}
                    disabled={uploadingPhoto}
                    className="chat-text-input"
                    aria-label="Message input"
                  />
                  <button
                    type="submit"
                    disabled={(!messageInput.trim() && !selectedPhoto) || uploadingPhoto}
                    className="chat-input-btn send"
                    aria-label={uploadingPhoto ? t('chat.uploading') : t('chat.send')}
                  >
                    {uploadingPhoto ? (
                      <i className="fas fa-spinner fa-spin" />
                    ) : (
                      <i className="fas fa-paper-plane" />
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New chat modal */}
      {showNewChatModal && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard handling is done via document-level event listener in useEffect
        <div
          className="chat-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowNewChatModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-chat-title"
        >
          <div className="chat-modal">
            <div className="chat-modal-header">
              <h2 id="new-chat-title" className="chat-modal-title">
                {t('chat.newChat')}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsGroupChatMode(false);
                    setGroupChatName('');
                    setSelectedGroupUserIds(new Set());
                  }}
                  className={`chat-input-btn ${!isGroupChatMode ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                  aria-pressed={!isGroupChatMode}
                >
                  <i className="fas fa-user" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsGroupChatMode(true)}
                  className={`chat-input-btn ${isGroupChatMode ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                  aria-pressed={isGroupChatMode}
                >
                  <i className="fas fa-users" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewChatModal(false);
                    setSearchQuery('');
                    setIsGroupChatMode(false);
                    setGroupChatName('');
                    setSelectedGroupUserIds(new Set());
                  }}
                  className="chat-modal-close"
                  aria-label="Close"
                >
                  <i className="fas fa-times text-lg" />
                </button>
              </div>
            </div>

            <div className="chat-modal-search">
              <div className="chat-search-container">
                <i className="fas fa-search chat-search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('chat.searchUsers')}
                  className="chat-search-input"
                  aria-label="Search users"
                />
              </div>
              {isGroupChatMode && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={groupChatName}
                    onChange={(e) => setGroupChatName(e.target.value)}
                    placeholder="Group name"
                    className="chat-search-input"
                    aria-label="Group name"
                  />
                </div>
              )}
            </div>

            <div className="chat-modal-body">
              {filteredUsers.length === 0 ? (
                <div className="chat-empty-state" style={{ padding: '2rem 0' }}>
                  <div className="chat-empty-icon" style={{ width: '4rem', height: '4rem' }}>
                    <i className="fas fa-users" style={{ fontSize: '1.5rem' }} />
                  </div>
                  <p className="chat-empty-subtitle">{t('chat.selectUser')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((chatUser) => {
                    const userStatus = getUserStatus(chatUser.id, chatUser.status);
                    const isSelected = selectedGroupUserIds.has(chatUser.id);
                    return (
                      <button
                        type="button"
                        key={chatUser.id}
                        onClick={() => {
                          if (isGroupChatMode) {
                            handleToggleGroupUser(chatUser.id);
                          } else {
                            startChat(chatUser.id);
                            setShowNewChatModal(false);
                            setSearchQuery('');
                            setIsGroupChatMode(false);
                            setGroupChatName('');
                            setSelectedGroupUserIds(new Set());
                          }
                        }}
                        className={`chat-user-item ${isGroupChatMode && isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      >
                        {isGroupChatMode && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleGroupUser(chatUser.id);
                            }}
                            className="mr-2"
                            aria-label={`Select ${chatUser.username}`}
                          />
                        )}
                        <UserAvatar
                          username={chatUser.username}
                          avatarUrl={chatUser.avatar_url}
                          size="md"
                          status={userStatus as 'online' | 'offline' | 'away' | 'busy'}
                          showStatus={true}
                        />
                        <div className="chat-user-info">
                          <div className="chat-user-name">{chatUser.username}</div>
                          <div className="chat-user-status">
                            <span className={`chat-user-status-dot ${userStatus}`} />
                            {t(`chat.${userStatus}`)}
                          </div>
                        </div>
                        <i className="chat-user-arrow fas fa-chevron-right" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {isGroupChatMode && (
              <div className="chat-confirm-actions" style={{ padding: '0 1.25rem 1.25rem' }}>
                <button
                  type="button"
                  onClick={handleCreateGroupChat}
                  disabled={groupChatName.trim().length === 0 || selectedGroupUserIds.size < 2}
                  className="chat-confirm-btn delete"
                >
                  {t('chat.startChat')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="btn-danger-glass fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up z-50">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <i className="fas fa-exclamation-circle" />
          </div>
          <p className="flex-1 text-sm">{error}</p>
        </div>
      )}

      {/* Delete message confirmation */}
      {messageToDelete && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard handling is done via document-level event listener in useEffect
        <div
          className="chat-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setMessageToDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-message-title"
        >
          <div className="chat-confirm-modal">
            <div className="chat-confirm-icon">
              <i className="fas fa-trash" />
            </div>
            <h3 id="delete-message-title" className="chat-confirm-title">
              {t('chat.deleteMessageConfirm')}
            </h3>
            <p className="chat-confirm-message">{t('chat.deleteMessageWarning')}</p>
            <div className="chat-confirm-actions">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="chat-confirm-btn cancel"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMessage(messageToDelete)}
                className="chat-confirm-btn delete"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete room confirmation */}
      {showDeleteRoomConfirm && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard handling is done via document-level event listener in useEffect
        <div
          className="chat-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowDeleteRoomConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-room-title"
        >
          <div className="chat-confirm-modal">
            <div className="chat-confirm-icon">
              <i className="fas fa-comments" />
            </div>
            <h3 id="delete-room-title" className="chat-confirm-title">
              {t('chat.deleteChatConfirm')}
            </h3>
            <p className="chat-confirm-message">{t('chat.deleteChatWarning')}</p>
            <div className="chat-confirm-actions">
              <button
                type="button"
                onClick={() => setShowDeleteRoomConfirm(false)}
                className="chat-confirm-btn cancel"
              >
                {t('common.cancel')}
              </button>
              <button type="button" onClick={handleDeleteRoom} className="chat-confirm-btn delete">
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo viewer modal */}
      {viewingPhoto && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard handling is done via document-level event listener in useEffect
        <div
          className="chat-photo-viewer"
          onClick={() => setViewingPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          <button
            type="button"
            onClick={() => setViewingPhoto(null)}
            className="chat-photo-viewer-close safe-area-inset-top"
            aria-label="Close"
          >
            <i className="fas fa-times" />
          </button>
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            {/* Prevent modal from closing when clicking the image itself */}
            <img
              src={viewingPhoto}
              alt="Full size view"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Pinned messages modal */}
      {showPinnedModal && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard handling is done via document-level event listener in useEffect
        <div
          className="chat-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowPinnedModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pinned-messages-title"
        >
          <div className="chat-modal">
            <div className="chat-modal-header">
              <h2 id="pinned-messages-title" className="chat-modal-title">
                <i className="fas fa-thumbtack mr-2 text-amber-600" />
                Pinned Messages
              </h2>
              <button
                type="button"
                onClick={() => setShowPinnedModal(false)}
                className="chat-modal-close"
                aria-label="Close"
              >
                <i className="fas fa-times text-lg" />
              </button>
            </div>
            <div className="chat-modal-body">
              {pinnedMessages.length === 0 ? (
                <div className="chat-empty-state" style={{ padding: '2rem 0' }}>
                  <div className="chat-empty-icon" style={{ width: '4rem', height: '4rem' }}>
                    <i className="fas fa-thumbtack" style={{ fontSize: '1.5rem' }} />
                  </div>
                  <p className="chat-empty-subtitle">No pinned messages</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pinnedMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <UserAvatar
                          username={message.sender.username}
                          avatarUrl={message.sender.avatar_url}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{message.sender.username}</p>
                          <p className="text-xs text-gray-500">{formatTime(message.created_at)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => unpinMessage(message.id)}
                          className="text-gray-500 hover:text-red-600"
                          title="Unpin"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
