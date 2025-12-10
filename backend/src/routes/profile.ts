/**
 * Profile and User Routes.
 */

import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import express from 'express';
import { jwtRequired } from '../middleware/auth';

const db = require('../config/database');
const router = express.Router();

/**
 * GET /api/profile - Get current user's profile
 */
router.get('/', jwtRequired, async (req: Request, res: Response) => {
  try {
    // Get user stats
    const totalNotes = await db.queryOne(`SELECT COUNT(*) as count FROM notes WHERE owner_id = ?`, [
      req.userId,
    ]);
    const favoriteNotes = await db.queryOne(
      `SELECT COUNT(*) as count FROM notes WHERE owner_id = ? AND favorite = 1`,
      [req.userId],
    );
    const archivedNotes = await db.queryOne(
      `SELECT COUNT(*) as count FROM notes WHERE owner_id = ? AND archived = 1`,
      [req.userId],
    );
    const sharedNotesCount = await db.queryOne(
      `SELECT COUNT(*) as count FROM share_notes WHERE shared_by_id = ?`,
      [req.userId],
    );
    const notesSharedWithMe = await db.queryOne(
      `SELECT COUNT(*) as count FROM share_notes WHERE shared_with_id = ?`,
      [req.userId],
    );
    const totalTags = await db.queryOne(
      `SELECT COUNT(DISTINCT t.id) as count 
       FROM tags t 
       INNER JOIN note_tag nt ON t.id = nt.tag_id 
       INNER JOIN notes n ON nt.note_id = n.id 
       WHERE n.owner_id = ?`,
      [req.userId],
    );

    // Get recent notes
    const recentNotes = await db.query(
      `SELECT id, title, updated_at FROM notes WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 5`,
      [req.userId],
    );

    // Get notes shared with user
    const sharedWithMe = await db.query(
      `
      SELECT n.id, n.title, u.username as shared_by, sn.created_at
      FROM notes n
      JOIN share_notes sn ON n.id = sn.note_id
      JOIN users u ON sn.shared_by_id = u.id
      WHERE sn.shared_with_id = ?
      ORDER BY sn.created_at DESC
      LIMIT 5
    `,
      [req.userId],
    );

    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        bio: req.user.bio,
        theme: req.user.theme,
        hidden_notes: req.user.hidden_notes || null,
        preferred_language: req.user.preferred_language || 'en',
        has_2fa: !!req.user.totp_secret,
        created_at: req.user.created_at,
        last_login: req.user.last_login,
      },
      stats: {
        total_notes: totalNotes?.count || 0,
        favorite_notes: favoriteNotes?.count || 0,
        archived_notes: archivedNotes?.count || 0,
        shared_notes: sharedNotesCount?.count || 0,
        notes_shared_with_me: notesSharedWithMe?.count || 0,
        total_tags: totalTags?.count || 0,
      },
      recent_notes: recentNotes,
      shared_with_me: sharedWithMe,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/profile - Update user profile
 */
router.put('/', jwtRequired, async (req: Request, res: Response) => {
  try {
    const { username, email, bio, theme, hidden_notes, preferred_language } = req.body;

    // Check if new username already exists
    if (username && username !== req.user.username) {
      const existingUser = await db.queryOne(
        `SELECT id FROM users WHERE username = ? AND id != ?`,
        [username, req.userId],
      );
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (username !== undefined) {
      updates.push('username = ?');
      params.push(username.trim());
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email || null);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio || null);
    }
    if (theme !== undefined && ['light', 'dark'].includes(theme)) {
      updates.push('theme = ?');
      params.push(theme);
    }
    if (hidden_notes !== undefined) {
      updates.push('hidden_notes = ?');
      // Validate that hidden_notes is either null or a valid JSON string
      if (hidden_notes !== null) {
        try {
          JSON.parse(hidden_notes);
          params.push(hidden_notes);
        } catch {
          return res.status(400).json({ error: 'Invalid hidden_notes format' });
        }
      } else {
        params.push(null);
      }
    }
    if (
      preferred_language !== undefined &&
      ['en', 'de', 'vi', 'ja', 'fr', 'es'].includes(preferred_language)
    ) {
      updates.push('preferred_language = ?');
      params.push(preferred_language);
    }

    if (updates.length > 0) {
      params.push(req.userId.toString());
      await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updatedUser = await db.queryOne(
      `SELECT id, username, email, bio, theme, hidden_notes, preferred_language, totp_secret, created_at FROM users WHERE id = ?`,
      [req.userId],
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio,
        theme: updatedUser.theme,
        hidden_notes: updatedUser.hidden_notes || null,
        preferred_language: updatedUser.preferred_language || 'en',
        has_2fa: !!updatedUser.totp_secret,
        created_at: updatedUser.created_at,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/profile/toggle-theme - Toggle theme
 */
router.post('/toggle-theme', jwtRequired, async (req: Request, res: Response) => {
  try {
    const newTheme = req.user.theme === 'light' ? 'dark' : 'light';

    await db.run(`UPDATE users SET theme = ? WHERE id = ?`, [newTheme, req.userId]);

    res.json({ theme: newTheme });
  } catch (error) {
    console.error('Toggle theme error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/invitations - Get user's invitations
 */
router.get('/invitations', jwtRequired, async (req: Request, res: Response) => {
  try {
    const invitations = await db.query(
      `
      SELECT i.*, u.username as used_by_username
      FROM invitations i
      LEFT JOIN users u ON i.used_by_id = u.id
      WHERE i.inviter_id = ?
      ORDER BY i.created_at DESC
    `,
      [req.userId],
    );

    res.json({ invitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/profile/invitations - Create an invitation
 */
router.post('/invitations', jwtRequired, async (req: Request, res: Response) => {
  try {
    const { email, message } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const result = await db.run(
      `
      INSERT INTO invitations (token, inviter_id, email, message, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `,
      [token, req.userId, email || null, message || null, expiresAt.toISOString()],
    );

    const invitation = await db.queryOne(`SELECT * FROM invitations WHERE id = ?`, [
      result.insertId,
    ]);

    res.status(201).json({
      invitation,
      invite_url: `${req.protocol}://${req.get('host')}/register?token=${token}`,
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/:id - Get user profile (public view)
 * Note: This endpoint is deprecated. Use /api/v1/users/:id instead
 */
router.get('/:id', jwtRequired, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);

    const user = await db.queryOne(`SELECT id, username, bio, created_at FROM users WHERE id = ?`, [
      userId,
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalNotes = await db.queryOne(`SELECT COUNT(*) as count FROM notes WHERE owner_id = ?`, [
      userId,
    ]);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        created_at: user.created_at,
      },
      stats: {
        total_notes: totalNotes?.count || 0,
      },
      is_own_profile: userId === req.userId,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export = router;
