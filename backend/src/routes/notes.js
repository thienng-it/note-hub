/**
 * Notes Routes.
 */
const express = require('express');
const router = express.Router();
const NoteService = require('../services/noteService');
const { jwtRequired } = require('../middleware/auth');
const db = require('../config/database');

/**
 * GET /api/notes - List all notes for user
 */
router.get('/', jwtRequired, async (req, res) => {
  try {
    const { view = 'all', q = '', tag = '' } = req.query;
    
    const notes = await NoteService.getNotesForUser(req.userId, view, q, tag);
    const tags = await NoteService.getTagsForUser(req.userId);

    res.json({
      notes: notes.map(note => ({
        id: note.id,
        title: note.title,
        body: note.body,
        excerpt: NoteService.getExcerpt(note.body),
        pinned: !!note.pinned,
        favorite: !!note.favorite,
        archived: !!note.archived,
        created_at: note.created_at,
        updated_at: note.updated_at,
        tags: note.tags
      })),
      tags
    });
  } catch (error) {
    console.error('List notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notes/:id - Get a specific note
 */
router.get('/:id', jwtRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const { note, hasAccess, canEdit } = await NoteService.checkNoteAccess(noteId, req.userId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      note: {
        id: note.id,
        title: note.title,
        body: note.body,
        html: NoteService.renderMarkdown(note.body),
        pinned: !!note.pinned,
        favorite: !!note.favorite,
        archived: !!note.archived,
        created_at: note.created_at,
        updated_at: note.updated_at,
        tags: note.tags,
        can_edit: canEdit
      }
    });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notes - Create a new note
 */
router.post('/', jwtRequired, async (req, res) => {
  try {
    const { title, body = '', tags = '', pinned = false, favorite = false, archived = false } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const note = await NoteService.createNote(
      req.userId,
      title.trim(),
      body,
      tags,
      pinned,
      favorite,
      archived
    );

    res.status(201).json({
      note: {
        id: note.id,
        title: note.title,
        body: note.body,
        pinned: !!note.pinned,
        favorite: !!note.favorite,
        archived: !!note.archived,
        created_at: note.created_at,
        tags: note.tags
      }
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT/PATCH /api/notes/:id - Update a note
 */
router.put('/:id', jwtRequired, updateNote);
router.patch('/:id', jwtRequired, updateNote);

async function updateNote(req, res) {
  try {
    const noteId = parseInt(req.params.id, 10);
    const { note, hasAccess, canEdit } = await NoteService.checkNoteAccess(noteId, req.userId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have edit permissions for this note' });
    }

    const { title, body, tags, pinned, favorite, archived } = req.body;

    const updatedNote = await NoteService.updateNote(
      noteId,
      title,
      body,
      tags,
      pinned,
      favorite,
      archived
    );

    res.json({
      note: {
        id: updatedNote.id,
        title: updatedNote.title,
        body: updatedNote.body,
        excerpt: NoteService.getExcerpt(updatedNote.body),
        pinned: !!updatedNote.pinned,
        favorite: !!updatedNote.favorite,
        archived: !!updatedNote.archived,
        created_at: updatedNote.created_at,
        updated_at: updatedNote.updated_at,
        tags: updatedNote.tags
      }
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/notes/:id - Delete a note
 */
router.delete('/:id', jwtRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const note = await NoteService.getNoteById(noteId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the note owner can delete it' });
    }

    await NoteService.deleteNote(noteId, req.userId);

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notes/:id/toggle-pin - Toggle note pin status
 */
router.post('/:id/toggle-pin', jwtRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const note = await NoteService.getNoteById(noteId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the note owner can pin/unpin' });
    }

    const updatedNote = await NoteService.updateNote(noteId, undefined, undefined, undefined, !note.pinned);

    res.json({
      pinned: !!updatedNote.pinned,
      message: updatedNote.pinned ? 'Note pinned' : 'Note unpinned'
    });
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notes/:id/toggle-favorite - Toggle note favorite status
 */
router.post('/:id/toggle-favorite', jwtRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const { note, hasAccess } = await NoteService.checkNoteAccess(noteId, req.userId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedNote = await NoteService.updateNote(noteId, undefined, undefined, undefined, undefined, !note.favorite);

    res.json({
      favorite: !!updatedNote.favorite,
      message: updatedNote.favorite ? 'Note favorited' : 'Note unfavorited'
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notes/:id/toggle-archive - Toggle note archive status
 */
router.post('/:id/toggle-archive', jwtRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const note = await NoteService.getNoteById(noteId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the note owner can archive' });
    }

    const updatedNote = await NoteService.updateNote(noteId, undefined, undefined, undefined, undefined, undefined, !note.archived);

    res.json({
      archived: !!updatedNote.archived,
      message: updatedNote.archived ? 'Note archived' : 'Note unarchived'
    });
  } catch (error) {
    console.error('Toggle archive error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notes/:id/shares - Get note shares
 */
router.get('/:id/shares', jwtRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const note = await NoteService.getNoteById(noteId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the note owner can view shares' });
    }

    const shares = await db.query(`
      SELECT sn.*, u.username, u.email
      FROM share_notes sn
      JOIN users u ON sn.shared_with_id = u.id
      WHERE sn.note_id = ?
    `, [noteId]);

    res.json({ shares });
  } catch (error) {
    console.error('Get shares error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notes/:id/share - Share a note
 */
router.post('/:id/share', jwtRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const { username, can_edit = false } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const note = await NoteService.getNoteById(noteId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the note owner can share' });
    }

    const result = await NoteService.shareNote(noteId, req.userId, username, can_edit);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      message: `Note shared with ${username}`,
      shared_with: result.sharedWith
    });
  } catch (error) {
    console.error('Share note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/notes/:id/share/:shareId - Unshare a note
 */
router.delete('/:id/share/:shareId', jwtRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const shareId = parseInt(req.params.shareId, 10);

    const note = await NoteService.getNoteById(noteId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the note owner can unshare' });
    }

    await NoteService.unshareNote(noteId, shareId);

    res.json({ message: 'Note unshared successfully' });
  } catch (error) {
    console.error('Unshare note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
