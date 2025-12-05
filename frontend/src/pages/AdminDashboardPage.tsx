import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  created_at: string;
  last_login: string | null;
  totp_secret: boolean;
  has_2fa?: boolean;
}

interface AdminStats {
  total_users: number;
  users_with_2fa: number;
  users_with_email: number;
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats>({ total_users: 0, users_with_2fa: 0, users_with_email: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('notehub_access_token');
      const params = new URLSearchParams({ page: String(page) });
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data.users);
      setStats({
        total_users: data.stats.total_users,
        users_with_2fa: data.stats.users_with_2fa,
        users_with_email: data.stats.users_with_email,
      });
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, page, searchQuery]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await loadUsers();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setPage(1);
  };

  const handleDisable2FA = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to disable 2FA for user "${username}"?\n\nThis action is for account recovery purposes only.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('notehub_access_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/disable-2fa`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      // Refresh user list
      await loadUsers();

      // Show success message (inline instead of alert)
      setError('');
      // You could set a success state here for a toast notification
      logger.info('2FA disabled successfully', { userId, username });
    } catch (err) {
      // Set error state instead of alert
      logger.error('Failed to disable 2FA', err);
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    }
  };

  // Check if user is admin
  if (user?.username !== 'admin') {
    return (
      <div>
        <div className="glass-card p-8 rounded-2xl text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-6">
            <i className="glass-i fas fa-ban text-3xl text-red-500" aria-hidden="true"></i>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Access Denied</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            You don't have permission to access the admin dashboard.
          </p>
          <Link
            to="/"
            className="btn-apple"
          >
            <i className="glass-i fas fa-arrow-left" aria-hidden="true"></i>
            <span>Back to Notes</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
              <i className="glass-i fas fa-users-cog text-blue-600" aria-hidden="true"></i>
              Admin Dashboard
            </h1>
            <p className="text-[var(--text-secondary)] mt-2">Manage users and view system statistics</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-colors"
          >
            <i className="glass-i fas fa-arrow-left" aria-hidden="true"></i>
            <span>Back to Notes</span>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="glass-card p-6 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm line-clamp-3 mb-3 text-[var(--text-secondary)]">Total Users</p>
              <p className="text-3xl sm:text-4xl font-bold text-[var(--text-secondary)]">{stats.total_users}</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-full flex items-center justify-center">
              <i className="glass-avatar fas fa-users text-xl sm:text-2xl" aria-hidden="true"></i>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm line-clamp-3 mb-3 text-[var(--text-secondary)]">2FA Enabled</p>
              <p className="text-3xl sm:text-4xl font-bold text-[var(--text-secondary)]">{stats.users_with_2fa}</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-full flex items-center justify-center">
              <i className="glass-avatar fas fa-shield-alt text-xl sm:text-2xl" aria-hidden="true"></i>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm line-clamp-3 mb-3 text-[var(--text-secondary)]">With Email</p>
              <p className="text-3xl sm:text-4xl font-bold text-[var(--text-secondary)]">{stats.users_with_email}</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-full flex items-center justify-center">
              <i className="glass-avatar fas fa-envelope text-xl sm:text-2xl" aria-hidden="true"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4 sm:p-6 rounded-xl mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <i className="glass-i fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or email..."
              className="glass-input w-full pl-11 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary px-6 py-3 rounded-lg font-medium flex items-center gap-2"
            >
              <i className="glass-i fas fa-search" aria-hidden="true"></i>
              <span>Search</span>
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-6 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-colors flex items-center gap-2"
              >
                <i className="glass-i fas fa-times" aria-hidden="true"></i>
                <span>Clear</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results Info */}
      <div className="mb-4 text-[var(--text-secondary)]">
        {searchQuery ? (
          <p>Found <strong>{stats.total_users}</strong> users matching "{searchQuery}"</p>
        ) : (
          <p>Showing <strong>{stats.total_users}</strong> users</p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-card p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 mb-6">
          <i className="glass-i fas fa-exclamation-circle mr-2" aria-hidden="true"></i>
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="glass-card p-12 rounded-xl text-center">
          <i className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600 mb-4" aria-hidden="true"></i>
          <p className="text-[var(--text-secondary)]">Loading users...</p>
        </div>
      ) : (
        <>
          {/* Users Table */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead className="bg-[var(--bg-tertiary)]">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">ID</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Username</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider hidden sm:table-cell">Email</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider hidden md:table-cell">Created At</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider hidden lg:table-cell">Last Login</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">2FA</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                        <i className="glass-i fas fa-users text-4xl mb-4 text-[var(--text-muted)]" aria-hidden="true"></i>
                        <p className="text-lg">No users found</p>
                        {searchQuery && <p className="text-sm mt-2">Try adjusting your search criteria</p>}
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                          {u.id}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                              {u.username[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                                {u.username}
                                {u.username === 'admin' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-600 dark:text-red-400">
                                    Admin
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)] hidden sm:table-cell">
                          {u.email ? (
                            <span className="flex items-center gap-2">
                              <i className="glass-i fas fa-envelope text-[var(--text-muted)]" aria-hidden="true"></i>
                              {u.email}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] italic">No email</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)] hidden md:table-cell">
                          <span className="flex items-center gap-2">
                            <i className="glass-i fas fa-calendar-plus text-[var(--text-muted)]" aria-hidden="true"></i>
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)] hidden lg:table-cell">
                          {u.last_login ? (
                            <span className="flex items-center gap-2">
                              <i className="glass-i fas fa-sign-in-alt text-[var(--text-muted)]" aria-hidden="true"></i>
                              {new Date(u.last_login).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] italic">Never</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          {u.has_2fa ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400">
                              <i className="glass-i fas fa-shield-alt mr-1" aria-hidden="true"></i>
                              Enabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                              <i className="glass-i fas fa-shield-alt mr-1" aria-hidden="true"></i>
                              Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          {u.has_2fa && (
                            <button
                              onClick={() => handleDisable2FA(u.id, u.username)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              title="Disable 2FA for this user"
                            >
                              <i className="glass-i fas fa-shield-alt mr-1.5" aria-hidden="true"></i>
                              Disable 2FA
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-[var(--text-secondary)]">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                {page > 1 && (
                  <button
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-colors flex items-center gap-2"
                  >
                    <i className="glass-i fas fa-chevron-left" aria-hidden="true"></i>
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                )}

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        pageNum === page
                          ? 'btn-apple'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--border-color)]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {page < totalPages && (
                  <button
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-colors flex items-center gap-2"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <i className="glass-i fas fa-chevron-right" aria-hidden="true"></i>
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
