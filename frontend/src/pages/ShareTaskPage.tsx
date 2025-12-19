import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient, tasksApi } from '../api/client';
import { ConfirmModal } from '../components/Modal';

interface TaskSummary {
  id: number;
  title: string;
}

export function ShareTaskPage() {
  const { id } = useParams<{ id: string }>();
  const taskId = useMemo(() => (id ? Number.parseInt(id, 10) : NaN), [id]);

  const [task, setTask] = useState<TaskSummary | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);

  const publicUrl = useMemo(() => {
    if (!publicToken) return '';
    return `${window.location.origin}/public/tasks/${publicToken}`;
  }, [publicToken]);

  const load = useCallback(async () => {
    if (!Number.isFinite(taskId)) return;
    setIsLoading(true);
    setError('');
    try {
      const [taskData, share] = await Promise.all([
        apiClient.get<{ task: TaskSummary }>(`/api/v1/tasks/${taskId}`),
        tasksApi.getPublicShare(taskId),
      ]);
      setTask(taskData.task);
      setPublicToken(share?.token || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setSuccess('Link copied');
      setError('');
    } catch {
      setSuccess('');
      setError('Failed to copy link');
    }
  };

  const enablePublicShare = async () => {
    if (!Number.isFinite(taskId)) return;
    setIsSharing(true);
    setError('');
    setSuccess('');
    try {
      const share = await tasksApi.createPublicShare(taskId);
      setPublicToken(share.token);
      setSuccess('Public link created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create public link');
    } finally {
      setIsSharing(false);
    }
  };

  const revokePublicShare = async () => {
    if (!Number.isFinite(taskId)) return;
    setIsSharing(true);
    setError('');
    setSuccess('');
    try {
      await tasksApi.revokePublicShare(taskId);
      setPublicToken(null);
      setSuccess('Public link revoked');
      setRevokeModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke public link');
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <i className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link
          to="/tasks"
          className="flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
          aria-label="Back to Tasks"
        >
          <i className="glass-i fas fa-arrow-left mr-2" aria-hidden="true"></i>
          Back to Tasks
        </Link>
        <h1 className="text-3xl font-bold flex items-center text-[var(--text-primary)]">
          <i className="glass-i fas fa-share-alt mr-3 text-blue-600" aria-hidden="true"></i>
          Share Task
        </h1>
        {task && <p className="mt-2 text-[var(--text-secondary)]">{task.title}</p>}
      </div>

      {error && (
        <div
          className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start"
          role="alert"
        >
          <i className="glass-i fas fa-exclamation-circle mr-2 mt-0.5" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <output className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 flex items-start">
          <i className="glass-i fas fa-check-circle mr-2 mt-0.5" aria-hidden="true"></i>
          <span>{success}</span>
        </output>
      )}

      <div className="glass-card p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Public link</h2>

        {publicToken ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={publicUrl}
                readOnly
                className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)]"
              />
              <button
                type="button"
                onClick={copyLink}
                className="btn-primary px-6 py-2.5 rounded-lg"
              >
                <i className="glass-i fas fa-copy mr-2" aria-hidden="true"></i>
                Copy
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary-glass px-6 py-2.5 rounded-lg"
              >
                <i className="glass-i fas fa-external-link-alt mr-2" aria-hidden="true"></i>
                Open
              </a>
              <button
                type="button"
                onClick={() => setRevokeModalOpen(true)}
                className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                disabled={isSharing}
              >
                <i className="glass-i fas fa-ban mr-2" aria-hidden="true"></i>
                Revoke
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">
              Create a public link so anyone with the URL can view this task without logging in.
            </p>
            <button
              type="button"
              onClick={enablePublicShare}
              className="btn-primary px-6 py-2.5 rounded-lg font-medium"
              disabled={isSharing}
            >
              {isSharing ? (
                <>
                  <i className="glass-i fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="glass-i fas fa-link mr-2" aria-hidden="true"></i>
                  Create public link
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        onConfirm={revokePublicShare}
        title="Revoke public link"
        message="Anyone with the old link will no longer be able to access this task. Continue?"
        confirmText="Revoke"
        cancelText="Cancel"
        variant="danger"
        isLoading={isSharing}
      />
    </div>
  );
}
