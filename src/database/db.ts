/**
 * Database Connection and Management
 */

import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { initializeSchema } from './schema.js';

/**
 * Default database path
 */
export const DEFAULT_DB_PATH = join(homedir(), '.claude', 'analytics.db');

/**
 * Get or create database connection
 */
export function getDatabase(dbPath: string = DEFAULT_DB_PATH): Database.Database {
  // Ensure directory exists
  const dir = join(dbPath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Open database
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');

  // Initialize schema
  initializeSchema(db);

  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(db: Database.Database): void {
  db.close();
}
