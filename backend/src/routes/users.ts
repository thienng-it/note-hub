/**
 * User Routes - Public user information and search.
 */

import type { Request, Response } from 'express';
import express from 'express';
import { jwtRequired } from '../middleware/auth';

const db = require('../config/database');
const router = express.Router();

/**
 * GET /api/users/search - Search for users (for share autocomplete)
 *
 * Security considerations:
 * - Requires authentication (jwtRequired)
 * - Only returns id and username (no email or sensitive data)
 * - Limited to 10 results to prevent data harvesting
 * - Minimum 2 characters required to prevent full user enumeration
 * - Case-insensitive search for better UX
 * - Excludes current user from results
 *
 * Query parameters:
 * - q: Search query (minimum 2 characters)
 *
 * Response:
 * - users: Array of {id, username} objects (max 10)
 */
router.get('/search', jwtRequired, async (req: Request, res: Response) => {
  try {
    const { q = '' } = req.query;
    const searchQuery = typeof q === 'string' ? q.trim() : '';

    // Security: Require minimum 2 characters to prevent full enumeration
    if (searchQuery.length < 2) {
      return res.json({ users: [] });
    }

    // Security: Limit to 10 results to prevent data harvesting
    // Exclude current user from results
    const users = await db.query(
      `SELECT id, username FROM users 
       WHERE username LIKE ? 
       AND id != ? 
       ORDER BY username ASC 
       LIMIT 10`,
      [`%${searchQuery}%`, req.userId],
    );

    return res.json({
      users: users.map((u: { id: number; username: string }) => ({
        id: u.id,
        username: u.username,
      })),
    });
  } catch (error) {
    console.error('User search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id - Get user profile (public view)
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

    return res.json({
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
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export = router;
