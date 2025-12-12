import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AuditLogsPage } from './AuditLogsPage';

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

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

const mockAuditLogsResponse = {
  logs: [
    {
      id: 1,
      user_id: 1,
      username: 'testuser',
      entity_type: 'note',
      entity_id: 123,
      action: 'create',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      metadata: { title: 'Test Note' },
      created_at: '2024-12-12T10:00:00Z',
    },
    {
      id: 2,
      user_id: 2,
      username: 'user2',
      entity_type: 'task',
      entity_id: 456,
      action: 'update',
      ip_address: '192.168.1.2',
      user_agent: 'Chrome/120.0',
      metadata: { description: true },
      created_at: '2024-12-12T11:00:00Z',
    },
  ],
  pagination: {
    page: 1,
    per_page: 20,
    total_count: 2,
    total_pages: 1,
  },
};

const mockStatsResponse = {
  total_logs: 150,
  recent_activity_24h: 25,
  by_action: [
    { action: 'view', count: 80 },
    { action: 'create', count: 30 },
    { action: 'update', count: 25 },
    { action: 'delete', count: 15 },
  ],
  by_entity_type: [
    { entity_type: 'note', count: 100 },
    { entity_type: 'task', count: 50 },
  ],
  most_active_users: [
    { id: 1, username: 'testuser', action_count: 50 },
    { id: 2, username: 'user2', action_count: 30 },
  ],
  date_range: {
    start: null,
    end: null,
  },
};

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('notehub_access_token', 'test-token');

    // Default fetch mock - successful response
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url) => {
      if (url.includes('/api/v1/admin/audit-logs/stats')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockStatsResponse,
        });
      }
      if (url.includes('/api/v1/admin/audit-logs')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockAuditLogsResponse,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it('renders audit logs page correctly', async () => {
    render(
      <TestWrapper>
        <AuditLogsPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    });
  });

  it('matches snapshot - default state', async () => {
    const { container } = render(
      <TestWrapper>
        <AuditLogsPage />
      </TestWrapper>,
    );

    // Wait for loading to complete and data to render
    await waitFor(() => {
      expect(screen.queryByText('Loading audit logs...')).not.toBeInTheDocument();
    });

    // Wait for logs to be displayed
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    expect(container).toMatchSnapshot();
  });

  it('displays audit logs title and description', async () => {
    render(
      <TestWrapper>
        <AuditLogsPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
      expect(
        screen.getByText('View and analyze system activity logs for compliance and security monitoring'),
      ).toBeInTheDocument();
    });
  });

  it('displays statistics cards', async () => {
    render(
      <TestWrapper>
        <AuditLogsPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Total Logs')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  it('displays export buttons', async () => {
    render(
      <TestWrapper>
        <AuditLogsPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
    });
  });

  it('displays audit log entries in table', async () => {
    render(
      <TestWrapper>
        <AuditLogsPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
      expect(screen.getByText('note')).toBeInTheDocument();
      expect(screen.getByText('task')).toBeInTheDocument();
    });
  });
});
