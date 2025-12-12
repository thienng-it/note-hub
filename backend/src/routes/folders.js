/**
 * Folders Routes
 */
import express from 'express';
import logger from '../config/logger.js';
import { jwtRequired } from '../middleware/auth.js';
import FolderService from '../services/folderService.js';
import websocketService from '../services/websocketService.js';

const router = express.Router();

/**
 * GET /api/folders - List all folders for user in tree structure
 */
router.get('/', jwtRequired, async (req, res) => {
  try {
    const folders = await FolderService.getFoldersForUser(req.userId);

    res.json({
      folders,
      total: folders.length,
    });
  } catch (error) {
    logger.error('List folders error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({ folder });
  } catch (error) {
    logger.error('Get folder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/folders/:id/path - Get folder breadcrumb path
 */
router.get('/:id/path', jwtRequired, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const path = await FolderService.getFolderPath(folderId, req.userId);

    res.json({ path });
  } catch (error) {
    logger.error('Get folder path error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/folders - Create a new folder
 */
router.post('/', jwtRequired, async (req, res) => {
  try {
    const { name, parent_id, description, icon, color, position } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = await FolderService.createFolder(req.userId, {
      name,
      parent_id,
      description,
      icon,
      color,
      position,
    });

    // Broadcast folder creation to all connected users
    websocketService.broadcastFolderCreated(req.userId, folder);

    res.status(201).json({
      folder,
      message: 'Folder created successfully',
    });
  } catch (error) {
    logger.error('Create folder error:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/folders/:id - Update a folder
 */
router.put('/:id', jwtRequired, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const { name, description, icon, color, position, is_expanded } = req.body;

    const folder = await FolderService.updateFolder(folderId, req.userId, {
      name,
      description,
      icon,
      color,
      position,
      is_expanded,
    });

    // Broadcast folder update to all connected users
    websocketService.broadcastFolderUpdated(req.userId, folder);

    res.json({
      folder,
      message: 'Folder updated successfully',
    });
  } catch (error) {
    logger.error('Update folder error:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/folders/:id/move - Move folder to new parent
 */
router.post('/:id/move', jwtRequired, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const { parent_id } = req.body;

    const folder = await FolderService.moveFolder(folderId, req.userId, parent_id);

    // Broadcast folder update to all connected users
    websocketService.broadcastFolderUpdated(req.userId, folder);

    res.json({
      folder,
      message: 'Folder moved successfully',
    });
  } catch (error) {
    logger.error('Move folder error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('circular') || error.message.includes('descendant')) {
      return res.status(400).json({ error: error.message });
    }

    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/folders/:id - Delete a folder
 */
router.delete('/:id', jwtRequired, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);

    await FolderService.deleteFolder(folderId, req.userId);

    // Broadcast folder deletion to all connected users
    websocketService.broadcastFolderDeleted(req.userId, folderId);

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    logger.error('Delete folder error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
