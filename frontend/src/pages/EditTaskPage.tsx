import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';

interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string;
}

export function EditTaskPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);

  const fetchTask = async () => {
    try {
      const data = await apiClient.get<{ task: TaskFormData & { due_date?: string } }>(
        `/api/v1/tasks/${id}`,
      );
      setFormData({
        title: data.task.title || '',
        description: data.task.description || '',
        priority: data.task.priority || 'medium',
        due_date: data.task.due_date ? data.task.due_date.split('T')[0] : '',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load task';
      setError(errorMessage);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isEdit && id) {
      fetchTask();
    }
  }, [id, isEdit, fetchTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }

    setIsLoading(true);
    try {
      if (isEdit) {
        await apiClient.put(`/api/v1/tasks/${id}`, formData);
      } else {
        await apiClient.post('/api/v1/tasks', formData);
      }
      navigate('/tasks');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save task';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <i
            className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"
            aria-hidden="true"
          ></i>
          <p className="text-[var(--text-secondary)]">Loading task...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
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
          <i
            className={`fas fa-${isEdit ? 'edit' : 'plus'} mr-3 text-blue-600`}
            aria-hidden="true"
          ></i>
          {isEdit ? 'Edit Task' : 'Create New Task'}
        </h1>
      </div>

      {/* Form */}
      <div className="glass-card p-6 rounded-xl">
        {error && (
          <div
            className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start"
            role="alert"
          >
            <i className="glass-i fas fa-exclamation-circle mr-2 mt-0.5" aria-hidden="true"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="glass-i fas fa-heading mr-2" aria-hidden="true"></i>
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
              placeholder="Enter task title..."
              required
              aria-required="true"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="glass-i fas fa-align-left mr-2" aria-hidden="true"></i>
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)] resize-none"
              rows={4}
              placeholder="Add task description (optional)..."
            />
          </div>

          {/* Priority and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Priority */}
            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
              >
                <i className="glass-i fas fa-flag mr-2" aria-hidden="true"></i>
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as TaskFormData['priority'] })
                }
                className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label
                htmlFor="due_date"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
              >
                <i className="glass-i fas fa-calendar mr-2" aria-hidden="true"></i>
                Due Date
              </label>
              <input
                type="date"
                id="due_date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <Link
              to="/tasks"
              className="px-6 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:opacity-80 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-primary px-6 py-2.5 rounded-lg font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="glass-i fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="glass-i fas fa-save mr-2" aria-hidden="true"></i>
                  {isEdit ? 'Update' : 'Create'} Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
