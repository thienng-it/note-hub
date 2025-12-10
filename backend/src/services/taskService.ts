/**
 * Task Service for task management operations.
 */
import db from '../config/database';
import type { Task } from '../types';

interface TaskWithOverdue extends Task {
  isOverdue: boolean;
}

interface TaskCounts {
  total: number;
  completed: number;
  active: number;
}

type FilterType = 'all' | 'active' | 'completed' | 'overdue';
type Priority = 'high' | 'medium' | 'low';

class TaskService {
  /**
   * Get all tasks for a user with optional filter.
   */
  static async getTasksForUser(
    userId: number,
    filterType: FilterType = 'all',
  ): Promise<TaskWithOverdue[]> {
    let sql = `SELECT * FROM tasks WHERE owner_id = ?`;
    const params: unknown[] = [userId];

    switch (filterType) {
      case 'active':
        sql += ` AND completed = 0`;
        break;
      case 'completed':
        sql += ` AND completed = 1`;
        break;
      case 'overdue':
        sql += ` AND completed = 0 AND due_date < datetime('now')`;
        break;
    }

    sql += ` ORDER BY
      CASE WHEN completed = 0 THEN 0 ELSE 1 END,
      CASE priority
        WHEN 'high' THEN 0
        WHEN 'medium' THEN 1
        WHEN 'low' THEN 2
        ELSE 3
      END,
      due_date ASC NULLS LAST,
      created_at DESC`;

    const tasks = await db.query<Task>(sql, params);

    // Add computed properties
    return tasks.map((task) => ({
      ...task,
      isOverdue: TaskService.isOverdue(task),
    }));
  }

  /**
   * Get task counts for a user.
   */
  static async getTaskCounts(userId: number): Promise<TaskCounts> {
    const total = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM tasks WHERE owner_id = ?`,
      [userId],
    );
    const completed = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM tasks WHERE owner_id = ? AND completed = 1`,
      [userId],
    );
    const active = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM tasks WHERE owner_id = ? AND completed = 0`,
      [userId],
    );

    return {
      total: total?.count || 0,
      completed: completed?.count || 0,
      active: active?.count || 0,
    };
  }

  /**
   * Check if a user has access to a task.
   */
  static async checkTaskAccess(taskId: number, userId: number): Promise<Task | null> {
    const task = await db.queryOne<Task>(`SELECT * FROM tasks WHERE id = ? AND owner_id = ?`, [
      taskId,
      userId,
    ]);
    return task;
  }

  /**
   * Create a new task.
   */
  static async createTask(
    userId: number,
    title: string,
    description: string | null = null,
    dueDate: string | null = null,
    priority: Priority = 'medium',
    images: string[] = [],
  ): Promise<Task | null> {
    const imagesJson = Array.isArray(images) ? JSON.stringify(images) : null;

    const result = await db.run(
      `
      INSERT INTO tasks (title, description, images, due_date, priority, owner_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [title, description, imagesJson, dueDate, priority, userId],
    );

    if (result.insertId) {
      return TaskService.getTaskById(result.insertId);
    }
    return null;
  }

  /**
   * Update an existing task.
   */
  static async updateTask(
    taskId: number,
    title?: string,
    description?: string | null,
    dueDate?: string | null,
    priority?: Priority,
    completed?: boolean,
    images?: string[],
  ): Promise<Task | null> {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (images !== undefined) {
      updates.push('images = ?');
      params.push(Array.isArray(images) ? JSON.stringify(images) : null);
    }
    if (dueDate !== undefined) {
      updates.push('due_date = ?');
      params.push(dueDate);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (completed !== undefined) {
      updates.push('completed = ?');
      params.push(completed ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(taskId);
      await db.run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return TaskService.getTaskById(taskId);
  }

  /**
   * Toggle task completion status.
   */
  static async toggleTask(taskId: number): Promise<Task | null> {
    await db.run(
      `
      UPDATE tasks SET completed = NOT completed WHERE id = ?
    `,
      [taskId],
    );
    return TaskService.getTaskById(taskId);
  }

  /**
   * Delete a task.
   */
  static async deleteTask(taskId: number): Promise<void> {
    await db.run(`DELETE FROM tasks WHERE id = ?`, [taskId]);
  }

  /**
   * Get a task by ID.
   */
  static async getTaskById(taskId: number): Promise<Task | null> {
    const task = await db.queryOne<Task>(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
    if (task) {
      (task as TaskWithOverdue).isOverdue = TaskService.isOverdue(task);
    }
    return task;
  }

  /**
   * Check if a task is overdue.
   */
  static isOverdue(task: Task): boolean {
    if (!task.due_date || task.completed) {
      return false;
    }
    return new Date(task.due_date) < new Date();
  }
}

export default TaskService;
