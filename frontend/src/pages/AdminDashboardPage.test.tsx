import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AdminDashboardPage } from './AdminDashboardPage';

// Mock useAuth
const mockUser = { id: 1, username: 'admin', is_admin: true };
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

// Mock fetch
global.fetch = vi.fn();
// Mock window.confirm
global.confirm = vi.fn();

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

const mockUsersResponse = {
  users: [
    {
      id: 1,
      username: 'user1',
      email: 'user1@example.com',
      created_at: '2024-01-01T00:00:00Z',
      last_login: '2024-01-15T00:00:00Z',
      totp_secret: true,
      has_2fa: true,
    },
    {
      id: 2,
      username: 'user2',
      email: 'user2@example.com',
      created_at: '2024-01-02T00:00:00Z',
      last_login: null,
      totp_secret: false,
      has_2fa: false,
    },
  ],
  pagination: { page: 1, per_page: 10, total: 2, total_pages: 1 },
};

const mockStatsResponse = {
  total_users: 2,
  users_with_2fa: 1,
  users_with_email: 2,
};

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('notehub_access_token', 'test-token');

    // Default fetch mock - successful response
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url) => {
      if (url.includes('/api/v1/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            users: mockUsersResponse.users,
            pagination: mockUsersResponse.pagination,
            stats: mockStatsResponse,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it('renders admin dashboard correctly', async () => {
    render(
      <TestWrapper>
        <AdminDashboardPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  it('matches snapshot', async () => {
    const { container } = render(
      <TestWrapper>
        <AdminDashboardPage />
      </TestWrapper>,
    );

    // Wait for loading to complete and data to render
    await waitFor(() => {
      expect(screen.queryByText('Loading users...')).not.toBeInTheDocument();
    });

    // Additional wait to ensure user data is rendered
    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    expect(container).toMatchSnapshot();
  });

  it('displays admin dashboard title and description', async () => {
    render(
      <TestWrapper>
        <AdminDashboardPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Manage users and view system statistics/i)).toBeInTheDocument();
    });
  });

  it('handles error when fetching users fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <AdminDashboardPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Network error|Failed to load users/i)).toBeInTheDocument();
    });
  });
});
