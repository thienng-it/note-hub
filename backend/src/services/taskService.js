/**
 * Task Service for task management operations.
 */
const { Task, Op, getSequelize } = require('../models');

class TaskService {
  /**
   * Get all tasks for a user with optional filter.
   */
  static async getTasksForUser(userId, filterType = 'all') {
    const where = { owner_id: userId };

    switch (filterType) {
      case 'active':
        where.completed = false;
        break;
      case 'completed':
        where.completed = true;
        break;
      case 'overdue':
        where.completed = false;
        where.due_date = { [Op.lt]: new Date() };
        break;
    }

    const sequelize = getSequelize();
    const tasks = await Task.findAll({
      where,
      order: [
        [sequelize.literal('CASE WHEN completed = 0 THEN 0 ELSE 1 END'), 'ASC'],
        [sequelize.literal(`CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END`), 'ASC'],
        ['due_date', 'ASC NULLS LAST'],
        ['created_at', 'DESC']
      ],
      raw: true
    });

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
    const total = await Task.count({ where: { owner_id: userId } });
    const completed = await Task.count({ where: { owner_id: userId, completed: true } });
    const active = await Task.count({ where: { owner_id: userId, completed: false } });

    return {
      total: total || 0,
      completed: completed || 0,
      active: active || 0
    };
  }

  /**
   * Check if a user has access to a task.
   */
  static async checkTaskAccess(taskId, userId) {
    const task = await Task.findOne({
      where: { id: taskId, owner_id: userId }
    });
    return task;
  }

  /**
   * Create a new task.
   */
  static async createTask(userId, title, description = null, dueDate = null, priority = 'medium') {
    const task = await Task.create({
      title,
      description,
      due_date: dueDate,
      priority,
      owner_id: userId
    });

    return this.getTaskById(task.id);
  }

  /**
   * Update an existing task.
   */
  static async updateTask(taskId, title, description, dueDate, priority, completed) {
    const updates = {};

    if (title !== undefined) {
      updates.title = title;
    }
    if (description !== undefined) {
      updates.description = description;
    }
    if (dueDate !== undefined) {
      updates.due_date = dueDate;
    }
    if (priority !== undefined) {
      updates.priority = priority;
    }
    if (completed !== undefined) {
      updates.completed = completed;
    }

    if (Object.keys(updates).length > 0) {
      await Task.update(updates, { where: { id: taskId } });
    }

    return this.getTaskById(taskId);
  }

  /**
   * Toggle task completion status.
   */
  static async toggleTask(taskId) {
    const task = await Task.findByPk(taskId);
    if (task) {
      await task.update({ completed: !task.completed });
    }
    return this.getTaskById(taskId);
  }

  /**
   * Delete a task.
   */
  static async deleteTask(taskId) {
    await Task.destroy({ where: { id: taskId } });
  }

  /**
   * Get a task by ID.
   */
  static async getTaskById(taskId) {
    const task = await Task.findByPk(taskId, { raw: true });
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
