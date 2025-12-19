import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicApi } from '../api/client';
import type { Task } from '../types';

export function PublicTaskPage() {
  const { token } = useParams<{ token: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await publicApi.getSharedTask(token);
      setTask(res.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Shared task not found');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] p-4">
        <div className="glass-card p-8 rounded-2xl text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i>
          <p className="text-[var(--text-secondary)]">Loading shared task...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] p-6 flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl w-full max-w-2xl">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 flex items-start">
            <i className="fas fa-exclamation-triangle mr-3 mt-0.5"></i>
            <div>
              <h3 className="font-medium">Error loading task</h3>
              <p className="text-sm mt-1">
                {error || 'The shared task could not be found or is no longer available.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/login" className="btn-primary px-4 py-2 text-sm">
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Sign in
                </Link>
                <Link to="/" className="btn-secondary-glass px-4 py-2 text-sm">
                  <i className="fas fa-home mr-2"></i>
                  Go to homepage
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const priorityClass =
    task.priority === 'high'
      ? 'text-red-500 bg-red-500/10 border-red-500/20'
      : task.priority === 'medium'
        ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
        : 'text-green-500 bg-green-500/10 border-green-500/20';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="glass-card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 pb-6 border-b border-white/10">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] truncate">
                {task.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`modern-tag px-2 py-0.5 text-xs rounded-full border ${priorityClass}`}
                >
                  {task.priority}
                </span>
                {task.due_date && (
                  <span className="text-xs text-[var(--text-muted)]">
                    <i className="glass-i fas fa-calendar mr-1"></i>
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
                {task.is_overdue && !task.completed && (
                  <span className="text-xs text-red-500">
                    <i className="glass-i fas fa-exclamation-triangle mr-1"></i>
                    Overdue
                  </span>
                )}
              </div>
            </div>
            <Link to="/login" className="btn-secondary-glass">
              <i className="glass-i fas fa-sign-in-alt mr-2"></i>
              Login
            </Link>
          </div>

          {task.description && (
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/5">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Description</h3>
              <div className="text-[var(--text-primary)] whitespace-pre-wrap">
                {task.description}
              </div>
            </div>
          )}

          {task.images && task.images.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Attachments</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {task.images.map((image, index) => (
                  <a
                    key={index}
                    href={image}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-hidden rounded-xl border border-white/10 hover:border-blue-400/30 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={image}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center">
                          View <i className="fas fa-external-link-alt ml-1 text-xs"></i>
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
