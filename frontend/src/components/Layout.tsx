import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { versionApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LanguageSelector } from './LanguageSelector';

// Version is injected at build time by Vite
declare const __APP_VERSION__: string;

export function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're on tablet (between 768px and 1024px)
  const isTablet = () => window.innerWidth >= 768 && window.innerWidth < 1024;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Auto-collapse on tablets, otherwise use saved preference
    if (isTablet()) return true;
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [backendVersion, setBackendVersion] = useState<string | null>(null);

  const view = new URLSearchParams(location.search).get('view');

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Fetch backend version on mount
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const version = await versionApi.get();
        setBackendVersion(version.version);
      } catch (error) {
        // Silently fail - version display is non-critical
        console.debug('Could not fetch backend version:', error);
      }
    };
    fetchVersion();
  }, []);

  // Handle resize to adjust sidebar on tablet
  useEffect(() => {
    const handleResize = () => {
      if (isTablet() && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarCollapsed, isTablet]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setShowBackToTop(target.scrollTop > 300);
  };

  const scrollToTop = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string, viewType?: string) => {
    if (viewType) {
      return location.pathname === path && view === viewType;
    }
    return location.pathname === path && !view;
  };

  const linkClass = (active: boolean, collapsed: boolean = false) =>
    `flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 ${
      active
        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium'
        : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
    }`;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Desktop & Tablet Sidebar */}
      <aside
        id="sidebar"
        className={`sidebar ${sidebarCollapsed ? 'w-20' : 'w-72 md:w-64 lg:w-72'} flex-shrink-0 hidden md:flex flex-col transition-all duration-300 border-r border-[var(--border-color)]`}
        aria-label="Main navigation"
      >
        <div className="p-4 border-b border-[var(--border-color)]">
          {/* Logo Row */}
          <div
            className={`flex ${sidebarCollapsed ? 'flex-col items-center gap-2' : 'items-center justify-between'}`}
          >
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-feather-alt text-white text-lg" aria-hidden="true"></i>
              </div>
              {!sidebarCollapsed && (
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  NoteHub
                </span>
              )}
            </Link>
            {/* Collapse button - always visible */}
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
                aria-label="Collapse sidebar"
              >
                <i className="fas fa-chevron-left text-sm" aria-hidden="true"></i>
              </button>
            )}
          </div>

          {/* Controls Row - only when expanded */}
          {user && !sidebarCollapsed && (
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[var(--border-color)]">
              <LanguageSelector />
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <i
                  className={`fas fa-${theme === 'dark' ? 'sun text-yellow-400' : 'moon text-blue-500'} text-lg`}
                  aria-hidden="true"
                ></i>
                <span className="text-sm">{theme === 'dark' ? t('profile.lightMode') : t('profile.darkMode')}</span>
              </button>
            </div>
          )}

          {/* Controls when collapsed - stacked vertically */}
          {user && sidebarCollapsed && (
            <div className="flex flex-col items-center gap-2 mt-3">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <i
                  className={`fas fa-${theme === 'dark' ? 'sun text-yellow-400' : 'moon text-blue-500'}`}
                  aria-hidden="true"
                ></i>
              </button>
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
                aria-label="Expand sidebar"
              >
                <i className="fas fa-chevron-right text-sm" aria-hidden="true"></i>
              </button>
            </div>
          )}
        </div>

        {user && (
          <>
            <nav
              className={`flex-1 p-4 space-y-2 ${sidebarCollapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}
              aria-label="Primary navigation"
            >
              <Link to="/" className={linkClass(isActive('/'), sidebarCollapsed)}>
                <i className="glass-i fas fa-home w-5 text-center" aria-hidden="true"></i>
                {!sidebarCollapsed && <span>{t('notes.allNotes')}</span>}
              </Link>
              <Link
                to="/?view=favorites"
                className={linkClass(isActive('/', 'favorites'), sidebarCollapsed)}
              >
                <i
                  className="glass-i fas fa-heart w-5 text-center text-red-500"
                  aria-hidden="true"
                ></i>
                {!sidebarCollapsed && <span>{t('notes.favorites')}</span>}
              </Link>
              <Link
                to="/?view=archived"
                className={linkClass(isActive('/', 'archived'), sidebarCollapsed)}
              >
                <i className="glass-i fas fa-archive w-5 text-center" aria-hidden="true"></i>
                {!sidebarCollapsed && <span>{t('notes.archived')}</span>}
              </Link>
              <Link
                to="/?view=shared"
                className={linkClass(isActive('/', 'shared'), sidebarCollapsed)}
              >
                <i
                  className="glass-i fas fa-share-alt w-5 text-center text-green-500"
                  aria-hidden="true"
                ></i>
                {!sidebarCollapsed && <span>{t('notes.sharedWithMe')}</span>}
              </Link>

              <div className="pt-2">
                <Link to="/notes/new" className={linkClass(false, sidebarCollapsed)}>
                  <i className="glass-i fas fa-plus w-5 text-center" aria-hidden="true"></i>
                  {!sidebarCollapsed && <span>{t('notes.newNote')}</span>}
                </Link>
              </div>

              <Link to="/tasks" className={linkClass(isActive('/tasks'), sidebarCollapsed)}>
                <i className="glass-i fas fa-tasks w-5 text-center" aria-hidden="true"></i>
                {!sidebarCollapsed && <span>{t('tasks.title')}</span>}
              </Link>

              <div className="pt-4 mt-4 border-t border-[var(--border-color)] space-y-2">
                {user.username === 'admin' && (
                  <Link to="/admin" className={linkClass(isActive('/admin'), sidebarCollapsed)}>
                    <i className="glass-i fas fa-users-cog w-5 text-center" aria-hidden="true"></i>
                    {!sidebarCollapsed && <span>{t('admin.title')}</span>}
                  </Link>
                )}
                <Link to="/profile" className={linkClass(isActive('/profile'), sidebarCollapsed)}>
                  <i className="glass-i fas fa-user-circle w-5 text-center" aria-hidden="true"></i>
                  {!sidebarCollapsed && <span>{t('profile.title')}</span>}
                </Link>
              </div>
            </nav>

            <div className="p-4 border-t border-[var(--border-color)]">
              <div
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-3'}`}
              >
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-medium text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-[var(--text-secondary)] truncate">
                      {user.username}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
                  aria-label="Sign out"
                >
                  <i className="glass-i fas fa-sign-out-alt" aria-hidden="true"></i>
                </button>
              </div>
              {!sidebarCollapsed && (
                <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                    <span>Frontend: v{__APP_VERSION__}</span>
                    {backendVersion && <span>Backend: v{backendVersion}</span>}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header - Only on phones */}
        <header className="md:hidden bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 py-3 safe-area-top flex-shrink-0">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <i className="fas fa-feather-alt text-white text-sm" aria-hidden="true"></i>
              </div>
              <span className="text-lg font-bold text-[var(--text-primary)]">NoteHub</span>
            </Link>
            {user && (
              <div className="flex items-center gap-1">
                <LanguageSelector />
                <button
                  onClick={toggleTheme}
                  className="p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  <i
                    className={`fas fa-${theme === 'dark' ? 'sun text-yellow-400' : 'moon text-blue-500'}`}
                    aria-hidden="true"
                  ></i>
                </button>
                <Link
                  to="/profile"
                  className="p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  aria-label="View profile"
                >
                  <i className="glass-i fas fa-user-circle" aria-hidden="true"></i>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-red-500 hover:bg-red-500/10"
                  aria-label="Sign out"
                >
                  <i className="glass-i fas fa-sign-out-alt" aria-hidden="true"></i>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div
          id="main-content"
          className="flex-1 overflow-auto bg-[var(--bg-primary)]"
          onScroll={handleScroll}
          tabIndex={-1}
        >
          <Outlet />
        </div>
      </div>

      {/* Back to Top Button */}
      <button
        id="backToTop"
        onClick={scrollToTop}
        className={`btn-back-to-top ${
          showBackToTop ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-4'
        }`}
        aria-label="Scroll to top"
      >
        <i className="glass-i fas fa-arrow-up text-white" aria-hidden="true"></i>
      </button>

      {/* Mobile Bottom Navigation - Only on phones */}
      {user && (
        <nav className="mobile-nav md:hidden safe-area-bottom" aria-label="Mobile navigation">
          <Link
            to="/"
            className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}
            aria-current={isActive('/') ? 'page' : undefined}
          >
            <i className="glass-i fas fa-home" aria-hidden="true"></i>
            <span>{t('notes.title')}</span>
          </Link>
          <Link
            to="/tasks"
            className={`mobile-nav-item ${isActive('/tasks') ? 'active' : ''}`}
            aria-current={isActive('/tasks') ? 'page' : undefined}
          >
            <i className="glass-i fas fa-tasks" aria-hidden="true"></i>
            <span>{t('tasks.title')}</span>
          </Link>
          <Link to="/notes/new" className="mobile-nav-item create-btn" aria-label="Create new note">
            <div className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <i className="glass-i fas fa-plus text-white text-lg" aria-hidden="true"></i>
            </div>
          </Link>
          <Link
            to="/?view=favorites"
            className={`mobile-nav-item ${isActive('/', 'favorites') ? 'active' : ''}`}
            aria-current={isActive('/', 'favorites') ? 'page' : undefined}
          >
            <i className="glass-i fas fa-heart" aria-hidden="true"></i>
            <span>{t('notes.favorites')}</span>
          </Link>
          <Link
            to="/profile"
            className={`mobile-nav-item ${isActive('/profile') ? 'active' : ''}`}
            aria-current={isActive('/profile') ? 'page' : undefined}
          >
            <i className="glass-i fas fa-user" aria-hidden="true"></i>
            <span>{t('profile.title')}</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
