/**
 * Tasks Routes.
 */
import express from 'express';
import logger from '../config/logger.js';
import AuditService from '../services/auditService.js';

const router = express.Router();

import { jwtRequired } from '../middleware/auth.js';
import TaskService from '../services/taskService.js';

/**
 * GET /api/tasks - List all tasks for user
 */
router.get('/', jwtRequired, async (req, res) => {
  try {
    const { filter = 'all' } = req.query;

    const tasks = await TaskService.getTasksForUser(req.userId, filter);
    const counts = await TaskService.getTaskCounts(req.userId);

    res.json({
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        images: task.images ? JSON.parse(task.images) : [],
        completed: !!task.completed,
        priority: task.priority,
        due_date: task.due_date,
        folder_id: task.folder_id,
        created_at: task.created_at,
        updated_at: task.updated_at,
        is_overdue: task.isOverdue,
      })),
      counts,
    });
  } catch (error) {
    logger.error('List tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tasks/:id - Get a specific task
 */
router.get('/:id', jwtRequired, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const task = await TaskService.checkTaskAccess(taskId, req.userId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    // Audit log: Task access
    await AuditService.logTaskAccess(
      req.userId,
      taskId,
      req.ip || req.socket?.remoteAddress,
      req.get('user-agent'),
    );

    res.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        images: task.images ? JSON.parse(task.images) : [],
        completed: !!task.completed,
        priority: task.priority,
        due_date: task.due_date,
        folder_id: task.folder_id,
        created_at: task.created_at,
        updated_at: task.updated_at,
        is_overdue: TaskService.isOverdue(task),
      },
    });
  } catch (error) {
    logger.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tasks - Create a new task
 */
router.post('/', jwtRequired, async (req, res) => {
  try {
    const {
      title,
      description,
      due_date,
      priority = 'medium',
      images = [],
      folder_id = null,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = await TaskService.createTask(
      req.userId,
      title.trim(),
      description,
      due_date,
      priority,
      images,
      folder_id,
    );

    // Audit log: Task creation
    await AuditService.logTaskCreation(req.userId, task.id, req.ip || req.socket?.remoteAddress, {
      title: title.substring(0, 100), // First 100 chars
      priority,
      hasDueDate: !!due_date,
      hasImages: images.length > 0,
    });

    res.status(201).json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        images: task.images ? JSON.parse(task.images) : [],
        completed: !!task.completed,
        priority: task.priority,
        due_date: task.due_date,
        folder_id: task.folder_id,
        created_at: task.created_at,
        updated_at: task.updated_at,
      },
    });
  } catch (error) {
    logger.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT/PATCH /api/tasks/:id - Update a task
 */
router.put('/:id', jwtRequired, updateTask);
router.patch('/:id', jwtRequired, updateTask);

async function updateTask(req, res) {
  try {
    const taskId = parseInt(req.params.id, 10);
    const task = await TaskService.checkTaskAccess(taskId, req.userId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    const { title, description, due_date, priority, completed, images, folder_id } = req.body;

    // Track what changed for audit log
    const changes = {};
    if (title !== undefined && title !== task.title) changes.title = true;
    if (description !== undefined && description !== task.description) changes.description = true;
    if (due_date !== undefined && due_date !== task.due_date) changes.due_date = true;
    if (priority !== undefined && priority !== task.priority) changes.priority = priority;
    if (completed !== undefined && completed !== !!task.completed) changes.completed = completed;
    if (images !== undefined) changes.images = true;
    if (folder_id !== undefined && folder_id !== task.folder_id) changes.folder = true;

    const updatedTask = await TaskService.updateTask(
      taskId,
      title,
      description,
      due_date,
      priority,
      completed,
      images,
      folder_id,
    );

    // Audit log: Task modification
    await AuditService.logTaskModification(
      req.userId,
      taskId,
      changes,
      req.ip || req.socket?.remoteAddress,
      req.get('user-agent'),
    );

    res.json({
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description,
        images: updatedTask.images ? JSON.parse(updatedTask.images) : [],
        completed: !!updatedTask.completed,
        priority: updatedTask.priority,
        due_date: updatedTask.due_date,
        folder_id: updatedTask.folder_id,
        updated_at: updatedTask.updated_at,
        is_overdue: TaskService.isOverdue(updatedTask),
      },
    });
  } catch (error) {
    logger.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/tasks/:id/toggle - Toggle task completion
 */
router.post('/:id/toggle', jwtRequired, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const task = await TaskService.checkTaskAccess(taskId, req.userId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    const updatedTask = await TaskService.toggleTask(taskId);

    res.json({
      completed: !!updatedTask.completed,
      message: updatedTask.completed ? 'Task completed' : 'Task marked as active',
    });
  } catch (error) {
    logger.error('Toggle task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/tasks/:id - Delete a task
 */
router.delete('/:id', jwtRequired, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const task = await TaskService.checkTaskAccess(taskId, req.userId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    // Audit log: Task deletion (before deleting)
    await AuditService.logTaskDeletion(req.userId, taskId, req.ip || req.socket?.remoteAddress, {
      title: task.title.substring(0, 100), // First 100 chars
      wasCompleted: !!task.completed,
      priority: task.priority,
    });

    await TaskService.deleteTask(taskId);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    logger.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
