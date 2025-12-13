/**
 * Folder Routes for hierarchical folder management.
 */
import express from 'express';
import logger from '../config/logger.js';
import { jwtRequired } from '../middleware/auth.js';
import FolderService from '../services/folderService.js';
import * as responseHandler from '../utils/responseHandler.js';

const router = express.Router();

/**
 * GET /api/folders - List all folders for user in tree structure
 */
router.get('/', jwtRequired, async (req, res) => {
  try {
    const result = await FolderService.getFoldersForUser(req.userId);
    return responseHandler.success(res, result);
  } catch (error) {
    logger.error('List folders error:', error);
    return responseHandler.error(res, error.message);
  }
});

/**
 * GET /api/folders/:id - Get a specific folder
 */
router.get('/:id', jwtRequired, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const folder = await FolderService.getFolderById(folderId, req.userId);
    
    if (!folder) {
      return responseHandler.notFound(res, 'Folder not found');
    }
    
    return responseHandler.success(res, folder);
  } catch (error) {
    logger.error('Get folder error:', error);
    return responseHandler.error(res, error.message);
  }
});

/**
 * GET /api/folders/:id/path - Get folder breadcrumb path
 */
router.get('/:id/path', jwtRequired, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const path = await FolderService.getFolderPath(folderId, req.userId);
    return responseHandler.success(res, { path });
  } catch (error) {
    logger.error('Get folder path error:', error);
    return responseHandler.error(res, error.message);
  }
});

/**
 * GET /api/folders/:id/notes - Get notes in folder
 */
router.get('/:id/notes', jwtRequired, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const recursive = req.query.recursive === 'true';
    
    const notes = await FolderService.getNotesInFolder(folderId, req.userId, recursive);
    
    // Parse tags
    const parsedNotes = notes.map(note => ({
      ...note,
      tags: note.tag_names
        ? note.tag_names.split(',').map((name, i) => ({
            id: parseInt(note.tag_ids.split(',')[i], 10),
            name: name,
          }))
        : [],
    }));
    
    return responseHandler.success(res, { notes: parsedNotes });
  } catch (error) {
    logger.error('Get folder notes error:', error);
    return responseHandler.error(res, error.message);
  }
});

/**
 * POST /api/folders - Create new folder
 */
router.post('/', jwtRequired, async (req, res) => {
  try {
    const { name, parent_id, description, icon, color, position } = req.body;
    
    if (!name || name.trim().length === 0) {
      return responseHandler.badRequest(res, 'Folder name is required');
    }
    
    if (name.length > 100) {
      return responseHandler.badRequest(res, 'Folder name must be 100 characters or less');
    }
    
    const folder = await FolderService.createFolder(req.userId, {
      name: name.trim(),
      parent_id: parent_id || null,
      description: description || '',
      icon: icon || 'folder',
      color: color || '#3B82F6',
      position: position || 0,
    });
    
    return responseHandler.success(res, folder, 'Folder created successfully', 201);
  } catch (error) {
    logger.error('Create folder error:', error);
    return responseHandler.error(res, error.message);
  }
});

/**
 * PUT /api/folders/:id - Update folder
 */
router.put('/:id', jwtRequired, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const { name, parent_id, description, icon, color, position, is_expanded } = req.body;
    
    const updates = {};
    if (name !== undefined) {
      if (name.trim().length === 0) {
        return responseHandler.badRequest(res, 'Folder name cannot be empty');
      }
      if (name.length > 100) {
        return responseHandler.badRequest(res, 'Folder name must be 100 characters or less');
      }
      updates.name = name.trim();
    }
    if (parent_id !== undefined) updates.parent_id = parent_id;
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;
    if (position !== undefined) updates.position = position;
    if (is_expanded !== undefined) updates.is_expanded = is_expanded ? 1 : 0;
    
    const folder = await FolderService.updateFolder(folderId, req.userId, updates);
    return responseHandler.success(res, folder, 'Folder updated successfully');
  } catch (error) {
    logger.error('Update folder error:', error);
    return responseHandler.error(res, error.message);
  }
});

/**
 * DELETE /api/folders/:id - Delete folder
 */
router.delete('/:id', jwtRequired, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    await FolderService.deleteFolder(folderId, req.userId);
    return responseHandler.success(res, null, 'Folder deleted successfully');
  } catch (error) {
    logger.error('Delete folder error:', error);
    return responseHandler.error(res, error.message);
  }
});

/**
 * POST /api/folders/:id/move - Move folder to new parent
 */
router.post('/:id/move', jwtRequired, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const { parent_id } = req.body;
    
    const folder = await FolderService.moveFolder(folderId, req.userId, parent_id || null);
    return responseHandler.success(res, folder, 'Folder moved successfully');
  } catch (error) {
    logger.error('Move folder error:', error);
    return responseHandler.error(res, error.message);
  }
});

/**
 * POST /api/folders/notes/:noteId/move - Move note to folder
 */
router.post('/notes/:noteId/move', jwtRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.noteId, 10);
    const { folder_id } = req.body;
    
    await FolderService.moveNoteToFolder(noteId, req.userId, folder_id || null);
    return responseHandler.success(res, null, 'Note moved successfully');
  } catch (error) {
    logger.error('Move note to folder error:', error);
    return responseHandler.error(res, error.message);
  }
});

/**
 * POST /api/folders/tasks/:taskId/move - Move task to folder
 */
router.post('/tasks/:taskId/move', jwtRequired, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { folder_id } = req.body;
    
    await FolderService.moveTaskToFolder(taskId, req.userId, folder_id || null);
    return responseHandler.success(res, null, 'Task moved successfully');
  } catch (error) {
    logger.error('Move task to folder error:', error);
    return responseHandler.error(res, error.message);
  }
});

export default router;
