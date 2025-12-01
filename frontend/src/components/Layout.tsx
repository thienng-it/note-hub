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
    `flex items-center px-3 py-2 rounded-lg transition-colors ${
      active
        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
        : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
    }`;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`sidebar ${sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 hidden md:flex flex-col transition-all duration-300`}
      >
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              <i className="fas fa-sticky-note mr-2"></i>
              {!sidebarCollapsed && <span>Beautiful Notes</span>}
            </h1>
            {user && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
                  title="Toggle Sidebar"
                >
                  <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
                </button>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'} text-yellow-500`}></i>
                </button>
              </div>
            )}
          </div>
        </div>

        {user && (
          <>
            <nav className="flex-1 p-4">
              <div className="space-y-2">
                <Link to="/" className={linkClass(isActive('/'))}>
                  <i className="fas fa-home mr-3"></i>
                  {!sidebarCollapsed && <span>All Notes</span>}
                </Link>
                <Link to="/?view=favorites" className={linkClass(isActive('/', 'favorites'))}>
                  <i className="fas fa-heart mr-3 text-red-500"></i>
                  {!sidebarCollapsed && <span>Favorites</span>}
                </Link>
                <Link to="/?view=archived" className={linkClass(isActive('/', 'archived'))}>
                  <i className="fas fa-archive mr-3"></i>
                  {!sidebarCollapsed && <span>Archived</span>}
                </Link>
                <Link to="/?view=shared" className={linkClass(isActive('/', 'shared'))}>
                  <i className="fas fa-share-alt mr-3"></i>
                  {!sidebarCollapsed && <span>Shared With Me</span>}
                </Link>
                <Link
                  to="/notes/new"
                  className="flex items-center px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-plus mr-3"></i>
                  {!sidebarCollapsed && <span>New Note</span>}
                </Link>
                <Link to="/tasks" className={linkClass(isActive('/tasks'))}>
                  <i className="fas fa-tasks mr-3"></i>
                  {!sidebarCollapsed && <span>Tasks</span>}
                </Link>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                {user.username === 'admin' && (
                  <Link to="/admin" className={linkClass(isActive('/admin'))}>
                    <i className="fas fa-users-cog mr-3"></i>
                    {!sidebarCollapsed && <span>Admin Dashboard</span>}
                  </Link>
                )}
                <Link to="/profile" className={linkClass(isActive('/profile'))}>
                  <i className="fas fa-user-circle mr-3"></i>
                  {!sidebarCollapsed && <span>Profile</span>}
                </Link>
              </div>
            </nav>

            <div className="p-4 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                {!sidebarCollapsed && (
                  <span className="text-sm text-[var(--text-secondary)]">{user.username}</span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  title="Logout"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
        {/* Top Bar for Mobile */}
        <header className="md:hidden bg-[var(--bg-secondary)] border-b border-[var(--border-color)] p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Beautiful Notes</h1>
            {user && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                >
                  <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'} text-yellow-500`}></i>
                </button>
                <Link to="/profile" className="p-2 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                  <i className="fas fa-user-circle"></i>
                </Link>
                <button onClick={handleLogout} className="text-red-600 dark:text-red-400">
                  <i className="fas fa-sign-out-alt"></i>
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
        >
          <Outlet />
        </div>

        {/* Back to Top Button */}
        <button
          id="backToTop"
          onClick={scrollToTop}
          className={`fixed bottom-8 right-8 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-40 ${
            showBackToTop ? 'opacity-100 visible' : 'opacity-0 invisible'
          }`}
          style={{ background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))' }}
          title="Back to top"
          aria-label="Scroll to top"
        >
          <i className="fas fa-arrow-up text-white"></i>
        </button>
      </main>

      {/* Mobile Bottom Navigation */}
      {user && (
        <nav className="mobile-nav md:hidden">
          <Link to="/" className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}>
            <i className="fas fa-home"></i>
            <span>Notes</span>
          </Link>
          <Link to="/tasks" className={`mobile-nav-item ${isActive('/tasks') ? 'active' : ''}`}>
            <i className="fas fa-tasks"></i>
            <span>Tasks</span>
          </Link>
          <Link to="/notes/new" className="mobile-nav-item">
            <i className="fas fa-plus-circle"></i>
            <span>New</span>
          </Link>
          <Link to="/?view=favorites" className={`mobile-nav-item ${isActive('/', 'favorites') ? 'active' : ''}`}>
            <i className="fas fa-heart"></i>
            <span>Favorites</span>
          </Link>
          <Link to="/profile" className={`mobile-nav-item ${isActive('/profile') ? 'active' : ''}`}>
            <i className="fas fa-user"></i>
            <span>Profile</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
