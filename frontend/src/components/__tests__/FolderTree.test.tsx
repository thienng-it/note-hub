import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Folder } from '../../types';
import { FolderTree } from '../FolderTree';

const mockFolders: Folder[] = [
  {
    id: 1,
    name: 'Work',
    parent_id: null,
    icon: 'briefcase',
    color: '#3B82F6',
    position: 0,
    is_expanded: true,
    note_count: 5,
    task_count: 3,
    children: [
      {
        id: 2,
        name: 'Project A',
        parent_id: 1,
        icon: 'folder',
        color: '#10B981',
        position: 0,
        is_expanded: false,
        note_count: 3,
        task_count: 2,
        children: [],
      },
    ],
  },
  {
    id: 3,
    name: 'Personal',
    parent_id: null,
    icon: 'home',
    color: '#F59E0B',
    position: 1,
    is_expanded: true,
    note_count: 2,
    task_count: 0,
    children: [],
  },
];

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('FolderTree', () => {
  const mockHandlers = {
    onSelectFolder: vi.fn(),
    onCreateFolder: vi.fn(),
    onEditFolder: vi.fn(),
    onDeleteFolder: vi.fn(),
    onMoveFolder: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders folder tree correctly', async () => {
    render(
      <TestWrapper>
        <FolderTree
          folders={mockFolders}
          selectedFolderId={null}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Project A')).toBeInTheDocument();
    });
  });

  it('renders all notes option', async () => {
    render(
      <TestWrapper>
        <FolderTree
          folders={mockFolders}
          selectedFolderId={null}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/all notes/i)).toBeInTheDocument();
    });
  });

  it('matches snapshot - default state', async () => {
    const { container } = render(
      <TestWrapper>
        <FolderTree
          folders={mockFolders}
          selectedFolderId={null}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot - with selected folder', async () => {
    const { container } = render(
      <TestWrapper>
        <FolderTree
          folders={mockFolders}
          selectedFolderId={1}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot - empty folders', async () => {
    const { container } = render(
      <TestWrapper>
        <FolderTree
          folders={[]}
          selectedFolderId={null}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/no folders yet/i)).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchSnapshot();
  });
});
