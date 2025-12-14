/**
 * Folder Service for hierarchical folder management.
 * Supports nested folders with caching for improved performance.
 */

import { CACHE_TTL } from '../config/constants.js';
import db from '../config/database.js';
import logger from '../config/logger.js';
import cache from '../config/redis.js';

export default class FolderService {
  /**
   * Get all folders for a user in tree structure.
   * Results are cached in Redis for improved performance.
   */
  static async getFoldersForUser(userId) {
    const cacheKey = `folders:user:${userId}`;

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query folders with note counts (all notes, including archived)
    // Note: Counts include all items (archived/completed) to show true folder contents
    // UI can filter the displayed items separately based on user preference
    const sql = `
      SELECT 
        f.id, f.name, f.parent_id, f.description, f.icon, f.color, 
        f.position, f.is_expanded, f.created_at, f.updated_at,
        COUNT(DISTINCT n.id) as note_count,
        COUNT(DISTINCT t.id) as task_count
      FROM folders f
      LEFT JOIN notes n ON n.folder_id = f.id
      LEFT JOIN tasks t ON t.folder_id = f.id
      WHERE f.user_id = ?
      GROUP BY f.id
      ORDER BY f.position, f.name
    `;

    const folders = await db.query(sql, [userId]);

    // Build tree structure
    const foldersById = new Map();
    const rootFolders = [];

    // First pass: create map of all folders
    for (const folder of folders) {
      foldersById.set(folder.id, {
        ...folder,
        children: [],
      });
    }

    // Second pass: build tree
    for (const folder of folders) {
      const folderWithChildren = foldersById.get(folder.id);
      if (folder.parent_id === null) {
        rootFolders.push(folderWithChildren);
      } else {
        const parent = foldersById.get(folder.parent_id);
        if (parent) {
          parent.children.push(folderWithChildren);
        } else {
          // Parent doesn't exist, treat as root
          rootFolders.push(folderWithChildren);
        }
      }
    }

    const result = {
      folders: rootFolders,
      total: folders.length,
    };

    // Cache the result
    await cache.set(cacheKey, result, CACHE_TTL.TAGS);

    return result;
  }

  /**
   * Get a single folder by ID.
   */
  static async getFolderById(folderId, userId) {
    const sql = `
      SELECT 
        f.id, f.name, f.parent_id, f.description, f.icon, f.color, 
        f.position, f.is_expanded, f.created_at, f.updated_at,
        COUNT(DISTINCT n.id) as note_count,
        COUNT(DISTINCT t.id) as task_count
      FROM folders f
      LEFT JOIN notes n ON n.folder_id = f.id AND n.archived = 0
      LEFT JOIN tasks t ON t.folder_id = f.id AND t.completed = 0
      WHERE f.id = ? AND f.user_id = ?
      GROUP BY f.id
    `;

    const folder = await db.queryOne(sql, [folderId, userId]);
    return folder;
  }

  /**
   * Create a new folder.
   */
  static async createFolder(userId, folderData) {
    const {
      name,
      parent_id = null,
      description = '',
      icon = 'folder',
      color = '#3B82F6',
      position = 0,
    } = folderData;

    // Validate: check for duplicate name at same level
    const duplicateCheckSql = parent_id
      ? 'SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id = ?'
      : 'SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id IS NULL';

    const params = parent_id ? [userId, name, parent_id] : [userId, name];
    const duplicate = await db.queryOne(duplicateCheckSql, params);

    if (duplicate) {
      throw new Error('A folder with this name already exists at this level');
    }

    // Validate parent exists if parent_id provided
    if (parent_id) {
      const parent = await db.queryOne('SELECT id FROM folders WHERE id = ? AND user_id = ?', [
        parent_id,
        userId,
      ]);
      if (!parent) {
        throw new Error('Parent folder not found');
      }
    }

    const sql = db.isSQLite
      ? `INSERT INTO folders (name, user_id, parent_id, description, icon, color, position) 
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`
      : `INSERT INTO folders (name, user_id, parent_id, description, icon, color, position) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`;

    if (db.isSQLite) {
      const folder = await db.queryOne(sql, [
        name,
        userId,
        parent_id,
        description,
        icon,
        color,
        position,
      ]);
      await FolderService.invalidateCache(userId);
      return folder;
    }

    // MySQL
    const result = await db.query(sql, [
      name,
      userId,
      parent_id,
      description,
      icon,
      color,
      position,
    ]);
    const insertId = result.insertId;
    const newFolder = await FolderService.getFolderById(insertId, userId);
    await FolderService.invalidateCache(userId);
    return newFolder;
  }

  /**
   * Update a folder.
   */
  static async updateFolder(folderId, userId, updates) {
    const folder = await FolderService.getFolderById(folderId, userId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    const allowedFields = [
      'name',
      'parent_id',
      'description',
      'icon',
      'color',
      'position',
      'is_expanded',
    ];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        // Convert boolean to integer for SQLite
        values.push(key === 'is_expanded' && typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    }

    if (updateFields.length === 0) {
      return folder;
    }

    // Check for circular reference if parent_id is being updated
    if (updates.parent_id !== undefined && updates.parent_id !== null) {
      const isCircular = await FolderService.checkCircularReference(
        folderId,
        updates.parent_id,
        userId,
      );
      if (isCircular) {
        throw new Error('Cannot move folder: would create circular reference');
      }

      // Validate parent exists
      const parent = await FolderService.getFolderById(updates.parent_id, userId);
      if (!parent) {
        throw new Error('Parent folder not found');
      }
    }

    values.push(folderId, userId);
    const sql = `UPDATE folders SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`;
    await db.query(sql, values);

    await FolderService.invalidateCache(userId);
    return await FolderService.getFolderById(folderId, userId);
  }

  /**
   * Delete a folder.
   * Notes and tasks in the folder will have their folder_id set to NULL.
   */
  static async deleteFolder(folderId, userId) {
    const folder = await FolderService.getFolderById(folderId, userId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    // Check if folder has children
    const children = await db.query('SELECT id FROM folders WHERE parent_id = ?', [folderId]);
    if (children.length > 0) {
      throw new Error('Cannot delete folder with subfolders. Delete subfolders first.');
    }

    // Delete the folder (notes and tasks will have folder_id set to NULL due to ON DELETE SET NULL)
    await db.query('DELETE FROM folders WHERE id = ? AND user_id = ?', [folderId, userId]);
    await FolderService.invalidateCache(userId);

    return { success: true };
  }

  /**
   * Move a folder to a new parent.
   */
  static async moveFolder(folderId, userId, newParentId) {
    // Check circular reference
    if (newParentId !== null) {
      const isCircular = await FolderService.checkCircularReference(folderId, newParentId, userId);
      if (isCircular) {
        throw new Error('Cannot move folder: would create circular reference');
      }
    }

    return await FolderService.updateFolder(folderId, userId, { parent_id: newParentId });
  }

  /**
   * Check if moving a folder would create a circular reference.
   */
  static async checkCircularReference(folderId, newParentId, userId) {
    if (folderId === newParentId) {
      return true;
    }

    let currentId = newParentId;
    const visited = new Set([folderId]);

    while (currentId !== null) {
      if (visited.has(currentId)) {
        return true;
      }
      visited.add(currentId);

      const parent = await db.queryOne(
        'SELECT parent_id FROM folders WHERE id = ? AND user_id = ?',
        [currentId, userId],
      );
      if (!parent) {
        break;
      }
      currentId = parent.parent_id;
    }

    return false;
  }

  /**
   * Get folder breadcrumb path.
   */
  static async getFolderPath(folderId, userId) {
    const path = [];
    let currentId = folderId;

    while (currentId !== null) {
      const folder = await db.queryOne(
        'SELECT id, name, parent_id FROM folders WHERE id = ? AND user_id = ?',
        [currentId, userId],
      );
      if (!folder) {
        break;
      }
      path.unshift(folder);
      currentId = folder.parent_id;
    }

    return path;
  }

  /**
   * Get all notes in a folder (including subfolders if recursive).
   */
  static async getNotesInFolder(folderId, userId, recursive = false) {
    if (!recursive) {
      const sql = `
        SELECT n.*, 
          GROUP_CONCAT(t.name) as tag_names,
          GROUP_CONCAT(t.id) as tag_ids
        FROM notes n
        LEFT JOIN note_tag nt ON n.id = nt.note_id
        LEFT JOIN tags t ON nt.tag_id = t.id
        WHERE n.folder_id = ? AND n.owner_id = ? AND n.archived = 0
        GROUP BY n.id
        ORDER BY n.pinned DESC, n.updated_at DESC
      `;
      return await db.query(sql, [folderId, userId]);
    }

    // Recursive: get all descendant folder IDs
    const folderIds = await FolderService.getAllDescendantFolderIds(folderId, userId);
    folderIds.push(folderId);

    const placeholders = folderIds.map(() => '?').join(',');
    const sql = `
      SELECT n.*, 
        GROUP_CONCAT(t.name) as tag_names,
        GROUP_CONCAT(t.id) as tag_ids
      FROM notes n
      LEFT JOIN note_tag nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.folder_id IN (${placeholders}) AND n.owner_id = ? AND n.archived = 0
      GROUP BY n.id
      ORDER BY n.pinned DESC, n.updated_at DESC
    `;

    return await db.query(sql, [...folderIds, userId]);
  }

  /**
   * Get all descendant folder IDs recursively.
   */
  static async getAllDescendantFolderIds(folderId, userId) {
    const descendants = [];
    const children = await db.query('SELECT id FROM folders WHERE parent_id = ? AND user_id = ?', [
      folderId,
      userId,
    ]);

    for (const child of children) {
      descendants.push(child.id);
      const childDescendants = await FolderService.getAllDescendantFolderIds(child.id, userId);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  /**
   * Move a note to a folder.
   */
  static async moveNoteToFolder(noteId, userId, folderId) {
    // Validate folder exists if folderId is not null
    if (folderId !== null) {
      const folder = await FolderService.getFolderById(folderId, userId);
      if (!folder) {
        throw new Error('Folder not found');
      }
    }

    // Validate note belongs to user
    const note = await db.queryOne('SELECT id FROM notes WHERE id = ? AND owner_id = ?', [
      noteId,
      userId,
    ]);
    if (!note) {
      throw new Error('Note not found');
    }

    await db.query('UPDATE notes SET folder_id = ? WHERE id = ? AND owner_id = ?', [
      folderId,
      noteId,
      userId,
    ]);
    await FolderService.invalidateCache(userId);

    return { success: true };
  }

  /**
   * Move a task to a folder.
   */
  static async moveTaskToFolder(taskId, userId, folderId) {
    // Validate folder exists if folderId is not null
    if (folderId !== null) {
      const folder = await FolderService.getFolderById(folderId, userId);
      if (!folder) {
        throw new Error('Folder not found');
      }
    }

    // Validate task belongs to user
    const task = await db.queryOne('SELECT id FROM tasks WHERE id = ? AND owner_id = ?', [
      taskId,
      userId,
    ]);
    if (!task) {
      throw new Error('Task not found');
    }

    await db.query('UPDATE tasks SET folder_id = ? WHERE id = ? AND owner_id = ?', [
      folderId,
      taskId,
      userId,
    ]);
    await FolderService.invalidateCache(userId);

    return { success: true };
  }

  /**
   * Create default folders for a new user.
   */
  static async createDefaultFolders(userId) {
    const defaultFolders = [
      { name: 'Work', icon: 'briefcase', color: '#3B82F6', position: 1 },
      { name: 'Personal', icon: 'home', color: '#10B981', position: 2 },
      { name: 'Archive', icon: 'archive', color: '#6B7280', position: 3 },
    ];

    for (const folderData of defaultFolders) {
      try {
        await FolderService.createFolder(userId, folderData);
      } catch (error) {
        logger.warn(`Failed to create default folder ${folderData.name}:`, error.message);
      }
    }
  }

  /**
   * Invalidate folder cache for a user.
   */
  static async invalidateCache(userId) {
    const cacheKey = `folders:user:${userId}`;
    await cache.del(cacheKey);

    // Also invalidate notes cache as folder changes affect note queries
    // Note: This invalidates multiple keys by pattern matching
    // If cache implementation doesn't support glob patterns,
    // we'll need to track and delete specific keys individually
    try {
      // Try pattern-based deletion (works with Redis KEYS/DEL)
      const notesPattern = `notes:user:${userId}:*`;
      await cache.del(notesPattern);
    } catch (_error) {
      // If pattern deletion fails, fall back to known cache keys
      const viewTypes = ['all', 'favorites', 'archived'];
      for (const view of viewTypes) {
        await cache.del(`notes:user:${userId}:${view}::`);
      }
    }
  }
}
