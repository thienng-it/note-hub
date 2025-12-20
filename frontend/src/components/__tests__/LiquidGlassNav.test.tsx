import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { LiquidGlassNav } from '../LiquidGlassNav';

// ─────────────────────────────
// Mocks
// ─────────────────────────────
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper: expand dock the correct way (new behavior)
   */
  const expandDock = () => {
    const minimizedButton = screen.getByRole('button', { name: /all notes/i });
    fireEvent.pointerEnter(minimizedButton, { pointerType: 'mouse' });
  };

  it('renders minimized dock by default', () => {
    render(
      <TestWrapper>
        <LiquidGlassNav />
      </TestWrapper>,
    );

    // Only active item should be visible
    expect(screen.getByRole('button', { name: /all notes/i })).toBeInTheDocument();
    expect(screen.queryByText(/favorites/i)).not.toBeInTheDocument();
  });

  it('expands and renders all navigation items for admin user', () => {
    render(
      <TestWrapper>
        <LiquidGlassNav />
      </TestWrapper>,
    );

    expandDock();

    expect(screen.getByText(/favorites/i)).toBeInTheDocument();
    expect(screen.getByText(/archived/i)).toBeInTheDocument();
    expect(screen.getByText(/shared with me/i)).toBeInTheDocument();
    expect(screen.getByText(/tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/new note/i)).toBeInTheDocument();
    expect(screen.getByText(/chat/i)).toBeInTheDocument();
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
    expect(screen.getByText(/profile/i)).toBeInTheDocument();

    expect(screen.getByText(/logout/i)).toBeInTheDocument();
  });

  it('matches snapshot – minimized state', () => {
    const { container } = render(
      <TestWrapper>
        <LiquidGlassNav />
      </TestWrapper>,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot – expanded state', () => {
    const { container } = render(
      <TestWrapper>
        <LiquidGlassNav />
      </TestWrapper>,
    );

    expandDock();

    expect(container.firstChild).toMatchSnapshot();
  });

  it('collapses dock when clicking backdrop (touch behavior)', () => {
    render(
      <TestWrapper>
        <LiquidGlassNav />
      </TestWrapper>,
    );

    expandDock();

    const backdrop = document.querySelector('.liquid-glass-dock-backdrop');
    expect(backdrop).toBeInTheDocument();

    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(screen.queryByText(/favorites/i)).not.toBeInTheDocument();
  });
});
