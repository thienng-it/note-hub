/**
 * Type definitions for database module
 */

export interface QueryResult {
  insertId?: number;
  affectedRows?: number;
  [key: string]: any;
}

export interface Database {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  run(sql: string, params?: any[]): Promise<QueryResult>;
  db: any;
  isSQLite: boolean;
  connect(): Promise<any>;
  replication: any;
}

declare const db: Database;
export default db;
