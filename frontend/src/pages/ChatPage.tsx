/**
 * Chat Page
 * Main chat interface with room list and messaging
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { chatApi } from '../api/chat';
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
    typingUsers,
    isConnected,
    isLoading,
    error,
    loadRooms,
    selectRoom,
    clearRoom,
    startChat,
    sendMessage,
    setTyping,
    deleteMessage,
    deleteRoom,
    getUserStatus,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load rooms on mount
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

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
    <div className="h-full flex flex-col overflow-hidden chat-page-container">
      {/* Header */}
      <div className="glass-header p-3 md:p-4 lg:p-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-[var(--text-primary)] flex items-center min-w-0">
            <i className="fas fa-comments mr-2 md:mr-3 text-blue-600 flex-shrink-0"></i>
            <span className="hidden sm:inline truncate">{t('chat.title')}</span>
            <span className="sm:hidden">Chat</span>
          </h1>
          <button
            type="button"
            onClick={handleOpenNewChat}
            className="btn-apple text-sm md:text-base flex-shrink-0 touch-manipulation"
            aria-label={t('chat.newChat')}
          >
            <i className="fas fa-plus mr-1 md:mr-2"></i>
            <span className="hidden sm:inline">{t('chat.newChat')}</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
        {!isConnected && (
          <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
            <i className="fas fa-exclamation-triangle mr-1"></i>
            {t('chat.disconnected')} - {t('chat.reconnecting')}
          </div>
        )}
        {showNotificationBanner && (
          <div className="mt-2 md:mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 md:p-4 animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-800/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-bell text-blue-600 dark:text-blue-400 text-sm md:text-base"></i>
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm md:text-base font-medium text-blue-900 dark:text-blue-100">
                    {t('chat.enableNotifications')}
                  </p>
                  <p className="text-xs md:text-sm text-blue-700 dark:text-blue-300 mt-1 line-clamp-2">
                    {t('chat.notificationDescription')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleRequestNotificationPermission}
                  className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
                >
                  {t('chat.enable')}
                </button>
                <button
                  type="button"
                  onClick={handleDismissNotificationBanner}
                  className="w-8 h-8 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-full transition-colors touch-manipulation"
                  aria-label="Dismiss"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Rooms list - Hidden on mobile when chat is selected */}
        <div
          className={`w-full md:w-72 lg:w-80 xl:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto flex-shrink-0 scroll-smooth overscroll-contain ${
            currentRoom ? 'hidden md:flex md:flex-col' : 'flex flex-col'
          }`}
        >
          {isLoading && rooms.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4 text-center text-gray-500">
              <div>
                <i className="fas fa-spinner fa-spin text-2xl mb-2 text-blue-500"></i>
                <p className="text-sm md:text-base">{t('chat.loadingChats')}</p>
              </div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 md:p-8 text-center">
              <div className="max-w-xs">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-comments text-2xl md:text-3xl text-gray-400 dark:text-gray-500"></i>
                </div>
                <p className="text-base md:text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('chat.noChats')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('chat.startNewChat')}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 divide-y divide-gray-200 dark:divide-gray-700">
              {rooms.map((room) => {
                const otherUser = getOtherParticipant(room);
                const displayName = room.is_group ? room.name : otherUser?.username || 'Unknown';
                const userStatus = otherUser
                  ? getUserStatus(otherUser.id, otherUser.status)
                  : 'offline';

                return (
                  <button
                    type="button"
                    key={room.id}
                    onClick={() => selectRoom(room.id)}
                    className={`w-full p-3 md:p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors touch-manipulation ${
                      currentRoom?.id === room.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-l-3 border-l-blue-500'
                        : 'border-l-3 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {!room.is_group && otherUser && (
                        <UserAvatar
                          username={otherUser.username}
                          avatarUrl={otherUser.avatar_url}
                          size="md"
                          status={userStatus as 'online' | 'offline' | 'away' | 'busy'}
                          showStatus={true}
                        />
                      )}
                      {room.is_group && (
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-users text-white text-sm"></i>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white truncate text-sm md:text-base">
                            {displayName}
                          </span>
                          {room.lastMessage && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                              {formatTime(room.lastMessage.created_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          {room.lastMessage ? (
                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                              <span className="font-medium">
                                {room.lastMessage.sender.username}:
                              </span>{' '}
                              {room.lastMessage.message}
                            </p>
                          ) : (
                            <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500 italic">
                              No messages yet
                            </p>
                          )}
                          {room.unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full flex-shrink-0 min-w-[1.25rem] text-center">
                              {room.unreadCount > 99 ? '99+' : room.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat area - Full width on mobile when chat is selected */}
        <div
          className={`flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden min-h-0 ${
            currentRoom ? 'flex' : 'hidden md:flex'
          }`}
        >
          {!currentRoom ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-comment-dots text-3xl md:text-4xl text-gray-400 dark:text-gray-600"></i>
                </div>
                <p className="text-base md:text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('chat.noChatSelected')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Select a conversation from the list or start a new chat
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 flex-shrink-0 safe-area-inset-top">
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                  {/* Back button for mobile */}
                  <button
                    type="button"
                    onClick={() => clearRoom()}
                    className="md:hidden w-9 h-9 flex items-center justify-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors flex-shrink-0 touch-manipulation"
                    title={t('common.back')}
                    aria-label="Back to chat list"
                  >
                    <i className="fas fa-arrow-left text-lg"></i>
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 dark:text-white truncate text-base md:text-lg">
                      {currentRoom.is_group
                        ? currentRoom.name
                        : t('chat.chatWith', {
                            username: getOtherParticipant(currentRoom)?.username || 'Unknown',
                          })}
                    </h2>
                    {typingUsers.size > 0 && (
                      <p className="text-xs md:text-sm text-blue-600 dark:text-blue-400 truncate flex items-center gap-1">
                        <span className="typing-indicator">
                          <span></span>
                        </span>
                        {Array.from(typingUsers.values())[0]} {t('chat.typing')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteRoomConfirm(true)}
                    className="w-9 h-9 flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/50 rounded-full transition-colors flex-shrink-0 touch-manipulation"
                    title={t('chat.deleteChat')}
                    aria-label="Delete chat"
                  >
                    <i className="fas fa-trash text-sm"></i>
                  </button>
                </div>
                {/* Search bar */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                    <input
                      type="text"
                      value={messageSearchQuery}
                      onChange={(e) => handleMessageSearch(e.target.value)}
                      placeholder={t('chat.searchMessages')}
                      className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                      aria-label="Search messages"
                    />
                    {messageSearchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors touch-manipulation"
                        aria-label="Clear search"
                      >
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    )}
                  </div>
                  {isSearching && (
                    <div className="flex items-center px-2">
                      <i className="fas fa-spinner fa-spin text-blue-500"></i>
                    </div>
                  )}
                </div>
                {showSearchResults && (
                  <div className="mt-2 px-1 text-xs md:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
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
              <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 space-y-3 md:space-y-4 min-h-0 scroll-smooth overscroll-contain">
                {(showSearchResults ? searchResults : messages).length === 0 &&
                  !showSearchResults && (
                    <div className="flex-1 flex items-center justify-center py-12">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <i className="fas fa-comments text-3xl mb-3 opacity-50"></i>
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    </div>
                  )}
                {(showSearchResults ? searchResults : messages).map((message, index) => {
                  const isSender = user && message.sender.id === user.id;
                  return (
                    <div
                      key={message.id || index}
                      className={`flex ${isSender ? 'justify-end' : 'justify-start'} gap-2 group animate-fade-in-up`}
                    >
                      {!isSender && (
                        <UserAvatar
                          username={message.sender.username}
                          avatarUrl={message.sender.avatar_url}
                          size="sm"
                          className="flex-shrink-0 hidden sm:block self-end mb-5"
                        />
                      )}
                      <div
                        className={`max-w-[85%] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg ${isSender ? 'order-2' : 'order-1'}`}
                      >
                        {!isSender && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 ml-2 truncate font-medium">
                            {message.sender.username}
                          </p>
                        )}
                        <div className="relative">
                          <div
                            className={`px-3 py-2 md:px-4 md:py-2.5 shadow-sm ${
                              isSender
                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-br-md'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-2xl rounded-bl-md'
                            }`}
                          >
                            {message.photo_url && (
                              <div className="mb-2">
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
                            <p className="break-words whitespace-pre-wrap text-sm md:text-base leading-relaxed">
                              {linkify(message.message)}
                            </p>
                          </div>
                          {isSender && message.id && !showSearchResults && (
                            <button
                              type="button"
                              onClick={() => setMessageToDelete(message.id)}
                              className="absolute -right-8 md:-right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full touch-manipulation"
                              title={t('chat.deleteMessage')}
                              aria-label="Delete message"
                            >
                              <i className="fas fa-trash text-xs"></i>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-2 flex items-center gap-1">
                          {formatTime(message.created_at)}
                          {isSender && (
                            <i className="fas fa-check text-blue-400 text-[10px]" title="Sent"></i>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {/* Scroll target */}
                <div ref={messagesEndRef} className="h-1" />
              </div>

              {/* Message input */}
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 md:p-3 lg:p-4 flex-shrink-0 safe-area-inset-bottom">
                {/* Photo preview */}
                {photoPreviewUrl && (
                  <div className="mb-3 relative inline-block animate-scale-in">
                    <img
                      src={photoPreviewUrl}
                      alt="Preview"
                      className="rounded-xl max-h-28 md:max-h-32 border-2 border-gray-200 dark:border-gray-600 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-700 active:bg-red-800 transition-colors shadow-md touch-manipulation"
                      aria-label="Remove photo"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
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
                    className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 rounded-full transition-colors flex-shrink-0 touch-manipulation"
                    title={t('chat.uploadPhoto')}
                    aria-label="Upload photo"
                  >
                    <i className="fas fa-image text-lg"></i>
                  </button>
                  <div className="flex-1 min-w-0 relative">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => handleTyping(e.target.value)}
                      placeholder={t('chat.typeMessage')}
                      disabled={uploadingPhoto}
                      className="w-full px-4 py-2.5 md:py-3 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm md:text-base transition-all"
                      aria-label="Message input"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={(!messageInput.trim() && !selectedPhoto) || uploadingPhoto}
                    className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-sm hover:shadow-md touch-manipulation"
                    aria-label={uploadingPhoto ? t('chat.uploading') : t('chat.send')}
                  >
                    {uploadingPhoto ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-paper-plane"></i>
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
          className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowNewChatModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-chat-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-md max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl animate-slide-up sm:animate-scale-in safe-area-inset-bottom">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              <h2
                id="new-chat-title"
                className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white"
              >
                {t('chat.newChat')}
              </h2>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors touch-manipulation"
                aria-label="Close"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <div className="relative mb-4">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('chat.searchUsers')}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base transition-all"
                aria-label="Search users"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 overscroll-contain">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-users text-2xl text-gray-400 dark:text-gray-500"></i>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">{t('chat.selectUser')}</p>
                </div>
              ) : (
                filteredUsers.map((chatUser) => {
                  const userStatus = getUserStatus(chatUser.id, chatUser.status);
                  return (
                    <button
                      type="button"
                      key={chatUser.id}
                      onClick={() => {
                        startChat(chatUser.id);
                        setShowNewChatModal(false);
                        setSearchQuery('');
                      }}
                      className="w-full p-3 md:p-4 text-left border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors touch-manipulation"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          username={chatUser.username}
                          avatarUrl={chatUser.avatar_url}
                          size="md"
                          status={userStatus as 'online' | 'offline' | 'away' | 'busy'}
                          showStatus={true}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">
                            {chatUser.username}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                userStatus === 'online'
                                  ? 'bg-green-500'
                                  : userStatus === 'away'
                                    ? 'bg-yellow-500'
                                    : userStatus === 'busy'
                                      ? 'bg-red-500'
                                      : 'bg-gray-400'
                              }`}
                            ></span>
                            {t(`chat.${userStatus}`)}
                          </div>
                        </div>
                        <i className="fas fa-chevron-right text-gray-400 text-sm"></i>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up z-50">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <p className="flex-1 text-sm">{error}</p>
        </div>
      )}

      {/* Delete message confirmation */}
      {messageToDelete && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard handling is done via document-level event listener in useEffect
        <div
          className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setMessageToDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-message-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-sm shadow-2xl animate-slide-up sm:animate-scale-in safe-area-inset-bottom">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-trash text-red-600 dark:text-red-400 text-xl"></i>
            </div>
            <h3
              id="delete-message-title"
              className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center mb-2"
            >
              {t('chat.deleteMessageConfirm')}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 text-center mb-6">
              {t('chat.deleteMessageWarning')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors text-sm sm:text-base font-medium touch-manipulation"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMessage(messageToDelete)}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors text-sm sm:text-base font-medium touch-manipulation"
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
          className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowDeleteRoomConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-room-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-sm shadow-2xl animate-slide-up sm:animate-scale-in safe-area-inset-bottom">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-comments text-red-600 dark:text-red-400 text-xl"></i>
            </div>
            <h3
              id="delete-room-title"
              className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center mb-2"
            >
              {t('chat.deleteChatConfirm')}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 text-center mb-6">
              {t('chat.deleteChatWarning')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteRoomConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors text-sm sm:text-base font-medium touch-manipulation"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteRoom}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors text-sm sm:text-base font-medium touch-manipulation"
              >
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
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in"
          onClick={() => setViewingPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          <button
            type="button"
            onClick={() => setViewingPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors z-10 touch-manipulation safe-area-inset-top"
            aria-label="Close"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            {/* Prevent modal from closing when clicking the image itself */}
            <img
              src={viewingPhoto}
              alt="Full size view"
              className="max-w-full max-h-[85vh] object-contain rounded-lg sm:rounded-xl shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              loading="lazy"
            />
          </div>
        </div>
      )}
    </div>
  );
}
