/**
 * Admin Routes.
 */
import express from 'express';
const router = express.Router();
import {  jwtRequired, adminRequired  } from '../middleware/auth.js';
import db from '../config/database.js';
import {  record2FAOperation  } from '../middleware/metrics.js';

/**
 * GET /api/admin/users - List all users (admin only)
 */
router.get('/users', jwtRequired, adminRequired, async (req, res) => {
  try {
    const { search = '', page = 1, per_page = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(per_page, 10);

    let sql = `SELECT id, username, email, bio, theme, totp_secret, is_admin, is_locked, created_at, last_login FROM users`;
    let countSql = `SELECT COUNT(*) as count FROM users`;
    const params = [];
    const countParams = [];

    if (search) {
      const searchPattern = `%${search}%`;
      sql += ` WHERE username LIKE ? OR email LIKE ?`;
      countSql += ` WHERE username LIKE ? OR email LIKE ?`;
      params.push(searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(per_page, 10), offset);

    const users = await db.query(sql, params);
    const totalCount = await db.queryOne(countSql, countParams);

    // Get stats
    const totalUsers = await db.queryOne(`SELECT COUNT(*) as count FROM users`);
    const usersWith2FA = await db.queryOne(
      `SELECT COUNT(*) as count FROM users WHERE totp_secret IS NOT NULL`,
    );
    const usersWithEmail = await db.queryOne(
      `SELECT COUNT(*) as count FROM users WHERE email IS NOT NULL`,
    );
    const lockedUsers = await db.queryOne(
      `SELECT COUNT(*) as count FROM users WHERE is_locked = 1`,
    );
    const adminUsers = await db.queryOne(`SELECT COUNT(*) as count FROM users WHERE is_admin = 1`);

    res.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        bio: u.bio,
        theme: u.theme,
        has_2fa: !!u.totp_secret,
        is_admin: !!u.is_admin,
        is_locked: !!u.is_locked,
        created_at: u.created_at,
        last_login: u.last_login,
      })),
      pagination: {
        page: parseInt(page, 10),
        per_page: parseInt(per_page, 10),
        total_count: totalCount?.count || 0,
        total_pages: Math.ceil((totalCount?.count || 0) / parseInt(per_page, 10)),
      },
      stats: {
        total_users: totalUsers?.count || 0,
        users_with_2fa: usersWith2FA?.count || 0,
        users_with_email: usersWithEmail?.count || 0,
        locked_users: lockedUsers?.count || 0,
        admin_users: adminUsers?.count || 0,
      },
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/users/:userId/disable-2fa - Disable 2FA for a user (admin only)
 */
router.post('/users/:userId/disable-2fa', jwtRequired, adminRequired, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (!userId || userId <= 0) {
      record2FAOperation('disable', false);
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const user = await db.queryOne(`SELECT id, username, totp_secret FROM users WHERE id = ?`, [
      userId,
    ]);

    if (!user) {
      record2FAOperation('disable', false);
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.totp_secret) {
      record2FAOperation('disable', false);
      return res.status(400).json({ error: '2FA is not enabled for this user' });
    }

    // Disable 2FA
    await db.run(`UPDATE users SET totp_secret = NULL WHERE id = ?`, [userId]);

    // Log admin action for audit trail
    // TODO: Consider using a proper logging framework (winston, pino) in production
    console.log(`[SECURITY AUDIT] Admin ID: ${req.userId} disabled 2FA for user ID: ${userId}`);

    record2FAOperation('disable', true);

    res.json({
      message: `2FA disabled successfully for user ${user.username}`,
      user: {
        id: user.id,
        username: user.username,
        has_2fa: false,
      },
    });
  } catch (error) {
    console.error('Admin disable 2FA error:', error);
    record2FAOperation('disable', false);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/users/:userId/lock - Lock a user account (admin only)
 */
router.post('/users/:userId/lock', jwtRequired, adminRequired, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (!userId || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const user = await db.queryOne(
      `SELECT id, username, is_admin, is_locked FROM users WHERE id = ?`,
      [userId],
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent locking the main admin user (username 'admin' is protected)
    if (user.username === 'admin') {
      return res.status(403).json({ error: 'Cannot lock the main admin user' });
    }

    if (user.is_locked) {
      return res.status(400).json({ error: 'User is already locked' });
    }

    // Lock user
    await db.run(`UPDATE users SET is_locked = 1 WHERE id = ?`, [userId]);

    // Log admin action for audit trail
    console.log(`[SECURITY AUDIT] Admin ID: ${req.userId} locked user ID: ${userId}`);

    res.json({
      message: `User ${user.username} locked successfully`,
      user: {
        id: user.id,
        username: user.username,
        is_locked: true,
      },
    });
  } catch (error) {
    console.error('Admin lock user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/users/:userId/unlock - Unlock a user account (admin only)
 */
router.post('/users/:userId/unlock', jwtRequired, adminRequired, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (!userId || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const user = await db.queryOne(`SELECT id, username, is_locked FROM users WHERE id = ?`, [
      userId,
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.is_locked) {
      return res.status(400).json({ error: 'User is not locked' });
    }

    // Unlock user
    await db.run(`UPDATE users SET is_locked = 0 WHERE id = ?`, [userId]);

    // Log admin action for audit trail
    console.log(`[SECURITY AUDIT] Admin ID: ${req.userId} unlocked user ID: ${userId}`);

    res.json({
      message: `User ${user.username} unlocked successfully`,
      user: {
        id: user.id,
        username: user.username,
        is_locked: false,
      },
    });
  } catch (error) {
    console.error('Admin unlock user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/users/:userId - Delete a user account (admin only)
 */
router.delete('/users/:userId', jwtRequired, adminRequired, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (!userId || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const user = await db.queryOne(`SELECT id, username FROM users WHERE id = ?`, [userId]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the main admin user (username 'admin' is protected)
    if (user.username === 'admin') {
      return res.status(403).json({ error: 'Cannot delete the main admin user' });
    }

    // Prevent deleting yourself
    if (userId === req.userId) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    // Delete user and all associated data (cascade deletes handled by foreign keys)
    await db.run(`DELETE FROM users WHERE id = ?`, [userId]);

    // Log admin action for audit trail
    console.log(
      `[SECURITY AUDIT] Admin ID: ${req.userId} deleted user ID: ${userId} (username: ${user.username})`,
    );

    res.json({
      message: `User ${user.username} deleted successfully`,
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/users/:userId/grant-admin - Grant admin privileges (admin only)
 */
router.post('/users/:userId/grant-admin', jwtRequired, adminRequired, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (!userId || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const user = await db.queryOne(`SELECT id, username, is_admin FROM users WHERE id = ?`, [
      userId,
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_admin) {
      return res.status(400).json({ error: 'User already has admin privileges' });
    }

    // Grant admin privileges
    await db.run(`UPDATE users SET is_admin = 1 WHERE id = ?`, [userId]);

    // Log admin action for audit trail
    console.log(
      `[SECURITY AUDIT] Admin ID: ${req.userId} granted admin privileges to user ID: ${userId}`,
    );

    res.json({
      message: `Admin privileges granted to ${user.username}`,
      user: {
        id: user.id,
        username: user.username,
        is_admin: true,
      },
    });
  } catch (error) {
    console.error('Admin grant privileges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/users/:userId/revoke-admin - Revoke admin privileges (admin only)
 */
router.post('/users/:userId/revoke-admin', jwtRequired, adminRequired, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (!userId || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const user = await db.queryOne(`SELECT id, username, is_admin FROM users WHERE id = ?`, [
      userId,
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent revoking the main admin user's privileges (username 'admin' is protected)
    if (user.username === 'admin' && user.is_admin) {
      return res.status(403).json({ error: 'Cannot revoke privileges from the main admin user' });
    }

    // Prevent revoking your own admin privileges
    if (userId === req.userId) {
      return res.status(403).json({ error: 'Cannot revoke your own admin privileges' });
    }

    if (!user.is_admin) {
      return res.status(400).json({ error: 'User does not have admin privileges' });
    }

    // Revoke admin privileges
    await db.run(`UPDATE users SET is_admin = 0 WHERE id = ?`, [userId]);

    // Log admin action for audit trail
    console.log(
      `[SECURITY AUDIT] Admin ID: ${req.userId} revoked admin privileges from user ID: ${userId}`,
    );

    res.json({
      message: `Admin privileges revoked from ${user.username}`,
      user: {
        id: user.id,
        username: user.username,
        is_admin: false,
      },
    });
  } catch (error) {
    console.error('Admin revoke privileges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/health - Health check endpoint
 */
router.get('/health', async (_req, res) => {
  try {
    // Check database connectivity
    const userCount = await db.queryOne(`SELECT COUNT(*) as count FROM users`);
    const dbPath = process.env.NOTES_DB_PATH || 'data/notes.db';

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        type: db.isSQLite ? 'SQLite' : 'MySQL',
        connection: 'OK',
        path: db.isSQLite ? dbPath : `${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT || 3306}`,
      },
      stats: {
        total_users: userCount?.count || 0,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
