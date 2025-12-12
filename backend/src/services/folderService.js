/**
 * Folder Service
 * Handles business logic for folder operations
 */

import { Folder, Note, Task } from '../models/index.js';
import logger from '../config/logger.js';

class FolderService {
  /**
   * Get all folders for a user in tree structure
   */
  async getFoldersForUser(userId) {
    try {
      // Get all folders with note counts
      const folders = await Folder.findAll({
        where: { user_id: userId },
        attributes: [
          'id',
          'name',
          'parent_id',
          'description',
          'icon',
          'color',
          'position',
          'is_expanded',
          'created_at',
          'updated_at',
        ],
        order: [
          ['position', 'ASC'],
          ['name', 'ASC'],
        ],
      });

      // Build tree structure
      const folderMap = new Map();
      const rootFolders = [];

      // First pass: create map
      for (const folder of folders) {
        const folderData = {
          ...folder.toJSON(),
          children: [],
          note_count: 0,
          task_count: 0,
        };
        folderMap.set(folder.id, folderData);
      }

      // Get note counts for each folder
      const noteCounts = await Note.findAll({
        attributes: ['folder_id', [Note.sequelize.fn('COUNT', '*'), 'count']],
        where: {
          owner_id: userId,
          folder_id: {
            [Note.sequelize.Op.ne]: null,
          },
          archived: false,
        },
        group: ['folder_id'],
        raw: true,
      });

      // Get task counts for each folder
      const taskCounts = await Task.findAll({
        attributes: ['folder_id', [Task.sequelize.fn('COUNT', '*'), 'count']],
        where: {
          owner_id: userId,
          folder_id: {
            [Task.sequelize.Op.ne]: null,
          },
        },
        group: ['folder_id'],
        raw: true,
      });

      // Apply counts
      for (const { folder_id, count } of noteCounts) {
        if (folderMap.has(folder_id)) {
          folderMap.get(folder_id).note_count = parseInt(count, 10);
        }
      }

      for (const { folder_id, count } of taskCounts) {
        if (folderMap.has(folder_id)) {
          folderMap.get(folder_id).task_count = parseInt(count, 10);
        }
      }

      // Second pass: build tree
      for (const folder of folderMap.values()) {
        if (folder.parent_id === null) {
          rootFolders.push(folder);
        } else {
          const parent = folderMap.get(folder.parent_id);
          if (parent) {
            parent.children.push(folder);
          } else {
            // Parent doesn't exist, treat as root
            rootFolders.push(folder);
          }
        }
      }

      return rootFolders;
    } catch (error) {
      logger.error('Get folders error:', error);
      throw error;
    }
  }

  /**
   * Get a single folder by ID
   */
  async getFolderById(folderId, userId) {
    try {
      const folder = await Folder.findOne({
        where: {
          id: folderId,
          user_id: userId,
        },
      });

      return folder;
    } catch (error) {
      logger.error('Get folder by ID error:', error);
      throw error;
    }
  }

  /**
   * Create a new folder
   */
  async createFolder(userId, data) {
    try {
      const { name, parent_id = null, description = '', icon = 'folder', color = '#3B82F6', position = 0 } = data;

      // Validate parent folder if provided
      if (parent_id) {
        const parentFolder = await Folder.findOne({
          where: {
            id: parent_id,
            user_id: userId,
          },
        });

        if (!parentFolder) {
          throw new Error('Parent folder not found');
        }
      }

      // Check for duplicate name in same parent
      const existing = await Folder.findOne({
        where: {
          user_id: userId,
          name,
          parent_id: parent_id || null,
        },
      });

      if (existing) {
        throw new Error('A folder with this name already exists in the same location');
      }

      const folder = await Folder.create({
        user_id: userId,
        name: name.trim(),
        parent_id,
        description,
        icon,
        color,
        position,
        is_expanded: true,
      });

      return folder;
    } catch (error) {
      logger.error('Create folder error:', error);
      throw error;
    }
  }

  /**
   * Update a folder
   */
  async updateFolder(folderId, userId, data) {
    try {
      const folder = await this.getFolderById(folderId, userId);

      if (!folder) {
        throw new Error('Folder not found');
      }

      const { name, description, icon, color, position, is_expanded } = data;

      // Check for duplicate name if name is being changed
      if (name && name !== folder.name) {
        const existing = await Folder.findOne({
          where: {
            user_id: userId,
            name: name.trim(),
            parent_id: folder.parent_id,
            id: {
              [Folder.sequelize.Op.ne]: folderId,
            },
          },
        });

        if (existing) {
          throw new Error('A folder with this name already exists in the same location');
        }
      }

      // Update fields
      if (name !== undefined) folder.name = name.trim();
      if (description !== undefined) folder.description = description;
      if (icon !== undefined) folder.icon = icon;
      if (color !== undefined) folder.color = color;
      if (position !== undefined) folder.position = position;
      if (is_expanded !== undefined) folder.is_expanded = is_expanded;

      await folder.save();

      return folder;
    } catch (error) {
      logger.error('Update folder error:', error);
      throw error;
    }
  }

  /**
   * Move folder to new parent
   */
  async moveFolder(folderId, userId, newParentId) {
    try {
      const folder = await this.getFolderById(folderId, userId);

      if (!folder) {
        throw new Error('Folder not found');
      }

      // Validate new parent
      if (newParentId) {
        const newParent = await this.getFolderById(newParentId, userId);

        if (!newParent) {
          throw new Error('New parent folder not found');
        }

        // Prevent circular reference
        if (await this.isDescendant(newParentId, folderId)) {
          throw new Error('Cannot move folder to its own descendant');
        }
      }

      // Check for duplicate name in new location
      const existing = await Folder.findOne({
        where: {
          user_id: userId,
          name: folder.name,
          parent_id: newParentId || null,
          id: {
            [Folder.sequelize.Op.ne]: folderId,
          },
        },
      });

      if (existing) {
        throw new Error('A folder with this name already exists in the destination');
      }

      folder.parent_id = newParentId || null;
      await folder.save();

      return folder;
    } catch (error) {
      logger.error('Move folder error:', error);
      throw error;
    }
  }

  /**
   * Check if a folder is a descendant of another
   */
  async isDescendant(folderId, potentialAncestorId) {
    let currentId = folderId;

    while (currentId) {
      if (currentId === potentialAncestorId) {
        return true;
      }

      const folder = await Folder.findByPk(currentId);
      if (!folder || !folder.parent_id) {
        break;
      }

      currentId = folder.parent_id;
    }

    return false;
  }

  /**
   * Delete a folder
   */
  async deleteFolder(folderId, userId) {
    try {
      const folder = await this.getFolderById(folderId, userId);

      if (!folder) {
        throw new Error('Folder not found');
      }

      // Move child folders to parent
      await Folder.update(
        { parent_id: folder.parent_id },
        {
          where: {
            parent_id: folderId,
            user_id: userId,
          },
        },
      );

      // Move notes to parent folder (or null if no parent)
      await Note.update(
        { folder_id: folder.parent_id },
        {
          where: {
            folder_id: folderId,
            owner_id: userId,
          },
        },
      );

      // Move tasks to parent folder (or null if no parent)
      await Task.update(
        { folder_id: folder.parent_id },
        {
          where: {
            folder_id: folderId,
            owner_id: userId,
          },
        },
      );

      // Delete the folder
      await folder.destroy();

      return true;
    } catch (error) {
      logger.error('Delete folder error:', error);
      throw error;
    }
  }

  /**
   * Get folder path (breadcrumbs)
   */
  async getFolderPath(folderId, userId) {
    try {
      const path = [];
      let currentId = folderId;

      while (currentId) {
        const folder = await this.getFolderById(currentId, userId);

        if (!folder) {
          break;
        }

        path.unshift({
          id: folder.id,
          name: folder.name,
          icon: folder.icon,
          color: folder.color,
        });

        currentId = folder.parent_id;
      }

      return path;
    } catch (error) {
      logger.error('Get folder path error:', error);
      throw error;
    }
  }
}

export default new FolderService();
