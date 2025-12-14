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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="glass-header p-3 md:p-4 flex-shrink-0">
        <div className="stack-mobile">
          <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-[var(--text-primary)]">
            <i className="fas fa-comments mr-2 text-blue-600"></i>
            <span className="hide-mobile sm:inline">{t('chat.title')}</span>
            <span className="show-mobile">Chat</span>
          </h1>
          <button
            type="button"
            onClick={handleOpenNewChat}
            className="btn-apple text-sm md:text-base"
          >
            <i className="fas fa-plus mr-1 md:mr-2"></i>
            <span className="hidden sm:inline">{t('chat.newChat')}</span>
          </button>
        </div>
        {!isConnected && (
          <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
            <i className="fas fa-exclamation-triangle mr-1"></i>
            {t('chat.disconnected')} - {t('chat.reconnecting')}
          </div>
        )}
        {showNotificationBanner && (
          <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 md:p-3">
            <div className="flex items-start justify-between gap-2 md:gap-3">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <i className="fas fa-bell text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"></i>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-blue-900 dark:text-blue-100">
                    {t('chat.enableNotifications')}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 md:mt-1 hidden sm:block">
                    {t('chat.notificationDescription')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleRequestNotificationPermission}
                  className="px-2 md:px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {t('chat.enable')}
                </button>
                <button
                  type="button"
                  onClick={handleDismissNotificationBanner}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Rooms list - Hidden on mobile when chat is selected */}
        <div
          className={`w-full md:w-72 lg:w-80 xl:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto flex-shrink-0 ${
            currentRoom ? 'hidden md:block' : 'block'
          }`}
        >
          {isLoading && rooms.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <i className="fas fa-spinner fa-spin mr-2"></i>
              {t('chat.loadingChats')}
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <i className="fas fa-comments text-4xl mb-4 opacity-50"></i>
              <p className="text-lg mb-2">{t('chat.noChats')}</p>
              <p className="text-sm">{t('chat.startNewChat')}</p>
            </div>
          ) : (
            <div>
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
                    className={`w-full p-4 text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      currentRoom?.id === room.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {!room.is_group && otherUser && (
                        <UserAvatar
                          username={otherUser.username}
                          avatarUrl={otherUser.avatar_url}
                          size="md"
                          status={userStatus as 'online' | 'offline' | 'away' | 'busy'}
                          showStatus={true}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white truncate">
                            {displayName}
                          </span>
                        </div>
                        {room.lastMessage && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                            {room.lastMessage.sender.username}: {room.lastMessage.message}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        {room.lastMessage && (
                          <span className="text-xs text-gray-500">
                            {formatTime(room.lastMessage.created_at)}
                          </span>
                        )}
                        {room.unreadCount > 0 && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                            {room.unreadCount}
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

        {/* Chat area - Full width on mobile when chat is selected */}
        <div
          className={`flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden ${
            currentRoom ? 'block' : 'hidden md:flex'
          }`}
        >
          {!currentRoom ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center px-4">
                <i className="fas fa-comment-dots text-5xl md:text-6xl mb-4 opacity-30"></i>
                <p className="text-base md:text-lg">{t('chat.noChatSelected')}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 flex-shrink-0">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  {/* Back button for mobile */}
                  <button
                    type="button"
                    onClick={() => clearRoom()}
                    className="md:hidden p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                    title={t('common.back')}
                  >
                    <i className="fas fa-arrow-left"></i>
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 dark:text-white truncate text-sm md:text-base">
                      {currentRoom.is_group
                        ? currentRoom.name
                        : t('chat.chatWith', {
                            username: getOtherParticipant(currentRoom)?.username || 'Unknown',
                          })}
                    </h2>
                    {typingUsers.size > 0 && (
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                        {Array.from(typingUsers.values())[0]} {t('chat.typing')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteRoomConfirm(true)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                    title={t('chat.deleteChat')}
                  >
                    <i className="fas fa-trash text-sm"></i>
                  </button>
                </div>
                {/* Search bar */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={messageSearchQuery}
                      onChange={(e) => handleMessageSearch(e.target.value)}
                      placeholder={t('chat.searchMessages')}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {messageSearchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    )}
                  </div>
                  {isSearching && (
                    <div className="flex items-center">
                      <i className="fas fa-spinner fa-spin text-gray-500"></i>
                    </div>
                  )}
                </div>
                {showSearchResults && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    {searchResults.length} {t('chat.resultsFound')}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 min-h-0">
                {(showSearchResults ? searchResults : messages).map((message, index) => {
                  const isSender = user && message.sender.id === user.id;
                  return (
                    <div
                      key={message.id || index}
                      className={`flex ${isSender ? 'justify-end' : 'justify-start'} gap-2 group`}
                    >
                      {!isSender && (
                        <UserAvatar
                          username={message.sender.username}
                          avatarUrl={message.sender.avatar_url}
                          size="sm"
                          className="flex-shrink-0 hidden sm:block"
                        />
                      )}
                      <div
                        className={`max-w-[85%] sm:max-w-xs lg:max-w-sm xl:max-w-md ${isSender ? 'order-2' : 'order-1'}`}
                      >
                        {!isSender && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 ml-1 truncate">
                            {message.sender.username}
                          </p>
                        )}
                        <div className="relative">
                          <div
                            className={`px-3 py-2 md:px-4 rounded-lg shadow-sm ${
                              isSender
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            {message.photo_url && (
                              <div className="mb-2">
                                <img
                                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${message.photo_url}`}
                                  alt="Chat attachment"
                                  className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() =>
                                    setViewingPhoto(
                                      `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${message.photo_url}`,
                                    )
                                  }
                                  style={{ maxHeight: '300px' }}
                                />
                              </div>
                            )}
                            <p className="break-words whitespace-pre-wrap text-sm md:text-base">
                              {linkify(message.message)}
                            </p>
                          </div>
                          {isSender && message.id && !showSearchResults && (
                            <button
                              type="button"
                              onClick={() => setMessageToDelete(message.id)}
                              className="absolute -right-7 md:-right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-600 hover:text-red-700"
                              title={t('chat.deleteMessage')}
                            >
                              <i className="fas fa-trash text-xs md:text-sm"></i>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-1">
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {/* Scroll target */}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 md:p-3 lg:p-4 flex-shrink-0">
                {/* Photo preview */}
                {photoPreviewUrl && (
                  <div className="mb-2 relative inline-block">
                    <img
                      src={photoPreviewUrl}
                      alt="Preview"
                      className="rounded-lg max-h-32 border border-gray-300 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition-colors"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                    title={t('chat.uploadPhoto')}
                  >
                    <i className="fas fa-image"></i>
                  </button>
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => handleTyping(e.target.value)}
                    placeholder={t('chat.typeMessage')}
                    disabled={uploadingPhoto}
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm md:text-base"
                  />
                  <button
                    type="submit"
                    disabled={(!messageInput.trim() && !selectedPhoto) || uploadingPhoto}
                    className="px-3 py-2 md:px-4 lg:px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base flex-shrink-0"
                  >
                    {uploadingPhoto ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-paper-plane"></i>
                    )}
                    <span className="hidden md:inline md:ml-2">
                      {uploadingPhoto ? t('chat.uploading') : t('chat.send')}
                    </span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New chat modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-gray-900/30 dark:bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg p-4 sm:p-6 w-full sm:max-w-md max-h-[90vh] sm:max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {t('chat.newChat')}
              </h2>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('chat.searchUsers')}
              className="w-full px-3 py-2 sm:px-4 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
            />

            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-4">{t('chat.selectUser')}</p>
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
                      className="w-full p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {t(`chat.${userStatus}`)}
                          </div>
                        </div>
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
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      {/* Delete message confirmation */}
      {messageToDelete && (
        <div className="fixed inset-0 bg-gray-900/30 dark:bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg p-4 sm:p-6 w-full sm:max-w-md shadow-xl">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              {t('chat.deleteMessageConfirm')}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
              {t('chat.deleteMessageWarning')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMessage(messageToDelete)}
                className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete room confirmation */}
      {showDeleteRoomConfirm && (
        <div className="fixed inset-0 bg-gray-900/30 dark:bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg p-4 sm:p-6 w-full sm:max-w-md shadow-xl">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              {t('chat.deleteChatConfirm')}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
              {t('chat.deleteChatWarning')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteRoomConfirm(false)}
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteRoom}
                className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo viewer modal */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              type="button"
              onClick={() => setViewingPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <i className="fas fa-times text-2xl"></i>
            </button>
            <img
              src={viewingPhoto}
              alt="Full size"
              className="max-w-full max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
