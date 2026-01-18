/**
 * Notes Routes.
 */
import express from 'express';
import logger from '../config/logger.js';
import AuditService from '../services/auditService.js';

const router = express.Router();

import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import db from '../config/database.js';
import { jwtRequired } from '../middleware/auth.js';
import { recordNoteOperation, recordTagOperation } from '../middleware/metrics.js';
import FolderService from '../services/folderService.js';
import NoteService from '../services/noteService.js';

const markdownUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

async function resolveUniqueTitle(userId, desiredTitle, reservedTitles) {
  const base = (desiredTitle || 'Untitled').trim() || 'Untitled';
  let title = base;
  let suffix = 1;

  while (reservedTitles.has(title)) {
    suffix += 1;
    title = `${base} (${suffix})`;
  }

  while (true) {
    const existing = await db.queryOne(`SELECT id FROM notes WHERE title = ? AND owner_id = ?`, [
      title,
      userId,
    ]);
    if (!existing) break;
    suffix += 1;
    title = `${base} (${suffix})`;
  }

  reservedTitles.add(title);
  return title;
}

function extractFirstHeadingTitle(markdown) {
  if (!markdown) return '';
  const lines = String(markdown)
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/);
  for (const line of lines) {
    const match = /^\s*#\s+(.+?)\s*$/.exec(line);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return '';
}

async function getOrCreateFolderId(userId, name, parentId) {
  const normalized = String(name || '').trim();
  if (!normalized) return parentId;

  const trimmed = normalized.length > 100 ? normalized.substring(0, 100) : normalized;
  const existing = parentId
    ? await db.queryOne(`SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id = ?`, [
        userId,
        trimmed,
        parentId,
      ])
    : await db.queryOne(
        `SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id IS NULL`,
        [userId, trimmed],
      );

  if (existing?.id) return existing.id;
  const created = await FolderService.createFolder(userId, {
    name: trimmed,
    parent_id: parentId || null,
  });
  return created.id;
}

async function ensureFolderPath(userId, baseFolderId, relativeDir) {
  const dir = String(relativeDir || '').replace(/\\/g, '/');
  if (!dir || dir === '.' || dir === '/') return baseFolderId;

  const parts = dir
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && p !== '.');
  if (parts.length === 0) return baseFolderId;

  let parentId = baseFolderId;
  for (const part of parts) {
    parentId = await getOrCreateFolderId(userId, part, parentId);
  }
  return parentId;
}

/**
 * GET /api/notes - List all notes for user
 */
router.get('/', jwtRequired, async (req, res) => {
  try {
    const { view = 'all', q = '', tag = '' } = req.query;

    const notes = await NoteService.getNotesForUser(req.userId, view, q, tag);
    const tags = await NoteService.getTagsForUser(req.userId);

    res.json({
      notes: notes.map((note) => ({
        id: note.id,
        title: note.title,
        body: note.body,
        excerpt: NoteService.getExcerpt(note.body),
        images: note.images ? JSON.parse(note.images) : [],
        pinned: !!note.pinned,
        favorite: !!note.favorite,
        archived: !!note.archived,
        folder_id: note.folder_id,
        created_at: note.created_at,
        updated_at: note.updated_at,
        tags: note.tags,
      })),
      tags,
    });
  } catch (error) {
    logger.error('List notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(
  '/import/markdown',
  jwtRequired,
  markdownUpload.array('files', 200),
  async (req, res) => {
    try {
      const files = req.files;
      const tags = typeof req.body?.tags === 'string' ? req.body.tags : '';
      const overwrite =
        req.body?.overwrite === true ||
        req.body?.overwrite === 'true' ||
        req.body?.overwrite === '1' ||
        req.body?.overwrite === 1;

      const folderIdRaw = req.body?.folder_id;
      const folderIdParsed =
        folderIdRaw === null || folderIdRaw === undefined || folderIdRaw === ''
          ? null
          : Number.parseInt(String(folderIdRaw), 10);
      const folderId = Number.isFinite(folderIdParsed) ? folderIdParsed : null;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const reservedTitles = new Set();
      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          const originalName = String(file.originalname || 'Untitled').replace(/\\/g, '/');
          const ext = path.posix.extname(originalName).toLowerCase();
          if (ext !== '.md' && ext !== '.markdown') {
            errors.push({ file: originalName, error: 'Skipped non-markdown file' });
            continue;
          }

          const body = file.buffer ? file.buffer.toString('utf8') : '';
          const baseTitle = path.posix.basename(originalName, ext) || 'Untitled';
          const headingTitle = extractFirstHeadingTitle(body);
          const desiredTitle = headingTitle || baseTitle;

          const relativeDir = path.posix.dirname(originalName);
          const derivedFolderId = await ensureFolderPath(req.userId, folderId, relativeDir);

          if (overwrite) {
            const existing = await db.queryOne(
              `SELECT id FROM notes WHERE title = ? AND owner_id = ?`,
              [desiredTitle, req.userId],
            );

            if (existing?.id) {
              const updated = await NoteService.updateNote(
                existing.id,
                desiredTitle,
                body,
                tags,
                undefined,
                undefined,
                undefined,
                undefined,
                derivedFolderId,
              );

              await AuditService.logNoteModification(
                req.userId,
                existing.id,
                { body: true, tags: !!tags, folder: derivedFolderId !== null },
                req.ip || req.socket?.remoteAddress,
                req.get('user-agent'),
              );

              recordNoteOperation('update', true);
              if (tags && tags.length > 0) {
                recordTagOperation('update');
              }

              results.push({ id: updated.id, title: updated.title, action: 'updated' });
              continue;
            }
          }

          const title = await resolveUniqueTitle(req.userId, desiredTitle, reservedTitles);
          const note = await NoteService.createNote(
            req.userId,
            title,
            body,
            tags,
            false,
            false,
            false,
            [],
            derivedFolderId,
          );

          await AuditService.logNoteCreation(
            req.userId,
            note.id,
            req.ip || req.socket?.remoteAddress,
            {
              title: title.substring(0, 100),
              hasImages: false,
              tagCount: tags ? tags.split(',').filter((t) => t.trim()).length : 0,
            },
          );

          recordNoteOperation('create', true);
          if (tags && tags.length > 0) {
            recordTagOperation('assign');
          }

          results.push({ id: note.id, title: note.title, action: 'created' });
        } catch (error) {
          logger.error('Markdown import error:', error);
          recordNoteOperation('create', false);
          errors.push({
            file: file?.originalname,
            error: error?.message || 'Failed to import file',
          });
        }
      }

      res.status(201).json({
        imported: results.filter((r) => r.action === 'created').length,
        updated: results.filter((r) => r.action === 'updated').length,
        failed: errors.length,
        notes: results,
        errors,
      });
    } catch (error) {
      logger.error('Markdown import error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

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

    // Audit log: Note access
    await AuditService.logNoteAccess(
      req.userId,
      noteId,
      req.ip || req.socket?.remoteAddress,
      req.get('user-agent'),
    );

    res.json({
      note: {
        id: note.id,
        title: note.title,
        body: note.body,
        html: NoteService.renderMarkdown(note.body),
        images: note.images ? JSON.parse(note.images) : [],
        pinned: !!note.pinned,
        favorite: !!note.favorite,
        archived: !!note.archived,
        created_at: note.created_at,
        updated_at: note.updated_at,
        tags: note.tags,
        can_edit: canEdit,
      },
    });
  } catch (error) {
    logger.error('Get note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notes - Create a new note
 */
router.post('/', jwtRequired, async (req, res) => {
  try {
    const {
      title,
      body = '',
      tags = '',
      images = [],
      pinned = false,
      favorite = false,
      archived = false,
      folder_id = null,
    } = req.body;

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
      archived,
      images,
      folder_id,
    );

    // Audit log: Note creation
    await AuditService.logNoteCreation(req.userId, note.id, req.ip || req.socket?.remoteAddress, {
      title: title.substring(0, 100), // First 100 chars
      hasImages: images.length > 0,
      tagCount: tags ? tags.split(',').filter((t) => t.trim()).length : 0,
    });

    // Record metrics
    recordNoteOperation('create', true);
    if (tags && tags.length > 0) {
      recordTagOperation('assign');
    }

    res.status(201).json({
      note: {
        id: note.id,
        title: note.title,
        body: note.body,
        images: note.images ? JSON.parse(note.images) : [],
        pinned: !!note.pinned,
        favorite: !!note.favorite,
        archived: !!note.archived,
        folder_id: note.folder_id,
        created_at: note.created_at,
        tags: note.tags,
      },
    });
  } catch (error) {
    logger.error('Create note error:', error);
    recordNoteOperation('create', false);
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

    const { title, body, tags, images, pinned, favorite, archived, folder_id } = req.body;

    // Track what changed for audit log
    const changes = {};
    if (title !== undefined && title !== note.title) changes.title = true;
    if (body !== undefined && body !== note.body) changes.body = true;
    if (pinned !== undefined && pinned !== !!note.pinned) changes.pinned = pinned;
    if (favorite !== undefined && favorite !== !!note.favorite) changes.favorite = favorite;
    if (archived !== undefined && archived !== !!note.archived) changes.archived = archived;
    if (tags !== undefined) changes.tags = true;
    if (images !== undefined) changes.images = true;
    if (folder_id !== undefined && folder_id !== note.folder_id) changes.folder = true;

    const updatedNote = await NoteService.updateNote(
      noteId,
      title,
      body,
      tags,
      pinned,
      favorite,
      archived,
      images,
      folder_id,
    );

    // Audit log: Note modification
    await AuditService.logNoteModification(
      req.userId,
      noteId,
      changes,
      req.ip || req.socket?.remoteAddress,
      req.get('user-agent'),
    );

    // Record metrics
    recordNoteOperation('update', true);
    if (tags && tags.length > 0) {
      recordTagOperation('update');
    }

    res.json({
      note: {
        id: updatedNote.id,
        title: updatedNote.title,
        body: updatedNote.body,
        excerpt: NoteService.getExcerpt(updatedNote.body),
        images: updatedNote.images ? JSON.parse(updatedNote.images) : [],
        pinned: !!updatedNote.pinned,
        favorite: !!updatedNote.favorite,
        archived: !!updatedNote.archived,
        folder_id: updatedNote.folder_id,
        created_at: updatedNote.created_at,
        updated_at: updatedNote.updated_at,
        tags: updatedNote.tags,
      },
    });
  } catch (error) {
    logger.error('Update note error:', error);
    recordNoteOperation('update', false);
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

    // Audit log: Note deletion (before deleting)
    await AuditService.logNoteDeletion(req.userId, noteId, req.ip || req.socket?.remoteAddress, {
      title: note.title.substring(0, 100), // First 100 chars
      hadTags: note.tags && note.tags.length > 0,
    });

    await NoteService.deleteNote(noteId, req.userId);

    // Record metrics
    recordNoteOperation('delete', true);

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    logger.error('Delete note error:', error);
    recordNoteOperation('delete', false);
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

    const updatedNote = await NoteService.updateNote(
      noteId,
      undefined,
      undefined,
      undefined,
      !note.pinned,
    );

    res.json({
      pinned: !!updatedNote.pinned,
      message: updatedNote.pinned ? 'Note pinned' : 'Note unpinned',
    });
  } catch (error) {
    logger.error('Toggle pin error:', error);
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

    const updatedNote = await NoteService.updateNote(
      noteId,
      undefined,
      undefined,
      undefined,
      undefined,
      !note.favorite,
    );

    res.json({
      favorite: !!updatedNote.favorite,
      message: updatedNote.favorite ? 'Note favorited' : 'Note unfavorited',
    });
  } catch (error) {
    logger.error('Toggle favorite error:', error);
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

    const updatedNote = await NoteService.updateNote(
      noteId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      !note.archived,
    );

    res.json({
      archived: !!updatedNote.archived,
      message: updatedNote.archived ? 'Note archived' : 'Note unarchived',
    });
  } catch (error) {
    logger.error('Toggle archive error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/:id/public-share', jwtRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const note = await NoteService.getNoteById(noteId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the note owner can manage public sharing' });
    }

    const share = await db.queryOne(
      `
      SELECT id, token, expires_at
      FROM public_note_shares
      WHERE note_id = ?
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [noteId],
    );

    res.json({
      share: share
        ? {
            id: share.id,
            token: share.token,
            expires_at: share.expires_at,
          }
        : null,
    });
  } catch (error) {
    logger.error('Get public share note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.post('/:id/public-share', jwtRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const { expires_at = null } = req.body || {};

    const note = await NoteService.getNoteById(noteId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the note owner can manage public sharing' });
    }

    await db.run(
      `
      UPDATE public_note_shares
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE note_id = ? AND revoked_at IS NULL
      `,
      [noteId],
    );

    const token = crypto.randomBytes(32).toString('hex');

    const result = await db.run(
      `
      INSERT INTO public_note_shares (note_id, token, created_by_id, expires_at)
      VALUES (?, ?, ?, ?)
      `,
      [noteId, token, req.userId, expires_at],
    );

    res.status(201).json({
      share: {
        id: result.insertId,
        token,
        expires_at,
      },
    });
  } catch (error) {
    logger.error('Create public share note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.delete('/:id/public-share', jwtRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const note = await NoteService.getNoteById(noteId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the note owner can manage public sharing' });
    }

    await db.run(
      `
      UPDATE public_note_shares
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE note_id = ? AND revoked_at IS NULL
      `,
      [noteId],
    );

    res.json({ message: 'Public share link revoked' });
  } catch (error) {
    logger.error('Revoke public share note error:', error);
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

    const shares = await db.query(
      `
      SELECT sn.*, u.username, u.email
      FROM share_notes sn
      JOIN users u ON sn.shared_with_id = u.id
      WHERE sn.note_id = ?
    `,
      [noteId],
    );

    res.json({ shares });
  } catch (error) {
    logger.error('Get shares error:', error);
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
      shared_with: result.sharedWith,
    });
  } catch (error) {
    logger.error('Share note error:', error);
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
    logger.error('Unshare note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
