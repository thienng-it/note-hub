import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { versionApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LiquidGlassNav } from './LiquidGlassNav';

// Version is injected at build time by Vite
declare const __APP_VERSION__: string;

export function Layout() {
  const { user } = useAuth();

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [backendVersion, setBackendVersion] = useState<string | null>(null);

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

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header with Logo and Version - Always visible */}
        <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 py-3 safe-area-top flex-shrink-0">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <i className="fas fa-feather-alt text-white text-sm" aria-hidden="true"></i>
              </div>
              <span className="text-lg font-bold text-[var(--text-primary)]">NoteHub</span>
            </Link>
            {user && (
              <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                <span>v{__APP_VERSION__}</span>
                {backendVersion && <span>BE v{backendVersion}</span>}
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
        type="button"
        id="backToTop"
        onClick={scrollToTop}
        className={`btn-back-to-top ${
          showBackToTop ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-4'
        }`}
        aria-label="Scroll to top"
      >
        <i className="glass-i fas fa-arrow-up text-white" aria-hidden="true"></i>
      </button>

      {/* Mac-Style Liquid Glass Navigation - All screen sizes */}
      {user && <LiquidGlassNav />}
    </div>
  );
}
