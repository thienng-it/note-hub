/**
 * Chat Page
 * Main chat interface with room list and messaging
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { chatApi } from '../api/chat';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import type { ChatUser } from '../types/chat';

export function ChatPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
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
    setTyping,
    deleteMessage,
    deleteRoom,
    getUserStatus,
  } = useChat();

  const [messageInput, setMessageInput] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<number | null>(null);
  const [showDeleteRoomConfirm, setShowDeleteRoomConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<number | null>(null);

  // Load rooms on mount
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

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
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    sendMessage(messageInput);
    setMessageInput('');
    setTyping(false);
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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            <i className="fas fa-comments mr-2"></i>
            {t('chat.title')}
          </h1>
          <button
            type="button"
            onClick={handleOpenNewChat}
            className="px-3 py-2 md:px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
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
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Rooms list - Hidden on mobile when chat is selected */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto ${
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
          className={`flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 ${
            currentRoom ? 'block' : 'hidden md:flex'
          }`}
        >
          {!currentRoom ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center px-4">
                <i className="fas fa-comment-dots text-6xl mb-4 opacity-30"></i>
                <p className="text-lg">{t('chat.noChatSelected')}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  {/* Back button for mobile */}
                  <button
                    type="button"
                    onClick={() => setCurrentRoom(null)}
                    className="md:hidden p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    title={t('common.back')}
                  >
                    <i className="fas fa-arrow-left"></i>
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                      {currentRoom.is_group
                        ? currentRoom.name
                        : t('chat.chatWith', {
                            username: getOtherParticipant(currentRoom)?.username || 'Unknown',
                          })}
                    </h2>
                    {typingUsers.size > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
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
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => {
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
                          className="flex-shrink-0"
                        />
                      )}
                      <div className={`max-w-xs lg:max-w-md ${isSender ? 'order-2' : 'order-1'}`}>
                        {!isSender && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 ml-1">
                            {message.sender.username}
                          </p>
                        )}
                        <div className="relative">
                          <div
                            className={`px-4 py-2 rounded-lg ${
                              isSender
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            }`}
                          >
                            <p className="break-words">{message.message}</p>
                          </div>
                          {isSender && message.id && (
                            <button
                              type="button"
                              onClick={() => setMessageToDelete(message.id)}
                              className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-600 hover:text-red-700"
                              title={t('chat.deleteMessage')}
                            >
                              <i className="fas fa-trash text-sm"></i>
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
              </div>

              {/* Message input */}
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 md:p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => handleTyping(e.target.value)}
                    placeholder={t('chat.typeMessage')}
                    className="flex-1 px-3 py-2 md:px-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm md:text-base"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="px-4 py-2 md:px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
                  >
                    <i className="fas fa-paper-plane md:mr-2"></i>
                    <span className="hidden md:inline">{t('chat.send')}</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New chat modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('chat.newChat')}
              </h2>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('chat.searchUsers')}
              className="w-full px-4 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />

            <div className="max-h-96 overflow-y-auto space-y-2">
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
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('chat.deleteMessageConfirm')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('chat.deleteMessageWarning')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMessage(messageToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete room confirmation */}
      {showDeleteRoomConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('chat.deleteChatConfirm')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{t('chat.deleteChatWarning')}</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteRoomConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteRoom}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
