/**
 * Project Metrics Parser
 *
 * Parses ~/.claude.json to extract project usage metrics
 */

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import {
  ClaudeConfigSchema,
  type ClaudeConfig,
  type ProjectMetrics,
  type ProjectStats,
} from '../types/index.js';

/**
 * Default path to .claude.json
 */
export const CLAUDE_CONFIG_PATH = join(homedir(), '.claude.json');

/**
 * Read and parse .claude.json
 */
export function readClaudeConfig(filePath: string = CLAUDE_CONFIG_PATH): ClaudeConfig {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);
    return ClaudeConfigSchema.parse(json);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`Claude config not found: ${filePath}`);
      return { projects: {} };
    }
    throw error;
  }
}

/**
 * Get all project metrics
 */
export function getAllProjects(config: ClaudeConfig): Map<string, ProjectMetrics> {
  const projects = new Map<string, ProjectMetrics>();

  for (const [path, metrics] of Object.entries(config.projects)) {
    projects.set(path, metrics);
  }

  return projects;
}

/**
 * Get metrics for a specific project
 */
export function getProjectMetrics(
  config: ClaudeConfig,
  projectPath: string
): ProjectMetrics | undefined {
  return config.projects[projectPath];
}

/**
 * Convert project metrics to stats
 */
export function projectMetricsToStats(
  projectPath: string,
  metrics: ProjectMetrics,
  lastActive?: Date
): ProjectStats {
  return {
    projectPath,
    totalPrompts: 0, // Will be calculated from history
    totalSessions: 0, // Will be calculated from history
    totalDuration: metrics.lastDuration || 0,
    lastActive: lastActive || new Date(),
    linesAdded: metrics.lastLinesAdded || 0,
    linesRemoved: metrics.lastLinesRemoved || 0,
    totalCost: metrics.lastCost || 0,
    totalTokens: {
      input: metrics.lastTotalInputTokens || 0,
      output: metrics.lastTotalOutputTokens || 0,
      cacheCreation: metrics.lastTotalCacheCreationInputTokens || 0,
      cacheRead: metrics.lastTotalCacheReadInputTokens || 0,
    },
  };
}

/**
 * Get top projects by cost
 */
export function getTopProjectsByCost(
  config: ClaudeConfig,
  limit: number = 10
): Array<{ path: string; cost: number }> {
  const projects = Object.entries(config.projects)
    .map(([path, metrics]) => ({
      path,
      cost: metrics.lastCost || 0,
    }))
    .filter((p) => p.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit);

  return projects;
}

/**
 * Get top projects by duration
 */
export function getTopProjectsByDuration(
  config: ClaudeConfig,
  limit: number = 10
): Array<{ path: string; duration: number }> {
  const projects = Object.entries(config.projects)
    .map(([path, metrics]) => ({
      path,
      duration: metrics.lastDuration || 0,
    }))
    .filter((p) => p.duration > 0)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit);

  return projects;
}

/**
 * Get top projects by lines changed
 */
export function getTopProjectsByLinesChanged(
  config: ClaudeConfig,
  limit: number = 10
): Array<{ path: string; linesAdded: number; linesRemoved: number; total: number }> {
  const projects = Object.entries(config.projects)
    .map(([path, metrics]) => {
      const added = metrics.lastLinesAdded || 0;
      const removed = metrics.lastLinesRemoved || 0;
      return {
        path,
        linesAdded: added,
        linesRemoved: removed,
        total: added + removed,
      };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  return projects;
}

/**
 * Get total token usage across all projects
 */
export function getTotalTokenUsage(config: ClaudeConfig): {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
  total: number;
} {
  let input = 0;
  let output = 0;
  let cacheCreation = 0;
  let cacheRead = 0;

  for (const metrics of Object.values(config.projects)) {
    input += metrics.lastTotalInputTokens || 0;
    output += metrics.lastTotalOutputTokens || 0;
    cacheCreation += metrics.lastTotalCacheCreationInputTokens || 0;
    cacheRead += metrics.lastTotalCacheReadInputTokens || 0;
  }

  return {
    input,
    output,
    cacheCreation,
    cacheRead,
    total: input + output + cacheCreation + cacheRead,
  };
}

/**
 * Get total cost across all projects
 */
export function getTotalCost(config: ClaudeConfig): number {
  let total = 0;
  for (const metrics of Object.values(config.projects)) {
    total += metrics.lastCost || 0;
  }
  return total;
}

/**
 * Get project count
 */
export function getProjectCount(config: ClaudeConfig): number {
  return Object.keys(config.projects).length;
}
