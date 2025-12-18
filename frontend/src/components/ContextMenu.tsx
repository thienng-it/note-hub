import { type ReactNode, useEffect, useRef, useState } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
  children?: ReactNode;
  position?: 'auto' | 'top' | 'bottom' | 'left' | 'right';
}

export function ContextMenu({
  items,
  isOpen,
  onClose,
  triggerRef,
  children,
  position = 'auto',
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, right: 'auto' });
  const [actualPosition, setActualPosition] = useState<'top' | 'bottom'>('bottom');

  useEffect(() => {
    if (!isOpen || !menuRef.current || !triggerRef?.current) return;

    const trigger = triggerRef.current;
    const menu = menuRef.current;
    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let top = 0;
    let left = 0;
    let right: string | number = 'auto';
    let computedPosition: 'top' | 'bottom' = 'bottom';

    // Determine vertical position
    if (position === 'auto' || position === 'bottom') {
      // Try positioning below first
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      if (spaceBelow >= menuRect.height || spaceBelow >= spaceAbove) {
        // Position below
        top = triggerRect.bottom + 4;
        computedPosition = 'bottom';
      } else {
        // Position above
        top = triggerRect.top - menuRect.height - 4;
        computedPosition = 'top';
      }
    } else if (position === 'top') {
      top = triggerRect.top - menuRect.height - 4;
      computedPosition = 'top';
    }

    // Determine horizontal position
    const spaceRight = viewportWidth - triggerRect.right;
    if (spaceRight >= menuRect.width) {
      // Align to the right edge of trigger
      left = triggerRect.right - menuRect.width;
    } else {
      // Align to the left edge of trigger
      left = triggerRect.left;
    }

    // Ensure menu doesn't overflow left
    if (left < 8) {
      left = 8;
    }

    // Ensure menu doesn't overflow right
    if (left + menuRect.width > viewportWidth - 8) {
      right = 8;
      left = 0;
    }

    setMenuPosition({ top, left, right });
    setActualPosition(computedPosition);
  }, [isOpen, triggerRef, position]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside as EventListener);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 z-40 bg-transparent md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu */}
      <div
        ref={menuRef}
        className={`context-menu ${actualPosition === 'top' ? 'context-menu-top' : 'context-menu-bottom'}`}
        style={{
          position: 'fixed',
          top: menuPosition.top,
          left: menuPosition.left !== 0 ? menuPosition.left : undefined,
          right: menuPosition.right !== 'auto' ? menuPosition.right : undefined,
          zIndex: 50,
        }}
        role="menu"
        aria-orientation="vertical"
      >
        {children}
        {items.map((item) => (
          <div key={item.id}>
            {item.divider && <div className="context-menu-divider" aria-hidden="true" />}
            <button
              type="button"
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className={`context-menu-item ${item.variant === 'danger' ? 'context-menu-item-danger' : ''}`}
              role="menuitem"
            >
              {item.icon && (
                <i className={`${item.icon} context-menu-item-icon`} aria-hidden="true" />
              )}
              <span>{item.label}</span>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
