/**
 * SQLite Database Schema
 *
 * Stores processed analytics data from history and config
 */

import type Database from 'better-sqlite3';

/**
 * Database schema version
 */
export const SCHEMA_VERSION = 1;

/**
 * Initialize database schema
 */
export function initializeSchema(db: Database.Database): void {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create schema version table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Check current version
  const currentVersion = db
    .prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1')
    .get() as { version: number } | undefined;

  if (!currentVersion || currentVersion.version < SCHEMA_VERSION) {
    applySchema(db);

    // Update version
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
  }
}

/**
 * Apply database schema
 */
function applySchema(db: Database.Database): void {
  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      prompt_count INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      first_prompt TEXT,
      last_prompt TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create index on project and time for fast queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
    CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
  `);

  // Prompts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      project TEXT NOT NULL,
      display TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      pasted_contents_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );
  `);

  // Create index for fast queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_prompts_session ON prompts(session_id);
    CREATE INDEX IF NOT EXISTS idx_prompts_project ON prompts(project);
    CREATE INDEX IF NOT EXISTS idx_prompts_timestamp ON prompts(timestamp);
  `);

  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      project_path TEXT PRIMARY KEY,
      first_seen TEXT NOT NULL,
      last_active TEXT NOT NULL,
      total_prompts INTEGER DEFAULT 0,
      total_sessions INTEGER DEFAULT 0,
      total_duration_ms INTEGER DEFAULT 0,
      lines_added INTEGER DEFAULT 0,
      lines_removed INTEGER DEFAULT 0,
      total_cost REAL DEFAULT 0,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cache_creation_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Daily statistics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      date TEXT PRIMARY KEY,
      total_prompts INTEGER DEFAULT 0,
      unique_sessions INTEGER DEFAULT 0,
      total_duration_ms INTEGER DEFAULT 0,
      unique_projects INTEGER DEFAULT 0,
      average_session_length_ms INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Habits table (for pattern detection)
  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      frequency INTEGER DEFAULT 0,
      last_occurrence TEXT,
      confidence REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Skills progression table
  db.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      skill TEXT PRIMARY KEY,
      level TEXT NOT NULL CHECK(level IN ('beginner', 'intermediate', 'advanced', 'expert')),
      usage_count INTEGER DEFAULT 0,
      first_used TEXT NOT NULL,
      last_used TEXT NOT NULL,
      proficiency INTEGER DEFAULT 0 CHECK(proficiency >= 0 AND proficiency <= 100),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Metadata table for storing last sync time, etc.
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/**
 * Insert or update session
 */
export function upsertSession(
  db: Database.Database,
  session: {
    sessionId: string;
    project: string;
    startTime: Date;
    endTime: Date;
    promptCount: number;
    duration: number;
    firstPrompt: string;
    lastPrompt: string;
  }
): void {
  db.prepare(`
    INSERT INTO sessions (session_id, project, start_time, end_time, prompt_count, duration_ms, first_prompt, last_prompt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      end_time = excluded.end_time,
      prompt_count = excluded.prompt_count,
      duration_ms = excluded.duration_ms,
      last_prompt = excluded.last_prompt
  `).run(
    session.sessionId,
    session.project,
    session.startTime.toISOString(),
    session.endTime.toISOString(),
    session.promptCount,
    session.duration,
    session.firstPrompt,
    session.lastPrompt
  );
}

/**
 * Insert prompt
 */
export function insertPrompt(
  db: Database.Database,
  prompt: {
    sessionId: string;
    project: string;
    display: string;
    timestamp: Date;
    pastedContentsCount: number;
  }
): void {
  db.prepare(`
    INSERT INTO prompts (session_id, project, display, timestamp, pasted_contents_count)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    prompt.sessionId,
    prompt.project,
    prompt.display,
    prompt.timestamp.toISOString(),
    prompt.pastedContentsCount
  );
}

/**
 * Update or insert project stats
 */
export function upsertProjectStats(
  db: Database.Database,
  stats: {
    projectPath: string;
    firstSeen: Date;
    lastActive: Date;
    totalPrompts: number;
    totalSessions: number;
    totalDuration: number;
    linesAdded: number;
    linesRemoved: number;
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  }
): void {
  db.prepare(`
    INSERT INTO projects (
      project_path, first_seen, last_active, total_prompts, total_sessions,
      total_duration_ms, lines_added, lines_removed, total_cost,
      input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_path) DO UPDATE SET
      last_active = excluded.last_active,
      total_prompts = excluded.total_prompts,
      total_sessions = excluded.total_sessions,
      total_duration_ms = excluded.total_duration_ms,
      lines_added = excluded.lines_added,
      lines_removed = excluded.lines_removed,
      total_cost = excluded.total_cost,
      input_tokens = excluded.input_tokens,
      output_tokens = excluded.output_tokens,
      cache_creation_tokens = excluded.cache_creation_tokens,
      cache_read_tokens = excluded.cache_read_tokens,
      updated_at = datetime('now')
  `).run(
    stats.projectPath,
    stats.firstSeen.toISOString(),
    stats.lastActive.toISOString(),
    stats.totalPrompts,
    stats.totalSessions,
    stats.totalDuration,
    stats.linesAdded,
    stats.linesRemoved,
    stats.totalCost,
    stats.inputTokens,
    stats.outputTokens,
    stats.cacheCreationTokens,
    stats.cacheReadTokens
  );
}

/**
 * Set metadata value
 */
export function setMetadata(db: Database.Database, key: string, value: string): void {
  db.prepare(`
    INSERT INTO metadata (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now')
  `).run(key, value);
}

/**
 * Get metadata value
 */
export function getMetadata(db: Database.Database, key: string): string | undefined {
  const result = db.prepare('SELECT value FROM metadata WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return result?.value;
}
