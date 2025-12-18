import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextMenu, type ContextMenuItem } from '../ContextMenu';

// Test wrapper component
function TestContextMenu({
  isOpen,
  onClose,
  items,
}: {
  isOpen: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <button ref={triggerRef} type="button">
        Trigger
      </button>
      <ContextMenu
        items={items}
        isOpen={isOpen}
        onClose={onClose}
        triggerRef={triggerRef}
        position="auto"
      />
    </div>
  );
}

describe('ContextMenu', () => {
  const mockOnClose = vi.fn();
  const mockItemClick = vi.fn();

  const defaultItems: ContextMenuItem[] = [
    {
      id: 'edit',
      label: 'Edit',
      icon: 'fas fa-edit',
      onClick: mockItemClick,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'fas fa-trash',
      onClick: mockItemClick,
      variant: 'danger',
      divider: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <TestContextMenu isOpen={false} onClose={mockOnClose} items={defaultItems} />,
    );

    expect(container.querySelector('.context-menu')).not.toBeInTheDocument();
  });

  it('renders menu when open', async () => {
    render(<TestContextMenu isOpen={true} onClose={mockOnClose} items={defaultItems} />);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  it('renders all menu items', async () => {
    render(<TestContextMenu isOpen={true} onClose={mockOnClose} items={defaultItems} />);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('calls item onClick when clicked', async () => {
    render(<TestContextMenu isOpen={true} onClose={mockOnClose} items={defaultItems} />);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit'));

    expect(mockItemClick).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes menu on Escape key', async () => {
    render(<TestContextMenu isOpen={true} onClose={mockOnClose} items={defaultItems} />);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders divider when specified', async () => {
    render(<TestContextMenu isOpen={true} onClose={mockOnClose} items={defaultItems} />);

    await waitFor(() => {
      const divider = document.querySelector('.context-menu-divider');
      expect(divider).toBeInTheDocument();
    });
  });

  it('applies danger variant styles', async () => {
    render(<TestContextMenu isOpen={true} onClose={mockOnClose} items={defaultItems} />);

    await waitFor(() => {
      const deleteButton = screen.getByText('Delete').closest('button');
      expect(deleteButton).toHaveClass('context-menu-item-danger');
    });
  });

  it('renders icons when provided', async () => {
    render(<TestContextMenu isOpen={true} onClose={mockOnClose} items={defaultItems} />);

    await waitFor(() => {
      const icons = document.querySelectorAll('.context-menu-item-icon');
      expect(icons.length).toBe(2);
    });
  });

  it('matches snapshot - default state', async () => {
    const { container } = render(
      <TestContextMenu isOpen={true} onClose={mockOnClose} items={defaultItems} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    expect(container.querySelector('.context-menu')).toMatchSnapshot();
  });

  it('matches snapshot - with divider', async () => {
    const itemsWithDivider: ContextMenuItem[] = [
      {
        id: 'edit',
        label: 'Edit',
        icon: 'fas fa-edit',
        onClick: mockItemClick,
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: 'fas fa-trash',
        onClick: mockItemClick,
        variant: 'danger',
        divider: true,
      },
    ];

    const { container } = render(
      <TestContextMenu isOpen={true} onClose={mockOnClose} items={itemsWithDivider} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    expect(container.querySelector('.context-menu')).toMatchSnapshot();
  });

  it('matches snapshot - danger variant', async () => {
    const dangerItems: ContextMenuItem[] = [
      {
        id: 'delete',
        label: 'Delete All',
        icon: 'fas fa-trash-alt',
        onClick: mockItemClick,
        variant: 'danger',
      },
    ];

    const { container } = render(
      <TestContextMenu isOpen={true} onClose={mockOnClose} items={dangerItems} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    expect(container.querySelector('.context-menu')).toMatchSnapshot();
  });
});
