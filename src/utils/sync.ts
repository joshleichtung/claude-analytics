/**
 * Data Sync Utility
 *
 * Syncs data from history.jsonl and .claude.json into the analytics database
 */

import type Database from 'better-sqlite3';
import {
  readHistoryFile,
  groupIntoSessions,
  getUniqueProjects,
} from '../parsers/history-parser.js';
import {
  readClaudeConfig,
  getAllProjects,
  projectMetricsToStats,
} from '../parsers/project-parser.js';
import {
  upsertSession,
  insertPrompt,
  upsertProjectStats,
  setMetadata,
  getMetadata,
} from '../database/schema.js';
import type { HistoryEntry } from '../types/index.js';

/**
 * Sync result summary
 */
export interface SyncResult {
  promptsProcessed: number;
  sessionsCreated: number;
  projectsUpdated: number;
  errors: string[];
  lastSyncTime: Date;
}

/**
 * Sync all data from history and config into database
 */
export function syncData(db: Database.Database): SyncResult {
  const result: SyncResult = {
    promptsProcessed: 0,
    sessionsCreated: 0,
    projectsUpdated: 0,
    errors: [],
    lastSyncTime: new Date(),
  };

  try {
    // Get last sync time
    const lastSyncStr = getMetadata(db, 'last_sync_time');
    const lastSyncTime = lastSyncStr ? new Date(lastSyncStr) : null;

    console.log(
      `Syncing data${lastSyncTime ? ` (last sync: ${lastSyncTime.toISOString()})` : ' (first sync)'}...`
    );

    // Read history file
    console.log('Reading history.jsonl...');
    const historyEntries = readHistoryFile();
    console.log(`Found ${historyEntries.length} history entries`);

    // Filter to new entries if incremental sync
    let entriesToProcess = historyEntries;
    if (lastSyncTime) {
      entriesToProcess = historyEntries.filter(
        (entry) => new Date(entry.timestamp) > lastSyncTime
      );
      console.log(`${entriesToProcess.length} new entries since last sync`);
    }

    // Group into sessions
    console.log('Grouping into sessions...');
    const sessions = groupIntoSessions(entriesToProcess);
    console.log(`Created ${sessions.length} sessions`);

    // Insert sessions
    console.log('Inserting sessions...');
    for (const session of sessions) {
      try {
        upsertSession(db, session);
        result.sessionsCreated++;
      } catch (error) {
        result.errors.push(`Failed to insert session ${session.sessionId}: ${error}`);
      }
    }

    // Insert prompts
    console.log('Inserting prompts...');
    for (const entry of entriesToProcess) {
      try {
        // Find session for this prompt
        const session = sessions.find(
          (s) =>
            new Date(entry.timestamp) >= s.startTime &&
            new Date(entry.timestamp) <= s.endTime &&
            s.project === entry.project
        );

        if (session) {
          insertPrompt(db, {
            sessionId: session.sessionId,
            project: entry.project,
            display: entry.display,
            timestamp: new Date(entry.timestamp),
            pastedContentsCount: Object.keys(entry.pastedContents || {}).length,
          });
          result.promptsProcessed++;
        }
      } catch (error) {
        result.errors.push(`Failed to insert prompt: ${error}`);
      }
    }

    // Calculate project stats from sessions
    console.log('Calculating project stats from sessions...');
    const projectStats = new Map<
      string,
      {
        firstSeen: Date;
        lastActive: Date;
        totalPrompts: number;
        totalSessions: number;
        totalDuration: number;
      }
    >();

    for (const session of sessions) {
      const existing = projectStats.get(session.project);
      if (existing) {
        existing.lastActive = new Date(
          Math.max(existing.lastActive.getTime(), session.endTime.getTime())
        );
        existing.totalPrompts += session.promptCount;
        existing.totalSessions += 1;
        existing.totalDuration += session.duration;
      } else {
        projectStats.set(session.project, {
          firstSeen: session.startTime,
          lastActive: session.endTime,
          totalPrompts: session.promptCount,
          totalSessions: 1,
          totalDuration: session.duration,
        });
      }
    }

    // Read Claude config for additional metrics
    console.log('Reading .claude.json...');
    const config = readClaudeConfig();
    const configProjects = getAllProjects(config);
    console.log(`Found ${configProjects.size} projects in config`);

    // Merge config metrics with session stats
    console.log('Updating project stats...');
    const allProjects = new Set([
      ...Array.from(projectStats.keys()),
      ...Array.from(configProjects.keys()),
    ]);

    for (const projectPath of allProjects) {
      try {
        const sessionData = projectStats.get(projectPath);
        const configData = configProjects.get(projectPath);

        upsertProjectStats(db, {
          projectPath,
          firstSeen: sessionData?.firstSeen || new Date(),
          lastActive: sessionData?.lastActive || new Date(),
          totalPrompts: sessionData?.totalPrompts || 0,
          totalSessions: sessionData?.totalSessions || 0,
          totalDuration: sessionData?.totalDuration || 0,
          linesAdded: configData?.lastLinesAdded || 0,
          linesRemoved: configData?.lastLinesRemoved || 0,
          totalCost: configData?.lastCost || 0,
          inputTokens: configData?.lastTotalInputTokens || 0,
          outputTokens: configData?.lastTotalOutputTokens || 0,
          cacheCreationTokens: configData?.lastTotalCacheCreationInputTokens || 0,
          cacheReadTokens: configData?.lastTotalCacheReadInputTokens || 0,
        });
        result.projectsUpdated++;
      } catch (error) {
        result.errors.push(`Failed to update project ${projectPath}: ${error}`);
      }
    }

    // Update last sync time
    setMetadata(db, 'last_sync_time', result.lastSyncTime.toISOString());

    console.log('Sync complete!');
    console.log(`- Prompts processed: ${result.promptsProcessed}`);
    console.log(`- Sessions created: ${result.sessionsCreated}`);
    console.log(`- Projects updated: ${result.projectsUpdated}`);
    if (result.errors.length > 0) {
      console.log(`- Errors: ${result.errors.length}`);
    }
  } catch (error) {
    result.errors.push(`Sync failed: ${error}`);
    console.error('Sync failed:', error);
  }

  return result;
}
