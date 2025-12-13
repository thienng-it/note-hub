import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  id: string;
  path: string;
  icon: string;
  label: string;
  view?: string;
  adminOnly?: boolean;
}

export function LiquidGlassNav() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const view = new URLSearchParams(location.search).get('view');

  const navItems: NavItem[] = [
    { id: 'home', path: '/', icon: 'fa-home', label: t('notes.allNotes') },
    {
      id: 'favorites',
      path: '/?view=favorites',
      icon: 'fa-heart',
      label: t('notes.favorites'),
      view: 'favorites',
    },
    { id: 'tasks', path: '/tasks', icon: 'fa-tasks', label: t('tasks.title') },
    { id: 'new-note', path: '/notes/new', icon: 'fa-plus', label: t('notes.newNote') },
    { id: 'chat', path: '/chat', icon: 'fa-comments', label: t('chat.title') },
    {
      id: 'admin',
      path: '/admin',
      icon: 'fa-users-cog',
      label: t('admin.title'),
      adminOnly: true,
    },
    { id: 'profile', path: '/profile', icon: 'fa-user-circle', label: t('profile.title') },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && !user?.is_admin) return false;
    return true;
  });

  const isActive = (item: NavItem) => {
    if (item.view) {
      return location.pathname === item.path.split('?')[0] && view === item.view;
    }
    return location.pathname === item.path && !view;
  };

  // Calculate icon scale based on distance from hovered icon
  const getIconScale = (index: number) => {
    if (hoveredIndex === null) return 1;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 1.5; // Hovered icon
    if (distance === 1) return 1.25; // Adjacent icons
    if (distance === 2) return 1.1; // Second-level adjacent
    return 1; // Other icons
  };

  const getIconTranslateY = (index: number) => {
    if (hoveredIndex === null) return 0;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return -12; // Hovered icon lifts more
    if (distance === 1) return -6; // Adjacent icons lift slightly
    if (distance === 2) return -3; // Second-level adjacent lift barely
    return 0;
  };

  return (
    <nav
      className="liquid-glass-nav"
      aria-label="Mac-style navigation dock"
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <div className="liquid-glass-nav-container">
        {filteredNavItems.map((item, index) => (
          <Link
            key={item.id}
            to={item.path}
            className={`liquid-glass-nav-item ${isActive(item) ? 'active' : ''}`}
            onMouseEnter={() => setHoveredIndex(index)}
            aria-current={isActive(item) ? 'page' : undefined}
            aria-label={item.label}
            style={{
              transform: `scale(${getIconScale(index)}) translateY(${getIconTranslateY(index)}px)`,
            }}
          >
            <div className="liquid-glass-nav-icon-wrapper">
              <i className={`fas ${item.icon} liquid-glass-nav-icon`} aria-hidden="true"></i>
            </div>
            <span className="liquid-glass-nav-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
