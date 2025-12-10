import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/client.ts';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import { logger } from '../utils/logger';

interface AdminStats {
  total_users: number;
  users_with_2fa: number;
  users_with_email: number;
  locked_users: number;
  admin_users: number;
}

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    users_with_2fa: 0,
    users_with_email: 0,
    locked_users: 0,
    admin_users: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ page: String(page) });
      if (searchQuery) params.append('search', searchQuery);

      const data = await adminApi.getUsers(params);

      setUsers(data.users);
      setStats({
        total_users: data.stats.total_users,
        users_with_2fa: data.stats.users_with_2fa,
        users_with_email: data.stats.users_with_email,
        locked_users: data.stats.locked_users,
        admin_users: data.stats.admin_users,
      });
      setTotalPages(data.pagination.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

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
    if (
      !confirm(
        `Are you sure you want to disable 2FA for user "${username}"?\n\nThis action is for account recovery purposes only.`,
      )
    ) {
      return;
    }

    try {
      await adminApi.disable2fa(userId);
      await loadUsers();
      setError('');
      logger.info('Admin action: 2FA disabled successfully', { userId, username });
    } catch (err) {
      logger.error('Admin action: Failed to disable 2FA', err, { userId, username });
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    }
  };

  const handleLockUser = async (userId: number, username: string) => {
    if (
      !confirm(
        `Are you sure you want to lock user "${username}"?\n\nThey will not be able to log in until unlocked.`,
      )
    ) {
      return;
    }

    try {
      await adminApi.lockUser(userId);
      await loadUsers();
      setError('');
      logger.info('Admin action: User locked successfully', { userId, username });
    } catch (err) {
      logger.error('Admin action: Failed to lock user', err, { userId, username });
      setError(err instanceof Error ? err.message : 'Failed to lock user');
    }
  };

  const handleUnlockUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to unlock user "${username}"?`)) {
      return;
    }

    try {
      await adminApi.unlockUser(userId);
      await loadUsers();
      setError('');
      logger.info('Admin action: User unlocked successfully', { userId, username });
    } catch (err) {
      logger.error('Admin action: Failed to unlock user', err, { userId, username });
      setError(err instanceof Error ? err.message : 'Failed to unlock user');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (
      !confirm(
        `⚠️ WARNING: Are you sure you want to DELETE user "${username}"?\n\nThis action is PERMANENT and will delete:\n• User account\n• All their notes\n• All their tasks\n• All associated data\n\nThis CANNOT be undone!`,
      )
    ) {
      return;
    }

    // Double confirmation for safety
    const confirmText = prompt(`Type "${username}" to confirm deletion:`);
    if (confirmText !== username) {
      setError('Deletion cancelled: Username did not match');
      return;
    }

    try {
      await adminApi.deleteUser(userId);
      await loadUsers();
      setError('');
      logger.info('Admin action: User deleted successfully', { userId, username });
    } catch (err) {
      logger.error('Admin action: Failed to delete user', err, { userId, username });
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleGrantAdmin = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to grant admin privileges to "${username}"?`)) {
      return;
    }

    try {
      await adminApi.grantAdmin(userId);
      await loadUsers();
      setError('');
      logger.info('Admin action: Admin privileges granted', { userId, username });
    } catch (err) {
      logger.error('Admin action: Failed to grant admin privileges', err, { userId, username });
      setError(err instanceof Error ? err.message : 'Failed to grant admin privileges');
    }
  };

  const handleRevokeAdmin = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to revoke admin privileges from "${username}"?`)) {
      return;
    }

    try {
      await adminApi.revokeAdmin(userId);
      await loadUsers();
      setError('');
      logger.info('Admin action: Admin privileges revoked', { userId, username });
    } catch (err) {
      logger.error('Admin action: Failed to revoke admin privileges', err, { userId, username });
      setError(err instanceof Error ? err.message : 'Failed to revoke admin privileges');
    }
  };

  // Check if user is admin
  if (!user?.is_admin) {
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
          <Link to="/" className="btn-apple">
            <i className="glass-i fas fa-arrow-left" aria-hidden="true"></i>
            <span>{t('admin.backToNotes')}</span>
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
            <p className="text-[var(--text-secondary)] mt-2">
              Manage users and view system statistics
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-colors"
          >
            <i className="glass-i fas fa-arrow-left" aria-hidden="true"></i>
            <span>{t('admin.backToNotes')}</span>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-6 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-2">Total Users</p>
              <p className="text-3xl font-bold">{stats.total_users}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fas fa-users text-xl" aria-hidden="true"></i>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-2">2FA Enabled</p>
              <p className="text-3xl font-bold">{stats.users_with_2fa}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fas fa-shield-alt text-xl" aria-hidden="true"></i>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-2">With Email</p>
              <p className="text-3xl font-bold">{stats.users_with_email}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fas fa-envelope text-xl" aria-hidden="true"></i>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-2">Admins</p>
              <p className="text-3xl font-bold">{stats.admin_users}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fas fa-crown text-xl" aria-hidden="true"></i>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm mb-2">Locked</p>
              <p className="text-3xl font-bold">{stats.locked_users}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fas fa-lock text-xl" aria-hidden="true"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4 sm:p-6 rounded-xl mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <i
              className="glass-i fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden="true"
            ></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('admin.searchPlaceholder')}
              className="glass-input w-full pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-apple">
              <i className="glass-i fas fa-search" aria-hidden="true"></i>
              <span>{t('common.search')}</span>
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-6 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-colors flex items-center gap-2"
              >
                <i className="glass-i fas fa-times" aria-hidden="true"></i>
                <span>{t('common.clear')}</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results Info */}
      <div className="mb-4 text-[var(--text-secondary)]">
        {searchQuery ? (
          <p>
            Found <strong>{stats.total_users}</strong> users matching "{searchQuery}"
          </p>
        ) : (
          <p>
            Showing <strong>{stats.total_users}</strong> users
          </p>
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
          <i
            className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"
            aria-hidden="true"
          ></i>
          <p className="text-[var(--text-secondary)]">Loading users...</p>
        </div>
      ) : (
        <>
          {/* Users Table */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-tertiary)]">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider hidden sm:table-cell">
                      Email
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider hidden md:table-cell">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider hidden lg:table-cell">
                      Created
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-[var(--text-secondary)]"
                      >
                        <i
                          className="glass-i fas fa-users text-4xl mb-4 text-[var(--text-muted)]"
                          aria-hidden="true"
                        ></i>
                        <p className="text-lg">No users found</p>
                        {searchQuery && (
                          <p className="text-sm mt-2">Try adjusting your search criteria</p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                        {/* User Column */}
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                              {u.username[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2 flex-wrap">
                                {u.username}
                                {u.is_admin && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-600 dark:text-orange-400">
                                    <i className="fas fa-crown mr-1" aria-hidden="true"></i>
                                    Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">ID: {u.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* Email Column */}
                        <td className="px-4 sm:px-6 py-4 text-sm text-[var(--text-secondary)] hidden sm:table-cell">
                          {u.email || (
                            <span className="text-[var(--text-muted)] italic">No email</span>
                          )}
                        </td>

                        {/* Status Column */}
                        <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                          <div className="flex flex-col gap-1">
                            {u.is_locked ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-600 dark:text-red-400 w-fit">
                                <i className="fas fa-lock mr-1" aria-hidden="true"></i>
                                Locked
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400 w-fit">
                                <i className="fas fa-check-circle mr-1" aria-hidden="true"></i>
                                Active
                              </span>
                            )}
                            {u.has_2fa && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400 w-fit">
                                <i className="fas fa-shield-alt mr-1" aria-hidden="true"></i>
                                2FA
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Created Column */}
                        <td className="px-4 sm:px-6 py-4 text-sm text-[var(--text-secondary)] hidden lg:table-cell">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                        </td>

                        {/* Actions Column */}
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {/* Lock/Unlock */}
                            {u.username !== 'admin' && (
                              <>
                                {u.is_locked ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUnlockUser(u.id, u.username)}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
                                    title="Unlock user account"
                                  >
                                    <i className="fas fa-unlock mr-1.5" aria-hidden="true"></i>
                                    Unlock
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleLockUser(u.id, u.username)}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors"
                                    title="Lock user account"
                                  >
                                    <i className="fas fa-lock mr-1.5" aria-hidden="true"></i>
                                    Lock
                                  </button>
                                )}
                              </>
                            )}

                            {/* Admin Grant/Revoke */}
                            {u.username !== 'admin' && user?.id !== u.id && (
                              <>
                                {u.is_admin ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeAdmin(u.id, u.username)}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                                    title="Revoke admin privileges"
                                  >
                                    <i className="fas fa-crown mr-1.5" aria-hidden="true"></i>
                                    Revoke
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleGrantAdmin(u.id, u.username)}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
                                    title="Grant admin privileges"
                                  >
                                    <i className="fas fa-crown mr-1.5" aria-hidden="true"></i>
                                    Grant
                                  </button>
                                )}
                              </>
                            )}

                            {/* Disable 2FA */}
                            {u.has_2fa && (
                              <button
                                type="button"
                                onClick={() => handleDisable2FA(u.id, u.username)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                                title="Disable 2FA for account recovery"
                              >
                                <i className="fas fa-shield-alt mr-1.5" aria-hidden="true"></i>
                                Disable 2FA
                              </button>
                            )}

                            {/* Delete */}
                            {u.username !== 'admin' && user?.id !== u.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                                title="Delete user account permanently"
                              >
                                <i className="fas fa-trash mr-1.5" aria-hidden="true"></i>
                                Delete
                              </button>
                            )}
                          </div>
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
                    type="button"
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
                      type="button"
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
                    type="button"
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
