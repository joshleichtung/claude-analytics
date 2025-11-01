/**
 * History.jsonl Parser
 *
 * Parses ~/.claude/history.jsonl to extract session and prompt data
 */

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { HistoryEntrySchema, type HistoryEntry, type Session } from '../types/index.js';

/**
 * Default path to history.jsonl
 */
export const HISTORY_PATH = join(homedir(), '.claude', 'history.jsonl');

/**
 * Parse a single line from history.jsonl
 */
export function parseHistoryLine(line: string): HistoryEntry | null {
  try {
    const json = JSON.parse(line);
    return HistoryEntrySchema.parse(json);
  } catch (error) {
    console.error('Failed to parse history line:', error);
    return null;
  }
}

/**
 * Read all history entries from history.jsonl
 */
export function readHistoryFile(filePath: string = HISTORY_PATH): HistoryEntry[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    const entries: HistoryEntry[] = [];
    for (const line of lines) {
      if (line.trim()) {
        const entry = parseHistoryLine(line);
        if (entry) {
          entries.push(entry);
        }
      }
    }

    return entries;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`History file not found: ${filePath}`);
      return [];
    }
    throw error;
  }
}

/**
 * Group history entries into sessions
 *
 * Sessions are determined by:
 * 1. Explicit sessionId field
 * 2. Time gap > 30 minutes between prompts
 * 3. Project change
 */
export function groupIntoSessions(
  entries: HistoryEntry[],
  sessionGapMs: number = 30 * 60 * 1000 // 30 minutes
): Session[] {
  if (entries.length === 0) {
    return [];
  }

  // Sort by timestamp
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  const sessions: Session[] = [];
  let currentSession: {
    sessionId?: string;
    project: string;
    startTime: Date;
    endTime: Date;
    prompts: HistoryEntry[];
  } | null = null;

  for (const entry of sorted) {
    const timestamp = new Date(entry.timestamp);

    // Check if we should start a new session
    const shouldStartNew =
      !currentSession ||
      entry.sessionId !== currentSession.sessionId ||
      entry.project !== currentSession.project ||
      timestamp.getTime() - currentSession.endTime.getTime() > sessionGapMs;

    if (shouldStartNew) {
      // Save previous session
      if (currentSession && currentSession.prompts.length > 0) {
        sessions.push({
          sessionId: currentSession.sessionId || `auto-${sessions.length}`,
          project: currentSession.project,
          startTime: currentSession.startTime,
          endTime: currentSession.endTime,
          promptCount: currentSession.prompts.length,
          duration: currentSession.endTime.getTime() - currentSession.startTime.getTime(),
          firstPrompt: currentSession.prompts[0].display,
          lastPrompt: currentSession.prompts[currentSession.prompts.length - 1].display,
        });
      }

      // Start new session
      currentSession = {
        sessionId: entry.sessionId,
        project: entry.project,
        startTime: timestamp,
        endTime: timestamp,
        prompts: [entry],
      };
    } else if (currentSession) {
      // Continue current session
      currentSession.endTime = timestamp;
      currentSession.prompts.push(entry);
    }
  }

  // Don't forget the last session
  if (currentSession && currentSession.prompts.length > 0) {
    sessions.push({
      sessionId: currentSession.sessionId || `auto-${sessions.length}`,
      project: currentSession.project,
      startTime: currentSession.startTime,
      endTime: currentSession.endTime,
      promptCount: currentSession.prompts.length,
      duration: currentSession.endTime.getTime() - currentSession.startTime.getTime(),
      firstPrompt: currentSession.prompts[0].display,
      lastPrompt: currentSession.prompts[currentSession.prompts.length - 1].display,
    });
  }

  return sessions;
}

/**
 * Filter entries by date range
 */
export function filterByDateRange(
  entries: HistoryEntry[],
  startDate: Date,
  endDate: Date
): HistoryEntry[] {
  return entries.filter((entry) => {
    const timestamp = new Date(entry.timestamp);
    return timestamp >= startDate && timestamp <= endDate;
  });
}

/**
 * Filter entries by project
 */
export function filterByProject(
  entries: HistoryEntry[],
  projectPath: string
): HistoryEntry[] {
  return entries.filter((entry) => entry.project === projectPath);
}

/**
 * Get unique projects from history
 */
export function getUniqueProjects(entries: HistoryEntry[]): string[] {
  const projects = new Set<string>();
  for (const entry of entries) {
    projects.add(entry.project);
  }
  return Array.from(projects).sort();
}

/**
 * Calculate total prompts per project
 */
export function getPromptsPerProject(entries: HistoryEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.project, (counts.get(entry.project) || 0) + 1);
  }
  return counts;
}
