/**
 * Admin Routes.
 */
const express = require('express');
const router = express.Router();
const { jwtRequired, adminRequired } = require('../middleware/auth');
const db = require('../config/database');

/**
 * GET /api/admin/users - List all users (admin only)
 */
router.get('/users', jwtRequired, adminRequired, async (req, res) => {
  try {
    const { search = '', page = 1, per_page = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(per_page, 10);

    let sql = `SELECT id, username, email, bio, theme, totp_secret, created_at, last_login FROM users`;
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

    res.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        bio: u.bio,
        theme: u.theme,
        has_2fa: !!u.totp_secret,
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
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const user = await db.queryOne(`SELECT id, username, totp_secret FROM users WHERE id = ?`, [
      userId,
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.totp_secret) {
      return res.status(400).json({ error: '2FA is not enabled for this user' });
    }

    // Disable 2FA
    await db.run(`UPDATE users SET totp_secret = NULL WHERE id = ?`, [userId]);

    // Log admin action for audit trail
    // TODO: Consider using a proper logging framework (winston, pino) in production
    console.log(`[SECURITY AUDIT] Admin ID: ${req.userId} disabled 2FA for user ID: ${userId}`);

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

module.exports = router;
