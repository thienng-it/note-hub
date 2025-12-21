import type { ChatMessage, ChatTheme } from '../types/chat';

interface MessageReactionsProps {
  message: ChatMessage;
  currentUserId: number;
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
}

import { useEffect, useRef, useState } from 'react';

const EMOJI_OPTIONS = ['👍', '👎', '❤️', '😂', '😮', '😢', '🎉', '🔥'];

export function MessageReactions({
  message,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const reactionCounts = (message.reactions || []).reduce(
    (acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const userReactions = new Set(
    (message.reactions || []).filter((r) => r.user.id === currentUserId).map((r) => r.emoji),
  );

  const handleReactionClick = (emoji: string) => {
    if (userReactions.has(emoji)) {
      onRemoveReaction(emoji);
    } else {
      onAddReaction(emoji);
    }
    setShowPicker(false);
  };

  // Handle tap and hold for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    longPressTimer.current = window.setTimeout(() => {
      setShowPicker(true);
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showPicker]);

  return (
    <div className="message-reactions-container">
      {Object.entries(reactionCounts).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => handleReactionClick(emoji)}
          className={`chat-reaction ${userReactions.has(emoji) ? 'active' : ''}`}
          title={`${count} reaction${count > 1 ? 's' : ''}`}
          type="button"
        >
          <span>{emoji}</span>
          <span className="reaction-count">{count}</span>
        </button>
      ))}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          className="chat-reaction add-reaction"
          title="Add reaction (tap and hold on mobile)"
          type="button"
        >
          <i className="fas fa-smile" />
        </button>
        {showPicker && (
          <div className="reaction-picker">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className="reaction-emoji"
                type="button"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface MessageStatusProps {
  message: ChatMessage;
  currentUserId: number;
}

export function MessageStatus({ message, currentUserId }: MessageStatusProps) {
  if (message.sender.id !== currentUserId) return null;

  const readCount = (message.readReceipts || []).length;
  const isRead = readCount > 0;
  const isDelivered = message.delivered_at != null;
  const isSent = message.sent_at != null;

  return (
    <span className="message-status">
      {isRead ? (
        <span className="message-status-read" title={`Read by ${readCount} user(s)`}>
          <i className="fas fa-check-double" />
        </span>
      ) : isDelivered ? (
        <span className="message-status-delivered" title="Delivered">
          <i className="fas fa-check-double" />
        </span>
      ) : isSent ? (
        <span className="message-status-sent" title="Sent">
          <i className="fas fa-check" />
        </span>
      ) : null}
    </span>
  );
}

interface PinnedMessagesBannerProps {
  pinnedMessages: ChatMessage[];
  onViewPinned: () => void;
  onUnpin: (messageId: number) => void;
}

export function PinnedMessagesBanner({
  pinnedMessages,
  onViewPinned,
  onUnpin,
}: PinnedMessagesBannerProps) {
  if (pinnedMessages.length === 0) return null;

  const latestPinned = pinnedMessages[0];

  return (
    <div className="pinned-messages-banner">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <i className="fas fa-thumbtack text-amber-600" />
        <div className="pinned-message-preview">
          <strong>{latestPinned.sender.username}:</strong> {latestPinned.message}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {pinnedMessages.length > 1 && (
          <button onClick={onViewPinned} className="text-sm text-blue-600 hover:underline">
            View all ({pinnedMessages.length})
          </button>
        )}
        <button
          onClick={() => onUnpin(latestPinned.id)}
          className="text-gray-500 hover:text-gray-700"
          title="Unpin"
        >
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );
}

interface ThemeSelectorProps {
  currentTheme: ChatTheme;
  onThemeChange: (theme: ChatTheme) => void;
}

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const themes: { name: ChatTheme; label: string }[] = [
    { name: 'default', label: 'Default' },
    { name: 'ocean', label: 'Ocean' },
    { name: 'sunset', label: 'Sunset' },
    { name: 'forest', label: 'Forest' },
    { name: 'midnight', label: 'Midnight' },
  ];

  return (
    <div className="theme-selector">
      {themes.map((theme) => (
        <button
          key={theme.name}
          onClick={() => onThemeChange(theme.name)}
          className={`theme-option ${theme.name} ${currentTheme === theme.name ? 'active' : ''}`}
          title={theme.label}
          aria-label={`Select ${theme.label} theme`}
        />
      ))}
    </div>
  );
}
