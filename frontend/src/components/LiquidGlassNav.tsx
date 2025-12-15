import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface NavItem {
  id: string;
  path: string;
  icon: string;
  label: string;
  view?: string;
  adminOnly?: boolean;
  color?: string;
}

export function LiquidGlassNav() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isDockExpanded, setIsDockExpanded] = useState(true);
  const [isHoveringDock, setIsHoveringDock] = useState(false);

  const view = new URLSearchParams(location.search).get('view');

  const navItems: NavItem[] = [
    { id: 'home', path: '/', icon: 'fa-home', label: t('notes.allNotes'), color: '#007aff' },
    {
      id: 'favorites',
      path: '/?view=favorites',
      icon: 'fa-heart',
      label: t('notes.favorites'),
      view: 'favorites',
      color: '#ff2d55',
    },
    {
      id: 'archived',
      path: '/?view=archived',
      icon: 'fa-archive',
      label: t('notes.archived'),
      view: 'archived',
      color: '#8e8e93',
    },
    {
      id: 'shared',
      path: '/?view=shared',
      icon: 'fa-share-alt',
      label: t('notes.sharedWithMe'),
      view: 'shared',
      color: '#5856d6',
    },
    { id: 'tasks', path: '/tasks', icon: 'fa-tasks', label: t('tasks.title'), color: '#34c759' },
    {
      id: 'new-note',
      path: '/notes/new',
      icon: 'fa-plus',
      label: t('notes.newNote'),
      color: '#ff9500',
    },
    { id: 'chat', path: '/chat', icon: 'fa-comments', label: t('chat.title'), color: '#af52de' },
    {
      id: 'admin',
      path: '/admin',
      icon: 'fa-users-cog',
      label: t('admin.title'),
      adminOnly: true,
      color: '#ff3b30',
    },
    {
      id: 'profile',
      path: '/profile',
      icon: 'fa-user-circle',
      label: t('profile.title'),
      color: '#30b0c7',
    },
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
    if (distance === 0) return 1.3; // Hovered icon
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

  // Auto-minimize functionality - minimize dock after inactivity, expand on hover
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;

    const handleMouseMove = () => {
      if (!isHoveringDock) {
        setIsDockExpanded(true);
      }

      // Clear existing timeout
      if (timeout) {
        clearTimeout(timeout);
      }

      // Set new timeout to minimize dock after 3 seconds of inactivity
      timeout = setTimeout(() => {
        if (!isHoveringDock) {
          setIsDockExpanded(false);
        }
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleMouseMove);
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isHoveringDock]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Color constants for additional buttons
  const THEME_TOGGLE_COLOR = '#ffcc00';
  const LOGOUT_COLOR = '#ff453a';

  // Find the currently active item for minimized state
  const activeItem = filteredNavItems.find((item) => isActive(item)) || filteredNavItems[0];

  return (
    <nav
      className={`liquid-glass-nav ${isDockExpanded ? 'dock-expanded' : 'dock-minimized'}`}
      aria-label="Mac-style navigation dock"
      onMouseEnter={() => {
        setIsHoveringDock(true);
        setIsDockExpanded(true);
      }}
      onMouseLeave={() => {
        setIsHoveringDock(false);
        setHoveredIndex(null);
      }}
    >
      {/* Minimized State - Show only active item */}
      {!isDockExpanded && (
        <div className="liquid-glass-nav-minimized-container">
          <Link
            to={activeItem.path}
            className="liquid-glass-nav-item active minimized"
            aria-current="page"
            aria-label={activeItem.label}
          >
            <div
              className="liquid-glass-nav-icon-wrapper"
              style={
                activeItem.color
                  ? {
                      background: `linear-gradient(135deg, ${activeItem.color}dd, ${activeItem.color}bb)`,
                      borderColor: `${activeItem.color}80`,
                    }
                  : undefined
              }
            >
              <i className={`fas ${activeItem.icon} liquid-glass-nav-icon`} aria-hidden="true"></i>
            </div>
          </Link>
        </div>
      )}

      {/* Expanded State - Show all items */}
      {isDockExpanded && (
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
              <div
                className="liquid-glass-nav-icon-wrapper"
                style={
                  item.color && !isActive(item)
                    ? {
                        borderColor: `${item.color}40`,
                        boxShadow: `0 4px 16px ${item.color}20, inset 0 1px 0 rgba(255, 255, 255, 0.5)`,
                      }
                    : item.color && isActive(item)
                      ? {
                          background: `linear-gradient(135deg, ${item.color}dd, ${item.color}bb)`,
                          borderColor: `${item.color}80`,
                          boxShadow: `0 8px 24px ${item.color}60, inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
                        }
                      : undefined
                }
              >
                <i className={`fas ${item.icon} liquid-glass-nav-icon`} aria-hidden="true"></i>
              </div>
              <span className="liquid-glass-nav-label">{item.label}</span>
            </Link>
          ))}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="liquid-glass-nav-item"
            onMouseEnter={() => setHoveredIndex(filteredNavItems.length)}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{
              transform: `scale(${getIconScale(filteredNavItems.length)}) translateY(${getIconTranslateY(filteredNavItems.length)}px)`,
            }}
          >
            <div
              className="liquid-glass-nav-icon-wrapper"
              style={{
                borderColor: `${THEME_TOGGLE_COLOR}40`,
                boxShadow: `0 4px 16px ${THEME_TOGGLE_COLOR}20, inset 0 1px 0 rgba(255, 255, 255, 0.5)`,
              }}
            >
              <i
                className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'} liquid-glass-nav-icon`}
                aria-hidden="true"
              ></i>
            </div>
            <span className="liquid-glass-nav-label">
              {theme === 'dark' ? t('profile.lightMode') : t('profile.darkMode')}
            </span>
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="liquid-glass-nav-item"
            onMouseEnter={() => setHoveredIndex(filteredNavItems.length + 1)}
            aria-label="Sign out"
            style={{
              transform: `scale(${getIconScale(filteredNavItems.length + 1)}) translateY(${getIconTranslateY(filteredNavItems.length + 1)}px)`,
            }}
          >
            <div
              className="liquid-glass-nav-icon-wrapper"
              style={{
                borderColor: `${LOGOUT_COLOR}40`,
                boxShadow: `0 4px 16px ${LOGOUT_COLOR}20, inset 0 1px 0 rgba(255, 255, 255, 0.5)`,
              }}
            >
              <i className="fas fa-sign-out-alt liquid-glass-nav-icon" aria-hidden="true"></i>
            </div>
            <span className="liquid-glass-nav-label">{t('auth.logout')}</span>
          </button>
        </div>
      )}
    </nav>
  );
}
