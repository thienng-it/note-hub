import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/client';
import type { AuditLog, AuditLogStats } from '../types';
import { logger } from '../utils/logger';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(20);

  // Filters
  const [filterUserId, setFilterUserId] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });

      if (filterUserId) params.append('user_id', filterUserId);
      if (filterEntityType) params.append('entity_type', filterEntityType);
      if (filterAction) params.append('action', filterAction);
      if (filterStartDate) params.append('start_date', filterStartDate);
      if (filterEndDate) params.append('end_date', filterEndDate);

      const data = await adminApi.getAuditLogs(params);
      setLogs(data.logs);
      setTotalPages(data.pagination.total_pages);
    } catch (err) {
      logger.error('Failed to load audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, filterUserId, filterEntityType, filterAction, filterStartDate, filterEndDate]);

  const loadStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStartDate) params.append('start_date', filterStartDate);
      if (filterEndDate) params.append('end_date', filterEndDate);

      const data = await adminApi.getAuditLogStats(params);
      setStats(data);
    } catch (err) {
      logger.error('Failed to load stats:', err);
    }
  }, [filterStartDate, filterEndDate]);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats]);

  const handleFilterApply = () => {
    setPage(1);
    loadLogs();
    loadStats();
  };

  const handleFilterClear = () => {
    setFilterUserId('');
    setFilterEntityType('');
    setFilterAction('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (filterUserId) params.append('user_id', filterUserId);
      if (filterEntityType) params.append('entity_type', filterEntityType);
      if (filterAction) params.append('action', filterAction);
      if (filterStartDate) params.append('start_date', filterStartDate);
      if (filterEndDate) params.append('end_date', filterEndDate);

      const blob = await adminApi.exportAuditLogs(format, params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      logger.error('Failed to export audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to export audit logs');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'view':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="container-responsive py-4 sm:py-6">
      {/* Modern Header Section */}
      <div className="modern-page-header mb-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="modern-icon-badge bg-gradient-to-br from-purple-500 to-indigo-600">
                <i className="fas fa-clipboard-list text-white"></i>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] truncate">
                Audit Logs
              </h1>
            </div>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] ml-1">
              View and analyze system activity logs for compliance and security monitoring
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin" className="modern-btn-secondary">
              <i className="fas fa-arrow-left mr-2"></i>
              <span className="hidden sm:inline">Back to Admin</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="responsive-grid-glass mb-6 sm:mb-8">
          <div className="stat-card stat-card-purple">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-card-label">Total Logs</p>
                <p className="stat-card-value">{stats.total_logs.toLocaleString()}</p>
                <div className="stat-card-progress"></div>
              </div>
              <div className="stat-card-icon">
                <i className="fas fa-list" aria-hidden="true"></i>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-blue">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-card-label">Last 24 Hours</p>
                <p className="stat-card-value">{stats.recent_activity_24h.toLocaleString()}</p>
                <div className="stat-card-progress"></div>
              </div>
              <div className="stat-card-icon">
                <i className="fas fa-clock" aria-hidden="true"></i>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-indigo">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-card-label">Most Common Action</p>
                <p className="stat-card-value uppercase">{stats.by_action[0]?.action || 'N/A'}</p>
                <div className="stat-card-progress"></div>
              </div>
              <div className="stat-card-icon">
                <i className="fas fa-bolt" aria-hidden="true"></i>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-cyan">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-card-label">Active Users</p>
                <p className="stat-card-value">{stats.most_active_users.length}</p>
                <div className="stat-card-progress"></div>
              </div>
              <div className="stat-card-icon">
                <i className="fas fa-users" aria-hidden="true"></i>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-panel p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <i className="fas fa-filter text-[var(--text-secondary)]"></i>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Filters</h2>
        </div>
        <div className="responsive-grid">
          <div>
            <label
              htmlFor="filter-user-id"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              User ID
            </label>
            <input
              id="filter-user-id"
              type="text"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="glass-input"
              placeholder="e.g., 42"
            />
          </div>
          <div>
            <label
              htmlFor="filter-entity-type"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Entity Type
            </label>
            <select
              id="filter-entity-type"
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className="glass-input"
            >
              <option value="">All</option>
              <option value="note">Note</option>
              <option value="task">Task</option>
              <option value="user">User</option>
              <option value="export">Export</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="filter-action"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Action
            </label>
            <select
              id="filter-action"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="glass-input"
            >
              <option value="">All</option>
              <option value="view">View</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="filter-start-date"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Start Date
            </label>
            <input
              id="filter-start-date"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label
              htmlFor="filter-end-date"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              End Date
            </label>
            <input
              id="filter-end-date"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="glass-input"
            />
          </div>
        </div>
        <div className="mt-4 stack-mobile">
          <div className="flex gap-2 flex-1">
            <button
              type="button"
              onClick={handleFilterApply}
              className="btn-apple flex-1 sm:flex-initial"
            >
              <i className="glass-i fas fa-check mr-2" aria-hidden="true"></i>
              <span>Apply Filters</span>
            </button>
            <button
              type="button"
              onClick={handleFilterClear}
              className="btn-secondary-glass flex-1 sm:flex-initial"
            >
              <i className="glass-i fas fa-times mr-2" aria-hidden="true"></i>
              <span>Clear Filters</span>
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="btn-apple flex-1 sm:flex-initial"
              style={{
                background: isExporting
                  ? undefined
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              }}
            >
              <i className="glass-i fas fa-file-csv mr-2" aria-hidden="true"></i>
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="btn-apple flex-1 sm:flex-initial"
              style={{
                background: isExporting
                  ? undefined
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              }}
            >
              <i className="glass-i fas fa-file-code mr-2" aria-hidden="true"></i>
              <span>{isExporting ? 'Exporting...' : 'Export JSON'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 mb-6">
          <i className="glass-i fas fa-exclamation-circle mr-2" aria-hidden="true"></i>
          {error}
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-tertiary)]">
              <tr>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider hidden md:table-cell">
                  Entity
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider hidden lg:table-cell">
                  IP Address
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider hidden xl:table-cell">
                  Metadata
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 sm:px-6 py-12 text-center text-[var(--text-secondary)]"
                  >
                    <i
                      className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"
                      aria-hidden="true"
                    ></i>
                    <p>Loading audit logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 sm:px-6 py-12 text-center text-[var(--text-secondary)]"
                  >
                    <i
                      className="glass-i fas fa-inbox text-4xl mb-4 text-[var(--text-muted)]"
                      aria-hidden="true"
                    ></i>
                    <p className="text-lg">No audit logs found</p>
                    <p className="text-sm mt-2">Try adjusting your filter criteria</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {log.username ? log.username[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="text-[var(--text-primary)] font-medium">
                            {log.username || `User ${log.user_id}`}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">ID: {log.user_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeClass(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm hidden md:table-cell">
                      <div className="text-[var(--text-primary)]">{log.entity_type}</div>
                      {log.entity_id && (
                        <div className="text-xs text-[var(--text-secondary)]">
                          ID: {log.entity_id}
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-[var(--text-secondary)] font-mono hidden lg:table-cell">
                      {log.ip_address || 'N/A'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm hidden xl:table-cell">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 dark:text-blue-400 hover:underline">
                            View metadata
                          </summary>
                          <pre className="mt-2 p-2 bg-[var(--bg-secondary)] rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-[var(--text-secondary)]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3">
            <div className="text-sm text-[var(--text-secondary)]">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <i className="glass-i fas fa-chevron-left" aria-hidden="true"></i>
                <span className="hidden sm:inline">Previous</span>
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="hidden sm:inline">Next</span>
                <i className="glass-i fas fa-chevron-right" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
