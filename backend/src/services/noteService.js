/**
 * Note Service for note management operations.
 * Integrated with Redis caching and Elasticsearch for enhanced performance.
 */
const db = require('../config/database');
const cache = require('../config/redis');
const elasticsearch = require('../config/elasticsearch');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

class NoteService {
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
    if (searchQuery && searchQuery.length >= 3 && elasticsearch.isEnabled()) {
      const esResults = await elasticsearch.searchNotes(userId, searchQuery, {
        archived: viewType === 'archived',
        favorite: viewType === 'favorites' ? true : null,
        tags: tagFilter ? [tagFilter] : null
      });

      if (esResults && esResults.notes) {
        // Fetch full note details from database (ES only stores indexed fields)
        const noteIds = esResults.notes.map(n => n.id);
        if (noteIds.length === 0) {
          await cache.set(cacheKey, [], 300); // Cache empty results for 5 minutes
          return [];
        }

        const sql = `
          SELECT DISTINCT n.*, 
            GROUP_CONCAT(t.name) as tag_names,
            GROUP_CONCAT(t.id) as tag_ids
          FROM notes n
          LEFT JOIN note_tag nt ON n.id = nt.note_id
          LEFT JOIN tags t ON nt.tag_id = t.id
          WHERE n.id IN (${noteIds.join(',')})
          GROUP BY n.id
          ORDER BY FIELD(n.id, ${noteIds.join(',')})
        `;

        const notes = await db.query(sql);
        const parsedNotes = notes.map(note => ({
          ...note,
          tags: note.tag_names
            ? note.tag_names.split(',').map((name, i) => ({
                id: note.tag_ids.split(',')[i],
                name
              }))
            : []
        }));

        await cache.set(cacheKey, parsedNotes, 600); // Cache for 10 minutes
        return parsedNotes;
      }
    }

    // Fall back to SQL query
    let sql = `
      SELECT DISTINCT n.*, 
        GROUP_CONCAT(t.name) as tag_names,
        GROUP_CONCAT(t.id) as tag_ids
      FROM notes n
      LEFT JOIN note_tag nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      LEFT JOIN share_notes sn ON n.id = sn.note_id
      WHERE (n.owner_id = ? OR sn.shared_with_id = ?)
    `;
    const params = [userId, userId];

    // Apply view filter
    switch (viewType) {
      case 'favorites':
        sql += ` AND n.favorite = 1`;
        break;
      case 'archived':
        sql += ` AND n.archived = 1`;
        break;
      case 'shared':
        sql += ` AND sn.shared_with_id = ?`;
        params.push(userId);
        break;
      case 'all':
      default:
        sql += ` AND n.archived = 0`;
        break;
    }

    // Apply search filter (SQL LIKE as fallback)
    if (searchQuery && searchQuery.length >= 3) {
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
    const parsedNotes = notes.map(note => ({
      ...note,
      tags: note.tag_names
        ? note.tag_names.split(',').map((name, i) => ({
            id: note.tag_ids.split(',')[i],
            name
          }))
        : []
    }));

    // Cache results
    await cache.set(cacheKey, parsedNotes, 600); // Cache for 10 minutes

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
    const tags = await db.query(`
      SELECT DISTINCT t.*, COUNT(nt.note_id) as note_count
      FROM tags t
      INNER JOIN note_tag nt ON t.id = nt.tag_id
      INNER JOIN notes n ON nt.note_id = n.id
      WHERE n.owner_id = ?
      GROUP BY t.id
      ORDER BY t.name
    `, [userId]);

    // Cache results for 30 minutes
    await cache.set(cacheKey, tags, 1800);

    return tags;
  }

  /**
   * Check if a user has access to a note.
   */
  static async checkNoteAccess(noteId, userId) {
    const note = await db.queryOne(`
      SELECT n.*, 
        GROUP_CONCAT(t.name) as tag_names,
        GROUP_CONCAT(t.id) as tag_ids
      FROM notes n
      LEFT JOIN note_tag nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.id = ?
      GROUP BY n.id
    `, [noteId]);

    if (!note) {
      return { note: null, hasAccess: false, canEdit: false };
    }

    // Parse tags
    note.tags = note.tag_names
      ? note.tag_names.split(',').map((name, i) => ({
          id: note.tag_ids.split(',')[i],
          name
        }))
      : [];

    // Owner has full access
    if (note.owner_id === userId) {
      return { note, hasAccess: true, canEdit: true };
    }

    // Check for share access
    const share = await db.queryOne(`
      SELECT * FROM share_notes WHERE note_id = ? AND shared_with_id = ?
    `, [noteId, userId]);

    if (share) {
      return { note, hasAccess: true, canEdit: !!share.can_edit };
    }

    return { note, hasAccess: false, canEdit: false };
  }

  /**
   * Create a new note.
   * Invalidates cache and indexes in Elasticsearch.
   */
  static async createNote(userId, title, body = '', tags = '', pinned = false, favorite = false, archived = false) {
    const result = await db.run(`
      INSERT INTO notes (title, body, pinned, favorite, archived, owner_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, body, pinned ? 1 : 0, favorite ? 1 : 0, archived ? 1 : 0, userId]);

    const noteId = result.insertId;

    // Process tags
    if (tags) {
      await this.updateNoteTags(noteId, tags);
    }

    // Get the complete note
    const note = await this.getNoteById(noteId);

    // Invalidate user's notes cache
    await cache.delPattern(`notes:user:${userId}:*`);
    await cache.delPattern(`tags:user:${userId}`);

    // Index in Elasticsearch
    if (note) {
      await elasticsearch.indexNote({
        ...note,
        tags: note.tags ? note.tags.map(t => t.name) : []
      });
    }

    return note;
  }

  /**
   * Update an existing note.
   * Invalidates cache and updates Elasticsearch index.
   */
  static async updateNote(noteId, title, body, tags, pinned, favorite, archived) {
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

    if (updates.length > 0) {
      params.push(noteId);
      await db.run(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Update tags if provided
    if (tags !== undefined) {
      await this.updateNoteTags(noteId, tags);
    }

    // Get the updated note
    const note = await this.getNoteById(noteId);

    if (note) {
      // Invalidate user's notes cache
      await cache.delPattern(`notes:user:${note.owner_id}:*`);
      await cache.delPattern(`tags:user:${note.owner_id}`);

      // Update in Elasticsearch
      await elasticsearch.indexNote({
        ...note,
        tags: note.tags ? note.tags.map(t => t.name) : []
      });
    }

    return note;
  }

  /**
   * Update note tags.
   */
  static async updateNoteTags(noteId, tagsString) {
    // Clear existing tags
    await db.run(`DELETE FROM note_tag WHERE note_id = ?`, [noteId]);

    // Parse and add new tags
    const tagNames = tagsString
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    for (const tagName of tagNames) {
      // Get or create tag
      let tag = await db.queryOne(`SELECT * FROM tags WHERE name = ?`, [tagName]);
      
      if (!tag) {
        const result = await db.run(`INSERT INTO tags (name) VALUES (?)`, [tagName]);
        tag = { id: result.insertId, name: tagName };
      }

      // Link tag to note
      await db.run(`INSERT OR IGNORE INTO note_tag (note_id, tag_id) VALUES (?, ?)`, [noteId, tag.id]);
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
    const note = await db.queryOne(`
      SELECT n.*, 
        GROUP_CONCAT(t.name) as tag_names,
        GROUP_CONCAT(t.id) as tag_ids
      FROM notes n
      LEFT JOIN note_tag nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.id = ?
      GROUP BY n.id
    `, [noteId]);

    if (!note) return null;

    note.tags = note.tag_names
      ? note.tag_names.split(',').map((name, i) => ({
          id: note.tag_ids.split(',')[i],
          name
        }))
      : [];

    return note;
  }

  /**
   * Delete a note.
   * Invalidates cache and removes from Elasticsearch index.
   */
  static async deleteNote(noteId, userId) {
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
      await cache.delPattern(`tags:user:${userId}`);
    }
  }

  /**
   * Share a note with another user.
   */
  static async shareNote(noteId, ownerId, sharedWithUsername, canEdit = false) {
    const sharedWithUser = await db.queryOne(
      `SELECT * FROM users WHERE username = ?`,
      [sharedWithUsername]
    );

    if (!sharedWithUser) {
      return { success: false, error: 'User not found' };
    }

    if (sharedWithUser.id === ownerId) {
      return { success: false, error: 'Cannot share a note with yourself' };
    }

    // Check if already shared
    const existingShare = await db.queryOne(`
      SELECT * FROM share_notes WHERE note_id = ? AND shared_with_id = ?
    `, [noteId, sharedWithUser.id]);

    if (existingShare) {
      return { success: false, error: 'Note is already shared with this user' };
    }

    await db.run(`
      INSERT INTO share_notes (note_id, shared_by_id, shared_with_id, can_edit)
      VALUES (?, ?, ?, ?)
    `, [noteId, ownerId, sharedWithUser.id, canEdit ? 1 : 0]);

    return { success: true, sharedWith: sharedWithUser };
  }

  /**
   * Unshare a note.
   */
  static async unshareNote(noteId, shareId) {
    await db.run(`DELETE FROM share_notes WHERE id = ? AND note_id = ?`, [shareId, noteId]);
  }

  /**
   * Get excerpt from note body.
   */
  static getExcerpt(body, length = 150) {
    if (!body) return '';
    const plainText = sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} });
    return plainText.length > length ? plainText.substring(0, length) + '...' : plainText;
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
        'p', 'br', 'strong', 'em', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'a', 'hr', 'div', 'span', 'img', 'del', 'ins', 'sub', 'sup'
      ],
      allowedAttributes: {
        'a': ['href', 'title', 'target', 'rel'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'code': ['class'],
        'pre': ['class'],
        'div': ['class'],
        'span': ['class']
      }
    });
  }
}

module.exports = NoteService;
