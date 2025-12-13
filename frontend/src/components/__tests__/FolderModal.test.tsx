import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Folder } from '../../types';
import { FolderModal } from '../FolderModal';

const mockFolder: Folder = {
  id: 1,
  name: 'Work',
  parent_id: null,
  icon: 'briefcase',
  color: '#3B82F6',
  position: 0,
  is_expanded: true,
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('FolderModal', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create modal correctly', async () => {
    render(
      <TestWrapper>
        <FolderModal
          folder={null}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/new folder/i)).toBeInTheDocument();
    });
  });

  it('renders edit modal correctly', async () => {
    render(
      <TestWrapper>
        <FolderModal
          folder={mockFolder}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Work')).toBeInTheDocument();
    });
  });

  it('matches snapshot - create mode', async () => {
    const { container } = render(
      <TestWrapper>
        <FolderModal
          folder={null}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/new folder/i)).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot - edit mode', async () => {
    const { container } = render(
      <TestWrapper>
        <FolderModal
          folder={mockFolder}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Work')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchSnapshot();
  });

  it('displays all icon options', async () => {
    render(
      <TestWrapper>
        <FolderModal
          folder={null}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('📁')).toBeInTheDocument();
      expect(screen.getByText('💼')).toBeInTheDocument();
      expect(screen.getByText('🏠')).toBeInTheDocument();
      expect(screen.getByText('📦')).toBeInTheDocument();
    });
  });

  it('displays all color options', async () => {
    const { container } = render(
      <TestWrapper>
        <FolderModal
          folder={null}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      const colorButtons = container.querySelectorAll('button[style*="background-color"]');
      expect(colorButtons.length).toBeGreaterThanOrEqual(8);
    });
  });
});
