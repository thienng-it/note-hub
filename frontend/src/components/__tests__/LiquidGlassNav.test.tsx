import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { LiquidGlassNav } from '../LiquidGlassNav';

// Mock useAuth
const mockUser = { id: 1, username: 'testuser', is_admin: true };
vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      isAuthenticated: true,
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

describe('LiquidGlassNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation with all items for admin user', () => {
    render(
      <TestWrapper>
        <LiquidGlassNav />
      </TestWrapper>,
    );

    // Check for main navigation items
    expect(screen.getByLabelText(/all notes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/favorites/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tasks/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new note/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/chat/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/admin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/profile/i)).toBeInTheDocument();
  });

  it('matches snapshot - default state', () => {
    const { container } = render(
      <TestWrapper>
        <LiquidGlassNav />
      </TestWrapper>,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot - with all navigation items', () => {
    const { container } = render(
      <TestWrapper>
        <LiquidGlassNav />
      </TestWrapper>,
    );

    const navElement = container.querySelector('.liquid-glass-nav');
    expect(navElement).toMatchSnapshot();
  });
});
