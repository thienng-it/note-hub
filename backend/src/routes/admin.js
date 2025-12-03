/**
 * Admin Routes.
 */
const express = require('express');
const router = express.Router();
const { jwtRequired, adminRequired } = require('../middleware/auth');
const { User, Op } = require('../models');

/**
 * GET /api/admin/users - List all users (admin only)
 */
router.get('/users', jwtRequired, adminRequired, async (req, res) => {
  try {
    const { search = '', page = 1, per_page = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(per_page, 10);
    const limit = parseInt(per_page, 10);

    const where = search ? {
      [Op.or]: [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const users = await User.findAll({
      where,
      attributes: ['id', 'username', 'email', 'bio', 'theme', 'totp_secret', 'created_at', 'last_login'],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    const totalCount = await User.count({ where });

    // Get stats
    const totalUsers = await User.count();
    const usersWith2FA = await User.count({ where: { totp_secret: { [Op.ne]: null } } });
    const usersWithEmail = await User.count({ where: { email: { [Op.ne]: null } } });

    res.json({
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        bio: u.bio,
        theme: u.theme,
        has_2fa: !!u.totp_secret,
        created_at: u.created_at,
        last_login: u.last_login
      })),
      pagination: {
        page: parseInt(page, 10),
        per_page: limit,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / limit)
      },
      stats: {
        total_users: totalUsers,
        users_with_2fa: usersWith2FA,
        users_with_email: usersWithEmail
      }
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/health - Health check endpoint
 */
router.get('/health', async (req, res) => {
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
        path: db.isSQLite ? dbPath : `${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT || 3306}`
      },
      stats: {
        total_users: userCount?.count || 0
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
