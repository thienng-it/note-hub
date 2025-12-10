/**
 * Type definitions for database module
 */

export type QueryParam = string | number | boolean | null;

export interface QueryResult {
  insertId?: number;
  affectedRows?: number;
  [key: string]: unknown;
}

export interface Database {
  query<T = Record<string, unknown>>(sql: string, params?: QueryParam[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: QueryParam[]): Promise<T | null>;
  run(sql: string, params?: QueryParam[]): Promise<QueryResult>;
  db: unknown;
  isSQLite: boolean;
  connect(): Promise<void>;
  replication: unknown;
}

declare const db: Database;
export default db;
