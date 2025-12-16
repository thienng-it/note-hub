import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Folder } from '../../types';
import { FolderSidebar } from '../FolderSidebar';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockFolders: Folder[] = [
  {
    id: 1,
    name: 'Work',
    icon: 'briefcase',
    color: '#3b82f6',
    parent_id: null,
    user_id: 1,
    note_count: 5,
    task_count: 3,
    is_expanded: true,
    children: [
      {
        id: 2,
        name: 'Projects',
        icon: 'folder',
        color: '#8b5cf6',
        parent_id: 1,
        user_id: 1,
        note_count: 2,
        task_count: 1,
        is_expanded: false,
        children: [],
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      },
    ],
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
  },
  {
    id: 3,
    name: 'Personal',
    icon: 'home',
    color: '#10b981',
    parent_id: null,
    user_id: 1,
    note_count: 8,
    task_count: 4,
    is_expanded: true,
    children: [],
    created_at: '2024-01-12T10:00:00Z',
    updated_at: '2024-01-12T10:00:00Z',
  },
];

const mockHandlers = {
  onSelectFolder: vi.fn(),
  onCreateFolder: vi.fn(),
  onEditFolder: vi.fn(),
  onDeleteFolder: vi.fn(),
  onToggle: vi.fn(),
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('FolderSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders closed state correctly', () => {
    render(
      <TestWrapper>
        <FolderSidebar
          folders={mockFolders}
          selectedFolder={null}
          onSelectFolder={mockHandlers.onSelectFolder}
          onCreateFolder={mockHandlers.onCreateFolder}
          onEditFolder={mockHandlers.onEditFolder}
          onDeleteFolder={mockHandlers.onDeleteFolder}
          isOpen={false}
          onToggle={mockHandlers.onToggle}
        />
      </TestWrapper>,
    );

    // Mobile drawer should not have 'open' class
    const mobileDrawer = document.querySelector('.folder-sidebar-mobile');
    expect(mobileDrawer).toBeInTheDocument();
    expect(mobileDrawer).not.toHaveClass('open');
  });

  it('renders open state correctly', async () => {
    render(
      <TestWrapper>
        <FolderSidebar
          folders={mockFolders}
          selectedFolder={null}
          onSelectFolder={mockHandlers.onSelectFolder}
          onCreateFolder={mockHandlers.onCreateFolder}
          onEditFolder={mockHandlers.onEditFolder}
          onDeleteFolder={mockHandlers.onDeleteFolder}
          isOpen={true}
          onToggle={mockHandlers.onToggle}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      const mobileDrawer = document.querySelector('.folder-sidebar-mobile');
      expect(mobileDrawer).toHaveClass('open');
    });
  });

  it('renders folders correctly', async () => {
    render(
      <TestWrapper>
        <FolderSidebar
          folders={mockFolders}
          selectedFolder={null}
          onSelectFolder={mockHandlers.onSelectFolder}
          onCreateFolder={mockHandlers.onCreateFolder}
          onEditFolder={mockHandlers.onEditFolder}
          onDeleteFolder={mockHandlers.onDeleteFolder}
          isOpen={true}
          onToggle={mockHandlers.onToggle}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Work')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Personal')[0]).toBeInTheDocument();
    });
  });

  it('renders with selected folder', async () => {
    const selectedFolder = mockFolders[0];
    render(
      <TestWrapper>
        <FolderSidebar
          folders={mockFolders}
          selectedFolder={selectedFolder}
          onSelectFolder={mockHandlers.onSelectFolder}
          onCreateFolder={mockHandlers.onCreateFolder}
          onEditFolder={mockHandlers.onEditFolder}
          onDeleteFolder={mockHandlers.onDeleteFolder}
          isOpen={true}
          onToggle={mockHandlers.onToggle}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Work')[0]).toBeInTheDocument();
    });
  });

  describe('Snapshots', () => {
    it('matches snapshot - closed state', () => {
      const { container } = render(
        <TestWrapper>
          <FolderSidebar
            folders={mockFolders}
            selectedFolder={null}
            onSelectFolder={mockHandlers.onSelectFolder}
            onCreateFolder={mockHandlers.onCreateFolder}
            onEditFolder={mockHandlers.onEditFolder}
            onDeleteFolder={mockHandlers.onDeleteFolder}
            isOpen={false}
            onToggle={mockHandlers.onToggle}
          />
        </TestWrapper>,
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot - open state', () => {
      const { container } = render(
        <TestWrapper>
          <FolderSidebar
            folders={mockFolders}
            selectedFolder={null}
            onSelectFolder={mockHandlers.onSelectFolder}
            onCreateFolder={mockHandlers.onCreateFolder}
            onEditFolder={mockHandlers.onEditFolder}
            onDeleteFolder={mockHandlers.onDeleteFolder}
            isOpen={true}
            onToggle={mockHandlers.onToggle}
          />
        </TestWrapper>,
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot - with selected folder', () => {
      const { container } = render(
        <TestWrapper>
          <FolderSidebar
            folders={mockFolders}
            selectedFolder={mockFolders[0]}
            onSelectFolder={mockHandlers.onSelectFolder}
            onCreateFolder={mockHandlers.onCreateFolder}
            onEditFolder={mockHandlers.onEditFolder}
            onDeleteFolder={mockHandlers.onDeleteFolder}
            isOpen={true}
            onToggle={mockHandlers.onToggle}
          />
        </TestWrapper>,
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot - empty folders', () => {
      const { container } = render(
        <TestWrapper>
          <FolderSidebar
            folders={[]}
            selectedFolder={null}
            onSelectFolder={mockHandlers.onSelectFolder}
            onCreateFolder={mockHandlers.onCreateFolder}
            onEditFolder={mockHandlers.onEditFolder}
            onDeleteFolder={mockHandlers.onDeleteFolder}
            isOpen={true}
            onToggle={mockHandlers.onToggle}
          />
        </TestWrapper>,
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
