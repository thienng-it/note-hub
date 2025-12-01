import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [showBackToTop, setShowBackToTop] = useState(false);

  const view = new URLSearchParams(location.search).get('view');

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

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

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active
        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium'
        : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
    }`;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <aside
        id="sidebar"
        className={`sidebar ${sidebarCollapsed ? 'w-20' : 'w-72'} flex-shrink-0 hidden lg:flex flex-col transition-all duration-300`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-sticky-note text-white" aria-hidden="true"></i>
              </div>
              {!sidebarCollapsed && (
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  NoteHub
                </span>
              )}
            </Link>
            {user && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`} aria-hidden="true"></i>
                </button>
                <button
                  onClick={toggleTheme}
                  className="p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  <i className={`fas fa-${theme === 'dark' ? 'sun text-yellow-400' : 'moon text-blue-500'}`} aria-hidden="true"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        {user && (
          <>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto" aria-label="Primary navigation">
              <Link to="/" className={linkClass(isActive('/'))}>
                <i className="fas fa-home w-5 text-center" aria-hidden="true"></i>
                {!sidebarCollapsed && <span>All Notes</span>}
              </Link>
              <Link to="/?view=favorites" className={linkClass(isActive('/', 'favorites'))}>
                <i className="fas fa-heart w-5 text-center text-red-500" aria-hidden="true"></i>
                {!sidebarCollapsed && <span>Favorites</span>}
              </Link>
              <Link to="/?view=archived" className={linkClass(isActive('/', 'archived'))}>
                <i className="fas fa-archive w-5 text-center" aria-hidden="true"></i>
                {!sidebarCollapsed && <span>Archived</span>}
              </Link>
              <Link to="/?view=shared" className={linkClass(isActive('/', 'shared'))}>
                <i className="fas fa-share-alt w-5 text-center text-green-500" aria-hidden="true"></i>
                {!sidebarCollapsed && <span>Shared With Me</span>}
              </Link>

              <div className="pt-2">
                <Link
                  to="/notes/new"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
                >
                  <i className="fas fa-plus w-5 text-center" aria-hidden="true"></i>
                  {!sidebarCollapsed && <span className="font-medium">New Note</span>}
                </Link>
              </div>

              <Link to="/tasks" className={linkClass(isActive('/tasks'))}>
                <i className="fas fa-tasks w-5 text-center" aria-hidden="true"></i>
                {!sidebarCollapsed && <span>Tasks</span>}
              </Link>

              <div className="pt-4 mt-4 border-t border-[var(--border-color)] space-y-2">
                {user.username === 'admin' && (
                  <Link to="/admin" className={linkClass(isActive('/admin'))}>
                    <i className="fas fa-users-cog w-5 text-center" aria-hidden="true"></i>
                    {!sidebarCollapsed && <span>Admin Dashboard</span>}
                  </Link>
                )}
                <Link to="/profile" className={linkClass(isActive('/profile'))}>
                  <i className="fas fa-user-circle w-5 text-center" aria-hidden="true"></i>
                  {!sidebarCollapsed && <span>Profile</span>}
                </Link>
              </div>
            </nav>

            <div className="p-4 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between gap-3">
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-medium text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-[var(--text-secondary)] truncate">{user.username}</span>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
                  aria-label="Sign out"
                >
                  <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
        {/* Mobile Header */}
        <header className="lg:hidden bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 py-3 safe-area-top">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <i className="fas fa-sticky-note text-white text-sm" aria-hidden="true"></i>
              </div>
              <span className="text-lg font-bold text-[var(--text-primary)]">NoteHub</span>
            </Link>
            {user && (
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleTheme}
                  className="p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  <i className={`fas fa-${theme === 'dark' ? 'sun text-yellow-400' : 'moon text-blue-500'}`} aria-hidden="true"></i>
                </button>
                <Link 
                  to="/profile" 
                  className="p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  aria-label="View profile"
                >
                  <i className="fas fa-user-circle" aria-hidden="true"></i>
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="p-2.5 rounded-xl text-red-500 hover:bg-red-500/10"
                  aria-label="Sign out"
                >
                  <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
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

        {/* Back to Top Button */}
        <button
          id="backToTop"
          onClick={scrollToTop}
          className={`fixed bottom-24 lg:bottom-8 right-4 lg:right-8 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-40 ${
            showBackToTop ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-4'
          }`}
          style={{ background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))' }}
          aria-label="Scroll to top"
        >
          <i className="fas fa-arrow-up text-white" aria-hidden="true"></i>
        </button>
      </main>

      {/* Mobile Bottom Navigation */}
      {user && (
        <nav 
          className="mobile-nav lg:hidden safe-area-bottom"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <Link 
            to="/" 
            className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}
            aria-current={isActive('/') ? 'page' : undefined}
          >
            <i className="fas fa-home" aria-hidden="true"></i>
            <span>Notes</span>
          </Link>
          <Link 
            to="/tasks" 
            className={`mobile-nav-item ${isActive('/tasks') ? 'active' : ''}`}
            aria-current={isActive('/tasks') ? 'page' : undefined}
          >
            <i className="fas fa-tasks" aria-hidden="true"></i>
            <span>Tasks</span>
          </Link>
          <Link 
            to="/notes/new" 
            className="mobile-nav-item create-btn"
            aria-label="Create new note"
          >
            <div className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <i className="fas fa-plus text-white text-lg" aria-hidden="true"></i>
            </div>
          </Link>
          <Link 
            to="/?view=favorites" 
            className={`mobile-nav-item ${isActive('/', 'favorites') ? 'active' : ''}`}
            aria-current={isActive('/', 'favorites') ? 'page' : undefined}
          >
            <i className="fas fa-heart" aria-hidden="true"></i>
            <span>Favorites</span>
          </Link>
          <Link 
            to="/profile" 
            className={`mobile-nav-item ${isActive('/profile') ? 'active' : ''}`}
            aria-current={isActive('/profile') ? 'page' : undefined}
          >
            <i className="fas fa-user" aria-hidden="true"></i>
            <span>Profile</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
