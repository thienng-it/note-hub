import express from 'express';
import db from '../config/database.js';
import NoteService from '../services/noteService.js';
import TaskService from '../services/taskService.js';

const router = express.Router();

router.get('/notes/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token) {
      return res.status(404).json({ error: 'Shared note not found' });
    }

    const share = await db.queryOne(
      `
      SELECT note_id, expires_at
      FROM public_note_shares
      WHERE token = ?
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `,
      [token],
    );

    if (!share?.note_id) {
      return res.status(404).json({ error: 'Shared note not found' });
    }

    const note = await NoteService.getNoteById(share.note_id);
    if (!note) {
      return res.status(404).json({ error: 'Shared note not found' });
    }

    res.json({
      note: {
        id: note.id,
        title: note.title,
        body: note.body,
        images: note.images ? JSON.parse(note.images) : [],
        pinned: !!note.pinned,
        favorite: !!note.favorite,
        archived: !!note.archived,
        folder_id: note.folder_id ?? null,
        created_at: note.created_at,
        updated_at: note.updated_at,
        tags: note.tags || [],
        can_edit: false,
      },
    });
  } catch (_error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/tasks/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token) {
      return res.status(404).json({ error: 'Shared task not found' });
    }

    const share = await db.queryOne(
      `
      SELECT task_id, expires_at
      FROM public_task_shares
      WHERE token = ?
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `,
      [token],
    );

    if (!share?.task_id) {
      return res.status(404).json({ error: 'Shared task not found' });
    }

    const task = await TaskService.getTaskById(share.task_id);
    if (!task) {
      return res.status(404).json({ error: 'Shared task not found' });
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
        folder_id: task.folder_id ?? null,
        created_at: task.created_at,
        updated_at: task.updated_at,
        is_overdue: TaskService.isOverdue(task),
      },
    });
  } catch (_error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
