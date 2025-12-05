/**
 * Tasks Routes.
 */
const express = require('express');
const router = express.Router();
const TaskService = require('../services/taskService');
const { jwtRequired } = require('../middleware/auth');

/**
 * GET /api/tasks - List all tasks for user
 */
router.get('/', jwtRequired, async (req, res) => {
  try {
    const { filter = 'all' } = req.query;
    
    const tasks = await TaskService.getTasksForUser(req.userId, filter);
    const counts = await TaskService.getTaskCounts(req.userId);

    res.json({
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        images: task.images ? JSON.parse(task.images) : [],
        completed: !!task.completed,
        priority: task.priority,
        due_date: task.due_date,
        created_at: task.created_at,
        is_overdue: task.isOverdue
      })),
      counts
    });
  } catch (error) {
    console.error('List tasks error:', error);
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

    res.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        images: task.images ? JSON.parse(task.images) : [],
        completed: !!task.completed,
        priority: task.priority,
        due_date: task.due_date,
        created_at: task.created_at,
        is_overdue: TaskService.isOverdue(task)
      }
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tasks - Create a new task
 */
router.post('/', jwtRequired, async (req, res) => {
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
      images
    );

    res.status(201).json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        images: task.images ? JSON.parse(task.images) : [],
        completed: !!task.completed,
        priority: task.priority,
        due_date: task.due_date,
        created_at: task.created_at
      }
    });
  } catch (error) {
    console.error('Create task error:', error);
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

    const { title, description, due_date, priority, completed, images } = req.body;

    const updatedTask = await TaskService.updateTask(
      taskId,
      title,
      description,
      due_date,
      priority,
      completed,
      images
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
        is_overdue: TaskService.isOverdue(updatedTask)
      }
    });
  } catch (error) {
    console.error('Update task error:', error);
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
      message: updatedTask.completed ? 'Task completed' : 'Task marked as active'
    });
  } catch (error) {
    console.error('Toggle task error:', error);
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

    await TaskService.deleteTask(taskId);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
