import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { LiquidGlassNav } from '../LiquidGlassNav';

// Mock useAuth
const mockUser = { id: 1, username: 'testuser', is_admin: true };
const mockLogout = vi.fn();
vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      isAuthenticated: true,
      logout: mockLogout,
    }),
  };
});

// Mock useTheme
const mockToggleTheme = vi.fn();
vi.mock('../../context/ThemeContext', async () => {
  const actual = await vi.importActual('../../context/ThemeContext');
  return {
    ...actual,
    useTheme: () => ({
      theme: 'light',
      toggleTheme: mockToggleTheme,
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
    // Use fake timers to control the auto-minimize behavior
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders navigation with all items for admin user', () => {
    const { container } = render(
      <TestWrapper>
        <LiquidGlassNav />
      </TestWrapper>,
    );

    // Hover over the minimized button to expand the nav
    const minimizedButton = container.querySelector('.liquid-glass-nav-item.minimized');
    if (minimizedButton) {
      fireEvent.pointerEnter(minimizedButton, { pointerType: 'mouse' });
    }

    // Check for main navigation items (now includes archived and shared)
    expect(screen.getByText(/all notes/i)).toBeInTheDocument();
    expect(screen.getByText(/favorites/i)).toBeInTheDocument();
    expect(screen.getByText(/archived/i)).toBeInTheDocument();
    expect(screen.getByText(/shared with me/i)).toBeInTheDocument();
    expect(screen.getByText(/tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/new note/i)).toBeInTheDocument();
    expect(screen.getByText(/chat/i)).toBeInTheDocument();
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
    expect(screen.getByText(/profile/i)).toBeInTheDocument();

    // Check for theme toggle and logout buttons
    expect(screen.getByText(/dark mode/i)).toBeInTheDocument();
    expect(screen.getByText(/logout/i)).toBeInTheDocument();
  });

  it('matches snapshot - default state', () => {
    const { container } = render(
      <TestWrapper>
        <LiquidGlassNav />
      </TestWrapper>,
    );

    // Hover over the minimized button to expand the nav
    const minimizedButton = container.querySelector('.liquid-glass-nav-item.minimized');
    if (minimizedButton) {
      fireEvent.pointerEnter(minimizedButton, { pointerType: 'mouse' });
    }

    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot - with all navigation items', () => {
    const { container } = render(
      <TestWrapper>
        <LiquidGlassNav />
      </TestWrapper>,
    );

    // Hover over the minimized button to expand the nav
    const minimizedButton = container.querySelector('.liquid-glass-nav-item.minimized');
    if (minimizedButton) {
      fireEvent.pointerEnter(minimizedButton, { pointerType: 'mouse' });
    }

    const navElement = container.querySelector('.liquid-glass-nav');
    expect(navElement).toMatchSnapshot();
  });
});
