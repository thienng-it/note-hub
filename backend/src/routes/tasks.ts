/**
 * Tasks Routes.
 */

import type { Request, Response } from 'express';
import express from 'express';
import { jwtRequired } from '../middleware/auth';

const TaskService = require('../services/taskService');
const router = express.Router();

/**
 * GET /api/tasks - List all tasks for user
 */
router.get('/', jwtRequired, async (req: Request, res: Response) => {
  try {
    const { filter = 'all' } = req.query;
    const filterStr = typeof filter === 'string' ? filter : 'all';

    const tasks = await TaskService.getTasksForUser(req.userId, filterStr);
    const counts = await TaskService.getTaskCounts(req.userId);

    return res.json({
      tasks: tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        images: task.images ? JSON.parse(task.images) : [],
        completed: !!task.completed,
        priority: task.priority,
        due_date: task.due_date,
        created_at: task.created_at,
        is_overdue: task.isOverdue,
      })),
      counts,
    });
  } catch (error) {
    console.error('List tasks error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tasks/:id - Get a specific task
 */
router.get('/:id', jwtRequired, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id!, 10);
    const task = await TaskService.checkTaskAccess(taskId, req.userId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    return res.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        images: task.images ? JSON.parse(task.images) : [],
        completed: !!task.completed,
        priority: task.priority,
        due_date: task.due_date,
        created_at: task.created_at,
        is_overdue: TaskService.isOverdue(task),
      },
    });
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tasks - Create a new task
 */
router.post('/', jwtRequired, async (req: Request, res: Response) => {
  try {
    const { title, description, due_date, priority = 'medium', images = [] } = req.body;

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
    );

    return res.status(201).json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        images: task.images ? JSON.parse(task.images) : [],
        completed: !!task.completed,
        priority: task.priority,
        due_date: task.due_date,
        created_at: task.created_at,
      },
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT/PATCH /api/tasks/:id - Update a task
 */
async function updateTask(req: Request, res: Response) {
  try {
    const taskId = parseInt(req.params.id!, 10);
    const task = await TaskService.checkTaskAccess(taskId, req.userId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    const { title, description, due_date, priority, completed, images } = req.body;

    const updatedTask = await TaskService.updateTask(
      taskId,
      title,
      description,
      due_date,
      priority,
      completed,
      images,
    );

    return res.json({
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description,
        images: updatedTask.images ? JSON.parse(updatedTask.images) : [],
        completed: !!updatedTask.completed,
        priority: updatedTask.priority,
        due_date: updatedTask.due_date,
        is_overdue: TaskService.isOverdue(updatedTask),
      },
    });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

router.put('/:id', jwtRequired, updateTask);
router.patch('/:id', jwtRequired, updateTask);

/**
 * POST /api/tasks/:id/toggle - Toggle task completion
 */
router.post('/:id/toggle', jwtRequired, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id!, 10);
    const task = await TaskService.checkTaskAccess(taskId, req.userId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    const updatedTask = await TaskService.toggleTask(taskId);

    return res.json({
      completed: !!updatedTask.completed,
      message: updatedTask.completed ? 'Task completed' : 'Task marked as active',
    });
  } catch (error) {
    console.error('Toggle task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/tasks/:id - Delete a task
 */
router.delete('/:id', jwtRequired, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id!, 10);
    const task = await TaskService.checkTaskAccess(taskId, req.userId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    await TaskService.deleteTask(taskId);

    return res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export = router;
