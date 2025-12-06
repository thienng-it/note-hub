import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from '../api/client';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { Disable2FAPage } from './Disable2FAPage';

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

// Mock useAuth
const mockRefreshUser = vi.fn();
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 1, username: 'testuser', has_2fa: true },
      isAuthenticated: true,
      refreshUser: mockRefreshUser,
    }),
  };
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('Disable2FAPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders disable 2FA page correctly', () => {
    render(
      <TestWrapper>
        <Disable2FAPage />
      </TestWrapper>,
    );

    expect(screen.getByText('Disable Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByText(/Confirm to disable two-factor authentication/i)).toBeInTheDocument();
    expect(screen.getByText(/No OTP Required/i)).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(
      <TestWrapper>
        <Disable2FAPage />
      </TestWrapper>,
    );

    expect(container).toMatchSnapshot();
  });

  it('shows confirmation dialog when disable button clicked', async () => {
    render(
      <TestWrapper>
        <Disable2FAPage />
      </TestWrapper>,
    );

    const disableButton = screen.getByRole('button', { name: /disable 2fa/i });
    fireEvent.click(disableButton);

    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
    });
  });

  it('successfully disables 2FA', async () => {
    (apiClient.apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

    render(
      <TestWrapper>
        <Disable2FAPage />
      </TestWrapper>,
    );

    // Click disable button
    const disableButton = screen.getByRole('button', { name: /disable 2fa/i });
    fireEvent.click(disableButton);

    // Confirm
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /yes, disable 2fa/i });
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(apiClient.apiClient.post).toHaveBeenCalledWith('/api/v1/auth/2fa/disable');
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/profile', {
        state: { message: 'Two-factor authentication disabled' },
      });
    });
  });

  it('handles error when disabling 2FA fails', async () => {
    (apiClient.apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error'),
    );

    render(
      <TestWrapper>
        <Disable2FAPage />
      </TestWrapper>,
    );

    // Click disable button
    const disableButton = screen.getByRole('button', { name: /disable 2fa/i });
    fireEvent.click(disableButton);

    // Confirm
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /yes, disable 2fa/i });
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('cancels disable action', async () => {
    render(
      <TestWrapper>
        <Disable2FAPage />
      </TestWrapper>,
    );

    // Click disable button
    const disableButton = screen.getByRole('button', { name: /disable 2fa/i });
    fireEvent.click(disableButton);

    // Cancel
    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Are you sure/i)).not.toBeInTheDocument();
    });
  });

  it('has cancel link that goes to profile', () => {
    render(
      <TestWrapper>
        <Disable2FAPage />
      </TestWrapper>,
    );

    const cancelLink = screen.getByText(/cancel/i);
    expect(cancelLink).toBeInTheDocument();
    expect(cancelLink.closest('a')).toHaveAttribute('href', '/profile');
  });
});
