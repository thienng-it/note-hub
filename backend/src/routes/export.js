/**
 * Export/Import Routes.
 * Allows users to export and import their notes and tasks data.
 */
import express from 'express';
import logger from '../config/logger.js';

const router = express.Router();

import db from '../config/database.js';
import { jwtRequired } from '../middleware/auth.js';
import * as responseHandler from '../utils/responseHandler.js';

/**
 * GET /api/v1/export/data - Export user's notes and tasks as JSON
 */
router.get('/data', jwtRequired, async (req, res) => {
  try {
    const userId = req.userId;

    // Fetch all user's notes with tags
    const notes = await db.query(
      `SELECT n.id, n.title, n.body, n.pinned, n.favorite, n.archived, 
              n.images, n.created_at, n.updated_at
       FROM notes n
       WHERE n.owner_id = ?
       ORDER BY n.created_at DESC`,
      [userId],
    );

    // Fetch tags for each note
    for (const note of notes) {
      const tags = await db.query(
        `SELECT t.name 
         FROM tags t 
         INNER JOIN note_tag nt ON t.id = nt.tag_id 
         WHERE nt.note_id = ?`,
        [note.id],
      );
      note.tags = tags.map((t) => t.name);
      // Parse images JSON if present
      if (note.images) {
        try {
          note.images = JSON.parse(note.images);
        } catch {
          note.images = [];
        }
      }
    }

    // Fetch all user's tasks
    const tasks = await db.query(
      `SELECT id, title, description, priority, completed, due_date, 
              images, created_at
       FROM tasks
       WHERE owner_id = ?
       ORDER BY created_at DESC`,
      [userId],
    );

    // Parse images JSON for tasks if present
    for (const task of tasks) {
      if (task.images) {
        try {
          task.images = JSON.parse(task.images);
        } catch {
          task.images = [];
        }
      }
    }

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user: {
        username: req.user.username,
        email: req.user.email,
      },
      notes,
      tasks,
    };

    logger.info(
      `User ${req.user.username} exported ${notes.length} notes and ${tasks.length} tasks`,
    );

    return responseHandler.success(res, exportData, {
      message: 'Data exported successfully',
    });
  } catch (error) {
    logger.error('Export error:', error);
    return responseHandler.error(res, 'Failed to export data', {
      statusCode: 500,
      errorCode: 'EXPORT_ERROR',
    });
  }
});

/**
 * POST /api/v1/export/import - Import notes and tasks from JSON
 */
router.post('/import', jwtRequired, async (req, res) => {
  try {
    const userId = req.userId;
    const { notes = [], tasks = [], overwrite = false } = req.body;

    if (!Array.isArray(notes) && !Array.isArray(tasks)) {
      return responseHandler.validationError(res, {
        message: 'Invalid import data format',
      });
    }

    let importedNotes = 0;
    let importedTasks = 0;
    let skippedNotes = 0;
    let skippedTasks = 0;

    // Import notes
    if (Array.isArray(notes)) {
      for (const noteData of notes) {
        if (!noteData.title || !noteData.body) {
          skippedNotes++;
          continue;
        }

        // Check if note with same title already exists
        const existing = await db.queryOne(
          `SELECT id FROM notes WHERE title = ? AND owner_id = ?`,
          [noteData.title, userId],
        );

        if (existing && !overwrite) {
          skippedNotes++;
          continue;
        }

        try {
          if (existing && overwrite) {
            // Update existing note
            await db.run(
              `UPDATE notes 
               SET body = ?, pinned = ?, favorite = ?, archived = ?, images = ?
               WHERE id = ?`,
              [
                noteData.body,
                noteData.pinned ? 1 : 0,
                noteData.favorite ? 1 : 0,
                noteData.archived ? 1 : 0,
                noteData.images ? JSON.stringify(noteData.images) : null,
                existing.id,
              ],
            );

            // Remove existing tags
            await db.run(`DELETE FROM note_tag WHERE note_id = ?`, [existing.id]);

            // Add new tags
            if (noteData.tags && Array.isArray(noteData.tags)) {
              for (const tagName of noteData.tags) {
                // Get or create tag
                let tag = await db.queryOne(`SELECT id FROM tags WHERE name = ?`, [tagName]);
                if (!tag) {
                  const result = await db.run(`INSERT INTO tags (name) VALUES (?)`, [tagName]);
                  tag = { id: result.insertId };
                }
                await db.run(`INSERT OR IGNORE INTO note_tag (note_id, tag_id) VALUES (?, ?)`, [
                  existing.id,
                  tag.id,
                ]);
              }
            }
          } else {
            // Create new note
            const result = await db.run(
              `INSERT INTO notes (title, body, pinned, favorite, archived, images, owner_id) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                noteData.title,
                noteData.body,
                noteData.pinned ? 1 : 0,
                noteData.favorite ? 1 : 0,
                noteData.archived ? 1 : 0,
                noteData.images ? JSON.stringify(noteData.images) : null,
                userId,
              ],
            );

            // Add tags
            if (noteData.tags && Array.isArray(noteData.tags)) {
              for (const tagName of noteData.tags) {
                // Get or create tag
                let tag = await db.queryOne(`SELECT id FROM tags WHERE name = ?`, [tagName]);
                if (!tag) {
                  const tagResult = await db.run(`INSERT INTO tags (name) VALUES (?)`, [tagName]);
                  tag = { id: tagResult.insertId };
                }
                await db.run(`INSERT OR IGNORE INTO note_tag (note_id, tag_id) VALUES (?, ?)`, [
                  result.insertId,
                  tag.id,
                ]);
              }
            }
          }
          importedNotes++;
        } catch (error) {
          logger.error('Error importing note:', error);
          skippedNotes++;
        }
      }
    }

    // Import tasks
    if (Array.isArray(tasks)) {
      for (const taskData of tasks) {
        if (!taskData.title) {
          skippedTasks++;
          continue;
        }

        // Check if task with same title already exists
        const existing = await db.queryOne(
          `SELECT id FROM tasks WHERE title = ? AND owner_id = ?`,
          [taskData.title, userId],
        );

        if (existing && !overwrite) {
          skippedTasks++;
          continue;
        }

        try {
          if (existing && overwrite) {
            // Update existing task
            await db.run(
              `UPDATE tasks 
               SET description = ?, priority = ?, completed = ?, due_date = ?, images = ?
               WHERE id = ?`,
              [
                taskData.description || null,
                taskData.priority || 'medium',
                taskData.completed ? 1 : 0,
                taskData.due_date || null,
                taskData.images ? JSON.stringify(taskData.images) : null,
                existing.id,
              ],
            );
          } else {
            // Create new task
            await db.run(
              `INSERT INTO tasks (title, description, priority, completed, due_date, images, owner_id) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                taskData.title,
                taskData.description || null,
                taskData.priority || 'medium',
                taskData.completed ? 1 : 0,
                taskData.due_date || null,
                taskData.images ? JSON.stringify(taskData.images) : null,
                userId,
              ],
            );
          }
          importedTasks++;
        } catch (error) {
          logger.error('Error importing task:', error);
          skippedTasks++;
        }
      }
    }

    logger.info(
      `User ${req.user.username} imported ${importedNotes} notes, ${importedTasks} tasks ` +
        `(skipped: ${skippedNotes} notes, ${skippedTasks} tasks)`,
    );

    return responseHandler.success(
      res,
      {
        imported: {
          notes: importedNotes,
          tasks: importedTasks,
        },
        skipped: {
          notes: skippedNotes,
          tasks: skippedTasks,
        },
      },
      {
        message: `Successfully imported ${importedNotes} notes and ${importedTasks} tasks`,
      },
    );
  } catch (error) {
    logger.error('Import error:', error);
    return responseHandler.error(res, 'Failed to import data', {
      statusCode: 500,
      errorCode: 'IMPORT_ERROR',
    });
  }
});

export default router;
