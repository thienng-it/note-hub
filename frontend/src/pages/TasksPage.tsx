import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { tasksApi } from '../api/client';
import type { Task, TaskFilterType } from '../types';
import { taskTemplates, type TaskTemplate } from '../utils/templates';
import { ImageUpload } from '../components/ImageUpload';

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // New task form
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isCreating, setIsCreating] = useState(false);

  // Edit task
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Hide/show tasks functionality
  const [hiddenTasks, setHiddenTasks] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('hiddenTasks');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleHideTask = (taskId: number) => {
    setHiddenTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      try {
        localStorage.setItem('hiddenTasks', JSON.stringify([...newSet]));
      } catch {
        // Silently fail if localStorage is unavailable (e.g., private browsing, storage full)
      }
      return newSet;
    });
  };

  const hideAllTasks = () => {
    const allTaskIds = new Set(tasks.map(task => task.id));
    setHiddenTasks(allTaskIds);
    try {
      localStorage.setItem('hiddenTasks', JSON.stringify([...allTaskIds]));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  };

  const showAllTasks = () => {
    setHiddenTasks(new Set());
    try {
      localStorage.setItem('hiddenTasks', JSON.stringify([]));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  };

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const fetchedTasks = await tasksApi.list(filter);
      setTasks(fetchedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const task = await tasksApi.create({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        images: newImages,
        due_date: newDueDate || undefined,
        priority: newPriority,
      });
      setTasks([task, ...tasks]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const updated = await tasksApi.toggleComplete(task);
      setTasks(tasks.map(t => (t.id === task.id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await tasksApi.delete(task.id);
      setTasks(tasks.filter(t => t.id !== task.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const handleUpdateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      const updated = await tasksApi.update(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description,
        due_date: editingTask.due_date,
        priority: editingTask.priority,
      });
      setTasks(tasks.map(t => (t.id === updated.id ? updated : t)));
      setEditingTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setShowTemplates(false);
    setNewTitle('');
    setNewDescription('');
    setNewImages([]);
    setNewDueDate('');
    setNewPriority('medium');
  };

  const applyTaskTemplate = (template: TaskTemplate) => {
    setNewTitle(template.title);
    setNewDescription(template.description);
    setNewPriority(template.priority);
    setShowTemplates(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    active: tasks.filter(t => !t.completed).length,
    overdue: tasks.filter(t => t.is_overdue && !t.completed).length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold flex items-center text-[var(--text-primary)]">
          <i className="glass-i fas fa-tasks mr-3 text-blue-600"></i>
          Tasks
        </h1>
        <div className="flex items-center gap-2">
          {tasks.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={hideAllTasks}
                className="btn-secondary-glass text-sm"
                title="Hide all task contents"
              >
                <i className="glass-i fas fa-eye-slash mr-2"></i>Hide All
              </button>
              <button
                onClick={showAllTasks}
                className="btn-secondary-glass text-sm"
                title="Show all task contents"
              >
                <i className="glass-i fas fa-eye mr-2"></i>Show All
              </button>
            </div>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-apple px-4 py-2 rounded-lg font-medium"
          >
            <i className={`glass-i fas fa-${showForm ? 'times' : 'plus'} mr-2`}></i>
            {showForm ? 'Cancel' : 'New Task'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-sm text-[var(--text-muted)]">Total</div>
        </div>
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          <div className="text-sm text-[var(--text-muted)]">Active</div>
        </div>
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-[var(--text-muted)]">Completed</div>
        </div>
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          <div className="text-sm text-[var(--text-muted)]">Overdue</div>
        </div>
      </div>

      {/* New Task Form */}
      {showForm && (
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              <i className="glass-i fas fa-plus-circle mr-2 text-blue-600"></i>
              Create New Task
            </h2>
            {!showTemplates && (
              <button
                type="button"
                onClick={() => setShowTemplates(true)}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                <i className="glass-i fas fa-magic mr-1"></i>
                Use template
              </button>
            )}
          </div>

          {/* Template Selection */}
          {showTemplates && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-[var(--text-primary)]">
                  <i className="glass-i fas fa-magic mr-2 text-purple-600"></i>
                  Choose a Template
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTemplates(false)}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <i className="glass-i fas fa-times mr-1"></i>
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {taskTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTaskTemplate(template)}
                    className="glass-card p-3 rounded-lg text-left hover:shadow-md transition-all hover:scale-[1.02] border border-[var(--border-color)] hover:border-blue-500"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <i className={`glass-i fas ${template.icon} text-blue-600 text-sm`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-0.5">
                          {template.name}
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                          {template.templateDescription}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="glass-input w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What needs to be done?"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="glass-input w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder="Add more details (optional)"
                rows={2}
              />
            </div>
            <ImageUpload
              images={newImages}
              onImagesChange={setNewImages}
              maxImages={3}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Due Date
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="glass-input w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Priority
                </label>
                <select
                  id="priority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="glass-input w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="btn-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <i className="glass-i fas fa-spinner fa-spin mr-2"></i>Creating...
                  </>
                ) : (
                  <>
                    <i className="glass-i fas fa-plus mr-2"></i>Create Task
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card flex space-x-1 p-1 rounded-lg bg-[var(--bg-tertiary)]">
        {(['all', 'active', 'completed', 'overdue'] as TaskFilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 text-center py-2 px-4 rounded-md transition-all capitalize ${
              filter === f
                ? 'shadow-sm bg-[var(--bg-secondary)] text-blue-600 dark:text-blue-400'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
          <i className="glass-i fas fa-exclamation-triangle mr-2"></i>
          {error}
        </div>
      )}

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <i className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600"></i>
        </div>
      ) : tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`card p-4 rounded-xl transition-all ${
                task.completed ? 'opacity-60' : ''
              } ${task.is_overdue && !task.completed ? 'border-l-4 border-l-red-500' : ''}`}
            >
              {editingTask?.id === task.id ? (
                /* Edit Mode */
                <form onSubmit={handleUpdateTask} className="space-y-4">
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-lg"
                    required
                  />
                  <textarea
                    value={editingTask.description || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-lg resize-y"
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="date"
                      value={editingTask.due_date?.split('T')[0] || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                      className="glass-input w-full px-3 py-2 rounded-lg"
                    />
                    <select
                      value={editingTask.priority}
                      onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                      className="glass-input w-full px-3 py-2 rounded-lg"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingTask(null)}
                      className="px-3 py-1 rounded bg-gray-500 text-white hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-apple px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                /* View Mode */
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      task.completed
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'border-[var(--border-color)] hover:border-green-600'
                    }`}
                  >
                    {task.completed && <i className="glass-i fas fa-check text-xs"></i>}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`font-medium text-[var(--text-primary)] ${
                          task.completed ? 'line-through' : ''
                        }`}
                      >
                        {task.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityColor(task.priority)}`}
                      >
                        {task.priority}
                      </span>
                      {task.is_overdue && !task.completed && (
                        <span className="text-xs text-red-500">
                          <i className="glass-i fas fa-exclamation-triangle mr-1"></i>Overdue
                        </span>
                      )}
                    </div>
                    {hiddenTasks.has(task.id) ? (
                      <div className="flex items-center py-2 bg-[var(--bg-tertiary)] rounded-lg mb-2 px-3">
                        <i className="fas fa-eye-slash text-[var(--text-muted)] mr-2"></i>
                        <span className="text-sm text-[var(--text-muted)]">Content hidden</span>
                        <button
                          onClick={(e) => { e.preventDefault(); toggleHideTask(task.id); }}
                          className="ml-3 text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                        >
                          Show
                        </button>
                      </div>
                    ) : (
                      <>
                        {task.description && (
                          <p className="text-sm text-[var(--text-secondary)] mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          {task.due_date && (
                            <span>
                              <i className="glass-i fas fa-calendar mr-1"></i>
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          {task.created_at && (
                            <span>
                              <i className="glass-i fas fa-clock mr-1"></i>
                              Created {new Date(task.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleHideTask(task.id)}
                      className={`p-2 rounded-lg transition-colors ${hiddenTasks.has(task.id) ? 'text-purple-600 hover:bg-purple-500/10' : 'text-gray-400 hover:bg-[var(--bg-tertiary)] hover:text-purple-600'}`}
                      title={hiddenTasks.has(task.id) ? 'Show content' : 'Hide content'}
                    >
                      <i className={`glass-i fas ${hiddenTasks.has(task.id) ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    </button>
                    <button
                      onClick={() => setEditingTask(task)}
                      className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <i className="glass-i fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 transition-colors"
                      title="Delete"
                    >
                      <i className="glass-i fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card glass-div-center">
          <i className="glass-i fas fa-tasks text-6xl mb-4 text-[var(--text-muted)]"></i>
          <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">No tasks found</h3>
          <p className="text-[var(--text-secondary)] mb-6">
            {filter === 'all' ? 'Create your first task to get started' : `No ${filter} tasks`}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex items-center px-6 py-3 rounded-lg"
          >
            <i className="glass-i fas fa-plus mr-2"></i>Create Task
          </button>
        </div>
      )}
    </div>
  );
}
