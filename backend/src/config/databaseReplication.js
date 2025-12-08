/**
 * Database Replication Configuration and Management
 *
 * Supports read replicas for improved performance and high availability:
 * - MySQL: Primary-replica replication with automatic failover
 * - SQLite: Backup/replication using file-based approach or Litestream
 *
 * Features:
 * - Read/write query routing
 * - Load balancing across read replicas
 * - Health monitoring and automatic failover
 * - Replica lag monitoring
 */

const path = require('node:path');
const fs = require('node:fs');

class DatabaseReplication {
  constructor() {
    this.primary = null;
    this.replicas = [];
    this.isSQLite = true;
    this.currentReplicaIndex = 0;
    this.replicaHealthStatus = new Map();
    this.enabled = false;
  }

  /**
   * Initialize replication based on environment configuration
   *
   * Environment variables:
   * - DB_REPLICATION_ENABLED: Enable/disable replication (default: false)
   *
   * For MySQL:
   * - MYSQL_REPLICA_HOSTS: Comma-separated list of replica hosts
   * - MYSQL_REPLICA_PORTS: Comma-separated list of replica ports (optional)
   * - MYSQL_REPLICA_USER: User for replica connections (default: same as primary)
   * - MYSQL_REPLICA_PASSWORD: Password for replicas (default: same as primary)
   *
   * For SQLite:
   * - SQLITE_REPLICA_PATHS: Comma-separated list of replica database paths
   */
  async initialize(primaryConnection, isSQLite = true) {
    this.primary = primaryConnection;
    this.isSQLite = isSQLite;

    // Check if replication is enabled
    const replicationEnabled = process.env.DB_REPLICATION_ENABLED === 'true';
    if (!replicationEnabled) {
      console.log('📦 Database replication is disabled');
      this.enabled = false;
      return;
    }

    try {
      if (this.isSQLite) {
        await this.initializeSQLiteReplicas();
      } else {
        await this.initializeMySQLReplicas();
      }

      if (this.replicas.length > 0) {
        this.enabled = true;
        console.log(`✅ Database replication initialized with ${this.replicas.length} replica(s)`);

        // Start health check monitoring
        this.startHealthChecks();
      } else {
        console.log('⚠️  No replicas configured, replication disabled');
        this.enabled = false;
      }
    } catch (error) {
      console.error('⚠️  Failed to initialize replication:', error.message);
      console.log('   Continuing without replication');
      this.enabled = false;
    }
  }

  /**
   * Initialize SQLite read replicas
   * SQLite replicas are read-only copies of the primary database
   */
  async initializeSQLiteReplicas() {
    const replicaPaths = process.env.SQLITE_REPLICA_PATHS;
    if (!replicaPaths) {
      return;
    }

    const Database = require('better-sqlite3');
    const paths = replicaPaths.split(',').map((p) => p.trim());

    for (const replicaPath of paths) {
      try {
        const resolvedPath = path.isAbsolute(replicaPath)
          ? replicaPath
          : path.resolve(process.cwd(), replicaPath);

        // Check if replica database exists
        if (!fs.existsSync(resolvedPath)) {
          console.warn(`⚠️  Replica database not found: ${resolvedPath}`);
          continue;
        }

        // Open replica in read-only mode
        const replica = new Database(resolvedPath, { readonly: true });
        replica.pragma('query_only = ON');

        this.replicas.push({
          connection: replica,
          path: resolvedPath,
          type: 'sqlite',
          healthy: true,
        });

        console.log(`   ✓ Connected to SQLite replica: ${resolvedPath}`);
      } catch (error) {
        console.error(`   ✗ Failed to connect to replica ${replicaPath}:`, error.message);
      }
    }
  }

  /**
   * Initialize MySQL read replicas
   * Connects to multiple MySQL replica servers for read operations
   */
  async initializeMySQLReplicas() {
    const replicaHosts = process.env.MYSQL_REPLICA_HOSTS;
    if (!replicaHosts) {
      return;
    }

    const mysql = require('mysql2/promise');
    const hosts = replicaHosts.split(',').map((h) => h.trim());
    const ports = (process.env.MYSQL_REPLICA_PORTS || '').split(',').map((p) => p.trim());
    const user = process.env.MYSQL_REPLICA_USER || process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_REPLICA_PASSWORD || process.env.MYSQL_PASSWORD || '';
    const database = process.env.MYSQL_DATABASE || 'notehub';

    for (let i = 0; i < hosts.length; i++) {
      const host = hosts[i];
      const port = ports[i] ? parseInt(ports[i], 10) : 3306;

      try {
        const config = {
          host,
          port,
          user,
          password,
          database,
          waitForConnections: true,
          connectionLimit: 5, // Fewer connections per replica
          queueLimit: 0,
        };

        // Disable SSL for local/Docker connections
        const sslDisabled =
          process.env.MYSQL_SSL_DISABLED === 'true' ||
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host.startsWith('mysql-replica') ||
          host.startsWith('10.') ||
          host.startsWith('172.') ||
          host.startsWith('192.168.');

        if (!sslDisabled) {
          config.ssl = { rejectUnauthorized: true };
        }

        const pool = await mysql.createPool(config);

        // Test connection
        const connection = await pool.getConnection();
        connection.release();

        this.replicas.push({
          connection: pool,
          host,
          port,
          type: 'mysql',
          healthy: true,
        });

        console.log(`   ✓ Connected to MySQL replica: ${host}:${port}`);
      } catch (error) {
        console.error(`   ✗ Failed to connect to replica ${host}:${port}:`, error.message);
      }
    }
  }

  /**
   * Execute a read query
   * Routes to a healthy replica, falls back to primary if no replicas available
   */
  async query(sql, params = []) {
    // If replication is not enabled or no healthy replicas, use primary
    if (!this.enabled || !this.hasHealthyReplicas()) {
      return this.queryPrimary(sql, params);
    }

    // Try to use a replica with round-robin load balancing
    const replica = this.getNextHealthyReplica();
    if (!replica) {
      console.warn('⚠️  No healthy replicas available, falling back to primary');
      return this.queryPrimary(sql, params);
    }

    try {
      if (this.isSQLite) {
        return replica.connection.prepare(sql).all(...params);
      } else {
        const [rows] = await replica.connection.execute(sql, params);
        return rows;
      }
    } catch (error) {
      console.error(
        `⚠️  Replica query failed (${replica.host || replica.path}), falling back to primary:`,
        error.message,
      );
      // Mark replica as unhealthy
      this.replicaHealthStatus.set(replica, false);
      // Fallback to primary
      return this.queryPrimary(sql, params);
    }
  }

  /**
   * Execute a read query that returns a single row
   * Routes to a healthy replica, falls back to primary if no replicas available
   */
  async queryOne(sql, params = []) {
    // If replication is not enabled or no healthy replicas, use primary
    if (!this.enabled || !this.hasHealthyReplicas()) {
      return this.queryOnePrimary(sql, params);
    }

    // Try to use a replica with round-robin load balancing
    const replica = this.getNextHealthyReplica();
    if (!replica) {
      console.warn('⚠️  No healthy replicas available, falling back to primary');
      return this.queryOnePrimary(sql, params);
    }

    try {
      if (this.isSQLite) {
        return replica.connection.prepare(sql).get(...params);
      } else {
        const [rows] = await replica.connection.execute(sql, params);
        return rows[0];
      }
    } catch (error) {
      console.error(
        `⚠️  Replica query failed (${replica.host || replica.path}), falling back to primary:`,
        error.message,
      );
      // Mark replica as unhealthy
      this.replicaHealthStatus.set(replica, false);
      // Fallback to primary
      return this.queryOnePrimary(sql, params);
    }
  }

  /**
   * Execute a write query (INSERT, UPDATE, DELETE)
   * Always routes to primary database
   */
  async run(sql, params = []) {
    if (this.isSQLite) {
      const result = this.primary.prepare(sql).run(...params);
      return { insertId: result.lastInsertRowid, affectedRows: result.changes };
    } else {
      const [result] = await this.primary.execute(sql, params);
      return { insertId: result.insertId, affectedRows: result.affectedRows };
    }
  }

  /**
   * Execute query on primary database
   */
  async queryPrimary(sql, params = []) {
    if (this.isSQLite) {
      return this.primary.prepare(sql).all(...params);
    } else {
      const [rows] = await this.primary.execute(sql, params);
      return rows;
    }
  }

  /**
   * Execute single-row query on primary database
   */
  async queryOnePrimary(sql, params = []) {
    if (this.isSQLite) {
      return this.primary.prepare(sql).get(...params);
    } else {
      const [rows] = await this.primary.execute(sql, params);
      return rows[0];
    }
  }

  /**
   * Get the next healthy replica using round-robin
   */
  getNextHealthyReplica() {
    if (this.replicas.length === 0) {
      return null;
    }

    const _startIndex = this.currentReplicaIndex;
    let attempts = 0;

    while (attempts < this.replicas.length) {
      const replica = this.replicas[this.currentReplicaIndex];
      this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.replicas.length;
      attempts++;

      if (replica.healthy && this.replicaHealthStatus.get(replica) !== false) {
        return replica;
      }
    }

    return null;
  }

  /**
   * Check if any healthy replicas are available
   */
  hasHealthyReplicas() {
    return this.replicas.some((r) => r.healthy && this.replicaHealthStatus.get(r) !== false);
  }

  /**
   * Start periodic health checks for replicas
   */
  startHealthChecks() {
    // Check replica health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkReplicaHealth();
    }, 30000);

    // Initial health check
    this.checkReplicaHealth();
  }

  /**
   * Check health of all replicas
   */
  async checkReplicaHealth() {
    for (const replica of this.replicas) {
      try {
        if (this.isSQLite) {
          // For SQLite, just try a simple query
          replica.connection.prepare('SELECT 1').get();
          replica.healthy = true;
          this.replicaHealthStatus.set(replica, true);
        } else {
          // For MySQL, check connection and replica lag
          const connection = await replica.connection.getConnection();

          // Check if replica is running (use modern REPLICA terminology, fallback to SLAVE for older MySQL)
          let status;
          try {
            [status] = await connection.execute('SHOW REPLICA STATUS');
          } catch (_error) {
            // Fallback to deprecated SLAVE syntax for MySQL < 8.0.22
            [status] = await connection.execute('SHOW SLAVE STATUS');
          }

          if (status.length > 0) {
            const replicaStatus = status[0];
            // Check both modern and legacy field names for compatibility
            const secondsBehind =
              replicaStatus.Seconds_Behind_Source || replicaStatus.Seconds_Behind_Master;

            // Consider replica unhealthy if lag is more than 30 seconds
            if (secondsBehind !== null && secondsBehind <= 30) {
              replica.healthy = true;
              this.replicaHealthStatus.set(replica, true);
            } else {
              console.warn(
                `⚠️  Replica ${replica.host}:${replica.port} has high lag: ${secondsBehind}s`,
              );
              replica.healthy = false;
              this.replicaHealthStatus.set(replica, false);
            }
          } else {
            // No replication status, assume it's healthy (might be a regular read-only instance)
            replica.healthy = true;
            this.replicaHealthStatus.set(replica, true);
          }

          connection.release();
        }
      } catch (error) {
        console.error(
          `⚠️  Health check failed for replica ${replica.host || replica.path}:`,
          error.message,
        );
        replica.healthy = false;
        this.replicaHealthStatus.set(replica, false);
      }
    }
  }

  /**
   * Get replication status
   */
  getStatus() {
    if (!this.enabled) {
      return {
        enabled: false,
        message: 'Replication is disabled',
      };
    }

    return {
      enabled: true,
      replicaCount: this.replicas.length,
      healthyReplicas: this.replicas.filter((r) => r.healthy).length,
      replicas: this.replicas.map((r) => ({
        type: r.type,
        location: r.host ? `${r.host}:${r.port}` : r.path,
        healthy: r.healthy,
      })),
    };
  }

  /**
   * Check if replication is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Close all replica connections
   */
  async close() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    for (const replica of this.replicas) {
      try {
        if (this.isSQLite) {
          replica.connection.close();
        } else {
          await replica.connection.end();
        }
      } catch (error) {
        console.error('Error closing replica connection:', error.message);
      }
    }

    this.replicas = [];
    this.enabled = false;
  }
}

// Singleton instance
const databaseReplication = new DatabaseReplication();

module.exports = databaseReplication;
