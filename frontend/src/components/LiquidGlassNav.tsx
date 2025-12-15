import { useState } from 'react';
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
  const [isDockExpanded, setIsDockExpanded] = useState(false);

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

  const filteredNavItems = navItems.filter((item) => !(item.adminOnly && !user?.is_admin));

  const isActive = (item: NavItem) => {
    if (item.view) {
      return location.pathname === item.path.split('?')[0] && view === item.view;
    }
    return location.pathname === item.path && !view;
  };

  const activeItem = filteredNavItems.find(isActive) || filteredNavItems[0];

  const getIconScale = (index: number) => {
    if (hoveredIndex === null) return 1;
    const d = Math.abs(index - hoveredIndex);
    if (d === 0) return 1.3;
    if (d === 1) return 1.2;
    if (d === 2) return 1.1;
    return 1;
  };

  const getIconTranslateY = (index: number) => {
    if (hoveredIndex === null) return 0;
    const d = Math.abs(index - hoveredIndex);
    if (d === 0) return -12;
    if (d === 1) return -6;
    if (d === 2) return -3;
    return 0;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* ───────── Backdrop for touch ───────── */}
      {isDockExpanded && (
        <div
          className="liquid-glass-dock-backdrop"
          onClick={() => {
            setIsDockExpanded(false);
            setHoveredIndex(null);
          }}
        />
      )}

      <nav
        className={`liquid-glass-nav ${isDockExpanded ? 'dock-expanded' : 'dock-minimized'}`}
        aria-label="Mac-style navigation dock"
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') {
            setIsDockExpanded(false);
            setHoveredIndex(null);
          }
        }}
      >
        {/* ───────── Minimized ───────── */}
        {!isDockExpanded && (
          <div className="liquid-glass-nav-minimized-container">
            <button
              type="button"
              className="liquid-glass-nav-item active minimized"
              aria-label={activeItem.label}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setIsDockExpanded(true)}
              onClick={() => setIsDockExpanded(true)} // 📱 TAP SUPPORT
            >
              <div
                className="liquid-glass-nav-icon-wrapper"
                style={{
                  background: `linear-gradient(135deg, ${activeItem.color}dd, ${activeItem.color}bb)`,
                  borderColor: `${activeItem.color}80`,
                }}
              >
                <i className={`fas ${activeItem.icon} liquid-glass-nav-icon`} />
              </div>
            </button>
          </div>
        )}

        {/* ───────── Expanded ───────── */}
        {isDockExpanded && (
          <div className="liquid-glass-nav-container">
            {filteredNavItems.map((item, index) => (
              <Link
                key={item.id}
                to={item.path}
                className={`liquid-glass-nav-item ${isActive(item) ? 'active' : ''}`}
                onPointerEnter={() => setHoveredIndex(index)}
                onClick={() => setIsDockExpanded(false)} // 📱 collapse after tap
                style={{
                  transform: `scale(${getIconScale(index)}) translateY(${getIconTranslateY(index)}px)`,
                }}
              >
                <div
                  className="liquid-glass-nav-icon-wrapper"
                  style={{
                    borderColor: item.color ? `${item.color}40` : undefined,
                  }}
                >
                  <i className={`fas ${item.icon} liquid-glass-nav-icon`} />
                </div>
                <span className="liquid-glass-nav-label">{item.label}</span>
              </Link>
            ))}

            <button
              className="liquid-glass-nav-item"
              onClick={toggleTheme}
              onPointerEnter={() => setHoveredIndex(filteredNavItems.length)}
            >
              <div className="liquid-glass-nav-icon-wrapper">
                <i
                  className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'} liquid-glass-nav-icon`}
                />
              </div>
              <span className="liquid-glass-nav-label">
                {theme === 'dark' ? t('profile.lightMode') : t('profile.darkMode')}
              </span>
            </button>

            <button
              className="liquid-glass-nav-item"
              onClick={handleLogout}
              onPointerEnter={() => setHoveredIndex(filteredNavItems.length + 1)}
            >
              <div className="liquid-glass-nav-icon-wrapper">
                <i className="fas fa-sign-out-alt liquid-glass-nav-icon" />
              </div>
              <span className="liquid-glass-nav-label">{t('auth.logout')}</span>
            </button>
          </div>
        )}
      </nav>
    </>
  );
}
