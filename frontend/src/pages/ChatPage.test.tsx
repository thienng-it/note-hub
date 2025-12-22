import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ChatPage } from './ChatPage';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock useAuth
const mockUser = { id: 1, username: 'testuser', is_admin: false };
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      isAuthenticated: true,
    }),
  };
});

// Use fixed date for consistent snapshots
const FIXED_DATE = '2024-01-15T10:30:00.000Z';

// Mock useChat
const mockRooms = [
  {
    id: 1,
    name: 'Test Room',
    is_group: false,
    participants: [
      { id: 1, username: 'testuser', avatar_url: null, status: 'online' },
      { id: 2, username: 'otheruser', avatar_url: null, status: 'online' },
    ],
    lastMessage: {
      id: 1,
      message: 'Hello there!',
      sender: { id: 2, username: 'otheruser', avatar_url: null },
      created_at: FIXED_DATE,
    },
    unreadCount: 2,
    created_at: FIXED_DATE,
    updated_at: FIXED_DATE,
  },
];

const mockMessages = [
  {
    id: 1,
    message: 'Hello!',
    sender: { id: 2, username: 'otheruser', avatar_url: null },
    created_at: FIXED_DATE,
    photo_url: null,
  },
  {
    id: 2,
    message: 'Hi there!',
    sender: { id: 1, username: 'testuser', avatar_url: null },
    created_at: FIXED_DATE,
    photo_url: null,
  },
];

const mockChatContext = {
  rooms: mockRooms,
  currentRoom: null,
  messages: [],
  pinnedMessages: [],
  typingUsers: new Map(),
  onlineUsers: new Set([1, 2]),
  userStatuses: new Map(),
  isConnected: true,
  isLoading: false,
  error: null,
  loadRooms: vi.fn(),
  selectRoom: vi.fn(),
  clearRoom: vi.fn(),
  startChat: vi.fn(),
  startGroupChat: vi.fn(),
  sendMessage: vi.fn(),
  loadMoreMessages: vi.fn(),
  setTyping: vi.fn(),
  deleteMessage: vi.fn(),
  deleteRoom: vi.fn(),
  getUserStatus: vi.fn().mockReturnValue('online'),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
  pinMessage: vi.fn(),
  unpinMessage: vi.fn(),
  loadPinnedMessages: vi.fn(),
  updateRoomTheme: vi.fn(),
};

vi.mock('../context/ChatContext', async () => {
  return {
    useChat: () => mockChatContext,
    ChatProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock chat API
vi.mock('../api/chat', () => ({
  chatApi: {
    getAvailableUsers: vi.fn().mockResolvedValue([
      { id: 2, username: 'otheruser', avatar_url: null, status: 'online' },
      { id: 3, username: 'thirduser', avatar_url: null, status: 'offline' },
    ]),
    searchMessages: vi.fn().mockResolvedValue([]),
    uploadPhoto: vi.fn().mockResolvedValue({ photoUrl: '/uploads/test.jpg' }),
  },
}));

// Mock notification service
vi.mock('../services/notificationService', () => ({
  notificationService: {
    isSupported: vi.fn().mockReturnValue(true),
    getPermission: vi.fn().mockReturnValue('default'),
    requestPermission: vi.fn().mockResolvedValue(true),
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('notehub_access_token', 'test-token');
    // Reset mock context
    mockChatContext.currentRoom = null;
    mockChatContext.messages = [];
    mockChatContext.pinnedMessages = [];
    mockChatContext.rooms = mockRooms;
    mockChatContext.isLoading = false;
    mockChatContext.error = null;
  });

  it('renders chat page with header correctly', async () => {
    render(
      <TestWrapper>
        <ChatPage />
      </TestWrapper>,
    );

    // Wait for the page to render - check for chat icon or new chat button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new/i })).toBeInTheDocument();
    });
  });

  it('displays rooms list', async () => {
    render(
      <TestWrapper>
        <ChatPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('otheruser')).toBeInTheDocument();
    });
  });

  it('shows no chat selected message when no room is selected', async () => {
    render(
      <TestWrapper>
        <ChatPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/select a conversation/i)).toBeInTheDocument();
    });
  });

  it('displays notification banner when permission is default', async () => {
    render(
      <TestWrapper>
        <ChatPage />
      </TestWrapper>,
    );

    // Look for the notification enable button which should always be visible when permission is 'default'
    await waitFor(() => {
      const enableButtons = screen.getAllByRole('button');
      const hasEnableButton = enableButtons.some((btn) =>
        btn.textContent?.toLowerCase().includes('enable'),
      );
      expect(hasEnableButton).toBe(true);
    });
  });

  it('shows empty state when no rooms exist', async () => {
    mockChatContext.rooms = [];

    render(
      <TestWrapper>
        <ChatPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/no chats/i)).toBeInTheDocument();
    });
  });

  describe('Snapshots', () => {
    it('matches snapshot - default state with rooms', async () => {
      mockChatContext.rooms = mockRooms;

      const { container } = render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText('otheruser')).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });

    it('matches snapshot - empty state (no rooms)', async () => {
      mockChatContext.rooms = [];

      const { container } = render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText(/no chats/i)).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });

    it('matches snapshot - loading state', async () => {
      mockChatContext.rooms = [];
      mockChatContext.isLoading = true;

      const { container } = render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });

    it('matches snapshot - with active chat room', async () => {
      mockChatContext.currentRoom = mockRooms[0];
      mockChatContext.messages = mockMessages;

      const { container } = render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText('Hello!')).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });

    it('matches snapshot - disconnected state', async () => {
      mockChatContext.isConnected = false;

      const { container } = render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });

    it('matches snapshot - with error', async () => {
      mockChatContext.error = 'Connection failed';

      const { container } = render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });
  });
});
