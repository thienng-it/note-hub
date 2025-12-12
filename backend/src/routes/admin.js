/**
 * Admin Routes.
 */
import express from 'express';
import logger from '../config/logger.js';
import AuditService from '../services/auditService.js';

const router = express.Router();

import db from '../config/database.js';
import { adminRequired, jwtRequired } from '../middleware/auth.js';
import { record2FAOperation } from '../middleware/metrics.js';

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
    logger.error('Admin list users error:', error);
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
    logger.info(`[SECURITY AUDIT] Admin ID: ${req.userId} disabled 2FA for user ID: ${userId}`);

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
    logger.error('Admin disable 2FA error:', error);
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
    logger.info(`[SECURITY AUDIT] Admin ID: ${req.userId} locked user ID: ${userId}`);

    res.json({
      message: `User ${user.username} locked successfully`,
      user: {
        id: user.id,
        username: user.username,
        is_locked: true,
      },
    });
  } catch (error) {
    logger.error('Admin lock user error:', error);
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
    logger.info(`[SECURITY AUDIT] Admin ID: ${req.userId} unlocked user ID: ${userId}`);

    res.json({
      message: `User ${user.username} unlocked successfully`,
      user: {
        id: user.id,
        username: user.username,
        is_locked: false,
      },
    });
  } catch (error) {
    logger.error('Admin unlock user error:', error);
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
    logger.info(
      `[SECURITY AUDIT] Admin ID: ${req.userId} deleted user ID: ${userId} (username: ${user.username})`,
    );

    res.json({
      message: `User ${user.username} deleted successfully`,
    });
  } catch (error) {
    logger.error('Admin delete user error:', error);
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
    logger.info(
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
    logger.error('Admin grant privileges error:', error);
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
    logger.info(
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
    logger.error('Admin revoke privileges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/audit-logs - Get audit logs with filtering (admin only)
 */
router.get('/audit-logs', jwtRequired, adminRequired, async (req, res) => {
  try {
    const {
      user_id,
      entity_type,
      entity_id,
      action,
      start_date,
      end_date,
      page = 1,
      per_page = 50,
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(per_page, 10);
    const limit = parseInt(per_page, 10);

    // Build WHERE clause
    const conditions = [];
    const params = [];

    if (user_id) {
      conditions.push('user_id = ?');
      params.push(parseInt(user_id, 10));
    }

    if (entity_type) {
      conditions.push('entity_type = ?');
      params.push(entity_type);
    }

    if (entity_id) {
      conditions.push('entity_id = ?');
      params.push(parseInt(entity_id, 10));
    }

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }

    if (start_date) {
      conditions.push('created_at >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('created_at <= ?');
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get logs with user information
    const sql = `
      SELECT 
        al.id,
        al.user_id,
        u.username,
        al.entity_type,
        al.entity_id,
        al.action,
        al.ip_address,
        al.user_agent,
        al.metadata,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = `SELECT COUNT(*) as count FROM audit_logs al ${whereClause}`;

    const logs = await db.query(sql, [...params, limit, offset]);
    const totalCount = await db.queryOne(countSql, params);

    // Parse metadata
    const parsedLogs = logs.map((log) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));

    res.json({
      logs: parsedLogs,
      pagination: {
        page: parseInt(page, 10),
        per_page: limit,
        total_count: totalCount?.count || 0,
        total_pages: Math.ceil((totalCount?.count || 0) / limit),
      },
    });
  } catch (error) {
    logger.error('Admin get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/audit-logs/user/:userId - Get audit logs for a specific user (admin only)
 */
router.get('/audit-logs/user/:userId', jwtRequired, adminRequired, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { limit = 100, offset = 0 } = req.query;

    const logs = await AuditService.getUserAuditLogs(
      userId,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );

    res.json({
      logs,
      user_id: userId,
      count: logs.length,
    });
  } catch (error) {
    logger.error('Admin get user audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/audit-logs/entity/:entityType/:entityId - Get audit logs for a specific entity (admin only)
 */
router.get(
  '/audit-logs/entity/:entityType/:entityId',
  jwtRequired,
  adminRequired,
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { limit = 50 } = req.query;

      const logs = await AuditService.getEntityAuditLogs(
        entityType,
        parseInt(entityId, 10),
        parseInt(limit, 10),
      );

      res.json({
        logs,
        entity_type: entityType,
        entity_id: parseInt(entityId, 10),
        count: logs.length,
      });
    } catch (error) {
      logger.error('Admin get entity audit logs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /api/admin/audit-logs/stats - Get audit log statistics (admin only)
 */
router.get('/audit-logs/stats', jwtRequired, adminRequired, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const conditions = [];
    const params = [];

    if (start_date) {
      conditions.push('created_at >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('created_at <= ?');
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total logs
    const totalLogs = await db.queryOne(
      `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
      params,
    );

    // Logs by action
    const logsByAction = await db.query(
      `SELECT action, COUNT(*) as count 
       FROM audit_logs ${whereClause}
       GROUP BY action 
       ORDER BY count DESC`,
      params,
    );

    // Logs by entity type
    const logsByEntity = await db.query(
      `SELECT entity_type, COUNT(*) as count 
       FROM audit_logs ${whereClause}
       GROUP BY entity_type 
       ORDER BY count DESC`,
      params,
    );

    // Most active users
    const mostActiveUsers = await db.query(
      `SELECT u.id, u.username, COUNT(*) as action_count 
       FROM audit_logs al
       JOIN users u ON al.user_id = u.id
       ${whereClause}
       GROUP BY al.user_id, u.id, u.username
       ORDER BY action_count DESC
       LIMIT 10`,
      params,
    );

    // Recent activity (last 24 hours)
    const recentActivity = await db.queryOne(
      `SELECT COUNT(*) as count 
       FROM audit_logs 
       WHERE created_at >= datetime('now', '-24 hours')`,
    );

    res.json({
      total_logs: totalLogs?.count || 0,
      recent_activity_24h: recentActivity?.count || 0,
      by_action: logsByAction,
      by_entity_type: logsByEntity,
      most_active_users: mostActiveUsers,
      date_range: {
        start: start_date || null,
        end: end_date || null,
      },
    });
  } catch (error) {
    logger.error('Admin get audit log stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/audit-logs/export - Export audit logs to CSV or JSON (admin only)
 */
router.get('/audit-logs/export', jwtRequired, adminRequired, async (req, res) => {
  try {
    const {
      format = 'json',
      user_id,
      entity_type,
      entity_id,
      action,
      start_date,
      end_date,
      limit = 1000,
    } = req.query;

    // Build WHERE clause
    const conditions = [];
    const params = [];

    if (user_id) {
      conditions.push('user_id = ?');
      params.push(parseInt(user_id, 10));
    }

    if (entity_type) {
      conditions.push('entity_type = ?');
      params.push(entity_type);
    }

    if (entity_id) {
      conditions.push('entity_id = ?');
      params.push(parseInt(entity_id, 10));
    }

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }

    if (start_date) {
      conditions.push('created_at >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('created_at <= ?');
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get logs with user information
    const sql = `
      SELECT 
        al.id,
        al.user_id,
        u.username,
        al.entity_type,
        al.entity_id,
        al.action,
        al.ip_address,
        al.user_agent,
        al.metadata,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ?
    `;

    const logs = await db.query(sql, [...params, parseInt(limit, 10)]);

    // Parse metadata
    const parsedLogs = logs.map((log) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));

    if (format === 'csv') {
      // Convert to CSV
      const headers = [
        'ID',
        'User ID',
        'Username',
        'Entity Type',
        'Entity ID',
        'Action',
        'IP Address',
        'User Agent',
        'Metadata',
        'Created At',
      ];

      const csvRows = [headers.join(',')];

      for (const log of parsedLogs) {
        const row = [
          log.id,
          log.user_id,
          `"${log.username || ''}"`,
          log.entity_type,
          log.entity_id || '',
          log.action,
          `"${log.ip_address || ''}"`,
          `"${(log.user_agent || '').replace(/"/g, '""')}"`,
          `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`,
          log.created_at,
        ];
        csvRows.push(row.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${Date.now()}.csv"`);
      res.send(csvRows.join('\n'));
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${Date.now()}.json"`);
      res.json({
        export_date: new Date().toISOString(),
        filters: {
          user_id,
          entity_type,
          entity_id,
          action,
          start_date,
          end_date,
        },
        count: parsedLogs.length,
        logs: parsedLogs,
      });
    }

    // Log the export action
    await AuditService.logDataExport(
      req.userId,
      'audit_logs',
      req.ip || req.socket?.remoteAddress,
      {
        format,
        filters: { user_id, entity_type, entity_id, action, start_date, end_date },
        count: parsedLogs.length,
      },
    );
  } catch (error) {
    logger.error('Admin export audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/audit-logs/cleanup - Clean old audit logs (admin only)
 */
router.delete('/audit-logs/cleanup', jwtRequired, adminRequired, async (req, res) => {
  try {
    const { retention_days = 365 } = req.query;
    const retentionDays = parseInt(retention_days, 10);

    if (retentionDays < 30) {
      return res.status(400).json({ error: 'Retention period must be at least 30 days' });
    }

    const deletedCount = await AuditService.cleanOldAuditLogs(retentionDays);

    // Log the cleanup action
    logger.info(
      `[SECURITY AUDIT] Admin ID: ${req.userId} cleaned ${deletedCount} audit logs older than ${retentionDays} days`,
    );

    res.json({
      message: `Cleaned ${deletedCount} audit log entries older than ${retentionDays} days`,
      deleted_count: deletedCount,
      retention_days: retentionDays,
    });
  } catch (error) {
    logger.error('Admin cleanup audit logs error:', error);
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
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
