/**
 * Note Service for note management operations.
 * Integrated with Redis caching and Elasticsearch for enhanced performance.
 */

import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { CACHE_TTL, SEARCH_MIN_LENGTH } from '../config/constants.js';
import db from '../config/database.js';
import elasticsearch from '../config/elasticsearch.js';
import cache from '../config/redis.js';
import { validateEmail } from '../utils/common.js';

export default class NoteService {
  /**
   * Get all notes for a user with optional filters.
   * Uses Elasticsearch for full-text search if available, otherwise falls back to SQL.
   * Results are cached in Redis for improved performance.
   */
  static async getNotesForUser(userId, viewType = 'all', searchQuery = '', tagFilter = '') {
    // Generate cache key
    const cacheKey = `notes:user:${userId}:${viewType}:${searchQuery}:${tagFilter}`;

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Use Elasticsearch for full-text search if available and query is provided
    if (searchQuery && searchQuery.length >= SEARCH_MIN_LENGTH && elasticsearch.isEnabled()) {
      const esResults = await elasticsearch.searchNotes(userId, searchQuery, {
        archived: viewType === 'archived',
        favorite: viewType === 'favorites' ? true : null,
        tags: tagFilter ? [tagFilter] : null,
      });

      if (esResults?.notes) {
        // Fetch full note details from database (ES only stores indexed fields)
        const noteIds = esResults.notes.map((n) => n.id);
        if (noteIds.length === 0) {
          await cache.set(cacheKey, [], CACHE_TTL.NOTES_SEARCH);
          return [];
        }

        // Validate noteIds are integers to prevent SQL injection
        // Convert to integers and validate (ES might return strings)
        const validNoteIds = noteIds
          .map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
          .filter((id) => Number.isInteger(id) && id > 0 && !Number.isNaN(id));
        if (validNoteIds.length === 0) {
          await cache.set(cacheKey, [], CACHE_TTL.NOTES_SEARCH);
          return [];
        }

        // Use parameterized query to prevent SQL injection
        const placeholders = validNoteIds.map(() => '?').join(',');
        const sql = `
          SELECT DISTINCT n.*,
            GROUP_CONCAT(t.name) as tag_names,
            GROUP_CONCAT(t.id) as tag_ids
          FROM notes n
          LEFT JOIN note_tag nt ON n.id = nt.note_id
          LEFT JOIN tags t ON nt.tag_id = t.id
          WHERE n.id IN (${placeholders})
          GROUP BY n.id
        `;

        const notes = await db.query(sql, validNoteIds);

        // Sort notes to match ES order (preserving relevance ranking)
        notes.sort((a, b) => {
          const indexA = validNoteIds.indexOf(a.id);
          const indexB = validNoteIds.indexOf(b.id);
          return indexA - indexB;
        });
        const parsedNotes = notes.map((note) => ({
          ...note,
          tags: note.tag_names
            ? note.tag_names.split(',').map((name, i) => ({
                id: note.tag_ids.split(',')[i],
                name,
              }))
            : [],
        }));

        await cache.set(cacheKey, parsedNotes, CACHE_TTL.NOTES_SEARCH);
        return parsedNotes;
      }
    }

    // Fall back to SQL query
    let sql, params;

    // Special handling for 'shared' view - use INNER JOIN to only get shared notes
    if (viewType === 'shared') {
      sql = `
        SELECT DISTINCT n.*,
          GROUP_CONCAT(t.name) as tag_names,
          GROUP_CONCAT(t.id) as tag_ids
        FROM notes n
        INNER JOIN share_notes sn ON n.id = sn.note_id
        LEFT JOIN note_tag nt ON n.id = nt.note_id
        LEFT JOIN tags t ON nt.tag_id = t.id
        WHERE sn.shared_with_id = ? AND n.owner_id != ?
      `;
      params = [userId, userId];
    } else {
      // Standard query for other views
      sql = `
        SELECT DISTINCT n.*,
          GROUP_CONCAT(t.name) as tag_names,
          GROUP_CONCAT(t.id) as tag_ids
        FROM notes n
        LEFT JOIN note_tag nt ON n.id = nt.note_id
        LEFT JOIN tags t ON nt.tag_id = t.id
        LEFT JOIN share_notes sn ON n.id = sn.note_id
        WHERE (n.owner_id = ? OR sn.shared_with_id = ?)
      `;
      params = [userId, userId];

      // Apply view filter
      switch (viewType) {
        case 'favorites':
          sql += ` AND n.favorite = 1`;
          break;
        case 'archived':
          sql += ` AND n.archived = 1`;
          break;
        default:
          sql += ` AND n.archived = 0`;
          break;
      }
    }

    // Apply search filter (SQL LIKE as fallback)
    if (searchQuery && searchQuery.length >= SEARCH_MIN_LENGTH) {
      sql += ` AND (n.title LIKE ? OR n.body LIKE ?)`;
      const searchPattern = `%${searchQuery}%`;
      params.push(searchPattern, searchPattern);
    }

    // Apply tag filter
    if (tagFilter) {
      sql += ` AND t.name = ?`;
      params.push(tagFilter);
    }

    sql += ` GROUP BY n.id ORDER BY n.pinned DESC, n.updated_at DESC`;

    const notes = await db.query(sql, params);

    // Parse tags from concatenated strings
    const parsedNotes = notes.map((note) => ({
      ...note,
      tags: note.tag_names
        ? note.tag_names.split(',').map((name, i) => ({
            id: note.tag_ids.split(',')[i],
            name,
          }))
        : [],
    }));

    // Cache results
    await cache.set(cacheKey, parsedNotes, CACHE_TTL.NOTES_LIST);

    return parsedNotes;
  }

  /**
   * Get all tags for a user's notes.
   * Cached for improved performance.
   */
  static async getTagsForUser(userId) {
    const cacheKey = `tags:user:${userId}`;

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const tags = await db.query(
      `
      SELECT DISTINCT t.*, COUNT(nt.note_id) as note_count
      FROM tags t
      INNER JOIN note_tag nt ON t.id = nt.tag_id
      INNER JOIN notes n ON nt.note_id = n.id
      WHERE n.owner_id = ?
      GROUP BY t.id
      ORDER BY t.name
    `,
      [userId],
    );

    // Cache results
    await cache.set(cacheKey, tags, CACHE_TTL.TAGS);

    return tags;
  }

  /**
   * Check if a user has access to a note.
   */
  static async checkNoteAccess(noteId, userId) {
    const note = await db.queryOne(
      `
      SELECT n.*,
        GROUP_CONCAT(t.name) as tag_names,
        GROUP_CONCAT(t.id) as tag_ids
      FROM notes n
      LEFT JOIN note_tag nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.id = ?
      GROUP BY n.id
    `,
      [noteId],
    );

    if (!note) {
      return { note: null, hasAccess: false, canEdit: false };
    }

    // Parse tags
    note.tags = note.tag_names
      ? note.tag_names.split(',').map((name, i) => ({
          id: note.tag_ids.split(',')[i],
          name,
        }))
      : [];

    // Owner has full access
    if (note.owner_id === userId) {
      return { note, hasAccess: true, canEdit: true };
    }

    // Check for share access
    const share = await db.queryOne(
      `
      SELECT * FROM share_notes WHERE note_id = ? AND shared_with_id = ?
    `,
      [noteId, userId],
    );

    if (share) {
      return { note, hasAccess: true, canEdit: !!share.can_edit };
    }

    return { note, hasAccess: false, canEdit: false };
  }

  /**
   * Create a new note.
   * Invalidates cache and indexes in Elasticsearch.
   */
  static async createNote(
    userId,
    title,
    body = '',
    tags = '',
    pinned = false,
    favorite = false,
    archived = false,
    images = [],
    folderId = null,
  ) {
    const imagesJson = Array.isArray(images) ? JSON.stringify(images) : null;

    const result = await db.run(
      `
      INSERT INTO notes (title, body, images, pinned, favorite, archived, owner_id, folder_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        title,
        body,
        imagesJson,
        pinned ? 1 : 0,
        favorite ? 1 : 0,
        archived ? 1 : 0,
        userId,
        folderId,
      ],
    );

    const noteId = result.insertId;

    // Process tags
    if (tags) {
      await NoteService.updateNoteTags(noteId, tags);
    }

    // Get the complete note
    const note = await NoteService.getNoteById(noteId);

    // Invalidate user's notes and tags cache
    await cache.delPattern(`notes:user:${userId}:*`);
    await cache.del(`tags:user:${userId}`);

    // Index in Elasticsearch
    if (note) {
      await elasticsearch.indexNote({
        ...note,
        tags: note.tags ? note.tags.map((t) => t.name) : [],
      });
    }

    return note;
  }

  /**
   * Update an existing note.
   * Invalidates cache and updates Elasticsearch index.
   */
  static async updateNote(noteId, title, body, tags, pinned, favorite, archived, images, folderId) {
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (body !== undefined) {
      updates.push('body = ?');
      params.push(body);
    }
    if (images !== undefined) {
      updates.push('images = ?');
      params.push(Array.isArray(images) ? JSON.stringify(images) : null);
    }
    if (pinned !== undefined) {
      updates.push('pinned = ?');
      params.push(pinned ? 1 : 0);
    }
    if (favorite !== undefined) {
      updates.push('favorite = ?');
      params.push(favorite ? 1 : 0);
    }
    if (archived !== undefined) {
      updates.push('archived = ?');
      params.push(archived ? 1 : 0);
    }
    if (folderId !== undefined) {
      updates.push('folder_id = ?');
      params.push(folderId);
    }

    if (updates.length > 0) {
      params.push(noteId);
      await db.run(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Update tags if provided
    if (tags !== undefined) {
      await NoteService.updateNoteTags(noteId, tags);
    }

    // Get the updated note
    const note = await NoteService.getNoteById(noteId);

    if (note) {
      // Invalidate user's notes and tags cache
      await cache.delPattern(`notes:user:${note.owner_id}:*`);
      await cache.del(`tags:user:${note.owner_id}`);

      // Update in Elasticsearch
      await elasticsearch.indexNote({
        ...note,
        tags: note.tags ? note.tags.map((t) => t.name) : [],
      });
    }

    return note;
  }

  /**
   * Update note tags.
   */
  static async updateNoteTags(noteId, tagsString) {
    // If tagsString is undefined, null, or empty, do nothing
    if (!tagsString) return;

    // Clear existing tags
    await db.run(`DELETE FROM note_tag WHERE note_id = ?`, [noteId]);

    // Parse and add new tags
    // Handle both string and array inputs
    const tagsStr = Array.isArray(tagsString) ? tagsString.join(',') : tagsString;
    const tagNames = tagsStr
      .trim()
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    for (const tagName of tagNames) {
      // Get or create tag
      let tag = await db.queryOne(`SELECT * FROM tags WHERE name = ?`, [tagName]);

      if (!tag) {
        const result = await db.run(`INSERT INTO tags (name) VALUES (?)`, [tagName]);
        tag = { id: result.insertId, name: tagName };
      }

      // Link tag to note
      await db.run(`INSERT OR IGNORE INTO note_tag (note_id, tag_id) VALUES (?, ?)`, [
        noteId,
        tag.id,
      ]);
    }

    // Cleanup orphaned tags
    await db.run(`
      DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tag)
    `);
  }

  /**
   * Get a note by ID.
   */
  static async getNoteById(noteId) {
    const note = await db.queryOne(
      `
      SELECT n.*,
        GROUP_CONCAT(t.name) as tag_names,
        GROUP_CONCAT(t.id) as tag_ids
      FROM notes n
      LEFT JOIN note_tag nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.id = ?
      GROUP BY n.id
    `,
      [noteId],
    );

    if (!note) return null;

    note.tags = note.tag_names
      ? note.tag_names.split(',').map((name, i) => ({
          id: note.tag_ids.split(',')[i],
          name,
        }))
      : [];

    return note;
  }

  /**
   * Delete a note.
   * Invalidates cache and removes from Elasticsearch index.
   * @param {number} noteId - Note ID to delete
   * @param {number} userId - Optional user ID for cache invalidation
   */
  static async deleteNote(noteId, userId = null) {
    // Get note owner if userId not provided
    if (!userId) {
      const note = await db.queryOne(`SELECT owner_id FROM notes WHERE id = ?`, [noteId]);
      userId = note?.owner_id;
    }

    // Delete from Elasticsearch first
    await elasticsearch.deleteNote(noteId);

    // Delete shares first
    await db.run(`DELETE FROM share_notes WHERE note_id = ?`, [noteId]);

    // Delete note (cascades to note_tag)
    await db.run(`DELETE FROM notes WHERE id = ?`, [noteId]);

    // Cleanup orphaned tags
    await db.run(`
      DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tag)
    `);

    // Invalidate cache
    if (userId) {
      await cache.delPattern(`notes:user:${userId}:*`);
      await cache.del(`tags:user:${userId}`);
    }
  }

  /**
   * Share a note with another user.
   */
  static async shareNote(noteId, ownerId, sharedWithUsername, canEdit = false) {
    const isEmail = validateEmail(sharedWithUsername);
    const credentialField = isEmail ? 'email' : 'username';

    const sharedWithUser = await db.queryOne(`SELECT * FROM users WHERE ${credentialField} = ?`, [
      sharedWithUsername,
    ]);

    if (!sharedWithUser) {
      return { success: false, error: 'User not found' };
    }

    if (sharedWithUser.id === ownerId) {
      return { success: false, error: 'Cannot share a note with yourself' };
    }

    // Check if already shared
    const existingShare = await db.queryOne(
      `
      SELECT * FROM share_notes WHERE note_id = ? AND shared_with_id = ?
    `,
      [noteId, sharedWithUser.id],
    );

    if (existingShare) {
      return { success: false, error: 'Note is already shared with this user' };
    }

    await db.run(
      `
      INSERT INTO share_notes (note_id, shared_by_id, shared_with_id, can_edit)
      VALUES (?, ?, ?, ?)
    `,
      [noteId, ownerId, sharedWithUser.id, canEdit ? 1 : 0],
    );

    // Invalidate the recipient's notes cache so they see the shared note
    await cache.delPattern(`notes:user:${sharedWithUser.id}:*`);

    return { success: true, sharedWith: sharedWithUser };
  }

  /**
   * Unshare a note.
   */
  static async unshareNote(noteId, shareId) {
    // First get the share to know which user's cache to invalidate
    const share = await db.queryOne(
      `SELECT shared_with_id FROM share_notes WHERE id = ? AND note_id = ?`,
      [shareId, noteId],
    );

    await db.run(`DELETE FROM share_notes WHERE id = ? AND note_id = ?`, [shareId, noteId]);

    // Invalidate the recipient's notes cache so the note disappears from their shared view
    if (share?.shared_with_id) {
      await cache.delPattern(`notes:user:${share.shared_with_id}:*`);
    }
  }

  /**
   * Get excerpt from note body.
   */
  static getExcerpt(body, length = 150) {
    if (!body) return '';
    const plainText = sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} });
    return plainText.length > length ? `${plainText.substring(0, length)}...` : plainText;
  }

  /**
   * Render markdown to HTML.
   */
  static renderMarkdown(body) {
    if (!body) return '';

    const html = marked(body);

    // Sanitize HTML
    return sanitizeHtml(html, {
      allowedTags: [
        'p',
        'br',
        'strong',
        'em',
        'code',
        'pre',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'blockquote',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'a',
        'hr',
        'div',
        'span',
        'img',
        'del',
        'ins',
        'sub',
        'sup',
      ],
      allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        code: ['class'],
        pre: ['class'],
        div: ['class'],
        span: ['class'],
      },
    });
  }
}
