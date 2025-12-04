import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { GoogleCallbackPage } from './GoogleCallbackPage';
import * as apiClient from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  authApi: {
    validate: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
  getStoredToken: vi.fn(() => 'test-token'),
  getStoredUser: vi.fn(() => null),
  setStoredAuth: vi.fn(),
  clearStoredAuth: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const TestWrapper = ({ children, initialEntries = ['/auth/google/callback?code=test-code'] }: { children: React.ReactNode, initialEntries?: string[] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </MemoryRouter>
);

describe('GoogleCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders loading state initially', () => {
    render(
      <TestWrapper>
        <GoogleCallbackPage />
      </TestWrapper>
    );

    expect(screen.getByText(/signing you in/i)).toBeInTheDocument();
    expect(screen.getByText(/completing google authentication/i)).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(
      <TestWrapper>
        <GoogleCallbackPage />
      </TestWrapper>
    );

    expect(container).toMatchSnapshot();
  });

  it('successfully handles Google OAuth callback', async () => {
    const mockResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 1, username: 'testuser', email: 'test@example.com' },
    };

    (apiClient.apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    render(
      <TestWrapper>
        <GoogleCallbackPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(apiClient.apiClient.post).toHaveBeenCalledWith('/api/auth/google/callback', { code: 'test-code' });
    });

    await waitFor(() => {
      expect(localStorage.getItem('notehub_access_token')).toBe('test-access-token');
      expect(localStorage.getItem('notehub_refresh_token')).toBe('test-refresh-token');
      expect(localStorage.getItem('notehub_user')).toBe(JSON.stringify(mockResponse.data.user));
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('handles missing authorization code', async () => {
    render(
      <TestWrapper initialEntries={['/auth/google/callback']}>
        <GoogleCallbackPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/No authorization code received/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    }, { timeout: 4000 });
  });

  it('handles OAuth error parameter', async () => {
    render(
      <TestWrapper initialEntries={['/auth/google/callback?error=access_denied']}>
        <GoogleCallbackPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Google authentication was cancelled or failed/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    }, { timeout: 4000 });
  });

  it('handles API error during callback', async () => {
    (apiClient.apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <GoogleCallbackPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to complete Google sign-in/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    }, { timeout: 4000 });
  });

  it('displays appropriate error messages', async () => {
    (apiClient.apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid OAuth code'));

    render(
      <TestWrapper>
        <GoogleCallbackPage />
      </TestWrapper>
    );

    await waitFor(() => {
      const errorElement = screen.getByText(/Failed to complete Google sign-in/i);
      expect(errorElement).toBeInTheDocument();
      expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    });
  });

  it('stores tokens using correct localStorage keys', async () => {
    const mockResponse = {
        access_token: 'token123',
        refresh_token: 'refresh456',
        user: { id: 1, username: 'user1' },
    };

    (apiClient.apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    render(
      <TestWrapper>
        <GoogleCallbackPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(localStorage.getItem('notehub_access_token')).toBe('token123');
      expect(localStorage.getItem('notehub_refresh_token')).toBe('refresh456');
    });
  });
});
