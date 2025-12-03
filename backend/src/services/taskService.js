/**
 * Task Service for task management operations.
 */
const db = require('../config/database');

class TaskService {
  /**
   * Get all tasks for a user with optional filter.
   */
  static async getTasksForUser(userId, filterType = 'all') {
    let sql = `SELECT * FROM tasks WHERE owner_id = ?`;
    const params = [userId];

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

    const tasks = await db.query(sql, params);

    // Add computed properties
    return tasks.map(task => ({
      ...task,
      isOverdue: this.isOverdue(task)
    }));
  }

  /**
   * Get task counts for a user.
   */
  static async getTaskCounts(userId) {
    const total = await db.queryOne(
      `SELECT COUNT(*) as count FROM tasks WHERE owner_id = ?`,
      [userId]
    );
    const completed = await db.queryOne(
      `SELECT COUNT(*) as count FROM tasks WHERE owner_id = ? AND completed = 1`,
      [userId]
    );
    const active = await db.queryOne(
      `SELECT COUNT(*) as count FROM tasks WHERE owner_id = ? AND completed = 0`,
      [userId]
    );

    return {
      total: total?.count || 0,
      completed: completed?.count || 0,
      active: active?.count || 0
    };
  }

  /**
   * Check if a user has access to a task.
   */
  static async checkTaskAccess(taskId, userId) {
    const task = await db.queryOne(
      `SELECT * FROM tasks WHERE id = ? AND owner_id = ?`,
      [taskId, userId]
    );
    return task;
  }

  /**
   * Create a new task.
   */
  static async createTask(userId, title, description = null, dueDate = null, priority = 'medium') {
    const result = await db.run(`
      INSERT INTO tasks (title, description, due_date, priority, owner_id)
      VALUES (?, ?, ?, ?, ?)
    `, [title, description, dueDate, priority, userId]);

    return this.getTaskById(result.insertId);
  }

  /**
   * Update an existing task.
   */
  static async updateTask(taskId, title, description, dueDate, priority, completed) {
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
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

    updates.push("updated_at = datetime('now')");

    if (updates.length > 0) {
      params.push(taskId);
      await db.run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return this.getTaskById(taskId);
  }

  /**
   * Toggle task completion status.
   */
  static async toggleTask(taskId) {
    await db.run(`
      UPDATE tasks SET completed = NOT completed, updated_at = datetime('now') WHERE id = ?
    `, [taskId]);
    return this.getTaskById(taskId);
  }

  /**
   * Delete a task.
   */
  static async deleteTask(taskId) {
    await db.run(`DELETE FROM tasks WHERE id = ?`, [taskId]);
  }

  /**
   * Get a task by ID.
   */
  static async getTaskById(taskId) {
    const task = await db.queryOne(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
    if (task) {
      task.isOverdue = this.isOverdue(task);
    }
    return task;
  }

  /**
   * Check if a task is overdue.
   */
  static isOverdue(task) {
    if (!task.due_date || task.completed) {
      return false;
    }
    return new Date(task.due_date) < new Date();
  }
}

module.exports = TaskService;
