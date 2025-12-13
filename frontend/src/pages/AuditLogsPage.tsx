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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Audit Logs</h1>
            <p className="text-[var(--text-secondary)] mt-1">
              View and analyze system activity logs for compliance and security monitoring
            </p>
          </div>
          <Link
            to="/admin"
            className="px-4 py-2 bg-[var(--background-secondary)] text-[var(--text-primary)] rounded hover:bg-[var(--hover-bg)] transition-colors"
          >
            ← Back to Admin
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="responsive-grid mb-6">
          <div className="glass-card p-4">
            <div className="text-sm text-[var(--text-secondary)]">Total Logs</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {stats.total_logs.toLocaleString()}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-sm text-[var(--text-secondary)]">Last 24 Hours</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {stats.recent_activity_24h.toLocaleString()}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-sm text-[var(--text-secondary)]">Most Common Action</div>
            <div className="text-xl font-bold text-[var(--text-primary)] mt-1">
              {stats.by_action[0]?.action || 'N/A'}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-sm text-[var(--text-secondary)]">Active Users</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {stats.most_active_users.length}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-panel p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Filters</h2>
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
              Apply Filters
            </button>
            <button
              type="button"
              onClick={handleFilterClear}
              className="btn-secondary-glass flex-1 sm:flex-initial"
            >
              Clear Filters
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="btn-apple flex-1 sm:flex-initial bg-green-600 hover:bg-green-700"
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="btn-apple flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700"
            >
              {isExporting ? 'Exporting...' : 'Export JSON'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--background-secondary)] border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                  User
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                  Entity
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--hover-bg)]">
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-[var(--text-primary)] font-medium">
                        {log.username || `User ${log.user_id}`}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">ID: {log.user_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getActionBadgeClass(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-[var(--text-primary)]">{log.entity_type}</div>
                      {log.entity_id && (
                        <div className="text-xs text-[var(--text-secondary)]">
                          ID: {log.entity_id}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] font-mono">
                      {log.ip_address || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 dark:text-blue-400 hover:underline">
                            View metadata
                          </summary>
                          <pre className="mt-2 p-2 bg-[var(--background-secondary)] rounded text-xs overflow-x-auto">
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
          <div className="px-4 py-3 bg-[var(--background-secondary)] border-t border-[var(--border-color)] flex items-center justify-between">
            <div className="text-sm text-[var(--text-secondary)]">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-[var(--background-primary)] text-[var(--text-primary)] rounded hover:bg-[var(--hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-[var(--background-primary)] text-[var(--text-primary)] rounded hover:bg-[var(--hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
