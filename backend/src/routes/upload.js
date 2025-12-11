/**
 * Upload Routes
 */
import express from 'express';
const router = express.Router();
import {  jwtRequired  } from '../middleware/auth.js';
import {  upload  } from '../middleware/upload.js';
import path from 'node:path';
import fs from 'node:fs';

/**
 * POST /api/upload/image - Upload an image
 */
router.post('/image', jwtRequired, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the file path relative to the uploads directory
    const filePath = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      path: filePath,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

/**
 * POST /api/upload/images - Upload multiple images
 */
router.post('/images', jwtRequired, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = req.files.map((file) => ({
      path: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload images' });
  }
});

/**
 * DELETE /api/upload/:filename - Delete an uploaded image
 */
router.delete('/:filename', jwtRequired, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
