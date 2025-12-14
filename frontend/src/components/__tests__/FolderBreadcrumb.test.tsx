import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Folder } from '../../types';
import { FolderBreadcrumb } from '../FolderBreadcrumb';

// Mock the API
vi.mock('../../api/client', () => ({
  foldersApi: {
    getPath: vi.fn(),
  },
}));

const mockPath: Folder[] = [
  {
    id: 1,
    name: 'Work',
    parent_id: null,
    icon: 'briefcase',
    color: '#3B82F6',
    position: 0,
    is_expanded: true,
  },
  {
    id: 2,
    name: 'Project A',
    parent_id: 1,
    icon: 'folder',
    color: '#10B981',
    position: 0,
    is_expanded: true,
  },
];

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('FolderBreadcrumb', () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when folderId is null', () => {
    const { container } = render(
      <TestWrapper>
        <FolderBreadcrumb folderId={null} onNavigate={mockOnNavigate} />
      </TestWrapper>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders breadcrumb path when loaded', async () => {
    const { foldersApi } = await import('../../api/client');
    vi.mocked(foldersApi.getPath).mockResolvedValue({ path: mockPath });

    render(
      <TestWrapper>
        <FolderBreadcrumb folderId={2} onNavigate={mockOnNavigate} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Project A')).toBeInTheDocument();
      expect(screen.getByText('All Notes')).toBeInTheDocument();
    });
  });

  it('matches snapshot - with path', async () => {
    const { foldersApi } = await import('../../api/client');
    vi.mocked(foldersApi.getPath).mockResolvedValue({ path: mockPath });

    const { container } = render(
      <TestWrapper>
        <FolderBreadcrumb folderId={2} onNavigate={mockOnNavigate} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows loading state', async () => {
    const { foldersApi } = await import('../../api/client');
    vi.mocked(foldersApi.getPath).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ path: mockPath }), 1000)),
    );

    render(
      <TestWrapper>
        <FolderBreadcrumb folderId={2} onNavigate={mockOnNavigate} />
      </TestWrapper>,
    );

    expect(screen.getByRole('img', { hidden: true })).toHaveClass('fa-spinner');
  });
});
