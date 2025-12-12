/**
 * Audit Service for tracking data access and modifications.
 * Provides compliance monitoring and security event tracking.
 */

import db from '../config/database.js';
import logger from '../config/logger.js';

export default class AuditService {
  /**
   * Log note access (view)
   */
  static async logNoteAccess(userId, noteId, ipAddress = null, userAgent = null) {
    try {
      logger.business('note_access', 'note', {
        userId,
        noteId,
        action: 'view',
        ipAddress,
        userAgent: userAgent?.substring(0, 255), // Truncate for storage
      });

      // Store in database for compliance reporting
      await db.run(
        `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, 'note', noteId, 'view', ipAddress, userAgent?.substring(0, 255)],
      );
    } catch (error) {
      // Don't fail the request if audit logging fails
      logger.error('Audit log error (note access):', error);
    }
  }

  /**
   * Log note creation
   */
  static async logNoteCreation(userId, noteId, ipAddress = null, metadata = {}) {
    try {
      logger.business('note_create', 'note', {
        userId,
        noteId,
        action: 'create',
        ipAddress,
        ...metadata,
      });

      await db.run(
        `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, ip_address, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, 'note', noteId, 'create', ipAddress, JSON.stringify(metadata)],
      );
    } catch (error) {
      logger.error('Audit log error (note creation):', error);
    }
  }

  /**
   * Log note modification
   */
  static async logNoteModification(
    userId,
    noteId,
    changes = {},
    ipAddress = null,
    userAgent = null,
  ) {
    try {
      logger.business('note_update', 'note', {
        userId,
        noteId,
        action: 'update',
        changes,
        ipAddress,
        userAgent: userAgent?.substring(0, 255),
      });

      await db.run(
        `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, metadata, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          userId,
          'note',
          noteId,
          'update',
          JSON.stringify(changes),
          ipAddress,
          userAgent?.substring(0, 255),
        ],
      );
    } catch (error) {
      logger.error('Audit log error (note modification):', error);
    }
  }

  /**
   * Log note deletion
   */
  static async logNoteDeletion(userId, noteId, ipAddress = null, metadata = {}) {
    try {
      logger.business('note_delete', 'note', {
        userId,
        noteId,
        action: 'delete',
        ipAddress,
        ...metadata,
      });

      await db.run(
        `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, ip_address, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, 'note', noteId, 'delete', ipAddress, JSON.stringify(metadata)],
      );
    } catch (error) {
      logger.error('Audit log error (note deletion):', error);
    }
  }

  /**
   * Log task access (view)
   */
  static async logTaskAccess(userId, taskId, ipAddress = null, userAgent = null) {
    try {
      logger.business('task_access', 'task', {
        userId,
        taskId,
        action: 'view',
        ipAddress,
        userAgent: userAgent?.substring(0, 255),
      });

      await db.run(
        `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, 'task', taskId, 'view', ipAddress, userAgent?.substring(0, 255)],
      );
    } catch (error) {
      logger.error('Audit log error (task access):', error);
    }
  }

  /**
   * Log task creation
   */
  static async logTaskCreation(userId, taskId, ipAddress = null, metadata = {}) {
    try {
      logger.business('task_create', 'task', {
        userId,
        taskId,
        action: 'create',
        ipAddress,
        ...metadata,
      });

      await db.run(
        `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, ip_address, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, 'task', taskId, 'create', ipAddress, JSON.stringify(metadata)],
      );
    } catch (error) {
      logger.error('Audit log error (task creation):', error);
    }
  }

  /**
   * Log task modification
   */
  static async logTaskModification(
    userId,
    taskId,
    changes = {},
    ipAddress = null,
    userAgent = null,
  ) {
    try {
      logger.business('task_update', 'task', {
        userId,
        taskId,
        action: 'update',
        changes,
        ipAddress,
        userAgent: userAgent?.substring(0, 255),
      });

      await db.run(
        `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, metadata, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          userId,
          'task',
          taskId,
          'update',
          JSON.stringify(changes),
          ipAddress,
          userAgent?.substring(0, 255),
        ],
      );
    } catch (error) {
      logger.error('Audit log error (task modification):', error);
    }
  }

  /**
   * Log task deletion
   */
  static async logTaskDeletion(userId, taskId, ipAddress = null, metadata = {}) {
    try {
      logger.business('task_delete', 'task', {
        userId,
        taskId,
        action: 'delete',
        ipAddress,
        ...metadata,
      });

      await db.run(
        `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, ip_address, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, 'task', taskId, 'delete', ipAddress, JSON.stringify(metadata)],
      );
    } catch (error) {
      logger.error('Audit log error (task deletion):', error);
    }
  }

  /**
   * Log data export
   */
  static async logDataExport(userId, exportType, ipAddress = null, metadata = {}) {
    try {
      logger.security('data_export', {
        userId,
        exportType,
        ipAddress,
        ...metadata,
      });

      await db.run(
        `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, ip_address, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, 'export', null, exportType, ipAddress, JSON.stringify(metadata)],
      );
    } catch (error) {
      logger.error('Audit log error (data export):', error);
    }
  }

  /**
   * Log data deletion (GDPR right to be forgotten)
   */
  static async logDataDeletion(userId, reason, ipAddress = null, metadata = {}) {
    try {
      logger.security('data_deletion', {
        userId,
        reason,
        ipAddress,
        ...metadata,
      });

      await db.run(
        `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, ip_address, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          userId,
          'user',
          userId,
          'data_deletion',
          ipAddress,
          JSON.stringify({ reason, ...metadata }),
        ],
      );
    } catch (error) {
      logger.error('Audit log error (data deletion):', error);
    }
  }

  /**
   * Get audit logs for a user (admin only)
   */
  static async getUserAuditLogs(userId, limit = 100, offset = 0) {
    try {
      const logs = await db.query(
        `SELECT * FROM audit_logs 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset],
      );

      return logs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      }));
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs by entity (admin only)
   */
  static async getEntityAuditLogs(entityType, entityId, limit = 50) {
    try {
      const logs = await db.query(
        `SELECT * FROM audit_logs 
         WHERE entity_type = ? AND entity_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [entityType, entityId, limit],
      );

      return logs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      }));
    } catch (error) {
      logger.error('Error fetching entity audit logs:', error);
      throw error;
    }
  }

  /**
   * Clean old audit logs (data retention policy)
   */
  static async cleanOldAuditLogs(retentionDays = 365) {
    try {
      const result = await db.run(
        `DELETE FROM audit_logs 
         WHERE created_at < datetime('now', '-' || ? || ' days')`,
        [retentionDays],
      );

      logger.info('Cleaned old audit logs', {
        retentionDays,
        deletedCount: result.changes || 0,
      });

      return result.changes || 0;
    } catch (error) {
      logger.error('Error cleaning audit logs:', error);
      throw error;
    }
  }
}
